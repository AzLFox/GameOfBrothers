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
  const cell = getStatCell(statKey);
  cell?.classList.toggle('is-rune-lit', lit);
  StatTierFrame?.refreshDimmed?.(cell);
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
  } else if (!fromCombatRow) {
    const statEl = getStatCell(stat);
    if (statEl) {
      activeCombatHintRow = statEl;
      showCombatTooltip(statTooltipHtml(stat), statEl);
    }
  }
}

function bindStatCombatRunes() {
  if (!statCombatRunesBound) {
    statCombatRunesBound = true;

    if (isTouchRuneMode()) {
      STAT_COMBAT_LINKS.forEach(({ stat, combatId }) => {
        const statEl = getStatCell(stat);
        const combatEl = document.getElementById(combatId);
        if (statEl) statEl.addEventListener('click', (e) => handleTouchRuneTap(e, stat, combatId, false));
        // тап по самой боевой строке показывает подсказку так же, как ховер на десктопе,
        // не мешая раскрытию источников (setupCombatRowExpand висит на том же элементе)
        if (combatEl) combatEl.addEventListener('click', (e) => handleTouchRuneTap(e, stat, combatId, true));
      });

      document.addEventListener('click', (e) => {
        if (e.target.closest('.stat-cell, .combat-row')) return;
        clearAllRuneLit();
      });
    }
  }

  // клик по боевой строке разворачивает её (setupCombatRowExpand), а ховер
  // (десктоп) подсвечивает руны на связанной паре «характеристика ↔ строка»
  // в обе стороны — как при наведении на ячейку, так и на боевую строку.
  if (isTouchRuneMode()) return;

  STAT_COMBAT_LINKS.forEach(({ stat, combatId }) => {
    const statEl = getStatCell(stat);
    const combatEl = document.getElementById(combatId);
    if (!statEl || !combatEl) return;

    const light = () => setStatCombatRuneLit(stat, true);
    const dim = (e) => {
      const next = e?.relatedTarget;
      if (statEl.contains(next) || combatEl.contains(next)) return;
      if (expandedStat === stat) return; // не гасим подсветку раскрытой строки
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

// ===== Классы характеристик =====
// При достижении порогов 6/9/12/20 характеристика получает «класс» (тир 1..4).
// Каждый достигнутый тир даёт редактируемое классовое поле, вклад которого
// вливается в боёвку. Источники и величины видны/правятся в развёртке строки.
const STAT_CLASS_THRESHOLDS = [6, 9, 12, 20];
const STAT_CLASS_MAX_TIER = STAT_CLASS_THRESHOLDS.length; // 4

function statClassTier(value) {
  let tier = 0;
  for (const th of STAT_CLASS_THRESHOLDS) if ((value || 0) >= th) tier++;
  return tier; // 0..4
}

// все характеристики имеют по 4 редактируемых классовых поля (по тиру).
// Дефолт поля: Сила/Ловкость/Выносливость — 0 (число с кубика),
// Дух/Интеллект/Удача — 1 (сохраняет прежнее поведение «+1 за тир»).
const STAT_CLASS_KEYS = ['str', 'dex', 'int', 'spi', 'end', 'luck'];
const STAT_CLASS_DEFAULT = { str: 0, dex: 0, end: 0, spi: 1, int: 1, luck: 1 };
const STAT_CLASS_LABEL = {
  str: 'Класс силы', dex: 'Класс ловкости', int: 'Класс интеллекта',
  spi: 'Класс духа', end: 'Класс выносливости', luck: 'Класс удачи',
};
// связь строки-агрегата боёвки с характеристикой, чей класс в неё вливается
const CLASS_ROW_STAT = { evasion: 'dex', armor: 'end', bubble: 'spi' };

// сумма видимых (по достигнутым тирам) значений классовых полей характеристики
function statClassDiceSum(statKey) {
  const tier = statClassTier(sheet.stats[statKey] || 0);
  const arr = sheet.statClass?.[statKey] || [];
  let sum = 0;
  for (let i = 0; i < tier; i++) sum += parseInt(arr[i], 10) || 0;
  return sum;
}

function strClassHp()      { return statClassDiceSum('str'); }
function dexClassEvasion() { return statClassDiceSum('dex'); }
function endClassArmor()   { return statClassDiceSum('end'); }
function spiClassBubble()  { return statClassDiceSum('spi'); }  // баблы от класса Духа
function luckClassCrit()   { return statClassDiceSum('luck'); } // крит от класса Удачи
function intClassSkills()  { return statClassDiceSum('int'); }  // скиллы от класса Интеллекта

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

/** На мобильных PageFlip показывает по одной физической странице за раз,
 *  поэтому шаг навигации — 1 страница, а не разворот из двух. */
function spellbookPageStep() {
  return (typeof GobMobile !== 'undefined' && GobMobile.isMobile()) ? 1 : 2;
}

function spellbookTotalPages(totalSpells) {
  const totalSpreads = Math.max(1, Math.ceil(totalSpells / SPELLS_PER_SPREAD));
  return totalSpreads * 2;
}

function spellbookTotalSteps(totalSpells) {
  return Math.ceil(spellbookTotalPages(totalSpells) / spellbookPageStep());
}
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
// какую коллекцию заклинаний показывает книга: основную или классовую (Интеллект)
let spellCollection = 'main'; // 'main' | 'classInt'
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
  return id ? activeSpellList().find((s) => s.id === id) : null;
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
      <span>${spell.ap} AP</span>
      <span>${spell.hp} HP</span>
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
    // ручной счётчик бабла (проценты/попытки пробить) и его вкл/выкл состояние
    bubbleCounter: 0,
    bubbleActive: true,
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
    bubbleCounter: Number.isFinite(c.bubbleCounter) ? c.bubbleCounter : base.bubbleCounter,
    bubbleActive: typeof c.bubbleActive === 'boolean' ? c.bubbleActive : base.bubbleActive,
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
  return sheet.stats.str * 4 + (sumEquipmentMods().hpBonus || 0) + strClassHp()
    + customSourcesSum('combat-row-hp');
}

function effectiveHit() {
  return sheet.stats.dex + (sumEquipmentMods().hit || 0) + customSourcesSum('combat-row-hit');
}

function effectiveCrit() {
  return critValue(sheet.stats.luck) + luckClassCrit() + customSourcesSum('combat-row-crit');
}

function maxAp() {
  return sheet.stats.end + customSourcesSum('combat-row-ap');
}

function maxMp() {
  return sheet.stats.spi + customSourcesSum('combat-row-mp');
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
  // повышенный лимит (int + тир класса) минус изученные в книге и классовые спеллы
  return sheet.stats.int + intClassSkills()
    - sheet.spells.length - (sheet.classSkills?.int?.length || 0);
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

function advantageTag(sides, value) {
  return sides <= value ? ' <span class="combat-tooltip-advantage">(Преимущество)</span>' : '';
}

function hitTooltipHtml() {
  const hit = effectiveHit();
  const lines = HIT_DICE.map((sides) => {
    const threshold = hitThreshold(sides, hit);
    return `<p class="combat-tooltip-line">D${sides} попадания: <strong>от ${sides} до ${threshold}</strong>${advantageTag(sides, hit)}</p>`;
  }).join('');
  return `<p class="combat-tooltip-title">Пороги попадания</p>${lines}`;
}

function statTooltipHtml(statKey) {
  const value = sheet.stats[statKey] || 0;
  const lines = HIT_DICE.map((sides) => {
    const max = Math.min(sides, value);
    const body = value > 0 ? `от 1 до ${max}` : 'нет успешных значений';
    return `<p class="combat-tooltip-line">D${sides}: <strong>${body}</strong>${advantageTag(sides, value)}</p>`;
  }).join('');
  return `<p class="combat-tooltip-title">Пороги проверки</p>${lines}`;
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
    return `<p class="combat-tooltip-line">D${sides} крит: <strong>от ${sides} до ${threshold}</strong>${advantageTag(sides, crit)}</p>`;
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

// Строки-агрегаты боевой панели. Уворот/Защита/Баблы появляются, как только
// связанная характеристика достигла 6 (тир ≥ 1) — даже при суммарном 0.
// Прочие (Скрытность, Сопрот. и т.п.) — только при наличии снаряжения-источника.
function extraRowVisible(key) {
  const stat = CLASS_ROW_STAT[key] || null;
  const hasClass = stat && statClassTier(sheet.stats[stat] || 0) >= 1;
  return Boolean(hasClass) || equipmentModSources(key).length > 0
    || customRowSources(`combat-row-${key}`).length > 0;
}

function renderExtraCombatRows(mods) {
  const host = document.getElementById('combat-extra-rows');
  if (!host) return;
  host.innerHTML = '';
  Object.entries(CATALOG.MODIFIERS).forEach(([key, def]) => {
    if (def.combat !== 'row') return;
    if (!extraRowVisible(key)) return;
    const val = mods[key] || 0;
    if (key === 'bubble') {
      const bubbleRow = buildBubbleRow(def, val);
      host.appendChild(bubbleRow);
      setupCombatRowExpand(bubbleRow);
      return;
    }
    const row = document.createElement('div');
    row.className = 'combat-row combat-row--equip';
    row.id = `combat-row-${key}`;
    row.innerHTML = `
      <span class="combat-label">${def.label}</span>
      <span class="combat-derived">${formatModValue(key, val)}</span>
    `;
    host.appendChild(row);
    setupCombatRowExpand(row);
  });
  refreshExpandedRow();
}

// обновляет только числа-итоги строк-агрегатов, не пересобирая их (сохраняет фокус)
function updateExtraRowTotals(mods) {
  Object.entries(CATALOG.MODIFIERS).forEach(([key, def]) => {
    if (def.combat !== 'row') return;
    const row = document.getElementById(`combat-row-${key}`);
    if (!row) return;
    const val = mods[key] || 0;
    if (key === 'bubble') {
      const unitsEl = row.querySelector('.bubble-units .combat-derived');
      const hintEl = row.querySelector('.bubble-unit-hint');
      if (unitsEl) unitsEl.textContent = val;
      if (hintEl) hintEl.textContent = `${val * 10}%`;
      return;
    }
    const derived = row.querySelector(':scope > .combat-derived');
    if (derived) derived.textContent = formatModValue(key, val);
  });
}

// Бабл-строка: показывает количество единиц (каждая = 10% шанс, что бабл
// останется — бросок делается в игре), редактируемый счётчик процентов/попыток
// и переключатель состояния (активен — один цвет, выключен — другой).
function buildBubbleRow(def, units) {
  const active = sheet.combat.bubbleActive !== false;
  const row = document.createElement('div');
  row.className = 'combat-row combat-row--equip combat-row--bubble';
  row.id = 'combat-row-bubble';
  row.classList.toggle('is-bubble-active', active);
  row.innerHTML = `
    <span class="combat-label">${def.label}</span>
    <div class="combat-value-combo bubble-combo">
      <span class="bubble-units" title="Единицы бабла: каждая даёт 10% шанс, что бабл останется (бросок в игре)">
        <span class="combat-derived">${units}</span>
        <span class="bubble-unit-hint">${units * 10}%</span>
      </span>
      <input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3"
             class="combat-input bubble-counter" id="combat-bubble-counter"
             aria-label="Счётчик бабла"
             title="Текущие проценты / попытки пробить бабл">
      <button type="button" class="bubble-toggle" id="combat-bubble-toggle"
              aria-pressed="${active}" title="Переключить состояние бабла">
        ${active ? 'Активен' : 'Выключен'}
      </button>
    </div>
  `;

  const counter = row.querySelector('#combat-bubble-counter');
  counter.value = sheet.combat.bubbleCounter || 0;
  counter.addEventListener('input', () => {
    const clean = counter.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 3);
    if (clean !== counter.value) {
      const atEnd = counter.selectionStart === counter.value.length;
      counter.value = clean;
      if (atEnd) counter.setSelectionRange(clean.length, clean.length);
    }
    sheet.combat.bubbleCounter = parseInt(clean, 10) || 0;
    scheduleSave();
  });

  const toggle = row.querySelector('#combat-bubble-toggle');
  toggle.addEventListener('click', () => {
    const next = sheet.combat.bubbleActive === false;
    sheet.combat.bubbleActive = next;
    row.classList.toggle('is-bubble-active', next);
    toggle.setAttribute('aria-pressed', String(next));
    toggle.textContent = next ? 'Активен' : 'Выключен';
    scheduleSave();
  });

  return row;
}

// rebuildExtra=false — правка значения в развёртке: обновляем итоги строк на месте,
// не пересобирая DOM (иначе фокус в поле ввода теряется).
function updateCombatValues(opts = {}) {
  if (!sheet?.combat) return;
  const { rebuildExtra = true } = opts;

  const mods = sumEquipmentMods();
  // классовые вклады вливаются в те же строки, что и снаряжение — строки
  // Уворот/Защита/Баблы появятся даже без надетых предметов
  mods.evasion = (mods.evasion || 0) + dexClassEvasion();
  mods.armor   = (mods.armor   || 0) + endClassArmor();
  mods.bubble  = (mods.bubble  || 0) + spiClassBubble();
  // пользовательские источники вливаются в те же строки-агрегаты снаряжения/классов
  // (базовые строки hp/hit/skills/mp/ap/crit учитываются отдельно ниже)
  const BASE_COMBAT_ROWS = new Set(['combat-row-hp', 'combat-row-hit', 'combat-row-skills', 'combat-row-mp', 'combat-row-ap', 'combat-row-crit']);
  Object.keys(sheet.combatCustom || {}).forEach((rowId) => {
    if (BASE_COMBAT_ROWS.has(rowId)) return;
    const modKey = rowId.replace('combat-row-', '');
    mods[modKey] = (mods[modKey] || 0) + customSourcesSum(rowId);
  });

  const hpMax = sheet.stats.str * 4 + (mods.hpBonus || 0) + strClassHp() + customSourcesSum('combat-row-hp');
  const apMax = maxAp();
  const mpMax = maxMp();

  document.getElementById('combat-hp-max').textContent = hpMax;
  document.getElementById('combat-ap-max').textContent = apMax;
  document.getElementById('combat-mp-max').textContent = mpMax;
  document.getElementById('combat-hit').textContent = sheet.stats.dex + (mods.hit || 0) + customSourcesSum('combat-row-hit');
  document.getElementById('combat-skills').textContent = sheet.stats.int + intClassSkills() + customSourcesSum('combat-row-skills');
  document.getElementById('combat-crit').textContent = critValue(sheet.stats.luck) + luckClassCrit() + customSourcesSum('combat-row-crit');

  updateOverheal('hp', sheet.combat.hp, hpMax);
  updateOverheal('mp', sheet.combat.mp, mpMax);
  updateOverheal('ap', sheet.combat.ap, apMax);

  if (rebuildExtra) renderExtraCombatRows(mods);
  else updateExtraRowTotals(mods);

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
    <div class="combat-extra-rows" id="combat-extra-rows"></div>
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
  // базовые строки тоже разворачиваются в свою разбивку по источникам
  STAT_COMBAT_LINKS.forEach(({ combatId }) => {
    const row = document.getElementById(combatId);
    if (row) setupCombatRowExpand(row);
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
  return { id: uid(), name: '', desc: '', spec: 'damage', level: 1, mana: 0, ap: 0, hp: 0, icon: defaultIconForSpec('damage'), iconImage: '' };
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
  if (!Number.isFinite(s.ap)) s.ap = 0;
  if (!Number.isFinite(s.hp)) s.hp = 0;
  return s;
}

function defaultSheet(char) {
  return {
    name: char.name || '',
    description: char.description || '',
    lore: char.lore || '',
    spells: [],
    stats: { str: 12, dex: 12, int: 12, spi: 12, end: 12, luck: 12 },
    // редактируемые классовые поля всех характеристик (по 4 тира на стат)
    statClass: Object.fromEntries(
      STAT_CLASS_KEYS.map(k => [
        k, Array.from({ length: STAT_CLASS_MAX_TIER }, () => STAT_CLASS_DEFAULT[k]),
      ])
    ),
    // отдельная «книга» скиллов класса Интеллекта (до 4 заклинаний)
    classSkills: { int: [] },
    // произвольные пользовательские источники бонусов по боевым строкам:
    // { [rowId]: [{ id, label, value }] }
    combatCustom: {},
    combat: defaultCombat({ str: 12, dex: 12, int: 12, spi: 12, end: 12, luck: 12 }),
    equipment: Object.fromEntries(
      [...EQUIPMENT_SLOTS, ...EXTRA_SLOTS].map(s => [s.key, emptyItem()])
    ),
    backpack: Array.from({ length: BACKPACK_COUNT }, () => emptyItem()),
  };
}

// нормализует классовые поля к массивам длины 4 из целых чисел;
// отсутствующие значения берут дефолт стата (spi/int/luck → 1, остальные → 0)
function migrateStatClass(data, base) {
  const src = (data.statClass && typeof data.statClass === 'object') ? data.statClass : {};
  const out = {};
  STAT_CLASS_KEYS.forEach((key) => {
    const arr = Array.isArray(src[key]) ? src[key] : [];
    out[key] = Array.from({ length: STAT_CLASS_MAX_TIER }, (_, i) => {
      const n = parseInt(arr[i], 10);
      return Number.isFinite(n) ? n : STAT_CLASS_DEFAULT[key];
    });
  });
  return out;
}

// произвольные источники бонусов боевых строк: { [rowId]: [{id, label, value}] }
function migrateCombatCustom(data) {
  const src = (data.combatCustom && typeof data.combatCustom === 'object') ? data.combatCustom : {};
  const out = {};
  Object.entries(src).forEach(([rowId, list]) => {
    if (!Array.isArray(list)) return;
    const clean = list
      .filter(s => s && typeof s === 'object')
      .map(s => ({
        id: typeof s.id === 'string' && s.id ? s.id : uid(),
        label: typeof s.label === 'string' ? s.label : '',
        value: parseInt(s.value, 10) || 0,
      }));
    if (clean.length) out[rowId] = clean;
  });
  return out;
}

// классовая «книга» Интеллекта: массив спеллов через normalizeSpell, обрезка до 4
function migrateClassSkills(data, base) {
  const src = data.classSkills?.int;
  const list = Array.isArray(src) ? src : [];
  return { int: list.slice(0, STAT_CLASS_MAX_TIER).map(normalizeSpell) };
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
      ap: 0,
      hp: 0,
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
      statClass: migrateStatClass(data, base),
      classSkills: migrateClassSkills(data, base),
      combatCustom: migrateCombatCustom(data),
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

async function loadSheetAsync(char) {
  const base = defaultSheet(char);
  let data = null;

  if (char.isUser && typeof loadUserSheet === 'function') {
    data = await loadUserSheet(char.id);
  }

  if (!data) {
    try {
      const saved = localStorage.getItem(storageKey());
      if (saved) data = JSON.parse(saved);
    } catch {
      data = null;
    }
  }

  if (!data) return base;

  const stats = { ...base.stats, ...data.stats };
  return {
    ...base,
    ...data,
    stats,
    combat: migrateCombat(data, stats),
    statClass: migrateStatClass(data, base),
    classSkills: migrateClassSkills(data, base),
    combatCustom: migrateCombatCustom(data),
    equipment: migrateEquipment(data, base),
    backpack: data.backpack?.length === BACKPACK_COUNT
      ? data.backpack
      : base.backpack,
    spells: migrateSpells(data, base),
  };
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
  saveTimer = setTimeout(async () => {
    const hint = document.getElementById('save-hint');
    if (catalogChar?.isUser && typeof saveUserSheet === 'function') {
      const result = await saveUserSheet(id, sheet);
      if (!result?.ok) {
        hint.textContent = result?.error ? `Ошибка: ${result.error}` : 'Не удалось сохранить';
        hint.classList.add('visible');
        setTimeout(() => hint.classList.remove('visible'), 3000);
        return;
      }
    } else {
      localStorage.setItem(storageKey(), JSON.stringify(sheet));
    }
    syncUserCardCatalog();
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
    const slot = document.createElement('div');
    slot.className = 'stat-slot';
    const cell = document.createElement('div');
    cell.className = 'stat-cell';
    cell.dataset.stat = key;
    cell.innerHTML = `
      <span class="stat-label">${label}<span class="combat-hint-icon" aria-hidden="true">i</span></span>
      <input type="number" class="stat-input" data-stat="${key}" min="0" max="999" value="${sheet.stats[key]}">
      ${createLinkRunesMarkup(key, 'stat')}
    `;
    const input = cell.querySelector('.stat-input');
    input.addEventListener('input', () => {
      sheet.stats[key] = parseInt(input.value, 10) || 0;
      scheduleSave();
      refreshStatTierFrame(key);
      applyStatCritical(key);
      updateCombatValues();
      updateSlotWarnings();
      if (selectedSlot?.group === 'equipment' && slotSupportsClasses(selectedSlot.key)) {
        renderReqHint(selectedSlot.key);
      }
    });
    slot.appendChild(cell);
    applyStatTierFrame(cell, key);
    applyStatCritical(key);
    bindCombatHint(cell, () => statTooltipHtml(key));
    grid.appendChild(slot);
  });
}

function updateStatTierFrame(cell, tier) {
  if (typeof StatTierFrame !== 'undefined') {
    StatTierFrame.attach(cell, tier);
  }
}

function applyStatTierFrame(cell, statKey) {
  const tier = statClassTier(sheet.stats[statKey] || 0);
  for (let t = 1; t <= STAT_CLASS_MAX_TIER; t++) cell.classList.remove(`stat-cell--tier-${t}`);
  if (tier > 0) cell.classList.add(`stat-cell--tier-${tier}`);
  updateStatTierFrame(cell, tier);
}

function refreshStatTierFrame(statKey) {
  const cell = getStatCell(statKey);
  if (cell) applyStatTierFrame(cell, statKey);
}

function applyStatCritical(statKey) {
  const cell = getStatCell(statKey);
  const input = cell?.querySelector('.stat-input');
  if (!input) return;
  input.classList.toggle('stat-input--critical', (sheet.stats[statKey] || 0) <= 0);
}

// ===== Разворачиваемые боевые строки: разбивка по источникам =====
// Источник = { label, value, editable, onEdit(v), slotKey? }. По клику строка
// раскрывается в список источников: классовые поля (по тирам) + вклад предметов.

let expandedRowId = null;
let expandedStat = null;

// редактируемые классовые поля характеристики (по достигнутым тирам)
function statClassFieldSources(statKey) {
  const tier = statClassTier(sheet.stats[statKey] || 0);
  if (!Array.isArray(sheet.statClass?.[statKey])) {
    sheet.statClass = {
      ...(sheet.statClass || {}),
      [statKey]: Array.from({ length: STAT_CLASS_MAX_TIER }, () => STAT_CLASS_DEFAULT[statKey]),
    };
  }
  const arr = sheet.statClass[statKey];
  const out = [];
  for (let i = 0; i < tier; i++) {
    out.push({
      label: `${STAT_CLASS_LABEL[statKey]} ${i + 1}`,
      value: parseInt(arr[i], 10) || 0,
      editable: true,
      onEdit(v) { arr[i] = v; scheduleSave(); updateCombatValues({ rebuildExtra: false }); },
    });
  }
  return out;
}

// вклад надетых предметов в конкретный модификатор (правка меняет поле предмета)
function equipmentModSources(modKey) {
  const out = [];
  [...EQUIPMENT_SLOTS, ...EXTRA_SLOTS].forEach(({ key: slotKey }) => {
    const item = sheet.equipment?.[slotKey];
    if (!item || item.mirror || !item.classId) return;
    if (!(modKey in (item.mods || {}))) return;
    const cls = findItemClass(slotKey, item.classId);
    if (!cls || !cls.mods.includes(modKey)) return;
    out.push({
      label: `${item.name?.trim() || cls.label} · Т${item.tier}`,
      value: parseInt(item.mods[modKey], 10) || 0,
      editable: true,
      slotKey,
      onEdit(v) {
        item.mods[modKey] = v;
        reconcileHands(slotKey);
        scheduleSave();
        updateSlotUI('equipment', slotKey);
        updateCombatValues({ rebuildExtra: false });
      },
    });
  });
  return out;
}

// произвольные пользовательские источники для боевой строки (не заведённые системой)
function customRowSources(rowId) {
  const list = sheet.combatCustom?.[rowId];
  return Array.isArray(list) ? list : [];
}

function customSourcesSum(rowId) {
  return customRowSources(rowId).reduce((sum, s) => sum + (parseInt(s.value, 10) || 0), 0);
}

// оборачивает произвольные источники в формат, понятный buildBreakdown
function customSourceEntries(rowId) {
  return customRowSources(rowId).map(entry => ({
    label: entry.label,
    value: entry.value,
    editable: true,
    custom: true,
    onEdit(v) { entry.value = v; scheduleSave(); updateCombatValues({ rebuildExtra: false }); },
    onLabelEdit(v) { entry.label = v; scheduleSave(); },
    onRemove() {
      const list = sheet.combatCustom[rowId];
      const idx = list?.findIndex(s => s.id === entry.id) ?? -1;
      if (idx === -1) return;
      list.splice(idx, 1);
      if (!list.length) delete sheet.combatCustom[rowId];
      scheduleSave();
      updateCombatValues();
    },
  }));
}

function addCustomSource(rowId) {
  if (!sheet.combatCustom[rowId]) sheet.combatCustom[rowId] = [];
  sheet.combatCustom[rowId].push({ id: uid(), label: '', value: 0 });
  scheduleSave();
  updateCombatValues();
  // фокус на новой строке названия источника
  requestAnimationFrame(() => {
    const row = document.getElementById(rowId);
    const input = row?.querySelector('.combat-breakdown-row--custom:last-of-type .combat-breakdown-label-input');
    input?.focus();
  });
}

// источники (и связанная характеристика) для боевой строки по её id
function combatRowSources(rowId) {
  const st = sheet.stats;
  switch (rowId) {
    case 'combat-row-hp':
      return { stat: 'str', sources: [
        { label: 'Сила ×4', value: st.str * 4, editable: false },
        ...statClassFieldSources('str'),
        ...equipmentModSources('hpBonus'),
        ...customSourceEntries(rowId),
      ] };
    case 'combat-row-hit':
      return { stat: 'dex', sources: [
        { label: 'Ловкость', value: st.dex, editable: false },
        ...equipmentModSources('hit'),
        ...customSourceEntries(rowId),
      ] };
    case 'combat-row-skills':
      return { stat: 'int', classBook: true, sources: [
        { label: 'Интеллект', value: st.int, editable: false },
        ...statClassFieldSources('int'),
        ...customSourceEntries(rowId),
      ] };
    case 'combat-row-mp':
      return { stat: 'spi', sources: [
        { label: 'Дух', value: st.spi, editable: false },
        ...customSourceEntries(rowId),
      ] };
    case 'combat-row-ap':
      return { stat: 'end', sources: [
        { label: 'Выносливость', value: st.end, editable: false },
        ...customSourceEntries(rowId),
      ] };
    case 'combat-row-crit':
      return { stat: 'luck', sources: [
        { label: 'Удача ÷2', value: critValue(st.luck), editable: false },
        ...statClassFieldSources('luck'),
        ...equipmentModSources('critDie'),
        ...customSourceEntries(rowId),
      ] };
    default: {
      // строки-агрегаты снаряжения/классов: id вида combat-row-<modKey>
      const modKey = rowId.replace('combat-row-', '');
      const stat = CLASS_ROW_STAT[modKey] || null;
      return { stat, sources: [
        ...(stat ? statClassFieldSources(stat) : []),
        ...equipmentModSources(modKey),
        ...customSourceEntries(rowId),
      ] };
    }
  }
}

function litStatCell(stat, on) {
  if (stat) getStatCell(stat)?.classList.toggle('is-rune-lit', on);
}

function highlightSourceSlot(slotKey) {
  document.querySelector(`.item-slot[data-group="equipment"][data-slot="${slotKey}"]`)
    ?.classList.add('is-source-lit');
}

function clearSourceHighlights() {
  document.querySelectorAll('.item-slot.is-source-lit')
    .forEach(el => el.classList.remove('is-source-lit'));
}

// делает боевую строку кликабельной для развёртки
function setupCombatRowExpand(row) {
  row.classList.add('combat-row--expandable');
  row.setAttribute('aria-expanded', 'false');
  row.addEventListener('click', (e) => {
    if (e.target.closest('input, textarea, select, button, .combat-breakdown, .spell-slot')) return;
    toggleRowExpand(row);
  });
}

function collapseCombatRow() {
  if (!expandedRowId) return;
  const prev = document.getElementById(expandedRowId);
  if (prev) {
    // is-rune-lit мог остаться от ховера (dim подавлен, пока строка раскрыта) —
    // снимаем принудительно, иначе подсветка «застревает» при переключении строк
    prev.classList.remove('is-expanded', 'is-rune-lit');
    prev.setAttribute('aria-expanded', 'false');
    prev.querySelector('.combat-breakdown')?.remove();
  }
  litStatCell(expandedStat, false);
  clearSourceHighlights();
  expandedRowId = null;
  expandedStat = null;
}

function toggleRowExpand(row) {
  if (expandedRowId === row.id) { collapseCombatRow(); return; }
  collapseCombatRow();
  expandedRowId = row.id;
  buildBreakdown(row);
}

// пересобрать развёртку открытой строки (после структурных изменений)
function refreshExpandedRow() {
  if (!expandedRowId) return;
  const row = document.getElementById(expandedRowId);
  if (!row) { litStatCell(expandedStat, false); clearSourceHighlights(); expandedRowId = null; expandedStat = null; return; }
  buildBreakdown(row);
}

function buildBreakdown(row) {
  const { stat, sources, classBook } = combatRowSources(row.id);

  clearSourceHighlights();
  litStatCell(expandedStat, false);
  expandedStat = stat;
  litStatCell(stat, true);

  row.classList.add('is-expanded');
  row.setAttribute('aria-expanded', 'true');

  let box = row.querySelector('.combat-breakdown');
  if (!box) {
    box = document.createElement('div');
    box.className = 'combat-breakdown';
    row.appendChild(box);
  }
  box.innerHTML = '';

  sources.forEach((src) => {
    const line = document.createElement('div');
    line.className = 'combat-breakdown-row';
    if (src.slotKey) { line.classList.add('combat-breakdown-row--equip'); highlightSourceSlot(src.slotKey); }
    if (src.custom) line.classList.add('combat-breakdown-row--custom');

    if (src.custom) {
      const labelInput = document.createElement('input');
      labelInput.type = 'text';
      labelInput.className = 'combat-breakdown-label-input';
      labelInput.maxLength = 40;
      labelInput.placeholder = 'Название источника';
      labelInput.value = src.label || '';
      labelInput.setAttribute('aria-label', 'Название источника');
      labelInput.addEventListener('click', (e) => e.stopPropagation());
      labelInput.addEventListener('input', () => src.onLabelEdit(labelInput.value));
      line.appendChild(labelInput);
    } else {
      const labelEl = document.createElement('span');
      labelEl.className = 'combat-breakdown-label';
      labelEl.textContent = src.label;
      line.appendChild(labelEl);
    }

    if (src.editable) {
      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'numeric';
      input.className = 'combat-breakdown-input';
      input.maxLength = 3;
      input.value = String(src.value ?? 0);
      input.setAttribute('aria-label', src.label);
      input.addEventListener('click', (e) => e.stopPropagation());
      input.addEventListener('input', () => {
        const clean = input.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 3);
        if (clean !== input.value) {
          const atEnd = input.selectionStart === input.value.length;
          input.value = clean;
          if (atEnd) input.setSelectionRange(clean.length, clean.length);
        }
        src.onEdit(parseInt(clean, 10) || 0);
      });
      line.appendChild(input);
    } else {
      const valEl = document.createElement('span');
      valEl.className = 'combat-breakdown-value';
      valEl.textContent = String(src.value ?? 0);
      line.appendChild(valEl);
    }

    if (src.custom) {
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'combat-breakdown-remove';
      removeBtn.textContent = '×';
      removeBtn.setAttribute('aria-label', 'Удалить источник');
      removeBtn.addEventListener('click', (e) => { e.stopPropagation(); src.onRemove(); });
      line.appendChild(removeBtn);
    }

    box.appendChild(line);
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'combat-breakdown-add';
  addBtn.textContent = '+ добавить источник';
  addBtn.addEventListener('click', (e) => { e.stopPropagation(); addCustomSource(row.id); });
  box.appendChild(addBtn);

  if (classBook) appendIntClassBook(box);
}

// мини-сетка книги скиллов класса Интеллекта (внутри развёртки строки «Скиллы»)
function appendIntClassBook(box) {
  const cap = classIntCapacity();
  if (cap <= 0) return;
  const wrap = document.createElement('div');
  wrap.className = 'combat-breakdown-book';
  const intList = Array.isArray(sheet.classSkills?.int) ? sheet.classSkills.int : [];
  for (let i = 0; i < cap; i++) {
    const cellEl = createSpellSlot(intList[i] || null);
    cellEl.classList.add('spell-slot--class');
    cellEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openSpellbookModal('classInt');
    });
    wrap.appendChild(cellEl);
  }
  box.appendChild(wrap);
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

function clearSlot(group, key) {
  if (group === 'backpack') {
    sheet.backpack[key] = emptyItem();
  } else {
    sheet.equipment[key] = emptyItem();
    reconcileHands(key);
  }
  scheduleSave();
  updateSlotUI(group, key);
  updateCombatValues();
  if (selectedSlot && selectedSlot.group === group && String(selectedSlot.key) === String(key)) {
    document.getElementById('slot-name').value = '';
    document.getElementById('slot-desc').value = '';
    renderClassSection(group, key);
  }
}

function bindSlotClear() {
  const modal = document.getElementById('slot-clear-modal');
  const btnOpen = document.getElementById('slot-editor-clear');
  const btnConfirm = document.getElementById('slot-clear-confirm');
  const btnCancel = document.getElementById('slot-clear-cancel');
  if (!modal || !btnOpen) return;

  btnOpen.addEventListener('click', () => {
    if (!selectedSlot) return;
    if (typeof modal.showModal === 'function') modal.showModal();
  });

  btnCancel?.addEventListener('click', () => modal.close());

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });

  btnConfirm?.addEventListener('click', () => {
    if (selectedSlot) clearSlot(selectedSlot.group, selectedSlot.key);
    modal.close();
  });
}

function bindSlotEditor() {
  const nameEl = document.getElementById('slot-name');
  const descEl = document.getElementById('slot-desc');

  document.getElementById('slot-editor-close').addEventListener('click', closeSlotEditor);
  bindSlotClear();

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

function spellbookFlipHandlers() {
  return {
    onFlip(pageIndex) {
      spreadIndex = Math.floor(pageIndex / spellbookPageStep());
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
      : Math.min(spreadIndex * spellbookPageStep(), pages.length - 1);

    spellbookFlipReady = false;
    window.SpellbookFlip.createSpellbookFlip(spellbookFlipHandlers());
    window.SpellbookFlip.loadSpellbookPages(pages, startPage);
    spellbookFlipReady = true;
    spreadIndex = Math.floor(startPage / spellbookPageStep());
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

// Открывает книгу заклинаний в нужном режиме: 'main' — основная книга,
// 'classInt' — отдельная книга скиллов класса Интеллекта (те же ячейки/редактор).
function openSpellbookModal(mode = 'main') {
  const modal = document.getElementById('spellbook-modal');
  spellCollection = mode === 'classInt' ? 'classInt' : 'main';
  spreadIndex = 0;
  if (spellCollection === 'classInt') activeSpec = 'all';
  destroySpellbookInstance();
  loadSpellbookFlip();
  renderSpellTabs();
  applySpellbookMode();

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
}

// Подстройка книги под режим: в классовой книге скрываем вкладки специализаций
// и прячем кнопку «создать», когда достигнут лимит тиров Интеллекта.
function applySpellbookMode() {
  const tabs = document.getElementById('spellbook-tabs');
  const createBtn = document.getElementById('spell-create-btn');
  const isClass = spellCollection === 'classInt';
  if (tabs) tabs.hidden = isClass;
  if (createBtn) {
    createBtn.hidden = isClass && activeSpellList().length >= classIntCapacity();
  }
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

  btn.addEventListener('click', () => openSpellbookModal('main'));
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

// активная коллекция книги (основная либо классовая книга Интеллекта)
function activeSpellList() {
  if (spellCollection === 'classInt') {
    if (!Array.isArray(sheet.classSkills?.int)) {
      sheet.classSkills = { ...(sheet.classSkills || {}), int: [] };
    }
    return sheet.classSkills.int;
  }
  return sheet.spells;
}

function setActiveSpellList(next) {
  if (spellCollection === 'classInt') sheet.classSkills.int = next;
  else sheet.spells = next;
}

// сколько классовых спеллов можно держать = число достигнутых тиров Интеллекта
function classIntCapacity() {
  return statClassTier(sheet.stats.int || 0);
}

function filteredSpells() {
  const list = activeSpellList();
  // классовая книга не фильтруется по специализации — там максимум 4 спелла
  if (spellCollection === 'classInt' || activeSpec === 'all') return list;
  return list.filter(s => s.spec === activeSpec);
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
      <span class="spell-ap-badge">${spell.ap}</span>
      <span class="spell-hp-badge">${spell.hp}</span>
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
  // возвращаем книгу в основной режим и восстанавливаем вкладки
  if (spellCollection !== 'main') {
    spellCollection = 'main';
    const tabs = document.getElementById('spellbook-tabs');
    if (tabs) tabs.hidden = false;
    const createBtn = document.getElementById('spell-create-btn');
    if (createBtn) createBtn.hidden = false;
  }
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
  const totalSpreads = spellbookTotalSteps(totalSpells);

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
      : Math.min(spreadIndex * spellbookPageStep(), pages.length - 1);

    if (!spellbookFlipReady) {
      window.SpellbookFlip.createSpellbookFlip(spellbookFlipHandlers());
      window.SpellbookFlip.loadSpellbookPages(pages, startPage);
      spellbookFlipReady = true;
    } else {
      window.SpellbookFlip.updateSpellbookPages(pages, startPage);
    }

    spreadIndex = Math.floor(startPage / spellbookPageStep());
    updatePageNav(spells.length);
    applySpellbookMode();
  });
}

function turnPage(direction) {
  if (isPageTurning || !spellbookFlipReady) return;
  hideSpellTooltip();

  const spells = filteredSpells();
  const maxSpread = Math.max(0, spellbookTotalSteps(spells.length) - 1);
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
    spell = activeSpellList().find(s => s.id === spellId);
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
  document.getElementById('spell-ap').value = spell.ap;
  document.getElementById('spell-hp').value = spell.hp;
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
    ? activeSpellList().find(s => s.id === editingSpellId)
    : null;
  return {
    name: document.getElementById('spell-name').value.trim(),
    spec: selectedSpec,
    icon: selectedIconId,
    iconImage: existing?.iconImage || '',
    level: Math.min(5, Math.max(1, parseInt(document.getElementById('spell-level').value, 10) || 1)),
    mana: Math.max(0, parseInt(document.getElementById('spell-mana').value, 10) || 0),
    ap: Math.max(0, parseInt(document.getElementById('spell-ap').value, 10) || 0),
    hp: Math.max(0, parseInt(document.getElementById('spell-hp').value, 10) || 0),
    desc: document.getElementById('spell-desc').value,
  };
}

function saveSpell() {
  const data = readSpellForm();
  if (!data.name) {
    document.getElementById('spell-name').focus();
    return;
  }

  const list = activeSpellList();
  if (editingSpellId) {
    const spell = list.find(s => s.id === editingSpellId);
    if (spell) Object.assign(spell, data);
  } else {
    // классовая книга ограничена числом достигнутых тиров Интеллекта
    if (spellCollection === 'classInt' && list.length >= classIntCapacity()) {
      closeSpellEditor();
      return;
    }
    list.push({ id: uid(), ...data });
  }

  scheduleSave();
  closeSpellEditor();
  renderSpellGrids();
  updateCombatValues(); // обновит развёртку строки «Скиллы», если она открыта
}

function deleteSpell() {
  if (!editingSpellId) return;
  setActiveSpellList(activeSpellList().filter(s => s.id !== editingSpellId));
  const total = filteredSpells().length;
  const maxSpread = Math.max(0, spellbookTotalSteps(total) - 1);
  if (spreadIndex > maxSpread) spreadIndex = maxSpread;
  scheduleSave();
  closeSpellEditor();
  renderSpellGrids();
  updateCombatValues(); // обновит развёртку строки «Скиллы», если она открыта
}

// ────────────────────────────────────────────────────────────────────────────
// TRANSFER MODULE — экспорт / импорт листа персонажа в JSON
// ────────────────────────────────────────────────────────────────────────────
// Формат — точный слепок текущей структуры `sheet`. При импорте данные
// прогоняются через те же migrate*-функции, что и загрузка из localStorage,
// поэтому формат не привязан к старой схеме и переживает будущие изменения
// модели персонажа (новые поля просто получат дефолт при отсутствии).

const TRANSFER_SCHEMA_VERSION = 2;

function toInt(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function strVal(v) {
  return typeof v === 'string' ? v : '';
}

/**
 * Сериализует текущий `sheet` в JSON-формат обмена.
 * Вызывается перед скачиванием файла или копированием в буфер.
 */
function exportToSharedFormat() {
  const s = sheet;
  const allSlots = [...EQUIPMENT_SLOTS, ...EXTRA_SLOTS];

  return {
    schemaVersion: TRANSFER_SCHEMA_VERSION,
    source: 'GameOfBrothers',
    name: s.name ?? '',
    description: s.description ?? '',
    lore: s.lore ?? '',
    stats: { ...s.stats },
    combat: { ...s.combat },
    // редактируемые классовые поля всех характеристик
    statClass: Object.fromEntries(
      STAT_CLASS_KEYS.map((key) => [key, [...(s.statClass?.[key] ?? [])]])
    ),
    // классовая книга скиллов Интеллекта
    classSkills: {
      int: (s.classSkills?.int ?? []).map(sp => ({ ...sp })),
    },
    equipment: Object.fromEntries(
      allSlots.map(({ key }) => [key, cloneItem(s.equipment[key] ?? emptyItem())])
    ),
    backpack: (s.backpack ?? []).map(item => cloneItem(item ?? emptyItem())),
    spells: (s.spells ?? []).map(sp => ({ ...sp })),
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
 * Использует те же migrate*-функции, что и загрузка сохранённого листа,
 * поэтому импорт устойчив к отсутствующим/лишним полям и не требует
 * ручной синхронизации со схемой при изменении модели персонажа.
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

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Ожидался JSON-объект.' };
  }

  if (!Number.isInteger(raw.schemaVersion)) {
    return { ok: false, error: 'Файл не похож на экспорт персонажа GameOfBrothers.' };
  }

  const base = defaultSheet({});

  const stats = {
    str:  toInt(raw.stats?.str,  base.stats.str),
    dex:  toInt(raw.stats?.dex,  base.stats.dex),
    int:  toInt(raw.stats?.int,  base.stats.int),
    spi:  toInt(raw.stats?.spi,  base.stats.spi),
    end:  toInt(raw.stats?.end,  base.stats.end),
    luck: toInt(raw.stats?.luck, base.stats.luck),
  };

  const rawBackpack = Array.isArray(raw.backpack) ? raw.backpack : [];
  const backpack = Array.from({ length: BACKPACK_COUNT }, (_, i) => (
    rawBackpack[i] ? normalizeItem(cloneItem(rawBackpack[i])) : emptyItem()
  ));

  return {
    ok: true,
    sheet: {
      name: strVal(raw.name) || 'Импортированный персонаж',
      description: strVal(raw.description),
      lore: strVal(raw.lore),
      stats,
      combat: migrateCombat(raw, stats),
      statClass: migrateStatClass(raw, base),
      classSkills: migrateClassSkills(raw, base),
      equipment: migrateEquipment(raw, base),
      backpack,
      spells: migrateSpells(raw, base),
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

async function init(char) {
  catalogChar = char;
  sheet = await loadSheetAsync(char);

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
  initTransfer();

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
      return init(char);
    });
}
