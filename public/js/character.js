const id = new URLSearchParams(location.search).get('id');

const STAT_COMBAT_LINKS = [
  { stat: 'str', combatId: 'combat-row-hp' },
  { stat: 'dex', combatId: 'combat-row-hit' },
  { stat: 'int', combatId: 'combat-row-skills' },
  { stat: 'spi', combatId: 'combat-row-mp' },
  { stat: 'end', combatId: 'combat-row-ap' },
  { stat: 'luck', combatId: 'combat-row-crit' },
];

const LINK_RUNE_GLYPHS = {
  str: ['ᚦ', 'ᚢ', 'ᛟ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᛞ', 'ᚠ'],
  dex: ['ᚠ', 'ᚹ', 'ᛃ', 'ᛇ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᚢ'],
  int: ['ᚨ', 'ᚱ', 'ᚲ', 'ᛟ', 'ᚦ', 'ᛞ', 'ᚠ', 'ᚹ'],
  spi: ['ᛁ', 'ᛃ', 'ᛇ', 'ᚾ', 'ᚺ', 'ᛟ', 'ᚲ', 'ᚨ'],
  end: ['ᚢ', 'ᚦ', 'ᚱ', 'ᛟ', 'ᚲ', 'ᛞ', 'ᚠ', 'ᚾ'],
  luck: ['ᛟ', 'ᛞ', 'ᚠ', 'ᚨ', 'ᚹ', 'ᛃ', 'ᚺ', 'ᚱ'],
};

const LINK_RUNE_LAYOUT_STAT = [
  { x: 8, y: 10, rot: -14, s: 0.92 },
  { x: 92, y: 12, rot: 12, s: 0.88 },
  { x: 6, y: 50, rot: -6, s: 0.9 },
  { x: 94, y: 52, rot: 10, s: 0.88 },
  { x: 12, y: 90, rot: 8, s: 0.86 },
  { x: 88, y: 88, rot: -8, s: 0.9 },
];

const LINK_RUNE_LAYOUT_COMBAT_INNER = [
  { x: 22, y: 20, rot: -10, s: 0.98 },
  { x: 50, y: 16, rot: 0, s: 0.96 },
  { x: 78, y: 22, rot: 12, s: 1 },
  { x: 26, y: 44, rot: -6, s: 0.98 },
  { x: 74, y: 46, rot: 8, s: 1 },
  { x: 20, y: 66, rot: 6, s: 0.96 },
  { x: 50, y: 62, rot: -4, s: 1.02 },
  { x: 80, y: 68, rot: 10, s: 0.98 },
  { x: 34, y: 84, rot: -8, s: 0.94 },
  { x: 66, y: 82, rot: 6, s: 0.96 },
];

const LINK_RUNE_LAYOUT_COMBAT_SIDES = [
  { x: 5, y: 8, rot: -14, s: 1.02 },
  { x: 95, y: 10, rot: 11, s: 0.98 },
  { x: 3, y: 32, rot: -8, s: 0.96 },
  { x: 97, y: 36, rot: 16, s: 1 },
  { x: 7, y: 58, rot: 6, s: 0.98 },
  { x: 93, y: 62, rot: -12, s: 1.02 },
  { x: 5, y: 90, rot: 10, s: 0.94 },
  { x: 95, y: 88, rot: -6, s: 0.98 },
];

const LINK_RUNE_LAYOUT_COMBAT = [
  ...LINK_RUNE_LAYOUT_COMBAT_INNER,
  ...LINK_RUNE_LAYOUT_COMBAT_SIDES,
];

function createLinkRunesMarkup(statKey, variant = 'stat') {
  const glyphs = LINK_RUNE_GLYPHS[statKey] || LINK_RUNE_GLYPHS.str;
  const layout = variant === 'combat' ? LINK_RUNE_LAYOUT_COMBAT : LINK_RUNE_LAYOUT_STAT;
  const wrapClass = variant === 'combat' ? 'link-runes link-runes--combat' : 'link-runes link-runes--stat';
  const items = layout.map((pos, i) => {
    const ch = glyphs[i % glyphs.length];
    const delay = (i * 0.11).toFixed(2);
    return `<span class="link-rune" style="--rx:${pos.x}%;--ry:${pos.y}%;--rr:${pos.rot}deg;--rs:${pos.s};--rd:${delay}s">${ch}</span>`;
  }).join('');
  return `<span class="${wrapClass}" aria-hidden="true">${items}</span>`;
}

function getStatCell(statKey) {
  return document.querySelector(`.stat-cell input[data-stat="${statKey}"]`)?.closest('.stat-cell');
}

function setStatCombatRuneLit(statKey, lit) {
  const link = STAT_COMBAT_LINKS.find((l) => l.stat === statKey);
  if (!link) return;
  getStatCell(statKey)?.classList.toggle('is-rune-lit', lit);
  document.getElementById(link.combatId)?.classList.toggle('is-rune-lit', lit);
}

function isTouchRuneMode() {
  return typeof GobMobile !== 'undefined'
    && (GobMobile.isMobile() || GobMobile.isCoarsePointer());
}

function isTouchTooltipMode() {
  return isTouchRuneMode();
}

function getTooltipSafePad() {
  const cs = getComputedStyle(document.documentElement);
  const num = (prop) => {
    const v = parseFloat(cs.getPropertyValue(prop));
    return Number.isFinite(v) ? v : 0;
  };
  return {
    top: Math.max(12, num('--gob-tooltip-pad-top')),
    right: Math.max(12, num('--gob-tooltip-pad-right')),
    bottom: Math.max(12, num('--gob-tooltip-pad-bottom')),
    left: Math.max(12, num('--gob-tooltip-pad-left')),
  };
}

function positionFloatingTooltip(tip, anchorEl, belowClass) {
  if (!tip || !anchorEl) return;

  const rect = anchorEl.getBoundingClientRect();
  tip.style.left = '0';
  tip.style.top = '0';
  tip.style.visibility = 'hidden';
  tip.hidden = false;

  const tipRect = tip.getBoundingClientRect();
  const pad = getTooltipSafePad();
  let left = rect.left + rect.width / 2 - tipRect.width / 2;
  let top = rect.top - tipRect.height - 12;
  let preferBelow = top < pad.top;
  if (preferBelow) top = rect.bottom + 12;

  left = Math.max(pad.left, Math.min(left, window.innerWidth - tipRect.width - pad.right));
  top = Math.max(pad.top, Math.min(top, window.innerHeight - tipRect.height - pad.bottom));

  tip.classList.toggle(belowClass, preferBelow);
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
  tip.style.visibility = 'visible';
}

let activeRuneStat = null;
let activeCombatHintRow = null;
let statCombatRunesBound = false;

function clearAllRuneLit() {
  STAT_COMBAT_LINKS.forEach(({ stat }) => setStatCombatRuneLit(stat, false));
  activeRuneStat = null;
  hideCombatTooltip();
}

function getCombatHintHtml(combatId) {
  switch (combatId) {
    case 'combat-row-hit': return hitTooltipHtml();
    case 'combat-row-skills': return skillsTooltipHtml();
    case 'combat-row-crit': return critTooltipHtml();
    default: return null;
  }
}

function handleTouchRuneTap(e, stat, combatId, fromCombatRow) {
  if (e.target.closest('input, textarea, select, button')) return;
  e.stopPropagation();

  const combatEl = document.getElementById(combatId);
  const hasHint = combatEl?.classList.contains('combat-row--hint');

  if (activeRuneStat === stat) {
    clearAllRuneLit();
    return;
  }

  if (activeRuneStat) setStatCombatRuneLit(activeRuneStat, false);
  hideCombatTooltip();

  activeRuneStat = stat;
  setStatCombatRuneLit(stat, true);

  if (fromCombatRow && hasHint && combatEl) {
    const html = getCombatHintHtml(combatId);
    if (html) {
      activeCombatHintRow = combatEl;
      combatEl.classList.add('is-hint-active');
      showCombatTooltip(html, combatEl);
    }
  }
}

function bindStatCombatRunes() {
  if (!statCombatRunesBound) {
    statCombatRunesBound = true;

    if (isTouchRuneMode()) {
      STAT_COMBAT_LINKS.forEach(({ stat, combatId }) => {
        const statEl = getStatCell(stat);
        if (!statEl) return;
        statEl.addEventListener('click', (e) => handleTouchRuneTap(e, stat, combatId, false));
      });

      document.addEventListener('click', (e) => {
        if (e.target.closest('.stat-cell, .combat-row')) return;
        clearAllRuneLit();
      });
    }
  }

  STAT_COMBAT_LINKS.forEach(({ stat, combatId }) => {
    const statEl = getStatCell(stat);
    const combatEl = document.getElementById(combatId);
    if (!statEl || !combatEl) return;

    if (isTouchRuneMode()) {
      combatEl.addEventListener('click', (e) => handleTouchRuneTap(e, stat, combatId, true));
      return;
    }

    const light = () => setStatCombatRuneLit(stat, true);
    const dim = (e) => {
      const next = e?.relatedTarget;
      if (statEl.contains(next) || combatEl.contains(next)) return;
      setStatCombatRuneLit(stat, false);
    };

    const bindFocus = (el) => {
      el.addEventListener('focusin', light);
      el.addEventListener('focusout', dim);
    };

    [statEl, combatEl].forEach((el) => {
      el.addEventListener('mouseenter', light);
      el.addEventListener('mouseleave', dim);
      bindFocus(el);
    });
  });
}

const STAT_KEYS = [
  { key: 'str', label: 'Сила' },
  { key: 'dex', label: 'Ловкость' },
  { key: 'int', label: 'Интеллект' },
  { key: 'spi', label: 'Дух' },
  { key: 'end', label: 'Выносливость' },
  { key: 'luck', label: 'Удача' },
];

const EQUIPMENT_SLOTS = [
  { key: 'helmet', label: 'Шлем', icon: '⛑' },
  { key: 'leftHand', label: 'Л. рука', icon: '🛡' },
  { key: 'armor', label: 'Броня', icon: '🦺' },
  { key: 'rightHand', label: 'П. рука', icon: '⚔' },
  { key: 'boots', label: 'Ботинки', icon: '👢' },
];

const EXTRA_SLOTS = [
  { key: 'ring', label: 'Кольцо', icon: '💍' },
  { key: 'necklace', label: 'Ожерелье', icon: '📿' },
  { key: 'bracers', label: 'Наручи', icon: '🧤' },
  { key: 'pet', label: 'Питомец', icon: '🐾' },
];

const BACKPACK_COUNT = 6;
const SPELLS_PER_PAGE = 7;
const SPELLS_PER_SPREAD = SPELLS_PER_PAGE * 2;
/** Порядок заполнения: крупные → средний → мелкие (индексы слотов 0..6) */
const SPELL_SLOT_FILL_ORDER = [0, 1, 5, 6, 3, 2, 4];

const SPELL_SPECS = [
  { key: 'all', label: 'Все', icon: '☆', tabClass: 'spell-tab--all' },
  { key: 'damage', label: 'Урон', icon: '⚔', tabClass: 'spell-tab--damage' },
  { key: 'buff', label: 'Бафф', icon: '▲', tabClass: 'spell-tab--buff' },
  { key: 'heal', label: 'Хилл', icon: '✚', tabClass: 'spell-tab--heal' },
  { key: 'debuff', label: 'Дебафф', icon: '▼', tabClass: 'spell-tab--debuff' },
];

const SPELL_ICONS = {
  damage: ['fireball', 'lightning', 'ice-spike', 'meteor', 'slash', 'explosion', 'arcane-arrow', 'dragon-breath', 'shockwave', 'blood-curse', 'plasma-beam', 'soul-fire', 'thunder-clap', 'blade-vortex', 'chaos-orb'],
  buff: ['shield', 'strength', 'haste', 'armor', 'banner', 'holy-wings', 'war-horn', 'magic-ward', 'divine-blessing', 'aegis', 'iron-skin', 'focus-mind', 'battle-fury', 'phalanx', 'arcane-insight'],
  heal: ['heal-water', 'aura', 'regen', 'holy-light', 'potion', 'rejuvenate', 'life-bloom', 'sanctuary', 'moonlight', 'resurrection', 'spring-water', 'sunbeam', 'bonding-light', 'herb-brew', 'veil-of-mercy'],
  debuff: ['poison', 'curse', 'chains', 'weaken', 'fear', 'silence', 'slow-time', 'blindness', 'voodoo-hex', 'soul-drain', 'rot', 'nightmare', 'rust', 'wither', 'shadow-bind'],
};

const SPELL_LEGENDARY_ICONS = {
  damage: ['legend-apocalypse', 'legend-ragnarok', 'legend-void-tear'],
  buff: ['legend-ascension', 'legend-avatar', 'legend-immortal-will'],
  heal: ['legend-phoenix', 'legend-world-tree', 'legend-divine-grace'],
  debuff: ['legend-doom', 'legend-oblivion', 'legend-entropy'],
};

function allIconsForSpec(spec) {
  const regular = SPELL_ICONS[spec] || SPELL_ICONS.damage;
  const legendary = SPELL_LEGENDARY_ICONS[spec] || [];
  return [...regular, ...legendary];
}

function isLegendaryIcon(spec, iconId) {
  return (SPELL_LEGENDARY_ICONS[spec] || []).includes(iconId);
}

function defaultIconForSpec(spec) {
  return SPELL_ICONS[spec]?.[0] || SPELL_ICONS.damage[0];
}

function iconSrc(spec, iconId) {
  return `/img/spell-icons/${spec}/${iconId}.png`;
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

let sheet = null;
let catalogChar = null;
let selectedSlot = null;
let saveTimer = null;
let activeSpec = 'all';
let spreadIndex = 0;
let editingSpellId = null;
let selectedIconId = 'star';
let selectedSpec = 'damage';
let isPageTurning = false;
let spellbookFlipReady = false;
let spellbookResizeBound = false;
let spellbookResizeTimer = null;
let spellbookModulePromise = null;
const HIT_DICE = [6, 12, 20, 60, 100];

let combatTooltipEl = null;
let combatTooltipTimer = null;
let combatTooltipVisible = false;
let spellTooltipEl = null;
let spellTooltipTimer = null;
let spellTooltipVisible = false;
let activeSpellTooltipBtn = null;
let spellTooltipTouchBound = false;
let spellSlotDelegationBound = false;
let spellLongPressTimer = null;
let spellLongPressSuppressedClick = false;

function spellForSlotEl(slot) {
  const id = slot?.dataset?.spellId;
  return id ? sheet.spells.find((s) => s.id === id) : null;
}

function bindSpellSlotDelegation(modal) {
  if (spellSlotDelegationBound) return;
  spellSlotDelegationBound = true;

  const mount = document.getElementById('spellbook-mount');
  const pressRoot = mount || modal;

  modal.addEventListener('click', (e) => {
    const slot = e.target.closest('.spell-slot:not(.spell-slot--empty)');
    if (!slot || !modal.open) return;

    if (spellLongPressSuppressedClick) {
      spellLongPressSuppressedClick = false;
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    hideSpellTooltip();
    const spell = spellForSlotEl(slot);
    if (spell) openSpellEditor(spell.id);
  });

  if (!isTouchTooltipMode()) return;

  const clearLongPress = () => {
    if (spellLongPressTimer) {
      clearTimeout(spellLongPressTimer);
      spellLongPressTimer = null;
    }
  };

  pressRoot.addEventListener('pointerdown', (e) => {
    clearLongPress();
    const slot = e.target.closest('.spell-slot:not(.spell-slot--empty)');
    if (!slot) return;
    const spell = spellForSlotEl(slot);
    if (!spell) return;

    spellLongPressTimer = window.setTimeout(() => {
      spellLongPressTimer = null;
      spellLongPressSuppressedClick = true;
      activeSpellTooltipBtn = slot;
      showSpellTooltip(spell, slot);
    }, 480);
  }, { passive: true });

  pressRoot.addEventListener('pointerup', clearLongPress);
  pressRoot.addEventListener('pointercancel', clearLongPress);
  pressRoot.addEventListener('pointerleave', clearLongPress);
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function specLabel(spec) {
  return SPELL_SPECS.find(s => s.key === spec)?.label || spec;
}

function ensureSpellTooltip() {
  if (!spellTooltipEl) {
    spellTooltipEl = document.getElementById('spell-tooltip');
    if (spellTooltipEl?.parentElement !== document.body) {
      document.body.appendChild(spellTooltipEl);
    }
  }
  return spellTooltipEl;
}

function hideSpellTooltip() {
  if (spellTooltipTimer) {
    clearTimeout(spellTooltipTimer);
    spellTooltipTimer = null;
  }
  const tip = ensureSpellTooltip();
  if (!tip || tip.hidden) return;

  if (spellTooltipVisible && typeof CharMotion !== 'undefined') {
    CharMotion.fadeTooltipOut(tip, () => {
      tip.hidden = true;
      tip.style.visibility = '';
      spellTooltipVisible = false;
      activeSpellTooltipBtn = null;
    });
    return;
  }

  tip.hidden = true;
  tip.style.visibility = '';
  spellTooltipVisible = false;
  activeSpellTooltipBtn = null;
}

function positionSpellTooltip(anchorEl) {
  const tip = spellTooltipEl;
  if (!tip) return;

  positionFloatingTooltip(tip, anchorEl, 'spell-tooltip--below');

  if (!spellTooltipVisible && typeof CharMotion !== 'undefined') {
    CharMotion.fadeTooltipIn(tip);
    spellTooltipVisible = true;
  }
}

function showSpellTooltip(spell, anchorEl) {
  const tip = ensureSpellTooltip();
  if (!tip) return;

  const desc = spell.desc?.trim();
  const legendary = isLegendaryIcon(spell.spec, spell.icon);

  tip.innerHTML = `
    <p class="spell-tooltip-name">${escapeHtml(spell.name || 'Без названия')}</p>
    <p class="spell-tooltip-meta">
      <span>${escapeHtml(specLabel(spell.spec))}</span>
      <span>Ур. ${ROMAN[spell.level] || spell.level}</span>
      <span>${spell.mana} маны</span>
      ${legendary ? '<span class="spell-tooltip-legend">Легендарное</span>' : ''}
    </p>
    <p class="spell-tooltip-desc${desc ? '' : ' spell-tooltip-desc--empty'}">${escapeHtml(desc || 'Описание не задано')}</p>
  `;
  positionSpellTooltip(anchorEl);
}

function bindSpellTooltipTouchDismiss() {
  if (spellTooltipTouchBound || !isTouchTooltipMode()) return;
  spellTooltipTouchBound = true;
  document.addEventListener('click', (e) => {
    if (e.target.closest('.spell-slot, .spell-tooltip')) return;
    hideSpellTooltip();
  });
}

function bindSpellTooltip(btn, spell) {
  if (isTouchTooltipMode()) {
    bindSpellTooltipTouchDismiss();
    return;
  }

  btn.addEventListener('pointerenter', () => {
    if (spellTooltipTimer) clearTimeout(spellTooltipTimer);
    spellTooltipTimer = setTimeout(() => showSpellTooltip(spell, btn), 200);
  });
  btn.addEventListener('pointerleave', hideSpellTooltip);
  btn.addEventListener('pointermove', () => {
    if (spellTooltipEl && !spellTooltipEl.hidden) positionSpellTooltip(btn);
  });
}

function defaultCombat(stats) {
  const str = stats.str ?? 12;
  const end = stats.end ?? 12;
  const spi = stats.spi ?? 12;
  return {
    hp: str * 4,
    ap: end,
    mp: spi,
  };
}

function migrateCombat(data, stats) {
  const base = defaultCombat(stats);
  if (!data.combat || typeof data.combat !== 'object') return base;
  const c = data.combat;
  return {
    hp: Number.isFinite(c.hp) ? c.hp : base.hp,
    ap: Number.isFinite(c.ap) ? c.ap : base.ap,
    mp: Number.isFinite(c.mp) ? c.mp : base.mp,
  };
}

function maxHp() {
  return sheet.stats.str * 4;
}

function maxAp() {
  return sheet.stats.end;
}

function maxMp() {
  return sheet.stats.spi;
}

function overheal(current, max) {
  return Math.max(0, (parseInt(current, 10) || 0) - max);
}

function hitThreshold(dieSides, dex) {
  return Math.max(2, dieSides - dex);
}

function critValue(luck) {
  return Math.floor(luck / 2);
}

function critThreshold(dieSides, luck) {
  return Math.max(2, dieSides - critValue(luck));
}

function spellsRemaining() {
  return sheet.stats.int - sheet.spells.length;
}

function ensureCombatTooltip() {
  if (!combatTooltipEl) {
    combatTooltipEl = document.getElementById('combat-tooltip');
    if (combatTooltipEl?.parentElement !== document.body) {
      document.body.appendChild(combatTooltipEl);
    }
  }
  return combatTooltipEl;
}

function hideCombatTooltip() {
  if (combatTooltipTimer) {
    clearTimeout(combatTooltipTimer);
    combatTooltipTimer = null;
  }
  activeCombatHintRow?.classList.remove('is-hint-active');
  activeCombatHintRow = null;
  combatTooltipVisible = false;
  const tip = ensureCombatTooltip();
  if (!tip || tip.hidden) return;

  if (typeof CharMotion !== 'undefined') {
    CharMotion.fadeTooltipOut(tip, () => {
      tip.hidden = true;
      tip.style.visibility = '';
      if (typeof GobMotion !== 'undefined') GobMotion.killOf(tip);
    });
    return;
  }

  tip.hidden = true;
  tip.style.visibility = '';
}

function positionCombatTooltip(anchorEl) {
  const tip = combatTooltipEl;
  if (!tip) return;

  positionFloatingTooltip(tip, anchorEl, 'combat-tooltip--below');

  if (typeof GobMotion !== 'undefined') GobMotion.killOf(tip);

  if (typeof CharMotion !== 'undefined') {
    CharMotion.fadeTooltipIn(tip);
  } else {
    tip.style.opacity = '1';
  }
  combatTooltipVisible = true;
}

function showCombatTooltip(html, anchorEl) {
  const tip = ensureCombatTooltip();
  if (!tip) return;
  tip.innerHTML = html;
  positionCombatTooltip(anchorEl);
}

function combatHintLabel(text) {
  return `<span class="combat-label">${text}<span class="combat-hint-icon" aria-hidden="true">i</span></span>`;
}

function bindCombatHint(rowEl, getHtml) {
  if (isTouchRuneMode()) return;

  rowEl.addEventListener('pointerenter', () => {
    if (combatTooltipTimer) clearTimeout(combatTooltipTimer);
    combatTooltipTimer = setTimeout(() => showCombatTooltip(getHtml(), rowEl), 200);
  });
  rowEl.addEventListener('pointerleave', hideCombatTooltip);
  rowEl.addEventListener('pointermove', () => {
    if (combatTooltipEl && !combatTooltipEl.hidden) positionCombatTooltip(rowEl);
  });
}

function hitTooltipHtml() {
  const dex = sheet.stats.dex;
  const lines = HIT_DICE.map((sides) => {
    const threshold = hitThreshold(sides, dex);
    return `<p class="combat-tooltip-line">D${sides} попадания: <strong>от ${sides} до ${threshold}</strong></p>`;
  }).join('');
  return `<p class="combat-tooltip-title">Пороги попадания</p>${lines}`;
}

function skillsTooltipHtml() {
  const remaining = spellsRemaining();
  const alert = remaining < 0
    ? '<p class="combat-tooltip-alert">БРО, НЕ МНОГОВАТО ЛИ У ТЕБЯ СПЕЛЛОВ?</p>'
    : '';
  return `${alert}<p class="combat-tooltip-line">Возможно изучить ещё <strong>${remaining}</strong> спелов</p>`;
}

function critTooltipHtml() {
  const luck = sheet.stats.luck;
  const lines = HIT_DICE.map((sides) => {
    const threshold = critThreshold(sides, luck);
    return `<p class="combat-tooltip-line">D${sides} крит: <strong>от ${sides} до ${threshold}</strong></p>`;
  }).join('');
  return `<p class="combat-tooltip-title">Пороги крита</p>${lines}`;
}

function syncCombatInputs() {
  document.getElementById('combat-hp').value = sheet.combat.hp;
  document.getElementById('combat-ap').value = sheet.combat.ap;
  document.getElementById('combat-mp').value = sheet.combat.mp;
}

function updateOverheal(key, current, max) {
  const wrap = document.getElementById(`combat-${key}-over-wrap`);
  const val = document.getElementById(`combat-${key}-over`);
  if (!wrap || !val) return;
  const over = overheal(current, max);
  val.textContent = over;
  wrap.hidden = over <= 0;
}

function updateCombatValues() {
  if (!sheet?.combat) return;

  const hpMax = maxHp();
  const apMax = maxAp();
  const mpMax = maxMp();

  document.getElementById('combat-hp-max').textContent = hpMax;
  document.getElementById('combat-ap-max').textContent = apMax;
  document.getElementById('combat-mp-max').textContent = mpMax;
  document.getElementById('combat-hit').textContent = sheet.stats.dex;
  document.getElementById('combat-skills').textContent = sheet.stats.int;
  document.getElementById('combat-crit').textContent = critValue(sheet.stats.luck);

  updateOverheal('hp', sheet.combat.hp, hpMax);
  updateOverheal('mp', sheet.combat.mp, mpMax);
  updateOverheal('ap', sheet.combat.ap, apMax);

  const skillsRow = document.getElementById('combat-row-skills');
  skillsRow.classList.toggle('combat-row--warning', spellsRemaining() < 0);
}

function bindCombatInputs() {
  const bind = (id, key, maxLen) => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      const clean = el.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, maxLen);
      if (clean !== el.value) {
        const atEnd = el.selectionStart === el.value.length;
        el.value = clean;
        if (atEnd) el.setSelectionRange(clean.length, clean.length);
      }
      sheet.combat[key] = parseInt(clean, 10) || 0;
      scheduleSave();
      updateCombatValues();
    });
  };

  bind('combat-hp', 'hp', 4);
  bind('combat-ap', 'ap', 3);
  bind('combat-mp', 'mp', 3);
}

function renderCombat() {
  const grid = document.getElementById('combat-grid');
  grid.innerHTML = `
    <div class="combat-row" id="combat-row-hp" data-stat-link="str">
      <span class="combat-label">HP</span>
      <div class="combat-value-combo">
        <input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" class="combat-input" id="combat-hp" aria-label="Текущие HP">
        <span class="combat-sep">/</span>
        <span class="combat-max" id="combat-hp-max" aria-label="Максимальные HP"></span>
        <span class="combat-bonus-wrap combat-overheal-wrap" id="combat-hp-over-wrap" hidden>
          <span class="combat-bonus-label">+</span>
          <span class="combat-overheal" id="combat-hp-over" title="Оверхил (текущие − макс.)" aria-label="Оверхил HP">0</span>
        </span>
      </div>
    </div>
    <div class="combat-row combat-row--hint" id="combat-row-hit" data-stat-link="dex">
      ${combatHintLabel('Попадание')}
      <span class="combat-derived" id="combat-hit"></span>
    </div>
    <div class="combat-row combat-row--hint" id="combat-row-skills" data-stat-link="int">
      ${combatHintLabel('Скиллы')}
      <span class="combat-derived" id="combat-skills"></span>
    </div>
    <div class="combat-row" id="combat-row-mp" data-stat-link="spi">
      <span class="combat-label">MP</span>
      <div class="combat-value-combo">
        <input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" class="combat-input" id="combat-mp" aria-label="Текущие MP">
        <span class="combat-sep">/</span>
        <span class="combat-max" id="combat-mp-max" aria-label="Максимальные MP"></span>
        <span class="combat-bonus-wrap combat-overheal-wrap" id="combat-mp-over-wrap" hidden>
          <span class="combat-bonus-label">+</span>
          <span class="combat-overheal" id="combat-mp-over" title="Оверхил (текущие − макс.)" aria-label="Оверхил MP">0</span>
        </span>
      </div>
    </div>
    <div class="combat-row" id="combat-row-ap" data-stat-link="end">
      <span class="combat-label">AP</span>
      <div class="combat-value-combo">
        <input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" class="combat-input" id="combat-ap" aria-label="Текущие AP">
        <span class="combat-sep">/</span>
        <span class="combat-max" id="combat-ap-max" aria-label="Максимальные AP"></span>
        <span class="combat-bonus-wrap combat-overheal-wrap" id="combat-ap-over-wrap" hidden>
          <span class="combat-bonus-label">+</span>
          <span class="combat-overheal" id="combat-ap-over" title="Оверхил (текущие − макс.)" aria-label="Оверхил AP">0</span>
        </span>
      </div>
    </div>
    <div class="combat-row combat-row--hint" id="combat-row-crit" data-stat-link="luck">
      ${combatHintLabel('Крит')}
      <span class="combat-derived" id="combat-crit"></span>
    </div>
  `;

  bindCombatInputs();
  bindCombatHint(document.getElementById('combat-row-hit'), hitTooltipHtml);
  bindCombatHint(document.getElementById('combat-row-skills'), skillsTooltipHtml);
  bindCombatHint(document.getElementById('combat-row-crit'), critTooltipHtml);
  bindStatCombatRunes();
  STAT_COMBAT_LINKS.forEach(({ stat, combatId }) => {
    const row = document.getElementById(combatId);
    if (row) row.insertAdjacentHTML('beforeend', createLinkRunesMarkup(stat, 'combat'));
  });
  syncCombatInputs();
  updateCombatValues();
}

function storageKey() {
  return `gob_character_${id}`;
}

function emptyItem() {
  return { name: '', desc: '' };
}

function uid() {
  return crypto.randomUUID?.() || `s${Date.now()}${Math.random().toString(36).slice(2, 9)}`;
}

function emptySpell() {
  return { id: uid(), name: '', desc: '', spec: 'damage', level: 1, mana: 0, icon: defaultIconForSpec('damage'), iconImage: '' };
}

function normalizeSpell(spell) {
  const s = { ...spell };
  if (!s.spec) {
    const legacy = { arcane: 'buff', dark: 'debuff', nature: 'heal', fire: 'damage', water: 'buff' };
    s.spec = legacy[s.school] || 'damage';
  }
  const icons = allIconsForSpec(s.spec);
  if (!s.icon || !icons.includes(s.icon)) s.icon = defaultIconForSpec(s.spec);
  if (s.iconImage === undefined) s.iconImage = '';
  return s;
}

function defaultSheet(char) {
  return {
    name: char.name || '',
    description: char.description || '',
    lore: char.lore || '',
    spells: [],
    stats: { str: 12, dex: 12, int: 12, spi: 12, end: 12, luck: 12 },
    combat: defaultCombat({ str: 12, dex: 12, int: 12, spi: 12, end: 12, luck: 12 }),
    equipment: Object.fromEntries(
      [...EQUIPMENT_SLOTS, ...EXTRA_SLOTS].map(s => [s.key, emptyItem()])
    ),
    backpack: Array.from({ length: BACKPACK_COUNT }, () => emptyItem()),
  };
}

function migrateSpells(data, base) {
  if (Array.isArray(data.spells)) return data.spells.map(normalizeSpell);
  if (typeof data.spells === 'string' && data.spells.trim()) {
    return [normalizeSpell({
      id: uid(),
      name: 'Записи',
      desc: data.spells,
      spec: 'buff',
      level: 1,
      mana: 0,
      icon: 'fireball',
    })];
  }
  return base.spells;
}

function spellIconHtml(spell) {
  if (spell.iconImage) {
    return `<img class="spell-icon-img" src="${spell.iconImage}" alt="" draggable="false">`;
  }
  const spec = spell.spec || 'damage';
  const icons = allIconsForSpec(spec);
  const iconId = icons.includes(spell.icon) ? spell.icon : defaultIconForSpec(spec);
  const legendaryClass = isLegendaryIcon(spec, iconId) ? ' spell-icon-img--legendary' : '';
  return `<img class="spell-icon-img${legendaryClass}" src="${iconSrc(spec, iconId)}" alt="" draggable="false">`;
}

function migrateEquipment(data, base) {
  const eq = { ...base.equipment, ...(data.equipment || {}) };

  if (eq.accessory && (!eq.ring?.name && !eq.necklace?.name)) {
    eq.ring = { ...eq.accessory };
  }
  delete eq.accessory;

  [...EQUIPMENT_SLOTS, ...EXTRA_SLOTS].forEach(({ key }) => {
    if (!eq[key]) eq[key] = emptyItem();
  });

  return eq;
}

function loadSheet(char) {
  const base = defaultSheet(char);
  try {
    const saved = localStorage.getItem(storageKey());
    if (!saved) return base;
    const data = JSON.parse(saved);
    const stats = { ...base.stats, ...data.stats };
    return {
      ...base,
      ...data,
      stats,
      combat: migrateCombat(data, stats),
      equipment: migrateEquipment(data, base),
      backpack: data.backpack?.length === BACKPACK_COUNT
        ? data.backpack
        : base.backpack,
      spells: migrateSpells(data, base),
    };
  } catch {
    return base;
  }
}

function syncUserCardCatalog() {
  if (!catalogChar?.isUser || typeof updateUserCharacterMeta !== 'function') return;
  updateUserCharacterMeta(catalogChar.id, {
    name: sheet.name ?? '',
    description: sheet.description ?? '',
  });
  catalogChar = {
    ...catalogChar,
    name: String(sheet.name ?? '').trim(),
    description: String(sheet.description ?? '').trim(),
  };
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(storageKey(), JSON.stringify(sheet));
    syncUserCardCatalog();
    const hint = document.getElementById('save-hint');
    hint.textContent = 'Сохранено';
    hint.classList.add('visible');
    setTimeout(() => hint.classList.remove('visible'), 1500);
  }, 400);
}

function bindField(el, path, onChange) {
  const get = () => {
    const parts = path.split('.');
    let v = sheet;
    for (const p of parts) v = v[p];
    return v ?? '';
  };
  const set = (val) => {
    const parts = path.split('.');
    let obj = sheet;
    for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
    obj[parts[parts.length - 1]] = val;
    scheduleSave();
    onChange?.();
  };

  el.value = get();
  el.addEventListener('input', () => set(el.value));
}

function renderStats() {
  const grid = document.getElementById('stats-grid');
  grid.innerHTML = '';
  STAT_KEYS.forEach(({ key, label }) => {
    const cell = document.createElement('div');
    cell.className = 'stat-cell';
    cell.innerHTML = `
      <span class="stat-label">${label}</span>
      <input type="number" class="stat-input" data-stat="${key}" min="0" max="999" value="${sheet.stats[key]}">
      ${createLinkRunesMarkup(key, 'stat')}
    `;
    const input = cell.querySelector('input');
    input.addEventListener('input', () => {
      sheet.stats[key] = parseInt(input.value, 10) || 0;
      scheduleSave();
      updateCombatValues();
    });
    grid.appendChild(cell);
  });
}

function createSlotButton(slotDef, slotKey, group) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'item-slot';
  btn.dataset.group = group;
  btn.dataset.slot = slotKey;

  const item = group === 'backpack'
    ? sheet.backpack[slotKey]
    : sheet.equipment[slotKey];

  if (item.name) btn.classList.add('has-item');

  btn.innerHTML = `
    <span class="slot-icon" aria-hidden="true">${slotDef.icon}</span>
    <span class="slot-label">${slotDef.label}</span>
    <span class="slot-preview">${item.name || ''}</span>
  `;

  btn.addEventListener('click', () => selectSlot(group, slotKey, slotDef.label));
  return btn;
}

function renderEquipment() {
  const grid = document.getElementById('equipment-grid');
  grid.innerHTML = '';

  EQUIPMENT_SLOTS.forEach(s => grid.appendChild(createSlotButton(s, s.key, 'equipment')));
  EXTRA_SLOTS.forEach(s => grid.appendChild(createSlotButton(s, s.key, 'equipment')));
}

function renderBackpack() {
  const container = document.getElementById('backpack-slots');
  container.innerHTML = '';
  for (let i = 0; i < BACKPACK_COUNT; i++) {
    container.appendChild(createSlotButton(
      { label: `Слот ${i + 1}`, icon: '📦' },
      i,
      'backpack'
    ));
  }
}

function getItem(group, key) {
  if (group === 'backpack') return sheet.backpack[key];
  return sheet.equipment[key];
}

function updateSlotUI(group, key) {
  const selector = group === 'backpack'
    ? `.item-slot[data-group="backpack"][data-slot="${key}"]`
    : `.item-slot[data-group="${group}"][data-slot="${key}"]`;
  const btn = document.querySelector(selector);
  if (!btn) return;

  const item = getItem(group, key);
  const preview = btn.querySelector('.slot-preview');
  preview.textContent = item.name || '';
  btn.classList.toggle('has-item', Boolean(item.name));
}

function selectSlot(group, key, label) {
  selectedSlot = { group, key };

  document.querySelectorAll('.item-slot.selected').forEach(el => el.classList.remove('selected'));
  const selector = group === 'backpack'
    ? `.item-slot[data-group="backpack"][data-slot="${key}"]`
    : `.item-slot[data-group="${group}"][data-slot="${key}"]`;
  document.querySelector(selector)?.classList.add('selected');

  const editor = document.getElementById('slot-editor');
  document.getElementById('slot-editor-title').textContent = label;

  const item = getItem(group, key);
  document.getElementById('slot-name').value = item.name;
  document.getElementById('slot-desc').value = item.desc;

  if (typeof CharMotion !== 'undefined') {
    CharMotion.openSidePanel(editor);
  } else {
    editor.hidden = false;
  }
}

function closeSlotEditor() {
  selectedSlot = null;
  document.querySelectorAll('.item-slot.selected').forEach(el => el.classList.remove('selected'));
  const editor = document.getElementById('slot-editor');

  const finish = () => {
    editor.hidden = true;
  };

  if (typeof CharMotion !== 'undefined') {
    CharMotion.closeSidePanel(editor, finish);
  } else {
    finish();
  }
}

function bindSlotEditor() {
  const nameEl = document.getElementById('slot-name');
  const descEl = document.getElementById('slot-desc');

  document.getElementById('slot-editor-close').addEventListener('click', closeSlotEditor);

  const apply = () => {
    if (!selectedSlot) return;
    const { group, key } = selectedSlot;
    const item = getItem(group, key);
    item.name = nameEl.value;
    item.desc = descEl.value;
    scheduleSave();
    updateSlotUI(group, key);
  };

  nameEl.addEventListener('input', apply);
  descEl.addEventListener('input', apply);
}

function spellbookFlipHandlers() {
  return {
    onFlip(pageIndex) {
      spreadIndex = Math.floor(pageIndex / 2);
      updatePageNav(filteredSpells().length);
    },
    onFlipping(flipping) {
      isPageTurning = flipping;
      updatePageNav(filteredSpells().length);
    },
  };
}

function scheduleSpellbookRelayout() {
  const modal = document.getElementById('spellbook-modal');
  if (!modal?.open || !spellbookFlipReady || !window.SpellbookFlip) return;

  clearTimeout(spellbookResizeTimer);
  spellbookResizeTimer = window.setTimeout(() => {
    const pages = buildSpellbookPages();
    const pf = window.SpellbookFlip.getPageFlip();
    const startPage = pf
      ? Math.min(pf.getCurrentPageIndex(), pages.length - 1)
      : Math.min(spreadIndex * 2, pages.length - 1);

    spellbookFlipReady = false;
    window.SpellbookFlip.createSpellbookFlip(spellbookFlipHandlers());
    window.SpellbookFlip.loadSpellbookPages(pages, startPage);
    spellbookFlipReady = true;
    spreadIndex = Math.floor(startPage / 2);
    updatePageNav(filteredSpells().length);
  }, 250);
}

function bindSpellbookResize() {
  if (spellbookResizeBound) return;
  spellbookResizeBound = true;
  window.addEventListener('resize', scheduleSpellbookRelayout);
  window.addEventListener('orientationchange', scheduleSpellbookRelayout);
  window.addEventListener('gobmobilechange', scheduleSpellbookRelayout);
  window.addEventListener('pagehide', () => {
    clearTimeout(spellbookResizeTimer);
    destroySpellbookInstance();
  });
}

function bindSpellbook() {
  const btn = document.getElementById('spellbook-btn');
  const modal = document.getElementById('spellbook-modal');
  const close = document.getElementById('spellbook-close');
  const createBtn = document.getElementById('spell-create-btn');

  renderSpellTabs();
  bindSpellEditor();
  bindSpellbookResize();
  bindSpellSlotDelegation(modal);

  modal.addEventListener('scroll', hideSpellTooltip, { passive: true });

  btn.addEventListener('click', () => {
    spreadIndex = 0;
    destroySpellbookInstance();
    loadSpellbookFlip();

    const mountSpellbook = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => renderSpellGrids());
      });
    };

    if (typeof CharMotion !== 'undefined') {
      CharMotion.openSpellbook(modal, mountSpellbook);
    } else {
      modal.showModal();
      mountSpellbook();
    }
  });
  close.addEventListener('click', () => closeSpellbookModal());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeSpellbookModal();
  });
  createBtn.addEventListener('click', () => openSpellEditor(null));

  document.getElementById('spell-page-prev').addEventListener('click', () => turnPage('prev'));
  document.getElementById('spell-page-next').addEventListener('click', () => turnPage('next'));
}

function formatSpellbookPageNum(pageIndex) {
  return `— ${String(pageIndex + 1).padStart(2, '0')} —`;
}

function updateSpellEditorPreview(spec, iconId) {
  const wrap = document.getElementById('spell-editor-preview-wrap');
  const art = document.getElementById('spell-editor-preview-art');
  if (!wrap || !art) return;

  const legendary = isLegendaryIcon(spec, iconId);
  wrap.className = `spell-icon-wrap spell-icon-wrap--${spec}${legendary ? ' spell-icon-wrap--legendary' : ''}`;
  art.className = `spell-icon-art spell-icon-art--${spec}`;
  art.innerHTML = `<img class="spell-icon-img${legendary ? ' spell-icon-img--legendary' : ''}" src="${iconSrc(spec, iconId)}" alt="" draggable="false">`;
}

function filteredSpells() {
  if (activeSpec === 'all') return sheet.spells;
  return sheet.spells.filter(s => s.spec === activeSpec);
}

function renderSpellTabs() {
  const nav = document.getElementById('spellbook-tabs');
  nav.innerHTML = '';
  SPELL_SPECS.forEach(({ key, icon, tabClass, label }) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = `spell-tab ${tabClass}${key === activeSpec ? ' active' : ''}`;
    tab.title = label;
    tab.textContent = icon;
    tab.addEventListener('click', () => {
      if (activeSpec === key) return;
      activeSpec = key;
      spreadIndex = 0;
      if (typeof CharMotion !== 'undefined') CharMotion.flashSpine();
      renderSpellTabs();
      renderSpellGrids();
    });
    nav.appendChild(tab);
  });
}

function createSpellSlot(spell) {
  if (!spell) {
    const empty = document.createElement('div');
    empty.className = 'spell-slot spell-slot--empty';
    empty.innerHTML = `
      <div class="spell-icon-wrap">
        <div class="spell-icon-ring"></div>
      </div>
      <span class="spell-slot-name">— пусто —</span>
    `;
    return empty;
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.dataset.spellId = spell.id;
  const legendary = isLegendaryIcon(spell.spec, spell.icon);
  btn.className = `spell-slot${legendary ? ' spell-slot--legendary' : ''}`;
  btn.innerHTML = `
    <div class="spell-icon-wrap spell-icon-wrap--${spell.spec}${legendary ? ' spell-icon-wrap--legendary' : ''}">
      <div class="spell-icon-ornament" aria-hidden="true"></div>
      <div class="spell-icon-ring">
        <div class="spell-icon-art spell-icon-art--${spell.spec}">${spellIconHtml(spell)}</div>
      </div>
      <span class="spell-mana-badge">${spell.mana}</span>
      <span class="spell-level-badge">${ROMAN[spell.level] || spell.level}</span>
    </div>
    <span class="spell-slot-name">${spell.name || 'Без названия'}</span>
  `;
  bindSpellTooltip(btn, spell);
  return btn;
}

function getSpreadSpells(index) {
  const spells = filteredSpells();
  const start = index * SPELLS_PER_SPREAD;
  return {
    left: spells.slice(start, start + SPELLS_PER_PAGE),
    right: spells.slice(start + SPELLS_PER_PAGE, start + SPELLS_PER_SPREAD),
    total: spells.length,
  };
}

function closeSpellbookModal() {
  const modal = document.getElementById('spellbook-modal');
  hideSpellTooltip();
  closeSpellEditor();
  destroySpellbookInstance();
  if (typeof CharMotion !== 'undefined') {
    CharMotion.closeSpellbook(modal);
  } else {
    modal?.close();
  }
}

function loadSpellbookFlip() {
  if (window.SpellbookFlip) return Promise.resolve(window.SpellbookFlip);
  if (!spellbookModulePromise) {
    spellbookModulePromise = import('./spellbook-bootstrap.mjs').then(() => window.SpellbookFlip);
  }
  return spellbookModulePromise;
}

function destroySpellbookInstance() {
  if (window.SpellbookFlip) {
    window.SpellbookFlip.destroySpellbookFlip();
  }
  spellbookFlipReady = false;
  isPageTurning = false;
}

function buildSpellbookPages() {
  const spells = filteredSpells();
  const totalSpreads = Math.max(1, Math.ceil(spells.length / SPELLS_PER_SPREAD));
  const pages = [];

  for (let p = 0; p < totalSpreads * 2; p++) {
    const spreadIdx = Math.floor(p / 2);
    const isLeft = p % 2 === 0;
    const start = spreadIdx * SPELLS_PER_SPREAD;
    const pageSpells = isLeft
      ? spells.slice(start, start + SPELLS_PER_PAGE)
      : spells.slice(start + SPELLS_PER_PAGE, start + SPELLS_PER_SPREAD);

    const page = document.createElement('div');
    page.className = 'spellbook-pf-page';
    page.innerHTML = `
      <div class="spellbook-page-inner${isLeft ? '' : ' spellbook-page-inner--back'}">
        <div class="spell-grid"></div>
        <span class="spellbook-page-num">${formatSpellbookPageNum(p)}</span>
      </div>
    `;
    fillSpellGrid(page.querySelector('.spell-grid'), pageSpells);
    pages.push(page);
  }

  return pages;
}

function fillSpellGrid(container, spells) {
  const el = typeof container === 'string' ? document.getElementById(container) : container;
  el.className = 'spell-grid';
  el.innerHTML = '';
  const placed = Array(SPELLS_PER_PAGE).fill(null);
  for (let i = 0; i < Math.min(spells.length, SPELLS_PER_PAGE); i++) {
    placed[SPELL_SLOT_FILL_ORDER[i]] = spells[i];
  }
  for (let i = 0; i < SPELLS_PER_PAGE; i++) {
    el.appendChild(createSpellSlot(placed[i]));
  }
}

function updatePageNav(totalSpells) {
  const prev = document.getElementById('spell-page-prev');
  const next = document.getElementById('spell-page-next');
  const indicator = document.getElementById('spell-page-indicator');
  const totalSpreads = Math.max(1, Math.ceil(totalSpells / SPELLS_PER_SPREAD));

  prev.hidden = spreadIndex <= 0;
  next.hidden = spreadIndex >= totalSpreads - 1;
  prev.disabled = isPageTurning;
  next.disabled = isPageTurning;
  indicator.textContent = totalSpreads > 1 ? `${spreadIndex + 1} / ${totalSpreads}` : '';
}

function renderSpellGrids() {
  const modal = document.getElementById('spellbook-modal');
  const mount = document.getElementById('spellbook-mount');
  if (!mount || !modal?.open) return;

  hideSpellTooltip();
  activeSpellTooltipBtn = null;

  loadSpellbookFlip().then(() => {
    if (!modal.open) return;

    const spells = filteredSpells();
    const pages = buildSpellbookPages();
    const pf = window.SpellbookFlip.getPageFlip();
    const startPage = pf
      ? Math.min(pf.getCurrentPageIndex(), pages.length - 1)
      : Math.min(spreadIndex * 2, pages.length - 1);

    if (!spellbookFlipReady) {
      window.SpellbookFlip.createSpellbookFlip(spellbookFlipHandlers());
      window.SpellbookFlip.loadSpellbookPages(pages, startPage);
      spellbookFlipReady = true;
    } else {
      window.SpellbookFlip.updateSpellbookPages(pages, startPage);
    }

    spreadIndex = Math.floor(startPage / 2);
    updatePageNav(spells.length);
  });
}

function turnPage(direction) {
  if (isPageTurning || !spellbookFlipReady) return;
  hideSpellTooltip();

  const spells = filteredSpells();
  const maxSpread = Math.max(0, Math.ceil(spells.length / SPELLS_PER_SPREAD) - 1);
  if (direction === 'next' && spreadIndex >= maxSpread) return;
  if (direction === 'prev' && spreadIndex <= 0) return;

  if (direction === 'next') window.SpellbookFlip.flipNext();
  else window.SpellbookFlip.flipPrev();
}

function renderSpecPicker(active) {
  const picker = document.getElementById('spell-spec-picker');
  picker.innerHTML = '';
  SPELL_SPECS.filter(s => s.key !== 'all').forEach(({ key, label, icon }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `spell-spec-btn spell-spec-btn--${key}${key === active ? ' selected' : ''}`;
    btn.innerHTML = `<span class="spell-spec-icon">${icon}</span><span>${label}</span>`;
    btn.addEventListener('click', () => {
      selectedSpec = key;
      renderSpecPicker(key);
      const icons = allIconsForSpec(key);
      if (!icons.includes(selectedIconId)) {
        selectedIconId = icons[0];
      }
      renderIconPicker(selectedIconId, key);
      updateSpellEditorPreview(key, selectedIconId);
    });
    picker.appendChild(btn);
  });
}

function renderIconPicker(active, spec = selectedSpec) {
  const picker = document.getElementById('spell-icon-picker');
  picker.innerHTML = '';

  const addIcons = (icons, legendary = false) => {
    icons.forEach((iconId) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `spell-icon-option${iconId === active ? ' selected' : ''}${legendary ? ' spell-icon-option--legendary' : ''}`;
      btn.title = legendary ? `Легендарное: ${iconId.replace('legend-', '')}` : iconId;
      const img = document.createElement('img');
      img.src = iconSrc(spec, iconId);
      img.alt = '';
      img.draggable = false;
      btn.appendChild(img);
      btn.addEventListener('click', () => {
        selectedIconId = iconId;
        renderIconPicker(iconId, spec);
        updateSpellEditorPreview(spec, iconId);
      });
      picker.appendChild(btn);
    });
  };

  const regular = SPELL_ICONS[spec] || SPELL_ICONS.damage;
  const legendary = SPELL_LEGENDARY_ICONS[spec] || [];

  addIcons(regular, false);

  if (legendary.length) {
    const label = document.createElement('p');
    label.className = 'spell-icon-picker-label spell-icon-picker-label--legendary';
    label.textContent = 'Легендарные';
    picker.appendChild(label);
    addIcons(legendary, true);
  }
}

function openSpellEditor(spellId) {
  hideSpellTooltip();
  editingSpellId = spellId;
  const editor = document.getElementById('spell-editor');
  const deleteBtn = document.getElementById('spell-delete-btn');

  let spell;
  if (spellId) {
    spell = sheet.spells.find(s => s.id === spellId);
    document.getElementById('spell-editor-title').textContent = 'Редактировать';
    deleteBtn.hidden = false;
  } else {
    spell = emptySpell();
    spell.spec = activeSpec !== 'all' ? activeSpec : 'damage';
    spell.icon = defaultIconForSpec(spell.spec);
    document.getElementById('spell-editor-title').textContent = 'Новое заклинание';
    deleteBtn.hidden = true;
  }

  selectedSpec = spell.spec;
  selectedIconId = allIconsForSpec(spell.spec).includes(spell.icon)
    ? spell.icon
    : defaultIconForSpec(spell.spec);

  document.getElementById('spell-name').value = spell.name;
  document.getElementById('spell-level').value = spell.level;
  document.getElementById('spell-mana').value = spell.mana;
  document.getElementById('spell-desc').value = spell.desc;
  renderSpecPicker(spell.spec);
  renderIconPicker(selectedIconId, spell.spec);
  updateSpellEditorPreview(spell.spec, selectedIconId);

  if (typeof CharMotion !== 'undefined') {
    CharMotion.openSpellEditorSlide(editor, () => document.getElementById('spell-name').focus());
  } else {
    editor.hidden = false;
    document.getElementById('spell-name').focus();
  }
}

function closeSpellEditor() {
  editingSpellId = null;
  const editor = document.getElementById('spell-editor');

  const finish = () => {
    editor.hidden = true;
  };

  if (typeof CharMotion !== 'undefined') {
    CharMotion.closeSpellEditorSlide(editor, finish);
  } else {
    finish();
  }
}

function bindSpellEditor() {
  document.getElementById('spell-editor-close').addEventListener('click', closeSpellEditor);
  document.getElementById('spell-save-btn').addEventListener('click', saveSpell);
  document.getElementById('spell-delete-btn').addEventListener('click', deleteSpell);
}

function readSpellForm() {
  const existing = editingSpellId
    ? sheet.spells.find(s => s.id === editingSpellId)
    : null;
  return {
    name: document.getElementById('spell-name').value.trim(),
    spec: selectedSpec,
    icon: selectedIconId,
    iconImage: existing?.iconImage || '',
    level: Math.min(5, Math.max(1, parseInt(document.getElementById('spell-level').value, 10) || 1)),
    mana: Math.max(0, parseInt(document.getElementById('spell-mana').value, 10) || 0),
    desc: document.getElementById('spell-desc').value,
  };
}

function saveSpell() {
  const data = readSpellForm();
  if (!data.name) {
    document.getElementById('spell-name').focus();
    return;
  }

  if (editingSpellId) {
    const spell = sheet.spells.find(s => s.id === editingSpellId);
    if (spell) Object.assign(spell, data);
  } else {
    sheet.spells.push({ id: uid(), ...data });
  }

  scheduleSave();
  closeSpellEditor();
  renderSpellGrids();
  updateCombatValues();
}

function deleteSpell() {
  if (!editingSpellId) return;
  sheet.spells = sheet.spells.filter(s => s.id !== editingSpellId);
  const total = filteredSpells().length;
  const maxSpread = Math.max(0, Math.ceil(total / SPELLS_PER_SPREAD) - 1);
  if (spreadIndex > maxSpread) spreadIndex = maxSpread;
  scheduleSave();
  closeSpellEditor();
  renderSpellGrids();
  updateCombatValues();
}

// ────────────────────────────────────────────────────────────────────────────
// TRANSFER MODULE — экспорт / импорт с GameOfBraza
// ────────────────────────────────────────────────────────────────────────────

function toInt(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function strVal(v) {
  return typeof v === 'string' ? v : '';
}

/**
 * Сериализует текущий `sheet` в нейтральный JSON-формат обмена.
 * Вызывается перед скачиванием файла или копированием в буфер.
 */
function exportToSharedFormat() {
  const s = sheet;

  const allSlots = [...EQUIPMENT_SLOTS, ...EXTRA_SLOTS];
  const equipment = Object.fromEntries(
    allSlots.map(({ key }) => [
      key,
      { name: s.equipment[key]?.name ?? '', desc: s.equipment[key]?.desc ?? '' },
    ])
  );

  const backpack = (s.backpack ?? [])
    .slice(0, 6)
    .map(item => ({ name: item?.name ?? '', desc: item?.desc ?? '' }));
  // Добить до 6 слотов на случай неполного массива
  while (backpack.length < 6) backpack.push({ name: '', desc: '' });

  return {
    schemaVersion: 1,
    source: 'GameOfBrothers',
    name: s.name ?? '',
    description: s.description ?? '',
    lore: s.lore ?? '',
    stats: {
      str:  s.stats?.str  ?? 12,
      dex:  s.stats?.dex  ?? 12,
      int:  s.stats?.int  ?? 12,
      spi:  s.stats?.spi  ?? 12,
      end:  s.stats?.end  ?? 12,
      luck: s.stats?.luck ?? 12,
    },
    combat: {
      hp:      s.combat?.hp      ?? 0,
      hpBonus: s.combat?.hpBonus ?? 0,
      ap:      s.combat?.ap      ?? 0,
      apBonus: s.combat?.apBonus ?? 0,
      mp:      s.combat?.mp      ?? 0,
      mpBonus: s.combat?.mpBonus ?? 0,
    },
    equipment,
    backpack,
    spells: (s.spells ?? []).map(sp => ({
      id:        sp.id        ?? uid(),
      name:      sp.name      ?? '',
      desc:      sp.desc      ?? '',
      spec:      sp.spec      ?? 'buff',
      level:     sp.level     ?? 1,
      mana:      sp.mana      ?? 0,
      icon:      sp.icon      ?? 'default',
      iconImage: sp.iconImage ?? '',
    })),
  };
}

/** Скачивает JSON-файл с данными персонажа. */
function downloadExportJson() {
  const data = exportToSharedFormat();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${(sheet.name || 'character').replace(/[^\wА-яЁё]/g, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Принимает JSON-строку в формате обмена и возвращает объект,
 * совместимый со структурой `sheet`.
 *
 * @param {string} jsonString
 * @returns {{ ok: true, sheet: object } | { ok: false, error: string }}
 */
function importFromSharedFormat(jsonString) {
  let raw;
  try {
    raw = JSON.parse(jsonString);
  } catch {
    return { ok: false, error: 'Невалидный JSON. Проверьте формат файла.' };
  }

  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Ожидался JSON-объект.' };
  }

  const schemaVersion = raw.schemaVersion;
  if (schemaVersion !== 1) {
    return { ok: false, error: `Неизвестная версия схемы: ${schemaVersion}. Ожидается 1.` };
  }

  // ── Характеристики ──────────────────────────────────────────────────
  const stats = {
    str:  toInt(raw.stats?.str,  12),
    dex:  toInt(raw.stats?.dex,  12),
    int:  toInt(raw.stats?.int,  12),
    spi:  toInt(raw.stats?.spi,  12),
    end:  toInt(raw.stats?.end,  12),
    luck: toInt(raw.stats?.luck, 12),
  };

  // ── Боевые показатели ───────────────────────────────────────────────
  const combat = defaultCombat(stats);
  combat.hp      = toInt(raw.combat?.hp,      combat.hp);
  combat.hpBonus = toInt(raw.combat?.hpBonus, 0);
  combat.ap      = toInt(raw.combat?.ap,      combat.ap);
  combat.apBonus = toInt(raw.combat?.apBonus, 0);
  combat.mp      = toInt(raw.combat?.mp,      combat.mp);
  combat.mpBonus = toInt(raw.combat?.mpBonus, 0);

  // ── Снаряжение ──────────────────────────────────────────────────────
  const allSlots = [...EQUIPMENT_SLOTS, ...EXTRA_SLOTS];
  const equipment = Object.fromEntries(
    allSlots.map(({ key }) => {
      const item = raw.equipment?.[key];
      return [key, { name: strVal(item?.name), desc: strVal(item?.desc) }];
    })
  );

  // ── Рюкзак ─────────────────────────────────────────────────────────
  const rawBackpack = Array.isArray(raw.backpack) ? raw.backpack : [];
  const backpack = Array.from({ length: BACKPACK_COUNT }, (_, i) => {
    const item = rawBackpack[i];
    return { name: strVal(item?.name), desc: strVal(item?.desc) };
  });

  // ── Спеллы ─────────────────────────────────────────────────────────
  const rawSpells = Array.isArray(raw.spells) ? raw.spells : [];
  const spells = rawSpells.map(s => normalizeSpell({
    id:        strVal(s?.id) || uid(),
    name:      strVal(s?.name),
    desc:      strVal(s?.desc),
    spec:      ['damage', 'buff', 'heal', 'debuff'].includes(s?.spec) ? s.spec : 'buff',
    level:     Math.min(5, Math.max(1, toInt(s?.level, 1))),
    mana:      Math.max(0, toInt(s?.mana, 0)),
    icon:      strVal(s?.icon) || 'default',
    iconImage: strVal(s?.iconImage),
  }));

  // ── Описание / квента ───────────────────────────────────────────────
  const description = strVal(raw.description);
  const lore        = strVal(raw.lore);

  return {
    ok: true,
    sheet: {
      name: strVal(raw.name) || 'Импортированный персонаж',
      description,
      lore,
      stats,
      combat,
      equipment,
      backpack,
      spells,
    },
  };
}

/**
 * Полностью пересинхронизирует UI листа с текущим объектом `sheet`.
 * Используется после импорта, когда заменяются все поля персонажа.
 */
function renderSheet() {
  document.getElementById('char-name').value = sheet.name ?? '';
  document.getElementById('char-desc').value = sheet.description ?? '';
  document.getElementById('char-lore').value = sheet.lore ?? '';
  document.title = `GoB — ${sheet.name || 'Персонаж'}`;

  closeSlotEditor();
  renderStats();
  renderCombat();
  renderEquipment();
  renderBackpack();

  spreadIndex = 0;
  renderSpellGrids();
}

function portraitErrorMessage(err) {
  if (err?.message === 'FILE_TOO_LARGE') {
    return 'Файл больше 2 МБ — выберите изображение меньше.';
  }
  if (err?.message === 'NOT_IMAGE') {
    return 'Нужен файл изображения (JPEG, PNG или WebP).';
  }
  if (err?.name === 'QuotaExceededError') {
    return 'Слишком большое фото — не хватает места в хранилище.';
  }
  return 'Не удалось обработать изображение.';
}

function initUserCharacterTools(char) {
  const portraitTools = document.getElementById('portrait-tools');

  if (!char.isUser) {
    portraitTools?.setAttribute('hidden', '');
    return;
  }

  portraitTools?.removeAttribute('hidden');
  bindPortraitTools(char);
  bindDeleteCharacter(char);
}

function bindPortraitTools(char) {
  const input = document.getElementById('char-portrait-input');
  const changeBtn = document.getElementById('char-portrait-change');
  const removeBtn = document.getElementById('char-portrait-remove');
  const errorEl = document.getElementById('char-portrait-error');
  const img = document.getElementById('char-img');

  removeBtn.hidden = !char.portrait;

  changeBtn?.addEventListener('click', () => input?.click());

  input?.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    errorEl.hidden = true;
    try {
      const dataUrl = await processPortraitFile(file);
      updateUserCharacterPortrait(char.id, dataUrl);
      catalogChar = { ...catalogChar, portrait: dataUrl };
      img.src = dataUrl;
      removeBtn.hidden = false;
      const hint = document.getElementById('save-hint');
      if (hint) {
        hint.textContent = 'Портрет сохранён';
        hint.classList.add('visible');
        setTimeout(() => hint.classList.remove('visible'), 1500);
      }
    } catch (err) {
      errorEl.textContent = portraitErrorMessage(err);
      errorEl.hidden = false;
    }
  });

  removeBtn?.addEventListener('click', () => {
    updateUserCharacterPortrait(char.id, '');
    catalogChar = { ...catalogChar, portrait: '' };
    img.src = PLACEHOLDER_PORTRAIT;
    removeBtn.hidden = true;
    errorEl.hidden = true;
  });
}

function bindDeleteCharacter(char) {
  const modal = document.getElementById('brumgilde-modal');
  const btnOpen = document.getElementById('btn-delete-char');
  const btnConfirm = document.getElementById('brumgilde-confirm');
  const btnCancel = document.getElementById('brumgilde-cancel');

  if (!modal || !btnOpen) return;

  btnOpen.removeAttribute('hidden');

  btnOpen.addEventListener('click', () => {
    if (typeof modal.showModal === 'function') modal.showModal();
  });

  btnCancel?.addEventListener('click', () => modal.close());

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });

  btnConfirm?.addEventListener('click', () => {
    deleteUserCharacter(char.id);
    modal.close();
    if (typeof GobMotion !== 'undefined') {
      GobMotion.navigateTo('/');
    } else {
      window.location.href = '/';
    }
  });
}

function initTransfer() {
  const modal        = document.getElementById('transfer-modal');
  const btnOpen      = document.getElementById('btn-transfer');
  const btnClose     = document.getElementById('btn-transfer-close');
  const btnCancel    = document.getElementById('btn-transfer-cancel');
  const panelExport  = document.getElementById('transfer-panel-export');
  const panelImport  = document.getElementById('transfer-panel-import');
  const tabs         = document.querySelectorAll('.transfer-tab');
  const exportArea   = document.getElementById('export-json');
  const importArea   = document.getElementById('import-json');
  const importError  = document.getElementById('import-error');
  const importOk     = document.getElementById('import-success');
  const fileInput    = document.getElementById('import-file-input');
  const fileInfo     = document.getElementById('import-file-info');
  const btnCopy      = document.getElementById('btn-export-copy');
  const btnDownload  = document.getElementById('btn-export-download');
  const btnFileOpen  = document.getElementById('btn-import-file');
  const btnApply     = document.getElementById('btn-import-apply');

  if (!modal || !btnOpen) return;

  // ── Открыть / закрыть ────────────────────────────────────────────────────
  btnOpen.addEventListener('click', () => {
    exportArea.value = JSON.stringify(exportToSharedFormat(), null, 2);
    modal.classList.remove('hidden');
  });

  function closeModal() {
    modal.classList.add('hidden');
    importArea.value = '';
    importError.classList.add('hidden');
    importOk.classList.add('hidden');
    fileInfo.textContent = '';
  }

  btnClose.addEventListener('click', closeModal);
  btnCancel.addEventListener('click', closeModal);
  modal.querySelector('.transfer-modal__backdrop').addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });

  // ── Переключение вкладок ─────────────────────────────────────────────────
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const isExport = tab.dataset.tab === 'export';
      panelExport.classList.toggle('hidden', !isExport);
      panelImport.classList.toggle('hidden',  isExport);
      if (isExport) exportArea.value = JSON.stringify(exportToSharedFormat(), null, 2);
    });
  });

  // ── Экспорт ──────────────────────────────────────────────────────────────
  btnCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(exportArea.value).then(() => {
      btnCopy.textContent = 'Скопировано ✓';
      setTimeout(() => { btnCopy.textContent = 'Скопировать'; }, 2000);
    }).catch(() => {
      // Фолбэк для окружений без clipboard API
      exportArea.select();
      document.execCommand('copy');
      btnCopy.textContent = 'Скопировано ✓';
      setTimeout(() => { btnCopy.textContent = 'Скопировать'; }, 2000);
    });
  });

  btnDownload.addEventListener('click', downloadExportJson);

  // ── Импорт: загрузка файла ───────────────────────────────────────────────
  btnFileOpen.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      importArea.value = ev.target.result;
      fileInfo.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      importError.classList.add('hidden');
      importOk.classList.add('hidden');
    };
    reader.readAsText(file, 'utf-8');
    fileInput.value = ''; // сбросить, чтобы можно было загрузить тот же файл повторно
  });

  // ── Импорт: применить к текущему листу ──────────────────────────────────
  btnApply.addEventListener('click', () => {
    importError.classList.add('hidden');
    importOk.classList.add('hidden');

    const result = importFromSharedFormat(importArea.value.trim());

    if (!result.ok) {
      importError.textContent = result.error;
      importError.classList.remove('hidden');
      return;
    }

    // Мёрджим в текущий sheet и сохраняем
    Object.assign(sheet, result.sheet);
    scheduleSave();
    renderSheet();

    importOk.classList.remove('hidden');
    document.getElementById('import-success-link').href = location.href;
  });
}

function init(char) {
  catalogChar = char;
  sheet = loadSheet(char);

  if (char.isUser && typeof updateUserCharacterMeta === 'function') {
    const sheetName = String(sheet.name ?? '').trim();
    const sheetDesc = String(sheet.description ?? '').trim();
    const catalogName = String(char.name ?? '').trim();
    const catalogDesc = String(char.description ?? '').trim();
    if (sheetName !== catalogName || sheetDesc !== catalogDesc) {
      updateUserCharacterMeta(char.id, { name: sheet.name ?? '', description: sheet.description ?? '' });
      catalogChar = { ...char, name: sheetName, description: sheetDesc };
    }
  }

  document.getElementById('char-img').src = typeof getPortraitUrl === 'function'
    ? getPortraitUrl(char)
    : `/characters/${char.id}.jpg`;
  document.getElementById('char-img').alt = sheet.name || char.name || 'Без имени';
  document.title = `GoB — ${sheet.name || char.name || 'Без имени'}`;

  bindField(document.getElementById('char-name'), 'name', () => {
    document.title = `GoB — ${sheet.name || 'Без имени'}`;
    document.getElementById('char-img').alt = sheet.name || 'Без имени';
  });
  bindField(document.getElementById('char-desc'), 'description');
  bindField(document.getElementById('char-lore'), 'lore');

  renderStats();
  renderCombat();
  renderEquipment();
  renderBackpack();
  bindSlotEditor();
  bindSpellbook();
  initUserCharacterTools(char);

  if (typeof CharMotion !== 'undefined') {
    CharMotion.bindBackLink();
    const runEnter = () => CharMotion.pageEnter();
    if (typeof GobMotion !== 'undefined' && GobMotion.initPageTransitionEnter) {
      GobMotion.initPageTransitionEnter({ onComplete: runEnter });
    } else {
      document.documentElement.classList.remove('page-enter-pending');
      runEnter();
    }
  } else {
    document.body.classList.add('char-motion-ready');
  }
}

if (!id) {
  document.body.innerHTML = '<p style="color:#e8c97a;text-align:center;padding:40px;font-family:Cinzel,serif">Персонаж не выбран. <a href="/" style="color:#c9a24d">Вернуться к миру</a></p>';
} else {
  findCharacterById(id)
    .then((char) => {
      if (!char) {
        document.body.innerHTML = '<p style="color:#e8c97a;text-align:center;padding:40px;font-family:Cinzel,serif">Персонаж не найден. <a href="/" style="color:#c9a24d">Вернуться к миру</a></p>';
        return;
      }
      init(char);
    });
}
