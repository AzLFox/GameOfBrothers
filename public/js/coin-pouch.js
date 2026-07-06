/**
 * Кошелёк: закрытый мешок → по клику раскрывается с монетами внутри.
 * Каждый номинал хранится отдельно (без автоперевода).
 * Эквивалент: 10 бронз = 1 серебро, 10 серебра = 1 золото — только в подписи.
 * Позиции монет в куче сохраняются (sheet.coinPile).
 */
const CoinPouch = (() => {
  const BRONZE_PER_SILVER = 10;
  const SILVER_PER_GOLD = 10;
  const BRONZE_PER_GOLD = BRONZE_PER_SILVER * SILVER_PER_GOLD;
  const COINS_PER_ZONE = 15;
  const PILE_ZONES = 4;
  const MAX_VISIBLE_COINS = PILE_ZONES * COINS_PER_ZONE;
  const ZONE_LAYER_STEP = 0.54;
  const ZONE_SPREAD_BOOST = 1.3;

  const COIN_SRC = {
    bronze: '/img/ui/coin-bronze.png',
    silver: '/img/ui/coin-silver.png',
    gold: '/img/ui/coin-gold.png',
  };

  function coinSize(kind) {
    const desktop = window.matchMedia('(min-width: 701px)').matches;
    if (desktop) return { gold: 54, silver: 48, bronze: 42 }[kind];
    return { gold: 44, silver: 40, bronze: 36 }[kind];
  }

  let sheet = null;
  let onSave = () => {};
  let root = null;
  let toggleBtn = null;
  let sheetEl = null;
  let sackEl = null;
  let dropZone = null;
  let coinsEl = null;
  let emptyEl = null;
  let totalsEl = null;
  let equivalentEl = null;
  let overflowEl = null;
  let isOpen = false;

  function uid() {
    return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  }

  function equivalentBreakdown(totalBronze) {
    let t = Math.max(0, Math.floor(totalBronze));
    const bronze = t % BRONZE_PER_SILVER;
    t = Math.floor(t / BRONZE_PER_SILVER);
    const silver = t % SILVER_PER_GOLD;
    const gold = Math.floor(t / SILVER_PER_GOLD);
    return { gold, silver, bronze };
  }

  function totalEquivalentBronze(wealth) {
    const w = wealth || getWealth();
    return Math.max(0,
      (w.gold || 0) * BRONZE_PER_GOLD
      + (w.silver || 0) * BRONZE_PER_SILVER
      + (w.bronze || 0),
    );
  }

  function getWealth() {
    const w = sheet?.wealth;
    return {
      gold: Math.max(0, Math.floor(w?.gold ?? 0)),
      silver: Math.max(0, Math.floor(w?.silver ?? 0)),
      bronze: Math.max(0, Math.floor(w?.bronze ?? 0)),
    };
  }

  function totalCoinCount() {
    const w = getWealth();
    return w.gold + w.silver + w.bronze;
  }

  function migrateWealth(data) {
    if (data?.wealth && typeof data.wealth === 'object') {
      return {
        gold: Math.max(0, parseInt(data.wealth.gold, 10) || 0),
        silver: Math.max(0, parseInt(data.wealth.silver, 10) || 0),
        bronze: Math.max(0, parseInt(data.wealth.bronze, 10) || 0),
      };
    }
    if (Number.isFinite(data?.wealthBronze)) {
      return equivalentBreakdown(Math.max(0, Math.floor(data.wealthBronze)));
    }
    return { gold: 0, silver: 0, bronze: 0 };
  }

  function migrateCoinPile(data) {
    if (!Array.isArray(data?.coinPile)) return [];
    return data.coinPile
      .filter((c) => c && typeof c === 'object' && c.id && c.kind)
      .map((c) => ({
        id: String(c.id),
        kind: ['gold', 'silver', 'bronze'].includes(c.kind) ? c.kind : 'bronze',
        x: Number.isFinite(c.x) ? c.x : 0,
        y: Number.isFinite(c.y) ? c.y : 0,
        rot: Number.isFinite(c.rot) ? c.rot : 0,
        z: Number.isFinite(c.z) ? c.z : 1,
      }));
  }

  function bellyWidth() {
    return coinsEl?.clientWidth || 160;
  }

  function bellyHeight() {
    return coinsEl?.clientHeight || 100;
  }

  const COIN_ASSET = {
    gold: { w: 1536, h: 1024, padBottom: 0.09, padTop: 0.05 },
    silver: { w: 1536, h: 1024, padBottom: 0.10, padTop: 0.051 },
    bronze: { w: 1536, h: 1024, padBottom: 0.08, padTop: 0.037 },
  };

  function coinRenderedHeight(kind) {
    const size = coinSize(kind);
    const a = COIN_ASSET[kind] || COIN_ASSET.bronze;
    return size * (a.h / a.w);
  }

  /** Отступ визуального низа монеты от CSS bottom (пустое поле в PNG + вписывание в квадрат) */
  function coinVisualInsetBottom(kind) {
    const a = COIN_ASSET[kind] || COIN_ASSET.bronze;
    return coinRenderedHeight(kind) * a.padBottom;
  }

  function coinVisualInsetTop(kind) {
    const a = COIN_ASSET[kind] || COIN_ASSET.bronze;
    return coinRenderedHeight(kind) * a.padTop;
  }

  function visualBottomToCss(visualBottom, kind) {
    return Math.max(0, visualBottom - coinVisualInsetBottom(kind));
  }

  function zoneForPileIndex(index) {
    return Math.min(PILE_ZONES - 1, Math.floor(index / COINS_PER_ZONE));
  }

  function randomPilePosition(kind, pileIndex = 0) {
    const size = coinSize(kind);
    const maxX = Math.max(4, bellyWidth() - size - 4);
    const insetB = coinVisualInsetBottom(kind);
    const insetT = coinVisualInsetTop(kind);
    const renderedH = coinRenderedHeight(kind);
    const visualMaxY = Math.max(12, bellyHeight() - size + insetB + insetT);
    const zone = zoneForPileIndex(pileIndex);

    const evenStep = (visualMaxY / Math.max(1, PILE_ZONES - 1)) * ZONE_SPREAD_BOOST;
    const layerStep = Math.max(renderedH * ZONE_LAYER_STEP, evenStep);

    let visualYLo;
    let visualYHi;
    if (zone === 0) {
      visualYLo = 0;
      visualYHi = Math.min(visualMaxY, layerStep * 0.48);
    } else if (zone >= PILE_ZONES - 1) {
      visualYLo = Math.max(0, visualMaxY - layerStep * 0.62);
      visualYHi = visualMaxY;
    } else {
      const base = zone * layerStep;
      visualYLo = Math.max(0, base - layerStep * 0.1);
      visualYHi = Math.min(visualMaxY, base + layerStep * 0.44);
    }

    const visualY = visualYLo + Math.random() * Math.max(0.5, visualYHi - visualYLo);

    return {
      x: 4 + Math.random() * Math.max(2, maxX - 4),
      y: visualBottomToCss(visualY, kind),
      rot: -55 + Math.random() * 110,
      z: 1 + zone * 6 + Math.floor(Math.random() * 4),
    };
  }

  function applyZonePosition(entry, pileIndex) {
    Object.assign(entry, randomPilePosition(entry.kind, pileIndex));
  }

  function syncPilePositionsToZones() {
    (sheet.coinPile || []).forEach((entry, i) => applyZonePosition(entry, i));
  }

  function makeCoinEntry(kind, pileIndex) {
    const index = Number.isFinite(pileIndex) ? pileIndex : (sheet.coinPile?.length || 0);
    return { id: uid(), kind, ...randomPilePosition(kind, index) };
  }

  function countPileByKind() {
    const counts = { gold: 0, silver: 0, bronze: 0 };
    (sheet.coinPile || []).forEach((c) => { counts[c.kind]++; });
    return counts;
  }

  function targetVisibleCounts() {
    const w = getWealth();
    const total = w.gold + w.silver + w.bronze;
    if (total <= MAX_VISIBLE_COINS) return { ...w };
    const visible = { gold: 0, silver: 0, bronze: 0 };
    const kinds = [];
    for (let i = 0; i < w.gold; i++) kinds.push('gold');
    for (let i = 0; i < w.silver; i++) kinds.push('silver');
    for (let i = 0; i < w.bronze; i++) kinds.push('bronze');
    kinds.slice(0, MAX_VISIBLE_COINS).forEach((k) => { visible[k]++; });
    return visible;
  }

  function ensureCoinPile() {
    if (!Array.isArray(sheet.coinPile)) sheet.coinPile = [];

    const target = targetVisibleCounts();
    const pileCounts = countPileByKind();

    for (let i = sheet.coinPile.length - 1; i >= 0; i--) {
      const kind = sheet.coinPile[i].kind;
      if (pileCounts[kind] > target[kind]) {
        sheet.coinPile.splice(i, 1);
        pileCounts[kind]--;
      }
    }

    ['gold', 'silver', 'bronze'].forEach((kind) => {
      while (pileCounts[kind] < target[kind] && sheet.coinPile.length < MAX_VISIBLE_COINS) {
        sheet.coinPile.push(makeCoinEntry(kind, sheet.coinPile.length));
        pileCounts[kind]++;
      }
    });
  }

  function bootstrapCoinPile() {
    if (!Array.isArray(sheet.coinPile)) sheet.coinPile = [];
    if (sheet.coinPile.length > 0 || totalCoinCount() === 0) return;
    ensureCoinPile();
  }

  function syncInputs() {
    if (!root) return;
    const { gold, silver, bronze } = getWealth();
    const g = root.querySelector('[data-wealth-input="gold"]');
    const s = root.querySelector('[data-wealth-input="silver"]');
    const b = root.querySelector('[data-wealth-input="bronze"]');
    if (g && document.activeElement !== g) g.value = gold;
    if (s && document.activeElement !== s) s.value = silver;
    if (b && document.activeElement !== b) b.value = bronze;
  }

  function updateTotals() {
    const w = getWealth();
    const total = totalCoinCount();

    if (emptyEl) {
      emptyEl.hidden = total !== 0;
    }
    if (totalsEl) {
      totalsEl.hidden = total === 0;
      if (total > 0) {
        totalsEl.textContent = `${w.gold} з · ${w.silver} с · ${w.bronze} б`;
      }
    }

    if (equivalentEl) {
      if (total === 0) {
        equivalentEl.hidden = true;
        equivalentEl.textContent = '';
      } else {
        const eq = equivalentBreakdown(totalEquivalentBronze(w));
        equivalentEl.hidden = false;
        equivalentEl.textContent = `Всего: ${eq.gold} з · ${eq.silver} с · ${eq.bronze} б`;
      }
    }
  }

  function updateOverflowBadge() {
    if (!overflowEl) {
      overflowEl = coinsEl?.querySelector('.coin-sack-overflow') || null;
    }
    const hidden = Math.max(0, totalCoinCount() - (sheet.coinPile?.length || 0));
    let badge = coinsEl?.querySelector('.coin-sack-overflow');
    if (hidden > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'coin-sack-overflow';
        coinsEl?.appendChild(badge);
      }
      badge.textContent = `+${hidden}`;
      badge.hidden = false;
    } else if (badge) {
      badge.remove();
    }
  }

  function updatePileHeight() {
    /* высота мешка фиксирована в CSS */
  }

  function createPileElement(entry, animateIn = false) {
    const img = document.createElement('img');
    img.className = `coin-pile-coin coin-pile-coin--${entry.kind}`;
    img.dataset.coinId = entry.id;
    img.src = COIN_SRC[entry.kind];
    img.alt = '';
    img.draggable = false;
    img.style.left = `${entry.x}px`;
    img.style.bottom = `${entry.y}px`;
    img.style.zIndex = String(entry.z);
    img.style.setProperty('--rot', `${entry.rot}deg`);
    img.style.setProperty('--coin-size', `${coinSize(entry.kind)}px`);
    if (animateIn) img.classList.add('coin-pile-coin--new');
    return img;
  }

  function appendCoinToDom(entry, animateIn = false) {
    if (!coinsEl) return;
    if (coinsEl.querySelector(`[data-coin-id="${entry.id}"]`)) return;
    coinsEl.appendChild(createPileElement(entry, animateIn));
    updatePileHeight();
    updateOverflowBadge();
    updateTotals();
  }

  function removeCoinFromDom(coinId) {
    coinsEl?.querySelector(`[data-coin-id="${coinId}"]`)?.remove();
  }

  function renderCoinsFull() {
    if (!coinsEl) return;
    bootstrapCoinPile();
    ensureCoinPile();
    syncPilePositionsToZones();

    coinsEl.querySelectorAll('.coin-pile-coin').forEach((el) => el.remove());
    (sheet.coinPile || []).forEach((entry) => appendCoinToDom(entry, false));
    updatePileHeight();
    updateOverflowBadge();
    updateTotals();
    syncInputs();
  }

  function landXForEntry(entry) {
    const bellyW = bellyWidth();
    return entry.x - bellyW / 2 + coinSize(entry.kind) / 2;
  }

  function landYForEntry(entry, kind) {
    return Math.max(12, bellyHeight() - entry.y - coinRenderedHeight(kind));
  }

  function playCoinDropTo(entry, onDone) {
    if (!dropZone || !sackEl) {
      onDone?.();
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onDone?.();
      return;
    }

    const kind = entry.kind;
    const size = coinSize(kind);
    const startX = -18 + Math.random() * 36;
    const landX = landXForEntry(entry);
    const landY = landYForEntry(entry, kind);
    const midX = (startX + landX) / 2 + (-10 + Math.random() * 20);
    const spin = -70 + Math.random() * 140;

    const coin = document.createElement('img');
    coin.className = `coin-drop coin-drop--${kind}`;
    coin.src = COIN_SRC[kind];
    coin.alt = '';
    coin.draggable = false;
    coin.style.setProperty('--coin-size', `${size}px`);
    coin.style.setProperty('--start-x', `${startX.toFixed(1)}px`);
    coin.style.setProperty('--mid-x', `${midX.toFixed(1)}px`);
    coin.style.setProperty('--land-x', `${landX.toFixed(1)}px`);
    coin.style.setProperty('--land-y', `${landY.toFixed(1)}px`);
    coin.style.setProperty('--spin', `${spin.toFixed(1)}deg`);
    dropZone.appendChild(coin);

    sackEl.classList.remove('is-catching');
    void sackEl.offsetWidth;
    sackEl.classList.add('is-catching');

    const finish = () => {
      coin.remove();
      onDone?.();
    };
    coin.addEventListener('animationend', finish, { once: true });
    window.setTimeout(finish, 800);
  }

  function playCoinDropGeneric(kind) {
    const fake = makeCoinEntry(kind);
    playCoinDropTo(fake, null);
  }

  function canAddVisibleCoin() {
    const total = totalCoinCount();
    const pileLen = sheet.coinPile?.length || 0;
    return pileLen < Math.min(total, MAX_VISIBLE_COINS);
  }

  function addCoinToPile(kind, animate = true) {
    if (canAddVisibleCoin()) {
      const pileIndex = sheet.coinPile.length;
      const entry = makeCoinEntry(kind, pileIndex);
      sheet.coinPile.push(entry);
      if (isOpen && animate) {
        playCoinDropTo(entry, () => appendCoinToDom(entry, true));
      } else {
        appendCoinToDom(entry, false);
      }
      return;
    }
    if (isOpen && animate) playCoinDropGeneric(kind);
    updateOverflowBadge();
    updateTotals();
  }

  function removeCoinsOfKind(kind, count) {
    let left = count;
    for (let i = sheet.coinPile.length - 1; i >= 0 && left > 0; i--) {
      if (sheet.coinPile[i].kind !== kind) continue;
      const [removed] = sheet.coinPile.splice(i, 1);
      removeCoinFromDom(removed.id);
      left--;
    }
    if (left > 0) ensureCoinPile();
    updateOverflowBadge();
    updateTotals();
  }

  function syncPileFromWealthChange(prev, next) {
    ['gold', 'silver', 'bronze'].forEach((kind) => {
      const diff = next[kind] - prev[kind];
      if (diff > 0) {
        for (let i = 0; i < diff; i++) {
          addCoinToPile(kind, i === diff - 1);
        }
      } else if (diff < 0) {
        removeCoinsOfKind(kind, -diff);
      }
    });

    ensureCoinPile();
    updateOverflowBadge();
  }

  function addWealth(kind) {
    if (!sheet.wealth) sheet.wealth = { gold: 0, silver: 0, bronze: 0 };
    sheet.wealth[kind] = (sheet.wealth[kind] || 0) + 1;
    addCoinToPile(kind, true);
    syncInputs();
    onSave();
  }

  function setWealthFromInputs() {
    if (!root) return;
    const prev = getWealth();
    const gold = Math.max(0, parseInt(root.querySelector('[data-wealth-input="gold"]')?.value, 10) || 0);
    const silver = Math.max(0, parseInt(root.querySelector('[data-wealth-input="silver"]')?.value, 10) || 0);
    const bronze = Math.max(0, parseInt(root.querySelector('[data-wealth-input="bronze"]')?.value, 10) || 0);
    sheet.wealth = { gold, silver, bronze };
    syncPileFromWealthChange(prev, getWealth());
    syncInputs();
    onSave();
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    root?.classList.add('is-open');
    toggleBtn?.setAttribute('aria-expanded', 'true');
    sheetEl?.removeAttribute('hidden');
    renderCoinsFull();
    window.setTimeout(() => document.addEventListener('click', onDocClick, true), 0);
    window.addEventListener('keydown', onKeydown);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    root?.classList.remove('is-open');
    toggleBtn?.setAttribute('aria-expanded', 'false');
    sheetEl?.setAttribute('hidden', '');
    document.removeEventListener('click', onDocClick, true);
    window.removeEventListener('keydown', onKeydown);
  }

  function toggle() {
    if (isOpen) close();
    else open();
  }

  function onDocClick(e) {
    if (!root?.contains(e.target)) close();
  }

  function onKeydown(e) {
    if (e.key === 'Escape') close();
  }

  function bindControls() {
    toggleBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle();
    });

    sheetEl?.addEventListener('click', (e) => e.stopPropagation());

    root?.querySelectorAll('[data-add-coin]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isOpen) open();
        addWealth(btn.dataset.addCoin);
      });
    });

    root?.querySelectorAll('[data-wealth-input]').forEach((input) => {
      input.addEventListener('change', setWealthFromInputs);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          input.blur();
          setWealthFromInputs();
        }
      });
    });
  }

  function init(s, saveCb) {
    sheet = s;
    onSave = typeof saveCb === 'function' ? saveCb : () => {};
    if (!sheet.wealth || typeof sheet.wealth !== 'object') {
      sheet.wealth = migrateWealth(sheet);
    }

    root = document.getElementById('coin-pouch');
    toggleBtn = document.getElementById('coin-pouch-toggle');
    sheetEl = document.getElementById('coin-pouch-sheet');
    sackEl = document.getElementById('coin-sack');
    dropZone = document.getElementById('coin-pouch-drop-zone');
    coinsEl = document.getElementById('coin-pouch-coins');
    emptyEl = document.getElementById('coin-pouch-empty');
    totalsEl = document.getElementById('coin-pouch-totals');
    equivalentEl = document.getElementById('coin-pouch-equivalent');
    if (!Array.isArray(sheet.coinPile)) sheet.coinPile = migrateCoinPile(sheet);

    bindControls();
    bootstrapCoinPile();
    if (isOpen) renderCoinsFull();
    else {
      updateTotals();
      syncInputs();
    }
  }

  function render() {
    bootstrapCoinPile();
    ensureCoinPile();
    if (isOpen) renderCoinsFull();
    else {
      updateTotals();
      syncInputs();
    }
  }

  return {
    init,
    render,
    migrateWealth,
    migrateCoinPile,
    equivalentBreakdown,
    totalEquivalentBronze,
    open,
    close,
  };
})();

Object.assign(window, { CoinPouch });
