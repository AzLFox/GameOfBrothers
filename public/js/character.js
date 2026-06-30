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

function bindStatCombatRunes() {
  STAT_COMBAT_LINKS.forEach(({ stat, combatId }) => {
    const statEl = getStatCell(stat);
    const combatEl = document.getElementById(combatId);
    if (!statEl || !combatEl) return;

    const light = () => setStatCombatRuneLit(stat, true);
    const dim = (e) => {
      const next = e?.relatedTarget;
      if (statEl.contains(next) || combatEl.contains(next)) return;
      setStatCombatRuneLit(stat, false);
    };

    [statEl, combatEl].forEach((el) => {
      el.addEventListener('mouseenter', light);
      el.addEventListener('mouseleave', dim);
      el.addEventListener('focusin', light);
      el.addEventListener('focusout', dim);
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

// ===== Каталог снаряжения (классы внутри слотов + модификаторы) =====
const CATALOG = window.ItemCatalog || {
  TIER_REQ: {}, FAMILIES: {}, MODIFIERS: {}, REDUCTION_MODS: [], PLAIN_MODS: [], SLOT_CLASSES: {},
};

function equipSlotDef(key) {
  return [...EQUIPMENT_SLOTS, ...EXTRA_SLOTS].find(s => s.key === key);
}

function slotClassList(slotKey) {
  return CATALOG.SLOT_CLASSES[slotKey] || null;
}

function slotSupportsClasses(slotKey) {
  return Array.isArray(slotClassList(slotKey));
}

function findItemClass(slotKey, classId) {
  if (!classId) return null;
  return (slotClassList(slotKey) || []).find(c => c.id === classId) || null;
}

// ----- слоты рук и двуручное оружие -----
const HAND_SLOTS = ['leftHand', 'rightHand'];

function isHandSlot(slotKey) {
  return HAND_SLOTS.includes(slotKey);
}

function otherHand(slotKey) {
  return slotKey === 'leftHand' ? 'rightHand' : 'leftHand';
}

function isTwoHanded(slotKey, item) {
  const cls = findItemClass(slotKey, item?.classId);
  return Boolean(cls && cls.hands === 2);
}

function familyDef(family) {
  return CATALOG.FAMILIES[family] || null;
}

function statLabel(statKey) {
  return STAT_KEYS.find(s => s.key === statKey)?.label || statKey;
}

function tierThreshold(tier) {
  return CATALOG.TIER_REQ[tier] ?? 0;
}

function classDefaults(cls, tier) {
  return { ...(cls?.tiers?.[tier] || {}) };
}

// требование тира по управляющей характеристике семейства выполнено?
function meetsTierReq(slotKey, item) {
  const cls = findItemClass(slotKey, item?.classId);
  if (!cls) return true;
  const fam = familyDef(cls.family);
  if (!fam?.stat) return true;
  return (sheet.stats[fam.stat] || 0) >= tierThreshold(item.tier);
}

const BACKPACK_COUNT = 6;
const SPELLS_PER_PAGE = 7;
const SPELLS_PER_SPREAD = SPELLS_PER_PAGE * 2;

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
let selectedSlot = null;
let saveTimer = null;
let activeSpec = 'all';
let spreadIndex = 0;
let editingSpellId = null;
let selectedIconId = 'star';
let selectedSpec = 'damage';
let isPageTurning = false;
let spellbookFlipReady = false;
const HIT_DICE = [6, 12, 20, 60, 100];

let combatTooltipEl = null;
let combatTooltipTimer = null;
let combatTooltipVisible = false;
let spellTooltipEl = null;
let spellTooltipTimer = null;
let spellTooltipVisible = false;

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
    });
    return;
  }

  tip.hidden = true;
  tip.style.visibility = '';
  spellTooltipVisible = false;
}

function positionSpellTooltip(anchorEl) {
  const tip = spellTooltipEl;
  if (!tip) return;

  const rect = anchorEl.getBoundingClientRect();
  tip.style.left = '0';
  tip.style.top = '0';
  tip.style.visibility = 'hidden';
  tip.hidden = false;

  const tipRect = tip.getBoundingClientRect();
  let left = rect.left + rect.width / 2 - tipRect.width / 2;
  let top = rect.top - tipRect.height - 12;
  const preferBelow = top < 10;
  if (preferBelow) top = rect.bottom + 12;

  left = Math.max(10, Math.min(left, window.innerWidth - tipRect.width - 10));
  top = Math.max(10, Math.min(top, window.innerHeight - tipRect.height - 10));

  tip.classList.toggle('spell-tooltip--below', preferBelow);
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
  tip.style.visibility = 'visible';

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

function bindSpellTooltip(btn, spell) {
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

// суммирует плоские (flat) модификаторы со всех надетых предметов
function sumEquipmentMods() {
  const sums = {};
  Object.values(sheet.equipment || {}).forEach((item) => {
    if (!item || !item.classId || !item.mods) return;
    if (item.mirror) return; // зеркало двуручного оружия — не считаем дважды
    Object.entries(item.mods).forEach(([key, val]) => {
      const def = CATALOG.MODIFIERS[key];
      if (!def || def.type !== 'flat') return;
      sums[key] = (sums[key] || 0) + (parseInt(val, 10) || 0);
    });
  });
  return sums;
}

function maxHp() {
  return sheet.stats.str * 4 + (sumEquipmentMods().hpBonus || 0);
}

function effectiveHit() {
  return sheet.stats.dex + (sumEquipmentMods().hit || 0);
}

function effectiveCrit() {
  return critValue(sheet.stats.luck) + (sumEquipmentMods().critDie || 0);
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
  }
  return combatTooltipEl;
}

function hideCombatTooltip() {
  if (combatTooltipTimer) {
    clearTimeout(combatTooltipTimer);
    combatTooltipTimer = null;
  }
  const tip = ensureCombatTooltip();
  if (!tip || tip.hidden) return;

  if (combatTooltipVisible && typeof CharMotion !== 'undefined') {
    CharMotion.fadeTooltipOut(tip, () => {
      tip.hidden = true;
      tip.style.visibility = '';
      combatTooltipVisible = false;
    });
    return;
  }

  tip.hidden = true;
  tip.style.visibility = '';
  combatTooltipVisible = false;
}

function positionCombatTooltip(anchorEl) {
  const tip = combatTooltipEl;
  if (!tip) return;

  const rect = anchorEl.getBoundingClientRect();
  tip.style.left = '0';
  tip.style.top = '0';
  tip.style.visibility = 'hidden';
  tip.hidden = false;

  const tipRect = tip.getBoundingClientRect();
  let left = rect.left + rect.width / 2 - tipRect.width / 2;
  let top = rect.top - tipRect.height - 12;
  const preferBelow = top < 10;
  if (preferBelow) top = rect.bottom + 12;

  left = Math.max(10, Math.min(left, window.innerWidth - tipRect.width - 10));
  top = Math.max(10, Math.min(top, window.innerHeight - tipRect.height - 10));

  tip.classList.toggle('combat-tooltip--below', preferBelow);
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
  tip.style.visibility = 'visible';

  if (!combatTooltipVisible && typeof CharMotion !== 'undefined') {
    CharMotion.fadeTooltipIn(tip);
    combatTooltipVisible = true;
  }
}

function showCombatTooltip(html, anchorEl) {
  const tip = ensureCombatTooltip();
  if (!tip) return;
  tip.innerHTML = html;
  positionCombatTooltip(anchorEl);
}

function bindCombatHint(rowEl, getHtml) {
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
  const hit = effectiveHit();
  const lines = HIT_DICE.map((sides) => {
    const threshold = hitThreshold(sides, hit);
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
  const crit = effectiveCrit();
  const lines = HIT_DICE.map((sides) => {
    const threshold = Math.max(2, sides - crit);
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

function formatModValue(key, val) {
  if (CATALOG.PLAIN_MODS.includes(key)) return `${val}`;
  if (CATALOG.REDUCTION_MODS.includes(key)) return `−${val}`;
  return `+${val}`;
}

// строки боевой панели, возникающие только при надевании снаряжения
function renderExtraCombatRows(mods) {
  const host = document.getElementById('combat-extra-rows');
  if (!host) return;
  host.innerHTML = '';
  Object.entries(CATALOG.MODIFIERS).forEach(([key, def]) => {
    if (def.combat !== 'row') return;
    const val = mods[key] || 0;
    if (!val) return;
    const row = document.createElement('div');
    row.className = 'combat-row combat-row--equip';
    row.innerHTML = `
      <span class="combat-label">${def.label}</span>
      <span class="combat-derived">${formatModValue(key, val)}</span>
    `;
    host.appendChild(row);
  });
}

function updateCombatValues() {
  if (!sheet?.combat) return;

  const mods = sumEquipmentMods();
  const hpMax = sheet.stats.str * 4 + (mods.hpBonus || 0);
  const apMax = maxAp();
  const mpMax = maxMp();

  document.getElementById('combat-hp-max').textContent = hpMax;
  document.getElementById('combat-ap-max').textContent = apMax;
  document.getElementById('combat-mp-max').textContent = mpMax;
  document.getElementById('combat-hit').textContent = sheet.stats.dex + (mods.hit || 0);
  document.getElementById('combat-skills').textContent = sheet.stats.int;
  document.getElementById('combat-crit').textContent = critValue(sheet.stats.luck) + (mods.critDie || 0);

  updateOverheal('hp', sheet.combat.hp, hpMax);
  updateOverheal('mp', sheet.combat.mp, mpMax);
  updateOverheal('ap', sheet.combat.ap, apMax);

  renderExtraCombatRows(mods);

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
      <span class="combat-label">Попадание</span>
      <span class="combat-derived" id="combat-hit"></span>
    </div>
    <div class="combat-row combat-row--hint" id="combat-row-skills" data-stat-link="int">
      <span class="combat-label">Скиллы</span>
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
      <span class="combat-label">Крит</span>
      <span class="combat-derived" id="combat-crit"></span>
    </div>
    <div class="combat-extra-rows" id="combat-extra-rows"></div>
  `;

  bindCombatInputs();
  bindCombatHint(document.getElementById('combat-row-hit'), hitTooltipHtml);
  bindCombatHint(document.getElementById('combat-row-skills'), skillsTooltipHtml);
  bindCombatHint(document.getElementById('combat-row-crit'), critTooltipHtml);
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
  return { name: '', desc: '', classId: null, tier: 1, mods: {} };
}

// копия предмета без служебного флага зеркала (его выставляет вызывающий)
function cloneItem(item) {
  return {
    name: item.name || '',
    desc: item.desc || '',
    classId: item.classId ?? null,
    tier: Number.isFinite(item.tier) ? item.tier : 1,
    mods: { ...(item.mods || {}) },
  };
}

function normalizeItem(item) {
  const out = cloneItem(item);
  if (item.mirror) out.mirror = true;
  return out;
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
    eq[key] = eq[key] ? normalizeItem(eq[key]) : emptyItem();
  });

  // двуручное оружие из старых сохранений отражаем во вторую руку, если она пуста
  HAND_SLOTS.forEach((key) => {
    const item = eq[key];
    if (!item || item.mirror || !isTwoHanded(key, item)) return;
    const other = otherHand(key);
    const otherItem = eq[other];
    const otherEmpty = otherItem && !otherItem.classId && !otherItem.name;
    if (otherEmpty) {
      eq[other] = { ...cloneItem(item), mirror: true };
    }
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

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(storageKey(), JSON.stringify(sheet));
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
      updateSlotWarnings();
      if (selectedSlot?.group === 'equipment' && slotSupportsClasses(selectedSlot.key)) {
        renderReqHint(selectedSlot.key);
      }
    });
    grid.appendChild(cell);
  });
}

function paintSlotButton(btn, slotDef, slotKey, group) {
  const item = group === 'backpack' ? sheet.backpack[slotKey] : sheet.equipment[slotKey];
  const cls = group === 'equipment' ? findItemClass(slotKey, item.classId) : null;
  const fam = cls ? familyDef(cls.family) : null;

  btn.classList.toggle('has-item', Boolean(item.name || cls));
  btn.classList.toggle('item-slot--warning', Boolean(cls && !meetsTierReq(slotKey, item)));
  btn.classList.toggle('item-slot--two-handed', Boolean(cls && cls.hands === 2));

  const previewText = item.name || (cls ? cls.label : '');
  const badge = fam ? `<span class="slot-family-badge" title="${escapeHtml(fam.label)}">${fam.icon}</span>` : '';
  const tierBadge = cls ? `<span class="slot-tier-badge">Т${item.tier}</span>` : '';
  const twoHandedBadge = cls && cls.hands === 2
    ? `<span class="slot-twohand-badge" title="Двуручное оружие — занимает обе руки">⚔</span>`
    : '';

  btn.innerHTML = `
    ${badge}
    ${tierBadge}
    ${twoHandedBadge}
    <span class="slot-icon" aria-hidden="true">${slotDef.icon}</span>
    <span class="slot-label">${slotDef.label}</span>
    <span class="slot-preview">${escapeHtml(previewText)}</span>
  `;
}

function createSlotButton(slotDef, slotKey, group) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'item-slot';
  btn.dataset.group = group;
  btn.dataset.slot = slotKey;
  paintSlotButton(btn, slotDef, slotKey, group);
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
  const btn = document.querySelector(`.item-slot[data-group="${group}"][data-slot="${key}"]`);
  if (!btn) return;
  const slotDef = group === 'backpack'
    ? { label: `Слот ${Number(key) + 1}`, icon: '📦' }
    : equipSlotDef(key);
  paintSlotButton(btn, slotDef, key, group);
}

// при изменении характеристик пересматриваем индикацию требований тира
function updateSlotWarnings() {
  [...EQUIPMENT_SLOTS, ...EXTRA_SLOTS].forEach(({ key }) => {
    if (!slotSupportsClasses(key)) return;
    const btn = document.querySelector(`.item-slot[data-group="equipment"][data-slot="${key}"]`);
    if (!btn) return;
    const item = sheet.equipment[key];
    const cls = findItemClass(key, item.classId);
    btn.classList.toggle('item-slot--warning', Boolean(cls && !meetsTierReq(key, item)));
  });
}

function selectSlot(group, key, label) {
  selectedSlot = { group, key };

  document.querySelectorAll('.item-slot.selected').forEach(el => el.classList.remove('selected'));
  document.querySelector(`.item-slot[data-group="${group}"][data-slot="${key}"]`)?.classList.add('selected');

  const editor = document.getElementById('slot-editor');
  document.getElementById('slot-editor-title').textContent = label;

  const item = getItem(group, key);
  document.getElementById('slot-name').value = item.name;
  document.getElementById('slot-desc').value = item.desc;

  renderClassSection(group, key);

  editor.querySelector('.slot-editor-body')?.scrollTo(0, 0);

  if (typeof CharMotion !== 'undefined') {
    CharMotion.openSidePanel(editor);
  } else {
    editor.hidden = false;
  }
}

// ===== Редактор слота: класс / тир / модификаторы =====
function renderClassSection(group, key) {
  const section = document.getElementById('slot-class-section');
  if (group !== 'equipment' || !slotSupportsClasses(key)) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  renderClassPicker(key);
  renderTierPicker(key);
  renderModFields(key);
  renderReqHint(key);
}

function renderClassPicker(slotKey) {
  const picker = document.getElementById('slot-class-picker');
  const item = sheet.equipment[slotKey];
  picker.innerHTML = '';

  const select = document.createElement('select');
  select.className = 'slot-class-select';
  select.setAttribute('aria-label', 'Класс снаряжения');

  const none = document.createElement('option');
  none.value = '';
  none.textContent = '— Без класса';
  if (!item.classId) none.selected = true;
  select.appendChild(none);

  (slotClassList(slotKey) || []).forEach((cls) => {
    const fam = familyDef(cls.family);
    const opt = document.createElement('option');
    opt.value = cls.id;
    const icon = fam?.icon ? `${fam.icon} ` : '';
    opt.textContent = `${icon}${cls.label}`;
    opt.title = fam ? `Семейство: ${fam.label}${cls.hands ? ` · ${cls.hands}р` : ''}` : cls.label;
    if (item.classId === cls.id) opt.selected = true;
    select.appendChild(opt);
  });

  select.addEventListener('change', () => setItemClass(slotKey, select.value || null));
  picker.appendChild(select);
}

function renderTierPicker(slotKey) {
  const picker = document.getElementById('slot-tier-picker');
  const item = sheet.equipment[slotKey];
  picker.innerHTML = '';
  [1, 2, 3, 4].forEach((tier) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `slot-tier-btn${item.tier === tier ? ' selected' : ''}`;
    btn.textContent = `Т${tier}`;
    btn.disabled = !item.classId;
    btn.addEventListener('click', () => setItemTier(slotKey, tier));
    picker.appendChild(btn);
  });
}

function renderModFields(slotKey) {
  const host = document.getElementById('slot-mods');
  const item = sheet.equipment[slotKey];
  host.innerHTML = '';
  const cls = findItemClass(slotKey, item.classId);
  if (!cls) return;

  cls.mods.forEach((modKey) => {
    const def = CATALOG.MODIFIERS[modKey];
    if (!def) return;
    const id = `slot-mod-${modKey}`;
    const cur = item.mods[modKey];
    const row = document.createElement('div');
    row.className = 'slot-mod-field';

    let control;
    if (def.type === 'flag') {
      control = `<input type="checkbox" id="${id}" ${cur ? 'checked' : ''}>`;
    } else if (def.type === 'dice') {
      control = `<input type="text" id="${id}" class="slot-mod-input" value="${escapeHtml(cur ?? '')}" spellcheck="false">`;
    } else {
      control = `<input type="number" id="${id}" class="slot-mod-input" value="${cur ?? 0}">`;
    }
    row.innerHTML = `<label class="slot-mod-label" for="${id}">${def.label}</label>${control}`;
    host.appendChild(row);

    const input = row.querySelector('input');
    input.addEventListener('input', () => {
      if (def.type === 'flag') item.mods[modKey] = input.checked;
      else if (def.type === 'dice') item.mods[modKey] = input.value;
      else item.mods[modKey] = parseInt(input.value, 10) || 0;
      reconcileHands(slotKey);
      scheduleSave();
      updateSlotUI('equipment', slotKey);
      updateCombatValues();
    });
  });

  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'slot-mod-reset';
  reset.textContent = 'Сбросить к тиру';
  reset.addEventListener('click', () => {
    item.mods = classDefaults(cls, item.tier);
    reconcileHands(slotKey);
    scheduleSave();
    renderModFields(slotKey);
    updateSlotUI('equipment', slotKey);
    updateCombatValues();
  });
  host.appendChild(reset);
}

function renderReqHint(slotKey) {
  const hint = document.getElementById('slot-req-hint');
  const item = sheet.equipment[slotKey];
  const cls = findItemClass(slotKey, item.classId);
  if (!cls) { hint.hidden = true; return; }
  const fam = familyDef(cls.family);
  const need = tierThreshold(item.tier);
  const have = sheet.stats[fam.stat] || 0;
  hint.hidden = false;
  hint.classList.toggle('slot-req-hint--warn', have < need);
  hint.textContent = `Требуется ${statLabel(fam.stat)} ≥ ${need} (есть ${have})`;
}

// Синхронизирует обе руки: двуручное оружие отражается во вторую руку,
// одноручное/пустой слот распускают связку. Активный слот — владелец предмета.
function reconcileHands(activeKey) {
  if (!isHandSlot(activeKey)) return;
  const other = otherHand(activeKey);
  const item = sheet.equipment[activeKey];
  if (item) delete item.mirror; // тот слот, что редактируют, всегда владелец
  if (isTwoHanded(activeKey, item)) {
    const mirror = cloneItem(item);
    mirror.mirror = true;
    sheet.equipment[other] = mirror;
  } else {
    const otherItem = sheet.equipment[other];
    // освобождаем вторую руку, если её занимало то же двуручное оружие
    if (otherItem && (otherItem.mirror || isTwoHanded(other, otherItem))) {
      sheet.equipment[other] = emptyItem();
    }
  }
  updateSlotUI('equipment', other);
}

function setItemClass(slotKey, classId) {
  const item = sheet.equipment[slotKey];
  if (classId === item.classId) return;
  item.classId = classId;
  item.mods = classId ? classDefaults(findItemClass(slotKey, classId), item.tier) : {};
  reconcileHands(slotKey);
  scheduleSave();
  renderClassSection('equipment', slotKey);
  updateSlotUI('equipment', slotKey);
  updateCombatValues();
}

function setItemTier(slotKey, tier) {
  const item = sheet.equipment[slotKey];
  if (!item.classId || item.tier === tier) return;
  item.tier = tier;
  item.mods = classDefaults(findItemClass(slotKey, item.classId), tier);
  reconcileHands(slotKey);
  scheduleSave();
  renderClassSection('equipment', slotKey);
  updateSlotUI('equipment', slotKey);
  updateCombatValues();
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
    if (group === 'equipment') reconcileHands(key);
    scheduleSave();
    updateSlotUI(group, key);
  };

  nameEl.addEventListener('input', apply);
  descEl.addEventListener('input', apply);
}

function bindSpellbook() {
  const btn = document.getElementById('spellbook-btn');
  const modal = document.getElementById('spellbook-modal');
  const close = document.getElementById('spellbook-close');
  const createBtn = document.getElementById('spell-create-btn');

  renderSpellTabs();
  bindSpellEditor();

  modal.addEventListener('scroll', hideSpellTooltip, { passive: true });

  btn.addEventListener('click', () => {
    spreadIndex = 0;
    destroySpellbookInstance();

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
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    hideSpellTooltip();
    openSpellEditor(spell.id);
  });
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
  for (let i = 0; i < SPELLS_PER_PAGE; i++) {
    el.appendChild(createSpellSlot(spells[i]));
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
  if (!mount || !window.SpellbookFlip || !modal?.open) return;

  const spells = filteredSpells();
  const pages = buildSpellbookPages();
  const pf = window.SpellbookFlip.getPageFlip();
  const startPage = pf
    ? Math.min(pf.getCurrentPageIndex(), pages.length - 1)
    : Math.min(spreadIndex * 2, pages.length - 1);

  if (!spellbookFlipReady) {
    window.SpellbookFlip.createSpellbookFlip({
      onFlip(pageIndex) {
        spreadIndex = Math.floor(pageIndex / 2);
        updatePageNav(filteredSpells().length);
      },
      onFlipping(flipping) {
        isPageTurning = flipping;
        updatePageNav(filteredSpells().length);
      },
    });
    window.SpellbookFlip.loadSpellbookPages(pages, startPage);
    spellbookFlipReady = true;
  } else {
    window.SpellbookFlip.updateSpellbookPages(pages, startPage);
  }

  spreadIndex = Math.floor(startPage / 2);
  updatePageNav(spells.length);
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

function init(char) {
  sheet = loadSheet(char);

  document.getElementById('char-img').src = `/characters/${char.id}.jpg`;
  document.getElementById('char-img').alt = char.name;
  document.title = `GoB — ${sheet.name || char.name}`;

  bindField(document.getElementById('char-name'), 'name', () => {
    document.title = `GoB — ${sheet.name}`;
  });
  bindField(document.getElementById('char-desc'), 'description');
  bindField(document.getElementById('char-lore'), 'lore');

  renderStats();
  renderCombat();
  bindStatCombatRunes();
  renderEquipment();
  renderBackpack();
  bindSlotEditor();
  bindSpellbook();

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
  fetch('/api/characters')
    .then(r => r.json())
    .then(data => {
      const char = data.find(x => x.id === id);
      if (!char) {
        document.body.innerHTML = '<p style="color:#e8c97a;text-align:center;padding:40px;font-family:Cinzel,serif">Персонаж не найден. <a href="/" style="color:#c9a24d">Вернуться к миру</a></p>';
        return;
      }
      init(char);
    });
}
