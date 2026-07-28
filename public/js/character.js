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

const RACE_PRESETS = [
  'Люди',
  'Орки',
  'Эльфы',
  'Гномы',
  'Наги',
  'Дриады',
  'Звери',
  'Насекомые',
  'Демоны',
];

const FACTION_PRESETS = [
  'Разбойники',
  'Стражники',
  'Странники',
  'Святые',
  'Нежить',
  'Механизмы',
  'Вампиры',
];

function fillIdentityDatalist(listId, options) {
  const list = document.getElementById(listId);
  if (!list) return;
  list.innerHTML = options
    .map((value) => `<option value="${escapeHtml(value)}"></option>`)
    .join('');
}

function isIdentityNativeMode() {
  return typeof GobMobile !== 'undefined' && GobMobile.isMobile();
}

function parseLegacyIdentity(description) {
  const text = String(description ?? '');
  const raceMatch = text.match(/Раса:\s*([^|]+)/i);
  const factionMatch = text.match(/Группировка:\s*([^|]+)/i);
  return {
    race: raceMatch ? raceMatch[1].trim() : '',
    faction: factionMatch ? factionMatch[1].trim() : '',
  };
}

function migrateIdentity(data) {
  const race = typeof data.race === 'string' ? data.race.trim() : '';
  const faction = typeof data.faction === 'string' ? data.faction.trim() : '';
  if (race || faction) return { race, faction };
  return parseLegacyIdentity(data.description);
}

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

function resolveItemClassContext(group, key) {
  const item = getItem(group, key);
  if (!item?.classId) return null;
  if (group === 'equipment' && slotSupportsClasses(key)) {
    const cls = findItemClass(key, item.classId);
    if (cls) return { slotKey: key, cls };
  }
  for (const slotKey of Object.keys(CATALOG.SLOT_CLASSES)) {
    const cls = findItemClass(slotKey, item.classId);
    if (cls) return { slotKey, cls };
  }
  return null;
}

// ----- слоты рук и двуручное оружие -----
const HAND_SLOTS = ['leftHand', 'rightHand'];
// подпись руки для боевых строк по-предметно (напр. «Щит в левой руке»)
const HAND_ROW_LABEL = { leftHand: 'в левой руке', rightHand: 'в правой руке' };
// именительная подпись руки для предупреждений редактора (напр. «левая рука занята»)
const HAND_NAME = { leftHand: 'левая рука', rightHand: 'правая рука' };

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

// Вторая рука занята самостоятельным предметом → двуручное оружие в этот слот брать нельзя
// (иначе reconcileHands молча затрёт соседний предмет — см. BUGS.md B5).
// Редактируемый слот-зеркало не в счёт: вторая рука — владелец той же двуручной связки.
function otherHandBlocksTwoHanded(slotKey) {
  if (!isHandSlot(slotKey)) return false;
  if (sheet.equipment[slotKey]?.mirror) return false;
  const otherItem = sheet.equipment[otherHand(slotKey)];
  return !isItemEmpty(otherItem) && !otherItem.mirror;
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
    // щит — не агрегат: своя строка на каждый надетый щит (по рукам)
    if (key === 'shieldGuard') { renderShieldRows(host); return; }
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

// значение щита в конкретной руке (собственный мод + пользовательские источники строки)
function shieldRowValue(slotKey) {
  const item = sheet.equipment?.[slotKey];
  const base = (item && !item.mirror && item.classId === 'shield')
    ? (parseInt(item.mods?.shieldGuard, 10) || 0)
    : 0;
  return base + customSourcesSum(`combat-row-shieldGuard-${slotKey}`);
}

// ── Кнопка «получить пизды»: авторасчёт входящего урона (С2·3) ──────────────
// Текущие защитные агрегаты — те же формулы, что и в updateCombatValues:
// снаряга (sumEquipmentMods) + классовый вклад + пользовательские источники строки.
function currentEvasion() {
  return (sumEquipmentMods().evasion || 0) + dexClassEvasion()
    + customSourcesSum('combat-row-evasion');
}

function currentArmor() {
  return (sumEquipmentMods().armor || 0) + endClassArmor()
    + customSourcesSum('combat-row-armor');
}

function currentBubbleUnits() {
  return (sumEquipmentMods().bubble || 0) + spiClassBubble()
    + customSourcesSum('combat-row-bubble');
}

// надетые щиты (по рукам) со значением проверки; пассивной защиты щит не даёт (B4)
function equippedShields() {
  return HAND_SLOTS.reduce((out, slotKey) => {
    const item = sheet.equipment?.[slotKey];
    if (item && !item.mirror && item.classId === 'shield') {
      out.push({ slot: slotKey, label: HAND_ROW_LABEL[slotKey], value: shieldRowValue(slotKey) });
    }
    return out;
  }, []);
}

// Чистый редьюсер входящего урона по шагам С2·3:
// уворот → щиты → бабл (0 при активном) → плоская броня → итог ≥ 0.
// input: { raw, dodge:{value,passed}, shields:[{label,value,passed}],
//          bubble:{active,fell}|null, armor }
function computeDamageIntake(input) {
  const steps = [];
  let dmg = Math.max(0, parseInt(input.raw, 10) || 0);
  const push = (label, rawDelta, extra) => {
    const before = dmg;
    dmg = Math.max(0, dmg + rawDelta);
    steps.push({ label, before, delta: dmg - before, after: dmg, ...(extra || {}) });
  };

  if (input.dodge) {
    push('Уворот', input.dodge.passed ? -(parseInt(input.dodge.value, 10) || 0) : 0);
  }
  (input.shields || []).forEach((sh) => {
    push(`Щит ${sh.label}`, sh.passed ? -(parseInt(sh.value, 10) || 0) : 0);
  });
  if (input.bubble && input.bubble.active) {
    push('Бабл', -dmg, { bubble: true });
  }
  push('Броня', -(parseInt(input.armor, 10) || 0));

  return { steps, finalDamage: dmg };
}

// По строке на каждый надетый щит — «Щит в левой/правой руке». Щитов может быть
// два (как урон у оружия), каждый — отдельная проверка; агрегата нет (см. BUGS.md B4).
function renderShieldRows(host) {
  const def = CATALOG.MODIFIERS.shieldGuard;
  HAND_SLOTS.forEach((slotKey) => {
    const item = sheet.equipment?.[slotKey];
    if (!item || item.mirror || item.classId !== 'shield') return;
    const row = document.createElement('div');
    row.className = 'combat-row combat-row--equip';
    row.id = `combat-row-shieldGuard-${slotKey}`;
    row.innerHTML = `
      <span class="combat-label">${def.label} ${HAND_ROW_LABEL[slotKey]}</span>
      <span class="combat-derived">${formatModValue('shieldGuard', shieldRowValue(slotKey))}</span>
    `;
    host.appendChild(row);
    setupCombatRowExpand(row);
  });
}

// обновляет только числа-итоги строк-агрегатов, не пересобирая их (сохраняет фокус)
function updateExtraRowTotals(mods) {
  Object.entries(CATALOG.MODIFIERS).forEach(([key, def]) => {
    if (def.combat !== 'row') return;
    if (key === 'shieldGuard') { updateShieldRowTotals(); return; }
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

// обновляет итоги по-предметных строк щитов на месте (не пересобирая DOM)
function updateShieldRowTotals() {
  HAND_SLOTS.forEach((slotKey) => {
    const row = document.getElementById(`combat-row-shieldGuard-${slotKey}`);
    if (!row) return;
    const derived = row.querySelector(':scope > .combat-derived');
    if (derived) derived.textContent = formatModValue('shieldGuard', shieldRowValue(slotKey));
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

// ── Визард «Получить пизды»: пошаговое списание входящего урона ─────────────
let damageWizard = null;

// Строит план шагов под текущий лист: урон → уворот → по щиту → бабл(если
// активен) → броня → итог. Снимок агрегатов делается один раз при открытии.
function openDamageWizard() {
  const bubbleActive = sheet.combat.bubbleActive !== false && currentBubbleUnits() > 0;
  const w = {
    index: 0,
    raw: 0,
    dodge: { value: currentEvasion(), passed: false, def: '', atk: '' },
    shields: equippedShields().map((s) => ({ ...s, passed: false, def: '', atk: '' })),
    bubble: bubbleActive ? { active: true, units: currentBubbleUnits(), fell: false } : null,
    armor: currentArmor(),
    plan: [{ type: 'raw' }, { type: 'dodge' }],
  };
  w.shields.forEach((_, i) => w.plan.push({ type: 'shield', i }));
  if (w.bubble) w.plan.push({ type: 'bubble' });
  w.plan.push({ type: 'armor' }, { type: 'summary' });
  damageWizard = w;
  renderDamageStep();
  document.getElementById('damage-modal')?.showModal();
}

function closeDamageWizard() {
  const d = document.getElementById('damage-modal');
  if (d?.open) d.close();
  damageWizard = null;
}

// текущий вход для computeDamageIntake из выбранных ответов
function damageIntakeInput() {
  const w = damageWizard;
  return {
    raw: w.raw,
    dodge: { value: w.dodge.value, passed: w.dodge.passed },
    shields: w.shields.map((s) => ({ label: s.label, value: s.value, passed: s.passed })),
    bubble: w.bubble ? { active: w.bubble.active } : null,
    armor: w.armor,
  };
}

function renderDamageStep() {
  const w = damageWizard;
  if (!w) return;
  const step = w.plan[w.index];
  const host = document.getElementById('damage-step');
  const title = document.getElementById('damage-modal-title');
  if (!host || !step) return;
  host.innerHTML = '';
  // «входящий» урон, дошедший до текущего шага (по уже выбранным ответам)
  const result = computeDamageIntake(damageIntakeInput());
  const before = w.index >= 1 && w.index <= result.steps.length ? result.steps[w.index - 1].before : w.raw;

  switch (step.type) {
    case 'raw':     renderDamageRawStep(host, title); break;
    case 'dodge':   renderDamageCheckStep(host, title, before, w.dodge, 'Уворот', 'Уворот прошёл — урон снижается на его значение.'); break;
    case 'shield':  renderDamageCheckStep(host, title, before, w.shields[step.i], `Щит ${w.shields[step.i].label}`, 'Проверка щита прошла — урон снижается на число щита.'); break;
    case 'bubble':  renderDamageBubbleStep(host, title, before); break;
    case 'armor':   renderDamageArmorStep(host, title, before); break;
    case 'summary': renderDamageSummaryStep(host, title); break;
    default: break;
  }
  renderDamageNav(step);
}

function renderDamageRawStep(host, title) {
  title.textContent = 'Сколько тебе прилетело?';
  const w = damageWizard;
  host.innerHTML = `
    <p class="damage-step__hint">Введи количество нанесённого урона.</p>
    <input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4"
           class="damage-input-big" id="damage-raw" aria-label="Входящий урон">
  `;
  const input = host.querySelector('#damage-raw');
  input.value = w.raw || '';
  input.addEventListener('input', () => {
    const clean = input.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 4);
    if (clean !== input.value) input.value = clean;
    w.raw = parseInt(clean, 10) || 0;
    const next = document.getElementById('damage-next');
    if (next) next.disabled = !(w.raw > 0);
  });
  requestAnimationFrame(() => input.focus());
}

// Единый шаг активной проверки (уворот/щит): да/нет ↔ альтернативный ввод по
// числам кубов (защита vs атака) — «два варианта, разделённых полосой» (С2·3).
function renderDamageCheckStep(host, title, before, state, heading, hint) {
  title.textContent = heading;
  host.innerHTML = `
    <p class="damage-running">Входящий урон: <strong>${before}</strong></p>
    <p class="damage-step__hint">${hint}</p>
    <div class="damage-choice">
      <button type="button" class="damage-choice-btn damage-choice-btn--yes${state.passed ? ' is-on' : ''}" data-pass="1">
        Прошло <span class="damage-choice-sub">−${state.value}</span>
      </button>
      <button type="button" class="damage-choice-btn damage-choice-btn--no${state.passed ? '' : ' is-on'}" data-pass="0">
        Не прошло <span class="damage-choice-sub">−0</span>
      </button>
    </div>
    <div class="damage-alt">
      <span class="damage-alt__rule"></span>
      <span class="damage-alt__label">или по кубам</span>
      <span class="damage-alt__rule"></span>
    </div>
    <div class="damage-dice">
      <label>Защита <input type="text" inputmode="numeric" class="damage-dice-input" data-die="def" maxlength="3" value="${state.def}"></label>
      <span class="damage-dice-vs">vs</span>
      <label>Атака <input type="text" inputmode="numeric" class="damage-dice-input" data-die="atk" maxlength="3" value="${state.atk}"></label>
      <span class="damage-dice-result" data-role="dice-result"></span>
    </div>
  `;
  const yes = host.querySelector('.damage-choice-btn--yes');
  const no = host.querySelector('.damage-choice-btn--no');
  const setPassed = (passed) => {
    state.passed = passed;
    yes.classList.toggle('is-on', passed);
    no.classList.toggle('is-on', !passed);
  };
  yes.addEventListener('click', () => setPassed(true));
  no.addEventListener('click', () => setPassed(false));

  const defI = host.querySelector('[data-die="def"]');
  const atkI = host.querySelector('[data-die="atk"]');
  const res = host.querySelector('[data-role="dice-result"]');
  const evalDice = () => {
    state.def = defI.value.replace(/\D/g, '').slice(0, 3);
    state.atk = atkI.value.replace(/\D/g, '').slice(0, 3);
    if (defI.value !== state.def) defI.value = state.def;
    if (atkI.value !== state.atk) atkI.value = state.atk;
    if (state.def !== '' && state.atk !== '') {
      const passed = parseInt(state.def, 10) >= parseInt(state.atk, 10);
      res.textContent = passed ? 'защита не ниже — прошло' : 'атака выше — не прошло';
      setPassed(passed);
    } else {
      res.textContent = '';
    }
  };
  defI.addEventListener('input', evalDice);
  atkI.addEventListener('input', evalDice);
}

function renderDamageBubbleStep(host, title, before) {
  title.textContent = 'Бабл держит удар';
  const w = damageWizard;
  host.innerHTML = `
    <p class="damage-running">Входящий урон: <strong>${before}</strong> → <strong>0</strong></p>
    <p class="damage-step__hint">Бабл активен (${w.bubble.units} ед.) — удар поглощается полностью. Бабл выстоял или упал?</p>
    <div class="damage-choice">
      <button type="button" class="damage-choice-btn damage-choice-btn--yes${w.bubble.fell ? '' : ' is-on'}" data-fell="0">
        Выстоял <span class="damage-choice-sub">−1 ед.</span>
      </button>
      <button type="button" class="damage-choice-btn damage-choice-btn--no${w.bubble.fell ? ' is-on' : ''}" data-fell="1">
        Упал <span class="damage-choice-sub">выключить</span>
      </button>
    </div>
  `;
  const stood = host.querySelector('[data-fell="0"]');
  const fell = host.querySelector('[data-fell="1"]');
  stood.addEventListener('click', () => { w.bubble.fell = false; stood.classList.add('is-on'); fell.classList.remove('is-on'); });
  fell.addEventListener('click', () => { w.bubble.fell = true; fell.classList.add('is-on'); stood.classList.remove('is-on'); });
}

function renderDamageArmorStep(host, title, before) {
  title.textContent = 'Плоская броня';
  const w = damageWizard;
  const after = Math.max(0, before - w.armor);
  host.innerHTML = `
    <p class="damage-running">Входящий урон: <strong>${before}</strong></p>
    <p class="damage-step__hint">Броня поглощает <strong>−${w.armor}</strong> плоско.</p>
    <p class="damage-running">Останется: <strong>${after}</strong></p>
  `;
}

function renderDamageSummaryStep(host, title) {
  title.textContent = 'Итог';
  const w = damageWizard;
  const result = computeDamageIntake(damageIntakeInput());
  w.result = result;
  const rows = result.steps.map((s) => {
    const sign = s.delta === 0 ? '±0' : (s.delta > 0 ? '+' : '−') + Math.abs(s.delta);
    return `<li class="damage-summary__row"><span>${s.label}</span><span>${sign} → ${s.after}</span></li>`;
  }).join('');
  const hp = parseInt(sheet.combat.hp, 10) || 0;
  const newHp = Math.max(0, hp - result.finalDamage);
  host.innerHTML = `
    <p class="damage-running">Исходный урон: <strong>${w.raw}</strong></p>
    <ul class="damage-summary">${rows}</ul>
    <p class="damage-summary__final">Итоговый урон: <strong>${result.finalDamage}</strong></p>
    <p class="damage-hp">HP: <strong>${hp}</strong> → <strong>${newHp}</strong></p>
  `;
}

function renderDamageNav(step) {
  const host = document.getElementById('damage-actions');
  const w = damageWizard;
  if (!host) return;
  host.innerHTML = '';
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'effect-btn effect-btn--cancel';
  back.textContent = 'Назад';
  back.disabled = w.index === 0;
  back.addEventListener('click', () => { if (w.index > 0) { w.index--; renderDamageStep(); } });
  host.appendChild(back);

  const spacer = document.createElement('span');
  spacer.className = 'effect-modal__spacer';
  host.appendChild(spacer);

  if (step.type === 'summary') {
    const apply = document.createElement('button');
    apply.type = 'button';
    apply.className = 'effect-btn effect-btn--save';
    apply.id = 'damage-apply';
    apply.textContent = 'Применить';
    apply.addEventListener('click', applyDamageIntake);
    host.appendChild(apply);
  } else {
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'effect-btn effect-btn--save';
    next.id = 'damage-next';
    next.textContent = 'Далее';
    if (step.type === 'raw') next.disabled = !(w.raw > 0);
    next.addEventListener('click', () => { w.index++; renderDamageStep(); });
    host.appendChild(next);
  }
}

function bindDamageIntake() {
  document.getElementById('btn-damage-intake')?.addEventListener('click', openDamageWizard);
  const modal = document.getElementById('damage-modal');
  document.getElementById('damage-modal-close')?.addEventListener('click', closeDamageWizard);
  bindDialogBackdropDismiss(modal, closeDamageWizard);
  modal?.addEventListener('cancel', (e) => { e.preventDefault(); closeDamageWizard(); });
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

function emptyEffect() {
  return { id: uid(), name: '', desc: '', source: '' };
}

function migrateEffects(data) {
  const normalize = (list) => {
    if (!Array.isArray(list)) return [];
    return list
      .filter((e) => e && typeof e === 'object')
      .map((e) => ({
        id: typeof e.id === 'string' && e.id ? e.id : uid(),
        name: typeof e.name === 'string' ? e.name : '',
        desc: typeof e.desc === 'string' ? e.desc : '',
        source: typeof e.source === 'string' ? e.source : '',
      }));
  };
  return {
    buffs: normalize(data.buffs),
    debuffs: normalize(data.debuffs),
  };
}

function migrateQuests(data) {
  if (!Array.isArray(data.quests)) return [];
  let orderBase = 0;
  return data.quests
    .filter((q) => q && typeof q === 'object')
    .map((q, i) => {
      const status = ['active', 'completed', 'turned_in'].includes(q.status) ? q.status : 'active';
      const order = Number.isFinite(q.order) ? q.order : orderBase + i;
      orderBase = Math.max(orderBase, order) + 1;
      return {
        id: typeof q.id === 'string' && q.id ? q.id : uid(),
        from: typeof q.from === 'string' ? q.from : '',
        summary: typeof q.summary === 'string' ? q.summary : '',
        location: typeof q.location === 'string' ? q.location : '',
        reward: typeof q.reward === 'string' ? q.reward : '',
        conditions: typeof q.conditions === 'string' ? q.conditions : '',
        status,
        order,
        collapsed: Boolean(q.collapsed),
      };
    });
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
    race: '',
    faction: '',
    lore: char.lore || '',
    buffs: [],
    debuffs: [],
    quests: [],
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
    wealth: { gold: 0, silver: 0, bronze: 0 },
    coinPile: [],
    satiety: 0,
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

// B4: щит больше не пассивная броня — переносим старый мод `armor` щита в его
// собственный мод `shieldGuard` (активная проверка). Остальные предметы (в т.ч.
// латные наручи на `armor`) не трогаем. Мутирует и возвращает переданный предмет.
function migrateShieldItem(item) {
  if (!item || item.classId !== 'shield' || !item.mods) return item;
  const mods = item.mods;
  if (mods.armor != null && mods.shieldGuard == null) {
    mods.shieldGuard = mods.armor;
  }
  delete mods.armor;
  return item;
}

// рюкзак грузится «как есть» (без нормализации предметов) — но старым щитам в нём
// тоже нужно переехать с `armor` на `shieldGuard`, иначе экипировка вернёт пассивность
function migrateBackpack(data, base) {
  if (data.backpack?.length !== BACKPACK_COUNT) return base.backpack;
  return data.backpack.map((item) => migrateShieldItem(item));
}

function migrateEquipment(data, base) {
  const eq = { ...base.equipment, ...(data.equipment || {}) };

  if (eq.accessory && (!eq.ring?.name && !eq.necklace?.name)) {
    eq.ring = { ...eq.accessory };
  }
  delete eq.accessory;

  [...EQUIPMENT_SLOTS, ...EXTRA_SLOTS].forEach(({ key }) => {
    eq[key] = eq[key] ? migrateShieldItem(normalizeItem(eq[key])) : emptyItem();
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
    const identity = migrateIdentity(data);
    return {
      ...base,
      ...data,
      race: identity.race,
      faction: identity.faction,
      stats,
      combat: migrateCombat(data, stats),
      statClass: migrateStatClass(data, base),
      classSkills: migrateClassSkills(data, base),
      combatCustom: migrateCombatCustom(data),
      equipment: migrateEquipment(data, base),
      backpack: migrateBackpack(data, base),
      spells: migrateSpells(data, base),
      ...migrateEffects(data),
      quests: migrateQuests(data),
      wealth: typeof CoinPouch !== 'undefined'
        ? CoinPouch.migrateWealth(data)
        : { gold: 0, silver: 0, bronze: 0 },
      coinPile: typeof CoinPouch !== 'undefined'
        ? CoinPouch.migrateCoinPile(data)
        : (Array.isArray(data.coinPile) ? data.coinPile : []),
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
  return migrateSheetData(data, base);
}

function migrateSheetData(data, base) {
  const stats = { ...base.stats, ...data.stats };
  const identity = migrateIdentity(data);
  return {
    ...base,
    ...data,
    race: identity.race,
    faction: identity.faction,
    stats,
    combat: migrateCombat(data, stats),
    statClass: migrateStatClass(data, base),
    classSkills: migrateClassSkills(data, base),
    combatCustom: migrateCombatCustom(data),
    equipment: migrateEquipment(data, base),
    backpack: migrateBackpack(data, base),
    spells: migrateSpells(data, base),
    ...migrateEffects(data),
    quests: migrateQuests(data),
    wealth: typeof CoinPouch !== 'undefined'
      ? CoinPouch.migrateWealth(data)
      : { gold: 0, silver: 0, bronze: 0 },
    coinPile: typeof CoinPouch !== 'undefined'
      ? CoinPouch.migrateCoinPile(data)
      : (Array.isArray(data.coinPile) ? data.coinPile : []),
  };
}

/**
 * Принять версию листа с сервера (правка мастера или другой вкладки)
 * и перерисовать лист, не затирая её локальной копией.
 */
function adoptRemoteSheet(data) {
  if (!data || typeof data !== 'object') return;
  clearTimeout(saveTimer);
  const next = migrateSheetData(data, defaultSheet(catalogChar));
  next.rev = data.rev;
  sheet = next;
  renderSheet();
  window.dispatchEvent(new CustomEvent('gob-sheet-refresh'));
}

/** Живое обновление листа: сервер шлёт rev при каждой чужой правке. */
function initSheetSync() {
  if (!catalogChar?.isUser || typeof watchUserSheet !== 'function') return;
  watchUserSheet(id, async (payload) => {
    if (Number(payload?.rev) <= Number(sheet?.rev ?? 0)) return;
    const fresh = typeof loadUserSheet === 'function' ? await loadUserSheet(id) : null;
    if (fresh) adoptRemoteSheet(fresh);
  });
}

function syncUserCardCatalog() {
  // Чужой герой (мы за него как мастер) — в свой каталог его не пишем.
  if (catalogChar?.isForeign) return;
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
      if (result?.conflict && result.sheet) {
        // Лист успели изменить (мастер или другая вкладка) — берём версию сервера.
        adoptRemoteSheet(result.sheet);
        hint.textContent = 'Лист обновлён мастером';
        hint.classList.add('visible');
        setTimeout(() => hint.classList.remove('visible'), 3000);
        return;
      }
      if (!result?.ok) {
        hint.textContent = result?.error ? `Ошибка: ${result.error}` : 'Не удалось сохранить';
        hint.classList.add('visible');
        setTimeout(() => hint.classList.remove('visible'), 3000);
        return;
      }
      if (result.rev !== undefined) sheet.rev = result.rev;
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

function bindIdentityCombo(input, listEl, datalistId, options, path) {
  const root = input.closest('.identity-combo');
  const toggle = root?.querySelector('.identity-combo__toggle');
  let highlight = -1;
  let suppressBlurClose = false;

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
  };

  function filtered(query) {
    const q = String(query ?? '').trim().toLowerCase();
    if (!q) return [...options];
    return options.filter((item) => item.toLowerCase().includes(q));
  }

  function updateHighlight() {
    listEl.querySelectorAll('.identity-combo__option').forEach((el, i) => {
      el.classList.toggle('is-highlighted', i === highlight);
      if (i === highlight) el.scrollIntoView({ block: 'nearest' });
    });
  }

  function closeList() {
    listEl.hidden = true;
    root?.classList.remove('is-open');
    if (!isIdentityNativeMode()) {
      input.setAttribute('aria-expanded', 'false');
    }
    highlight = -1;
  }

  function openList() {
    if (isIdentityNativeMode()) return;
    if (listEl.hidden) {
      listEl.hidden = false;
      root?.classList.add('is-open');
      input.setAttribute('aria-expanded', 'true');
    }
  }

  function renderList(items) {
    if (isIdentityNativeMode()) return;

    const current = String(input.value ?? '').trim();
    listEl.innerHTML = '';

    if (!items.length) {
      const empty = document.createElement('li');
      empty.className = 'identity-combo__empty';
      empty.textContent = 'Нет совпадений — можно ввести своё';
      listEl.appendChild(empty);
      openList();
      highlight = -1;
      return;
    }

    items.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'identity-combo__option';
      li.role = 'option';
      li.textContent = item;
      if (item === current) li.classList.add('is-selected');
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        suppressBlurClose = true;
      });
      li.addEventListener('click', () => {
        input.value = item;
        set(item);
        closeList();
        suppressBlurClose = false;
      });
      listEl.appendChild(li);
    });

    openList();
    highlight = -1;
  }

  function refreshList() {
    if (isIdentityNativeMode()) return;
    renderList(filtered(input.value));
  }

  function syncInputMode() {
    if (isIdentityNativeMode()) {
      fillIdentityDatalist(datalistId, options);
      input.setAttribute('list', datalistId);
      input.removeAttribute('role');
      input.removeAttribute('aria-expanded');
      input.removeAttribute('aria-controls');
      input.removeAttribute('aria-autocomplete');
      closeList();
      return;
    }

    input.removeAttribute('list');
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'false');
    if (listEl.id) input.setAttribute('aria-controls', listEl.id);
    input.setAttribute('aria-autocomplete', 'list');
  }

  input.value = get();
  syncInputMode();

  input.addEventListener('input', () => {
    set(input.value);
    refreshList();
  });

  input.addEventListener('focus', refreshList);

  input.addEventListener('blur', () => {
    if (isIdentityNativeMode()) return;
    if (suppressBlurClose) {
      suppressBlurClose = false;
      return;
    }
    setTimeout(closeList, 120);
  });

  input.addEventListener('keydown', (e) => {
    if (isIdentityNativeMode()) return;

    const items = listEl.querySelectorAll('.identity-combo__option');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (listEl.hidden) refreshList();
      if (!items.length) return;
      highlight = Math.min(highlight + 1, items.length - 1);
      updateHighlight();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (listEl.hidden) refreshList();
      if (!items.length) return;
      highlight = Math.max(highlight - 1, 0);
      updateHighlight();
      return;
    }
    if (e.key === 'Enter' && !listEl.hidden && highlight >= 0 && items[highlight]) {
      e.preventDefault();
      const value = items[highlight].textContent;
      input.value = value;
      set(value);
      closeList();
      return;
    }
    if (e.key === 'Escape') {
      closeList();
    }
  });

  toggle?.addEventListener('mousedown', (e) => {
    e.preventDefault();
    suppressBlurClose = true;
  });

  toggle?.addEventListener('click', () => {
    if (isIdentityNativeMode()) return;
    if (listEl.hidden) {
      input.focus();
      refreshList();
    } else {
      closeList();
    }
    suppressBlurClose = false;
  });

  document.addEventListener('mousedown', (e) => {
    if (isIdentityNativeMode()) return;
    if (!root?.contains(e.target)) closeList();
  });

  window.addEventListener('gobmobilechange', syncInputMode);
}

function satietyCap() {
  return (parseInt(sheet.stats?.str, 10) || 0) + (parseInt(sheet.stats?.end, 10) || 0);
}

function parseSatietyInput(raw) {
  const text = String(raw ?? '').trim();
  if (!text || text === '-') return 0;
  const n = parseInt(text, 10);
  return Number.isFinite(n) ? n : 0;
}

function formatSatietyValue(value) {
  if (value > 0) return `+${value}`;
  return String(value);
}

function satietyDigestMessage(value) {
  const damage = Math.abs(value);
  return `В скором времени ты начнёшь переваривать самого себя и получишь урон = ${damage}.`;
}

function renderSatietyTicks(cap) {
  const host = document.getElementById('satiety-ticks');
  if (!host) return;

  const scaleCap = Math.max(cap, 1);
  const ticks = [];
  for (let i = 0; i <= cap; i += 1) {
    const tick = document.createElement('span');
    tick.className = `satiety-bar__tick${i === cap ? ' satiety-bar__tick--cap' : ''}`;
    tick.style.left = `${(i / scaleCap) * 100}%`;
    ticks.push(tick);
  }

  host.replaceChildren(...ticks);
}

function setSatietyValue(next) {
  sheet.satiety = parseInt(next, 10) || 0;
  scheduleSave();
  updateSatietyBar();
}

function updateSatietyBar() {
  const block = document.getElementById('satiety-block');
  const input = document.getElementById('satiety-value');
  const capEl = document.getElementById('satiety-cap');
  const fill = document.getElementById('satiety-fill');
  const overflowWrap = document.getElementById('satiety-overflow-wrap');
  const overflowEl = document.getElementById('satiety-overflow');
  const warningWrap = document.getElementById('satiety-warning-wrap');
  const warningEl = document.getElementById('satiety-warning');
  const hintEl = document.getElementById('satiety-hint');
  const barWrap = document.getElementById('satiety-bar-wrap');
  if (!block || !input || !capEl || !fill) return;

  const cap = satietyCap();
  const value = parseInt(sheet.satiety, 10) || 0;
  const scaleCap = Math.max(cap, 1);
  const magnitude = value > 0 ? value : value < 0 ? -value : 0;

  if (document.activeElement !== input) {
    input.value = formatSatietyValue(value);
  }
  capEl.textContent = String(cap);
  renderSatietyTicks(cap);

  const fillPct = (Math.min(magnitude, cap) / scaleCap) * 100;
  fill.style.width = `${fillPct}%`;
  fill.classList.toggle('satiety-bar__fill--pos', value > 0);
  fill.classList.toggle('satiety-bar__fill--neg', value < 0);

  const overPos = value > cap ? value - cap : 0;
  const overNeg = value < -cap ? Math.abs(value + cap) : 0;
  const isOverfed = overPos > 0;
  const isStarved = overNeg > 0;
  const isNegative = value < 0;

  block.classList.toggle('is-overfed', isOverfed);
  block.classList.toggle('is-starved', isStarved);
  block.classList.toggle('is-starving', isNegative);

  if (warningWrap && warningEl) {
    if (isNegative) {
      warningWrap.hidden = false;
      const message = satietyDigestMessage(value);
      warningEl.title = message;
      warningEl.setAttribute('aria-label', message);
    } else {
      warningWrap.hidden = true;
      warningEl.title = '';
      warningEl.setAttribute('aria-label', 'Опасность истощения');
    }
  }

  if (overflowWrap && overflowEl) {
    if (isOverfed) {
      overflowWrap.hidden = false;
      overflowEl.textContent = `+${overPos}`;
      overflowEl.title = 'Превышение сытости';
    } else if (isStarved) {
      overflowWrap.hidden = false;
      overflowEl.textContent = `−${overNeg}`;
      overflowEl.title = 'Превышение истощения';
    } else {
      overflowWrap.hidden = true;
      overflowEl.textContent = '0';
    }
  }

  if (hintEl) {
    const hints = [];
    if (isNegative) hints.push(satietyDigestMessage(value));
    if (isOverfed) hints.push('Ты объелся');
    if (isStarved) hints.push('Ужасно истощён');
    if (hints.length) {
      hintEl.hidden = false;
      hintEl.textContent = hints.join(' ');
    } else {
      hintEl.hidden = true;
      hintEl.textContent = '';
    }
  }

  if (barWrap) {
    const parts = [`Сытость: ${formatSatietyValue(value)}`, `Кап: ${cap}`];
    if (isNegative) parts.push(satietyDigestMessage(value));
    if (isOverfed) parts.push('Ты объелся');
    if (isStarved) parts.push('Ужасно истощён');
    barWrap.title = parts.join(' · ');
  }
}

let satietyBound = false;

function bindSatiety() {
  if (satietyBound) return;
  const input = document.getElementById('satiety-value');
  const minusBtn = document.getElementById('satiety-minus');
  const plusBtn = document.getElementById('satiety-plus');
  if (!input) return;
  satietyBound = true;

  minusBtn?.addEventListener('click', () => {
    setSatietyValue((parseInt(sheet.satiety, 10) || 0) - 1);
  });

  plusBtn?.addEventListener('click', () => {
    setSatietyValue((parseInt(sheet.satiety, 10) || 0) + 1);
  });

  input.addEventListener('input', () => {
    const cleaned = input.value.replace(/[^\d-]/g, '');
    if (cleaned !== input.value) input.value = cleaned;
    sheet.satiety = parseSatietyInput(input.value);
    scheduleSave();
    updateSatietyBar();
  });

  input.addEventListener('blur', () => {
    sheet.satiety = parseSatietyInput(input.value);
    input.value = formatSatietyValue(sheet.satiety);
    scheduleSave();
    updateSatietyBar();
  });
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
      if (key === 'str' || key === 'end') updateSatietyBar();
      if (selectedSlot && resolveItemClassContext(selectedSlot.group, selectedSlot.key)) {
        renderReqHint(selectedSlot.group, selectedSlot.key);
      }
    });
    slot.appendChild(cell);
    applyStatTierFrame(cell, key);
    applyStatCritical(key);
    bindCombatHint(cell, () => statTooltipHtml(key));
    grid.appendChild(slot);
  });
  updateSatietyBar();
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
      // по-предметная строка щита: combat-row-shieldGuard-<рука> — источник только этот щит
      const shieldSlot = /^combat-row-shieldGuard-(leftHand|rightHand)$/.exec(rowId)?.[1];
      if (shieldSlot) {
        return { stat: null, sources: [
          ...equipmentModSources('shieldGuard').filter((s) => s.slotKey === shieldSlot),
          ...customSourceEntries(rowId),
        ] };
      }
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

function isItemEmpty(item) {
  return !String(item?.name ?? '').trim() && !item?.classId;
}

function isMirrorHandSlot(slotKey) {
  return isHandSlot(slotKey) && Boolean(sheet.equipment[slotKey]?.mirror);
}

function canEquipBackpackItemToSlot(backpackIndex, equipSlotKey) {
  const item = sheet.backpack[backpackIndex];
  if (isItemEmpty(item)) return false;
  if (!slotSupportsClasses(equipSlotKey)) return false;
  if (!item.classId) return false;
  if (!findItemClass(equipSlotKey, item.classId)) return false;
  if (isMirrorHandSlot(equipSlotKey)) return false;
  // двуручное оружие нельзя надеть, если вторая рука занята — иначе затрёт её предмет (B5)
  if (isTwoHanded(equipSlotKey, item) && otherHandBlocksTwoHanded(equipSlotKey)) return false;
  return true;
}

function refreshOpenSlotEditor() {
  if (!selectedSlot) return;
  const { group, key } = selectedSlot;
  const item = getItem(group, key);
  document.getElementById('slot-name').value = item.name;
  document.getElementById('slot-desc').value = item.desc;
  renderClassSection(group, key);
}

function equipFromBackpack(backpackIndex, equipSlotKey) {
  if (!canEquipBackpackItemToSlot(backpackIndex, equipSlotKey)) return false;

  const backpackItem = sheet.backpack[backpackIndex];
  const currentEquip = sheet.equipment[equipSlotKey];
  const hasCurrentEquip = !isItemEmpty(currentEquip);

  sheet.equipment[equipSlotKey] = cloneItem(backpackItem);
  delete sheet.equipment[equipSlotKey].mirror;

  if (hasCurrentEquip) {
    sheet.backpack[backpackIndex] = cloneItem(currentEquip);
    delete sheet.backpack[backpackIndex].mirror;
  } else {
    sheet.backpack[backpackIndex] = emptyItem();
  }

  reconcileHands(equipSlotKey);
  scheduleSave();
  updateSlotUI('backpack', backpackIndex);
  updateSlotUI('equipment', equipSlotKey);
  updateSlotWarnings();
  updateCombatValues();
  refreshOpenSlotEditor();
  return true;
}

function moveEquipToBackpack(equipSlotKey, backpackIndex) {
  if (isMirrorHandSlot(equipSlotKey)) return false;
  const equipItem = sheet.equipment[equipSlotKey];
  if (isItemEmpty(equipItem)) return false;

  const backpackItem = sheet.backpack[backpackIndex];
  if (!isItemEmpty(backpackItem)) return false;

  sheet.backpack[backpackIndex] = cloneItem(equipItem);
  delete sheet.backpack[backpackIndex].mirror;
  sheet.equipment[equipSlotKey] = emptyItem();

  reconcileHands(equipSlotKey);
  scheduleSave();
  updateSlotUI('backpack', backpackIndex);
  updateSlotUI('equipment', equipSlotKey);
  updateSlotWarnings();
  updateCombatValues();
  refreshOpenSlotEditor();
  return true;
}

const CHAR_BACKPACK_DRAG_MIME = 'application/x-gob-char-backpack-index';
const CHAR_EQUIP_DRAG_MIME = 'application/x-gob-char-equip-slot';
let draggingBackpackIndex = null;
let draggingEquipSlotKey = null;

function clearEquipDropHighlights() {
  document.querySelectorAll('.item-slot[data-group="equipment"]').forEach((btn) => {
    btn.classList.remove('item-slot--drop-valid', 'item-slot--drop-invalid', 'is-dragover');
  });
}

function clearBackpackDropHighlights() {
  document.querySelectorAll('.item-slot[data-group="backpack"]').forEach((btn) => {
    btn.classList.remove('item-slot--drop-valid', 'item-slot--drop-invalid', 'is-dragover');
  });
}

function clearAllDragHighlights() {
  clearEquipDropHighlights();
  clearBackpackDropHighlights();
}

function highlightEquipDropTargets(backpackIndex) {
  clearAllDragHighlights();
  document.querySelectorAll('.item-slot[data-group="equipment"]').forEach((btn) => {
    const slotKey = btn.dataset.slot;
    if (!slotSupportsClasses(slotKey)) return;
    const valid = canEquipBackpackItemToSlot(backpackIndex, slotKey);
    btn.classList.toggle('item-slot--drop-valid', valid);
    btn.classList.toggle('item-slot--drop-invalid', !valid);
  });
}

function highlightBackpackDropTargets() {
  clearAllDragHighlights();
  document.querySelectorAll('.item-slot[data-group="backpack"]').forEach((btn) => {
    const index = btn.dataset.slot;
    const empty = isItemEmpty(sheet.backpack[index]);
    btn.classList.toggle('item-slot--drop-valid', empty);
    btn.classList.toggle('item-slot--drop-invalid', !empty);
  });
}

function canDropItemOn(fromGroup, fromKey, toGroup, toKey) {
  if (fromGroup === 'backpack' && toGroup === 'equipment') {
    return canEquipBackpackItemToSlot(fromKey, toKey);
  }
  if (fromGroup === 'equipment' && toGroup === 'backpack') {
    return !isMirrorHandSlot(fromKey) && isItemEmpty(sheet.backpack[toKey]);
  }
  return false;
}

function executeItemMove(fromGroup, fromKey, toGroup, toKey) {
  if (fromGroup === 'backpack' && toGroup === 'equipment') {
    return equipFromBackpack(fromKey, toKey);
  }
  if (fromGroup === 'equipment' && toGroup === 'backpack') {
    return moveEquipToBackpack(fromKey, toKey);
  }
  return false;
}

function highlightMoveTargets(fromGroup, fromKey) {
  if (fromGroup === 'backpack') highlightEquipDropTargets(fromKey);
  else if (fromGroup === 'equipment') highlightBackpackDropTargets();
}

function slotCanBeDragSource(group, key) {
  if (isItemEmpty(getItem(group, key))) return false;
  if (group === 'equipment' && isMirrorHandSlot(key)) return false;
  return true;
}

function slotIsHtmlDraggable(group, key) {
  if (isTouchRuneMode()) return false;
  return slotCanBeDragSource(group, key);
}

function getItemSlotAtPoint(x, y) {
  const el = document.elementFromPoint(x, y)?.closest('.item-slot');
  if (!el?.dataset.group) return null;
  return { group: el.dataset.group, key: el.dataset.slot, el };
}

function isTouchItemMoveMode() {
  return isTouchRuneMode();
}

let itemTouchDrag = null;
let itemMovePick = null;
let itemTouchSuppressedClick = false;
let itemLongPressTimer = null;
let itemLongPressPicked = false;
let touchDragHoverEl = null;

function clearItemLongPress() {
  if (itemLongPressTimer) {
    clearTimeout(itemLongPressTimer);
    itemLongPressTimer = null;
  }
}

function removeTouchItemGhost() {
  document.getElementById('item-touch-ghost')?.remove();
}

function createTouchItemGhost(group, key, x, y) {
  removeTouchItemGhost();
  const item = getItem(group, key);
  const ctx = resolveItemClassContext(group, key);
  const ghost = document.createElement('div');
  ghost.id = 'item-touch-ghost';
  ghost.className = 'item-slot-touch-ghost';
  ghost.textContent = item.name || ctx?.cls?.label || 'Предмет';
  ghost.style.left = `${x}px`;
  ghost.style.top = `${y}px`;
  document.body.appendChild(ghost);
}

function moveTouchItemGhost(x, y) {
  const ghost = document.getElementById('item-touch-ghost');
  if (!ghost) return;
  ghost.style.left = `${x}px`;
  ghost.style.top = `${y}px`;
}

function updateTouchDragHover(x, y, fromGroup, fromKey) {
  const target = getItemSlotAtPoint(x, y);
  const next = target?.el ?? null;
  if (touchDragHoverEl === next) return;
  touchDragHoverEl?.classList.remove('is-dragover');
  touchDragHoverEl = next;
  if (!next) return;
  if (canDropItemOn(fromGroup, fromKey, target.group, target.key)) {
    next.classList.add('is-dragover');
  }
}

function cleanupTouchDrag(sourceBtn) {
  const btn = sourceBtn || itemTouchDrag?.btn;
  btn?.classList.remove('is-dragging');
  removeTouchItemGhost();
  touchDragHoverEl?.classList.remove('is-dragover');
  touchDragHoverEl = null;
  clearAllDragHighlights();
  document.documentElement.classList.remove('gob-item-touch-drag');
  itemTouchDrag = null;
}

function clearItemMovePick() {
  itemMovePick = null;
  itemLongPressPicked = false;
  document.querySelectorAll('.item-slot--pick-source').forEach((el) => {
    el.classList.remove('item-slot--pick-source');
  });
  clearAllDragHighlights();
  document.getElementById('item-move-hint')?.remove();
}

function showItemMoveHint(text) {
  let hint = document.getElementById('item-move-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'item-move-hint';
    hint.className = 'item-move-hint';
    document.body.appendChild(hint);
  }
  hint.textContent = text;
  hint.hidden = false;
}

function startItemMovePick(group, key) {
  if (!slotCanBeDragSource(group, key)) return;
  clearItemMovePick();
  itemMovePick = { group, key };
  document.querySelector(`.item-slot[data-group="${group}"][data-slot="${key}"]`)
    ?.classList.add('item-slot--pick-source');
  highlightMoveTargets(group, key);
  showItemMoveHint('Нажмите слот назначения');
  navigator.vibrate?.(12);
}

function handleItemMovePickTap(group, key) {
  if (!itemMovePick) return false;
  const { group: fromGroup, key: fromKey } = itemMovePick;
  if (fromGroup === group && String(fromKey) === String(key)) {
    clearItemMovePick();
    return true;
  }
  if (canDropItemOn(fromGroup, fromKey, group, key)) {
    executeItemMove(fromGroup, fromKey, group, key);
    clearItemMovePick();
    itemTouchSuppressedClick = true;
    return true;
  }
  navigator.vibrate?.([20, 40, 20]);
  return true;
}

function handleItemSlotClick(group, key, label) {
  if (itemTouchSuppressedClick) {
    itemTouchSuppressedClick = false;
    return;
  }
  if (itemMovePick) {
    handleItemMovePickTap(group, key);
    return;
  }
  selectSlot(group, key, label);
}

function bindTouchItemDrop(btn, group, slotKey) {
  if (!isTouchItemMoveMode()) return;

  btn.addEventListener('pointerup', (e) => {
    if (!itemMovePick || itemTouchDrag?.active) return;
    const { group: fromGroup, key: fromKey } = itemMovePick;

    if (fromGroup === group && String(fromKey) === String(slotKey)) {
      if (itemLongPressPicked) {
        itemLongPressPicked = false;
        itemTouchSuppressedClick = true;
        return;
      }
      clearItemMovePick();
      itemTouchSuppressedClick = true;
      return;
    }

    if (!canDropItemOn(fromGroup, fromKey, group, slotKey)) {
      navigator.vibrate?.([20, 40, 20]);
      itemTouchSuppressedClick = true;
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    executeItemMove(fromGroup, fromKey, group, slotKey);
    clearItemMovePick();
    itemTouchSuppressedClick = true;
  });
}

function bindTouchItemMove(btn, group, slotKey, label) {
  if (!isTouchItemMoveMode()) return;

  btn.addEventListener('pointerdown', (e) => {
    if (!slotCanBeDragSource(group, slotKey)) return;

    clearItemLongPress();
    itemTouchDrag = {
      group,
      key: slotKey,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      active: false,
      btn,
    };
    try {
      btn.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    itemLongPressTimer = window.setTimeout(() => {
      itemLongPressTimer = null;
      if (itemTouchDrag?.active) return;
      itemLongPressPicked = true;
      itemTouchSuppressedClick = true;
      itemTouchDrag = null;
      startItemMovePick(group, slotKey);
    }, 480);
  }, { passive: true });

  btn.addEventListener('pointermove', (e) => {
    if (!itemTouchDrag || e.pointerId !== itemTouchDrag.pointerId) return;
    const dx = e.clientX - itemTouchDrag.startX;
    const dy = e.clientY - itemTouchDrag.startY;
    if (!itemTouchDrag.active) {
      if (Math.hypot(dx, dy) < 10) return;
      clearItemLongPress();
      clearItemMovePick();
      itemTouchDrag.active = true;
      itemTouchSuppressedClick = true;
      document.documentElement.classList.add('gob-item-touch-drag');
      btn.classList.add('is-dragging');
      createTouchItemGhost(group, slotKey, e.clientX, e.clientY);
      highlightMoveTargets(group, slotKey);
    }
    moveTouchItemGhost(e.clientX, e.clientY);
    updateTouchDragHover(e.clientX, e.clientY, group, slotKey);
  });

  const endTouchDrag = (e) => {
    if (!itemTouchDrag || e.pointerId !== itemTouchDrag.pointerId) return;
    clearItemLongPress();
    try {
      btn.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    if (itemTouchDrag.active) {
      const target = getItemSlotAtPoint(e.clientX, e.clientY);
      if (target && canDropItemOn(group, slotKey, target.group, target.key)) {
        executeItemMove(group, slotKey, target.group, target.key);
        itemTouchSuppressedClick = true;
      }
      cleanupTouchDrag(btn);
      return;
    }
    itemTouchDrag = null;
  };

  btn.addEventListener('pointerup', endTouchDrag);
  btn.addEventListener('pointercancel', endTouchDrag);
}

function bindBackpackSlotDrag(btn, slotKey) {
  btn.addEventListener('dragstart', (e) => {
    const item = sheet.backpack[slotKey];
    if (isItemEmpty(item)) {
      e.preventDefault();
      return;
    }
    draggingBackpackIndex = slotKey;
    draggingEquipSlotKey = null;
    e.dataTransfer.setData(CHAR_BACKPACK_DRAG_MIME, String(slotKey));
    e.dataTransfer.effectAllowed = 'move';
    btn.classList.add('is-dragging');
    highlightEquipDropTargets(slotKey);
  });

  btn.addEventListener('dragend', () => {
    btn.classList.remove('is-dragging');
    draggingBackpackIndex = null;
    clearAllDragHighlights();
  });
}

function bindBackpackSlotDrop(btn, backpackIndex) {
  btn.addEventListener('dragover', (e) => {
    if (!e.dataTransfer.types.includes(CHAR_EQUIP_DRAG_MIME)) return;
    if (draggingEquipSlotKey == null || isMirrorHandSlot(draggingEquipSlotKey)) return;
    if (!isItemEmpty(sheet.backpack[backpackIndex])) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    btn.classList.add('is-dragover');
  });

  btn.addEventListener('dragleave', (e) => {
    if (!btn.contains(e.relatedTarget)) btn.classList.remove('is-dragover');
  });

  btn.addEventListener('drop', (e) => {
    if (!e.dataTransfer.types.includes(CHAR_EQUIP_DRAG_MIME)) return;
    e.preventDefault();
    btn.classList.remove('is-dragover');
    const equipSlotKey = draggingEquipSlotKey;
    if (equipSlotKey == null) return;
    moveEquipToBackpack(equipSlotKey, backpackIndex);
    draggingEquipSlotKey = null;
    clearAllDragHighlights();
  });
}

function bindEquipmentSlotDrag(btn, slotKey) {
  btn.addEventListener('dragstart', (e) => {
    const item = sheet.equipment[slotKey];
    if (isItemEmpty(item) || isMirrorHandSlot(slotKey)) {
      e.preventDefault();
      return;
    }
    draggingEquipSlotKey = slotKey;
    draggingBackpackIndex = null;
    e.dataTransfer.setData(CHAR_EQUIP_DRAG_MIME, String(slotKey));
    e.dataTransfer.effectAllowed = 'move';
    btn.classList.add('is-dragging');
    highlightBackpackDropTargets();
  });

  btn.addEventListener('dragend', () => {
    btn.classList.remove('is-dragging');
    draggingEquipSlotKey = null;
    clearAllDragHighlights();
  });
}

function bindEquipmentSlotDrop(btn, slotKey) {
  if (!slotSupportsClasses(slotKey)) return;

  btn.addEventListener('dragover', (e) => {
    if (!e.dataTransfer.types.includes(CHAR_BACKPACK_DRAG_MIME)) return;
    const backpackIndex = draggingBackpackIndex;
    if (backpackIndex == null) return;
    if (!canEquipBackpackItemToSlot(backpackIndex, slotKey)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    btn.classList.add('is-dragover');
  });

  btn.addEventListener('dragleave', (e) => {
    if (!btn.contains(e.relatedTarget)) btn.classList.remove('is-dragover');
  });

  btn.addEventListener('drop', (e) => {
    if (!e.dataTransfer.types.includes(CHAR_BACKPACK_DRAG_MIME)) return;
    e.preventDefault();
    btn.classList.remove('is-dragover');
    const backpackIndex = draggingBackpackIndex;
    if (backpackIndex == null) return;
    equipFromBackpack(backpackIndex, slotKey);
    draggingBackpackIndex = null;
    clearAllDragHighlights();
  });
}

function paintSlotButton(btn, slotDef, slotKey, group) {
  const item = group === 'backpack' ? sheet.backpack[slotKey] : sheet.equipment[slotKey];
  const ctx = resolveItemClassContext(group, slotKey);
  const cls = ctx?.cls ?? null;
  const tierSlotKey = ctx?.slotKey ?? slotKey;
  const fam = cls ? familyDef(cls.family) : null;

  btn.classList.toggle('has-item', Boolean(item.name || cls));
  btn.classList.toggle('item-slot--warning', Boolean(cls && !meetsTierReq(tierSlotKey, item)));
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
  btn.addEventListener('click', () => handleItemSlotClick(group, slotKey, slotDef.label));
  bindTouchItemMove(btn, group, slotKey, slotDef.label);
  bindTouchItemDrop(btn, group, slotKey);
  if (group === 'backpack') {
    btn.draggable = slotIsHtmlDraggable(group, slotKey);
    bindBackpackSlotDrag(btn, slotKey);
    bindBackpackSlotDrop(btn, slotKey);
  } else {
    btn.draggable = slotIsHtmlDraggable(group, slotKey);
    bindEquipmentSlotDrag(btn, slotKey);
    bindEquipmentSlotDrop(btn, slotKey);
  }
  return btn;
}

function renderEquipment() {
  const grid = document.getElementById('equipment-grid');
  grid.innerHTML = '';
  clearItemMovePick();
  cleanupTouchDrag();

  EQUIPMENT_SLOTS.forEach(s => grid.appendChild(createSlotButton(s, s.key, 'equipment')));
  EXTRA_SLOTS.forEach(s => grid.appendChild(createSlotButton(s, s.key, 'equipment')));
}

function renderBackpack() {
  const container = document.getElementById('backpack-slots');
  container.innerHTML = '';
  clearItemMovePick();
  cleanupTouchDrag();
  for (let i = 0; i < BACKPACK_COUNT; i++) {
    container.appendChild(createSlotButton(
      { label: `Слот ${i + 1}`, icon: '📦' },
      i,
      'backpack'
    ));
  }
}

let effectEdit = null;

function effectListKey(type) {
  return type === 'buff' ? 'buffs' : 'debuffs';
}

function renderEffectCard(effect, type) {
  const card = document.createElement('article');
  card.className = `effect-card effect-card--${type}`;
  card.dataset.id = effect.id;
  card.dataset.type = type;

  const glow = document.createElement('div');
  glow.className = 'effect-card__glow';
  glow.setAttribute('aria-hidden', 'true');

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'effect-card__remove';
  removeBtn.title = 'Снять эффект';
  removeBtn.setAttribute('aria-label', 'Снять эффект');
  removeBtn.textContent = '×';

  const name = document.createElement('h4');
  name.className = 'effect-card__name';
  name.textContent = effect.name.trim() || 'Без названия';

  card.append(glow, removeBtn, name);

  if (effect.source.trim()) {
    const source = document.createElement('span');
    source.className = 'effect-card__source';
    source.textContent = effect.source.trim();
    card.appendChild(source);
  }

  if (effect.desc.trim()) {
    const desc = document.createElement('p');
    desc.className = 'effect-card__desc';
    desc.textContent = effect.desc.trim();
    card.appendChild(desc);
  }

  card.addEventListener('click', (e) => {
    if (e.target === removeBtn) return;
    openEffectModal(type, effect.id);
  });

  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    removeEffect(type, effect.id);
  });

  return card;
}

function renderEffects() {
  const buffsList = document.getElementById('buffs-list');
  const debuffsList = document.getElementById('debuffs-list');
  const buffsEmpty = document.getElementById('buffs-empty');
  const debuffsEmpty = document.getElementById('debuffs-empty');
  if (!buffsList || !debuffsList) return;

  buffsList.innerHTML = '';
  debuffsList.innerHTML = '';

  (sheet.buffs ?? []).forEach((e) => buffsList.appendChild(renderEffectCard(e, 'buff')));
  (sheet.debuffs ?? []).forEach((e) => debuffsList.appendChild(renderEffectCard(e, 'debuff')));

  if (buffsEmpty) buffsEmpty.hidden = (sheet.buffs ?? []).length > 0;
  if (debuffsEmpty) debuffsEmpty.hidden = (sheet.debuffs ?? []).length > 0;
}

function removeEffect(type, id) {
  const key = effectListKey(type);
  sheet[key] = (sheet[key] ?? []).filter((e) => e.id !== id);
  scheduleSave();
  renderEffects();
}

function openEffectModal(type, id = null) {
  const modal = document.getElementById('effect-modal');
  const title = document.getElementById('effect-modal-title');
  const removeBtn = document.getElementById('effect-remove');
  const nameInput = document.getElementById('effect-name');
  const sourceInput = document.getElementById('effect-source');
  const descInput = document.getElementById('effect-desc');

  effectEdit = { type, id };

  const isBuff = type === 'buff';
  modal.classList.toggle('effect-modal--buff', isBuff);
  modal.classList.toggle('effect-modal--debuff', !isBuff);

  const existing = id
    ? (sheet[effectListKey(type)] ?? []).find((e) => e.id === id)
    : null;

  title.textContent = existing
    ? (isBuff ? 'Редактировать бафф' : 'Редактировать дебафф')
    : (isBuff ? 'Новый бафф' : 'Новый дебафф');

  nameInput.value = existing?.name ?? '';
  sourceInput.value = existing?.source ?? '';
  descInput.value = existing?.desc ?? '';
  removeBtn.hidden = !existing;

  modal.showModal();
  requestAnimationFrame(() => nameInput.focus());
}

function closeEffectModal() {
  const modal = document.getElementById('effect-modal');
  if (modal?.open) modal.close();
  effectEdit = null;
}

function saveEffectFromModal() {
  if (!effectEdit) return;
  const { type, id } = effectEdit;
  const key = effectListKey(type);
  const name = document.getElementById('effect-name').value.trim();
  const source = document.getElementById('effect-source').value.trim();
  const desc = document.getElementById('effect-desc').value.trim();

  if (!name && !desc) {
    document.getElementById('effect-name').focus();
    return;
  }

  const entry = {
    id: id || uid(),
    name: name || (type === 'buff' ? 'Бафф' : 'Дебафф'),
    source,
    desc,
  };

  const list = [...(sheet[key] ?? [])];
  const idx = id ? list.findIndex((e) => e.id === id) : -1;
  if (idx >= 0) list[idx] = entry;
  else list.push(entry);
  sheet[key] = list;

  scheduleSave();
  renderEffects();
  closeEffectModal();
}

function bindDialogBackdropDismiss(dialog, onClose) {
  if (!dialog) return;
  dialog.addEventListener('mousedown', (e) => {
    if (e.target === dialog) onClose();
  });
}

function bindEffects() {
  document.getElementById('btn-add-buff')?.addEventListener('click', () => openEffectModal('buff'));
  document.getElementById('btn-add-debuff')?.addEventListener('click', () => openEffectModal('debuff'));

  const modal = document.getElementById('effect-modal');
  const form = document.getElementById('effect-form');
  const closeBtn = document.getElementById('effect-modal-close');
  const cancelBtn = document.getElementById('effect-cancel');
  const removeBtn = document.getElementById('effect-remove');

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveEffectFromModal();
  });

  closeBtn?.addEventListener('click', closeEffectModal);
  cancelBtn?.addEventListener('click', closeEffectModal);
  bindDialogBackdropDismiss(modal, closeEffectModal);

  removeBtn?.addEventListener('click', () => {
    if (!effectEdit?.id) return;
    removeEffect(effectEdit.type, effectEdit.id);
    closeEffectModal();
  });
}

let questEdit = null;
let turnedQuestsExpanded = false;

const QUEST_STATUS_RANK = { completed: 0, active: 1, turned_in: 2 };

function sortedQuests() {
  return [...(sheet.quests ?? [])].sort((a, b) => {
    const ra = QUEST_STATUS_RANK[a.status] ?? 1;
    const rb = QUEST_STATUS_RANK[b.status] ?? 1;
    if (ra !== rb) return ra - rb;
    return (a.order ?? 0) - (b.order ?? 0);
  });
}

function findQuest(id) {
  return (sheet.quests ?? []).find((q) => q.id === id);
}

function questFieldRow(icon, label, value, extraClass = '') {
  if (!value?.trim()) return null;
  const row = document.createElement('div');
  row.className = `quest-card__row ${extraClass}`.trim();

  const iconEl = document.createElement('span');
  iconEl.className = 'quest-card__row-icon';
  iconEl.setAttribute('aria-hidden', 'true');
  iconEl.textContent = icon;

  const body = document.createElement('div');
  body.className = 'quest-card__row-body';

  const lbl = document.createElement('span');
  lbl.className = 'quest-card__row-label';
  lbl.textContent = label;

  const val = document.createElement('span');
  val.className = 'quest-card__row-value';
  val.textContent = value.trim();

  body.append(lbl, val);
  row.append(iconEl, body);
  return row;
}

function renderQuestCard(quest) {
  const card = document.createElement('article');
  card.className = 'quest-card';
  card.dataset.id = quest.id;
  if (quest.collapsed) card.classList.add('is-collapsed');
  if (quest.status === 'completed') card.classList.add('quest-card--completed');
  if (quest.status === 'turned_in') card.classList.add('quest-card--turned-in');

  const inner = document.createElement('div');
  inner.className = 'quest-card__inner';

  const accent = document.createElement('div');
  accent.className = 'quest-card__accent';
  accent.setAttribute('aria-hidden', 'true');

  const glow = document.createElement('div');
  glow.className = 'quest-card__glow';
  glow.setAttribute('aria-hidden', 'true');

  const header = document.createElement('header');
  header.className = 'quest-card__header';

  const titleWrap = document.createElement('div');
  titleWrap.className = 'quest-card__title-wrap';

  const scrollMark = document.createElement('span');
  scrollMark.className = 'quest-card__scroll';
  scrollMark.setAttribute('aria-hidden', 'true');
  scrollMark.textContent = 'ᛞ';

  const title = document.createElement('h3');
  title.className = 'quest-card__title';
  title.textContent = quest.summary.trim() || 'Задание без названия';

  titleWrap.append(scrollMark, title);
  header.appendChild(titleWrap);

  const detailsToggle = document.createElement('button');
  detailsToggle.type = 'button';
  detailsToggle.className = 'quest-card__details-toggle';
  detailsToggle.setAttribute('aria-label', 'Свернуть/развернуть детали');
  detailsToggle.setAttribute('aria-expanded', String(!quest.collapsed));
  detailsToggle.innerHTML = '<span aria-hidden="true">▾</span>';
  detailsToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleQuestCollapsed(quest.id);
  });
  header.appendChild(detailsToggle);

  if (quest.status === 'completed') {
    const badge = document.createElement('span');
    badge.className = 'quest-card__badge quest-card__badge--turn-in';
    badge.textContent = 'Сдать квестодателю';
    header.appendChild(badge);
  }

  inner.append(accent, glow, header);

  const details = document.createElement('div');
  details.className = 'quest-card__details';

  if (quest.location.trim()) {
    const origin = document.createElement('div');
    origin.className = 'quest-card__origin';

    const pin = document.createElement('span');
    pin.className = 'quest-card__origin-pin';
    pin.setAttribute('aria-hidden', 'true');

    const body = document.createElement('div');
    body.className = 'quest-card__origin-body';

    const lbl = document.createElement('span');
    lbl.className = 'quest-card__origin-label';
    lbl.textContent = 'Взято в';

    const place = document.createElement('span');
    place.className = 'quest-card__origin-place';
    place.textContent = quest.location.trim();

    body.append(lbl, place);
    origin.append(pin, body);
    details.appendChild(origin);
  }

  const meta = document.createElement('div');
  meta.className = 'quest-card__meta';
  [
    questFieldRow('✦', 'От кого', quest.from),
    questFieldRow('⚖', 'Дополнительные условия', quest.conditions),
  ].filter(Boolean).forEach((el) => meta.appendChild(el));

  if (quest.reward.trim()) {
    const reward = document.createElement('div');
    reward.className = 'quest-card__reward';
    reward.innerHTML = '<span class="quest-card__reward-icon" aria-hidden="true">◎</span>';
    const rewardBody = document.createElement('div');
    rewardBody.className = 'quest-card__reward-body';
    const rewardLbl = document.createElement('span');
    rewardLbl.className = 'quest-card__reward-label';
    rewardLbl.textContent = 'Награда';
    const rewardVal = document.createElement('span');
    rewardVal.className = 'quest-card__reward-value';
    rewardVal.textContent = quest.reward.trim();
    rewardBody.append(rewardLbl, rewardVal);
    reward.appendChild(rewardBody);
    meta.appendChild(reward);
  }

  if (meta.childElementCount) details.appendChild(meta);

  const actions = document.createElement('footer');
  actions.className = 'quest-card__actions';

  const mkBtn = (text, className, handler) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `quest-action-btn ${className}`;
    btn.textContent = text;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handler();
    });
    return btn;
  };

  if (quest.status === 'active') {
    actions.append(
      mkBtn('Выполнено', 'quest-action-btn--complete', () => completeQuest(quest.id)),
      mkBtn('Забыть', 'quest-action-btn--forget', () => forgetQuest(quest.id)),
    );
  } else if (quest.status === 'completed') {
    actions.append(
      mkBtn('Сдать', 'quest-action-btn--turn-in', () => turnInQuest(quest.id)),
      mkBtn('Отменить', 'quest-action-btn--cancel', () => cancelQuestComplete(quest.id)),
    );
  } else if (quest.status === 'turned_in') {
    actions.append(
      mkBtn('Вернуть', 'quest-action-btn--cancel', () => revertTurnInQuest(quest.id)),
      mkBtn('Забыть', 'quest-action-btn--forget', () => forgetQuest(quest.id)),
    );
  }

  details.appendChild(actions);
  inner.appendChild(details);
  card.appendChild(inner);

  card.addEventListener('click', (e) => {
    if (e.target.closest('.quest-action-btn')) return;
    openQuestModal(quest.id);
  });

  return card;
}

function renderQuests() {
  const list = document.getElementById('quests-list');
  const empty = document.getElementById('quests-empty');
  const turnedWrap = document.getElementById('quests-turned');
  const turnedList = document.getElementById('quests-turned-list');
  const turnedTitle = document.getElementById('quests-turned-title');
  const turnedToggle = document.getElementById('quests-turned-toggle');
  const turnedEmpty = document.getElementById('quests-turned-empty');
  if (!list) return;

  list.innerHTML = '';
  if (turnedList) turnedList.innerHTML = '';

  const quests = sortedQuests();
  const activeQuests = quests.filter((q) => q.status !== 'turned_in');
  const turnedQuests = quests.filter((q) => q.status === 'turned_in');

  activeQuests.forEach((q) => list.appendChild(renderQuestCard(q)));
  turnedQuests.forEach((q) => turnedList?.appendChild(renderQuestCard(q)));

  if (empty) empty.hidden = activeQuests.length > 0;
  if (turnedWrap) turnedWrap.hidden = turnedQuests.length === 0;
  if (turnedTitle) turnedTitle.textContent = `Сданные задания (${turnedQuests.length})`;
  if (turnedToggle) turnedToggle.setAttribute('aria-expanded', String(turnedQuestsExpanded));
  if (turnedList) turnedList.hidden = !turnedQuestsExpanded;
  if (turnedEmpty) turnedEmpty.hidden = turnedQuests.length > 0 || !turnedQuestsExpanded;
}

function toggleQuestCollapsed(id) {
  const idx = (sheet.quests ?? []).findIndex((q) => q.id === id);
  if (idx < 0) return;
  const current = sheet.quests[idx];
  sheet.quests[idx] = { ...current, collapsed: !current.collapsed };
  scheduleSave();
  renderQuests();
}

function toggleTurnedQuests(expanded) {
  turnedQuestsExpanded = expanded;
  localStorage.setItem('gob-quests-turned-expanded', expanded ? '1' : '0');
  renderQuests();
}

function updateQuest(id, patch) {
  const idx = (sheet.quests ?? []).findIndex((q) => q.id === id);
  if (idx < 0) return;
  sheet.quests[idx] = { ...sheet.quests[idx], ...patch };
  scheduleSave();
  renderQuests();
}

function completeQuest(id) {
  const q = findQuest(id);
  if (!q || q.status !== 'active') return;
  updateQuest(id, { status: 'completed' });
}

function cancelQuestComplete(id) {
  const q = findQuest(id);
  if (!q || q.status !== 'completed') return;
  updateQuest(id, { status: 'active' });
}

function turnInQuest(id) {
  const q = findQuest(id);
  if (!q || q.status !== 'completed') return;
  updateQuest(id, { status: 'turned_in' });
}

function revertTurnInQuest(id) {
  const q = findQuest(id);
  if (!q || q.status !== 'turned_in') return;
  updateQuest(id, { status: 'completed' });
}

function forgetQuest(id) {
  const q = findQuest(id);
  if (!q || q.status === 'completed') return;
  sheet.quests = (sheet.quests ?? []).filter((item) => item.id !== id);
  scheduleSave();
  renderQuests();
}

function openQuestModal(id = null) {
  const modal = document.getElementById('quest-modal');
  const title = document.getElementById('quest-modal-title');
  const statusRow = document.getElementById('quest-status-row');
  const completedCheck = document.getElementById('quest-completed-check');

  const editId = id || null;
  questEdit = editId;

  const existing = editId ? findQuest(editId) : null;
  const isNew = !existing;

  title.textContent = isNew ? 'Новое задание' : 'Редактировать задание';
  document.getElementById('quest-from').value = existing?.from ?? '';
  document.getElementById('quest-summary').value = existing?.summary ?? '';
  document.getElementById('quest-location').value = existing?.location ?? '';
  document.getElementById('quest-reward').value = existing?.reward ?? '';
  document.getElementById('quest-conditions').value = existing?.conditions ?? '';

  const canToggleComplete = !isNew && existing.status !== 'turned_in';
  statusRow.hidden = !canToggleComplete;
  completedCheck.checked = canToggleComplete && existing.status === 'completed';
  completedCheck.disabled = !canToggleComplete;

  modal.showModal();
  requestAnimationFrame(() => document.getElementById('quest-summary').focus());
}

function closeQuestModal() {
  const modal = document.getElementById('quest-modal');
  if (modal?.open) modal.close();
  questEdit = null;
}

function saveQuestFromModal() {
  const from = document.getElementById('quest-from').value.trim();
  const summary = document.getElementById('quest-summary').value.trim();
  const location = document.getElementById('quest-location').value.trim();
  const reward = document.getElementById('quest-reward').value.trim();
  const conditions = document.getElementById('quest-conditions').value.trim();

  if (!summary && !from && !location) {
    document.getElementById('quest-summary').focus();
    return;
  }

  const completedCheck = document.getElementById('quest-completed-check');
  const statusRow = document.getElementById('quest-status-row');
  const existing = questEdit ? findQuest(questEdit) : null;
  const isNew = !existing;

  let status = existing?.status ?? 'active';
  if (isNew) {
    status = 'active';
  } else if (existing.status === 'turned_in') {
    status = 'turned_in';
  } else if (statusRow && !statusRow.hidden) {
    status = completedCheck.checked ? 'completed' : 'active';
  }

  const entry = {
    id: questEdit || uid(),
    from,
    summary: summary || 'Задание',
    location,
    reward,
    conditions,
    status,
    order: existing?.order ?? Date.now(),
    collapsed: existing?.collapsed ?? false,
  };

  const list = [...(sheet.quests ?? [])];
  const idx = questEdit ? list.findIndex((q) => q.id === questEdit) : -1;
  if (idx >= 0) list[idx] = entry;
  else list.push(entry);
  sheet.quests = list;

  scheduleSave();
  renderQuests();
  closeQuestModal();
}

function bindQuests() {
  document.getElementById('btn-add-quest')?.addEventListener('click', () => openQuestModal());

  const modal = document.getElementById('quest-modal');
  const form = document.getElementById('quest-form');
  const closeBtn = document.getElementById('quest-modal-close');
  const cancelBtn = document.getElementById('quest-cancel');
  const turnedToggle = document.getElementById('quests-turned-toggle');

  turnedQuestsExpanded = localStorage.getItem('gob-quests-turned-expanded') === '1';

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveQuestFromModal();
  });

  closeBtn?.addEventListener('click', closeQuestModal);
  cancelBtn?.addEventListener('click', closeQuestModal);
  turnedToggle?.addEventListener('click', () => toggleTurnedQuests(!turnedQuestsExpanded));
  bindDialogBackdropDismiss(modal, closeQuestModal);
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
  if (group === 'backpack') {
    btn.draggable = slotIsHtmlDraggable(group, key);
  } else {
    btn.draggable = slotIsHtmlDraggable(group, key);
  }
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
  const ctx = resolveItemClassContext(group, key);
  const equipmentClassSlot = group === 'equipment' && slotSupportsClasses(key);
  const backpackWithClass = group === 'backpack' && ctx;

  if (!equipmentClassSlot && !backpackWithClass) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  if (equipmentClassSlot) renderClassPicker(key);
  else renderBackpackClassInfo(ctx);
  renderTierPicker(group, key);
  renderModFields(group, key);
  renderReqHint(group, key);
}

function renderBackpackClassInfo(ctx) {
  const picker = document.getElementById('slot-class-picker');
  picker.innerHTML = '';
  const fam = familyDef(ctx.cls.family);
  const row = document.createElement('div');
  row.className = 'slot-class-readonly';
  const icon = fam?.icon ? `${fam.icon} ` : '';
  row.textContent = `${icon}${ctx.cls.label}`;
  if (fam) {
    row.title = `Семейство: ${fam.label}${ctx.cls.hands ? ` · ${ctx.cls.hands}р` : ''}`;
  }
  picker.appendChild(row);
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

  // вторая рука занята — двуручное оружие сюда брать нельзя (иначе затрёт её предмет, B5)
  const blockTwoHanded = otherHandBlocksTwoHanded(slotKey);
  let hasBlockedTwoHanded = false;

  (slotClassList(slotKey) || []).forEach((cls) => {
    const fam = familyDef(cls.family);
    const opt = document.createElement('option');
    opt.value = cls.id;
    const icon = fam?.icon ? `${fam.icon} ` : '';
    opt.textContent = `${icon}${cls.label}`;
    opt.title = fam ? `Семейство: ${fam.label}${cls.hands ? ` · ${cls.hands}р` : ''}` : cls.label;
    if (blockTwoHanded && cls.hands === 2) {
      opt.disabled = true;
      opt.title = `Недоступно: ${HAND_NAME[otherHand(slotKey)]} занята`;
      hasBlockedTwoHanded = true;
    }
    if (item.classId === cls.id) opt.selected = true;
    select.appendChild(opt);
  });

  select.addEventListener('change', () => setItemClass(slotKey, select.value || null));
  picker.appendChild(select);

  if (hasBlockedTwoHanded) {
    const note = document.createElement('p');
    note.className = 'slot-class-note';
    note.textContent = `Двуручное оружие недоступно: ${HAND_NAME[otherHand(slotKey)]} занята.`;
    picker.appendChild(note);
  }
}

function renderTierPicker(group, key) {
  const picker = document.getElementById('slot-tier-picker');
  const item = getItem(group, key);
  picker.innerHTML = '';
  [1, 2, 3, 4].forEach((tier) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `slot-tier-btn${item.tier === tier ? ' selected' : ''}`;
    btn.textContent = `Т${tier}`;
    btn.disabled = !item.classId;
    btn.addEventListener('click', () => setSlotItemTier(group, key, tier));
    picker.appendChild(btn);
  });
}

function renderModFields(group, key) {
  const host = document.getElementById('slot-mods');
  const item = getItem(group, key);
  const ctx = resolveItemClassContext(group, key);
  host.innerHTML = '';
  if (!ctx) return;
  const { cls } = ctx;

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
      if (group === 'equipment') {
        reconcileHands(key);
        updateCombatValues();
      }
      scheduleSave();
      updateSlotUI(group, key);
    });
  });

  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'slot-mod-reset';
  reset.textContent = 'Сбросить к тиру';
  reset.addEventListener('click', () => {
    item.mods = classDefaults(cls, item.tier);
    if (group === 'equipment') {
      reconcileHands(key);
      updateCombatValues();
    }
    scheduleSave();
    renderModFields(group, key);
    updateSlotUI(group, key);
  });
  host.appendChild(reset);
}

function renderReqHint(group, key) {
  const hint = document.getElementById('slot-req-hint');
  const item = getItem(group, key);
  const ctx = resolveItemClassContext(group, key);
  if (!ctx) { hint.hidden = true; return; }
  const { slotKey, cls } = ctx;
  const fam = familyDef(cls.family);
  const need = tierThreshold(item.tier);
  const have = sheet.stats[fam.stat] || 0;
  hint.hidden = false;
  hint.classList.toggle('slot-req-hint--warn', !meetsTierReq(slotKey, item));
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
  setSlotItemTier('equipment', slotKey, tier);
}

function setSlotItemTier(group, key, tier) {
  const item = getItem(group, key);
  if (!item.classId || item.tier === tier) return;
  const ctx = resolveItemClassContext(group, key);
  if (!ctx) return;
  item.tier = tier;
  item.mods = classDefaults(ctx.cls, tier);
  if (group === 'equipment') reconcileHands(key);
  scheduleSave();
  renderClassSection(group, key);
  updateSlotUI(group, key);
  if (group === 'equipment') updateCombatValues();
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

  wrap.querySelectorAll('.spell-mana-badge, .spell-ap-badge, .spell-hp-badge, .spell-level-badge').forEach((el) => el.remove());
  wrap.insertAdjacentHTML('beforeend', spellCostBadgesHtml(readSpellEditorCosts()));
}

function readSpellEditorCosts() {
  return {
    level: Math.min(5, Math.max(1, parseInt(document.getElementById('spell-level')?.value, 10) || 1)),
    mana: Math.max(0, parseInt(document.getElementById('spell-mana')?.value, 10) || 0),
    ap: Math.max(0, parseInt(document.getElementById('spell-ap')?.value, 10) || 0),
    hp: Math.max(0, parseInt(document.getElementById('spell-hp')?.value, 10) || 0),
  };
}

function spellCostBadgesHtml({ mana, ap, hp, level }) {
  let html = '';
  if (mana > 0) html += `<span class="spell-mana-badge">${mana}</span>`;
  if (ap > 0) html += `<span class="spell-ap-badge">${ap}</span>`;
  if (hp > 0) html += `<span class="spell-hp-badge">${hp}</span>`;
  html += `<span class="spell-level-badge">${ROMAN[level] || level}</span>`;
  return html;
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
      ${spellCostBadgesHtml(spell)}
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
  ['spell-mana', 'spell-ap', 'spell-hp', 'spell-level'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', () => {
      updateSpellEditorPreview(selectedSpec, selectedIconId);
    });
  });
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

  const modal = document.getElementById('spell-delete-modal');
  if (!modal) {
    performSpellDelete();
    return;
  }

  const spell = activeSpellList().find(s => s.id === editingSpellId);
  const textEl = document.getElementById('spell-delete-text');
  if (textEl) {
    textEl.textContent = spell && spell.name ? `Удалить «${spell.name}»?` : 'Удалить это заклинание?';
  }

  const btnConfirm = document.getElementById('spell-delete-confirm');
  const btnCancel = document.getElementById('spell-delete-cancel');

  const onConfirm = () => {
    cleanup();
    performSpellDelete();
  };
  const onCancel = () => {
    cleanup();
    modal.close();
  };
  const onBackdropClick = (e) => {
    if (e.target === modal) onCancel();
  };
  function cleanup() {
    btnConfirm?.removeEventListener('click', onConfirm);
    btnCancel?.removeEventListener('click', onCancel);
    modal.removeEventListener('click', onBackdropClick);
  }

  btnConfirm?.addEventListener('click', onConfirm);
  btnCancel?.addEventListener('click', onCancel);
  modal.addEventListener('click', onBackdropClick);

  if (typeof modal.showModal === 'function') modal.showModal();
}

function performSpellDelete() {
  const modal = document.getElementById('spell-delete-modal');
  if (modal?.open) modal.close();

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
    race: s.race ?? '',
    faction: s.faction ?? '',
    lore: s.lore ?? '',
    buffs: (s.buffs ?? []).map((e) => ({ ...e })),
    debuffs: (s.debuffs ?? []).map((e) => ({ ...e })),
    quests: (s.quests ?? []).map((q) => ({ ...q })),
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
    wealth: {
      gold: Math.max(0, Math.floor(s.wealth?.gold ?? 0)),
      silver: Math.max(0, Math.floor(s.wealth?.silver ?? 0)),
      bronze: Math.max(0, Math.floor(s.wealth?.bronze ?? 0)),
    },
    wealthBronze: typeof CoinPouch !== 'undefined'
      ? CoinPouch.totalEquivalentBronze(s.wealth)
      : Math.max(0, Math.floor(s.wealthBronze ?? 0)),
    coinPile: (s.coinPile ?? []).map((c) => ({ ...c })),
    satiety: toInt(s.satiety, 0),
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
    rawBackpack[i] ? migrateShieldItem(normalizeItem(cloneItem(rawBackpack[i]))) : emptyItem()
  ));

  const identity = migrateIdentity(raw);

  return {
    ok: true,
    sheet: {
      name: strVal(raw.name) || 'Импортированный персонаж',
      description: strVal(raw.description),
      race: identity.race,
      faction: identity.faction,
      lore: strVal(raw.lore),
      ...migrateEffects(raw),
      quests: migrateQuests(raw),
      stats,
      combat: migrateCombat(raw, stats),
      statClass: migrateStatClass(raw, base),
      classSkills: migrateClassSkills(raw, base),
      equipment: migrateEquipment(raw, base),
      backpack,
      spells: migrateSpells(raw, base),
      wealth: typeof CoinPouch !== 'undefined'
        ? CoinPouch.migrateWealth(raw)
        : { gold: 0, silver: 0, bronze: 0 },
      coinPile: typeof CoinPouch !== 'undefined'
        ? CoinPouch.migrateCoinPile(raw)
        : (Array.isArray(raw.coinPile) ? raw.coinPile : []),
      satiety: toInt(raw.satiety, 0),
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
  document.getElementById('char-race').value = sheet.race ?? '';
  document.getElementById('char-faction').value = sheet.faction ?? '';
  document.getElementById('char-lore').value = sheet.lore ?? '';
  document.title = `GoB — ${sheet.name || 'Персонаж'}`;

  closeSlotEditor();
  renderStats();
  renderCombat();
  renderEquipment();
  renderBackpack();
  renderEffects();
  renderQuests();

  spreadIndex = 0;
  renderSpellGrids();
  CoinPouch?.render?.();
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

  if (char.isUser && !char.isForeign && typeof updateUserCharacterMeta === 'function') {
    const sheetName = String(sheet.name ?? '').trim();
    const sheetDesc = String(sheet.description ?? '').trim();
    const catalogName = String(char.name ?? '').trim();
    const catalogDesc = String(char.description ?? '').trim();
    if (sheetName !== catalogName || sheetDesc !== catalogDesc) {
      updateUserCharacterMeta(char.id, { name: sheet.name ?? '', description: sheet.description ?? '' });
      catalogChar = { ...char, name: sheetName, description: sheetDesc };
    }
  }

  document.getElementById('char-img').src = getPortraitUrl(char);
  document.getElementById('char-img').alt = sheet.name || char.name || 'Без имени';
  document.title = `GoB — ${sheet.name || char.name || 'Без имени'}`;

  bindField(document.getElementById('char-name'), 'name', () => {
    document.title = `GoB — ${sheet.name || 'Без имени'}`;
    document.getElementById('char-img').alt = sheet.name || 'Без имени';
  });
  bindField(document.getElementById('char-desc'), 'description');
  bindIdentityCombo(
    document.getElementById('char-race'),
    document.getElementById('char-race-list'),
    'race-presets',
    RACE_PRESETS,
    'race',
  );
  bindIdentityCombo(
    document.getElementById('char-faction'),
    document.getElementById('char-faction-list'),
    'faction-presets',
    FACTION_PRESETS,
    'faction',
  );
  bindField(document.getElementById('char-lore'), 'lore');

  renderStats();
  bindSatiety();
  renderCombat();
  renderEquipment();
  renderBackpack();
  bindEffects();
  renderEffects();
  bindDamageIntake();
  bindQuests();
  renderQuests();
  bindSlotEditor();
  bindSpellbook();
  CoinPouch?.init?.(sheet, scheduleSave);
  initUserCharacterTools(char);
  initTransfer();
  initSheetSync();
  if (typeof GobInvites !== 'undefined' && !char.isForeign) {
    GobInvites.bind(char.id);
  }

  window.addEventListener('gob-sheet-refresh', async () => {
    if (!char?.isUser || !catalogChar) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    sheet = await loadSheetAsync(catalogChar);
    renderBackpack();
  });

  const groupDock = document.getElementById('group-dock-btn');
  if (groupDock && id) {
    groupDock.href = `/group?id=${encodeURIComponent(id)}`;
  }

  initFloatDock();

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

function initFloatDock() {
  const dock = document.getElementById('char-float-dock');
  const toggle = document.getElementById('char-dock-toggle');
  if (!dock || !toggle) return;

  const STORAGE_KEY = 'gob-char-dock-collapsed';

  const apply = (collapsed) => {
    dock.classList.toggle('is-collapsed', collapsed);
    toggle.setAttribute('aria-expanded', String(!collapsed));
    const label = collapsed ? 'Развернуть панель инструментов' : 'Свернуть панель инструментов';
    toggle.title = label;
    toggle.setAttribute('aria-label', label);
  };

  apply(localStorage.getItem(STORAGE_KEY) === '1');

  toggle.addEventListener('click', () => {
    const willCollapse = !dock.classList.contains('is-collapsed');
    if (willCollapse) {
      CoinPouch?.close?.();
    }
    apply(willCollapse);
    localStorage.setItem(STORAGE_KEY, willCollapse ? '1' : '0');
  });
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
