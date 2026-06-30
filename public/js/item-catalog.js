/* =====================================================================
 * ItemCatalog — справочник снаряжения (классы внутри слотов + модификаторы).
 *
 * Это статические константы в стиле EQUIPMENT_SLOTS / SPELL_ICONS из
 * character.js. Идеи и числа перенесены из дизайнерского справочника;
 * сам CSV в проекте не используется и не загружается.
 *
 * Структура:
 *   TIER_REQ     — порог управляющей характеристики для каждого тира.
 *   FAMILIES     — семейства (визуальная группа + управляющая харка `stat`).
 *   MODIFIERS    — словарь модификаторов: подпись, тип значения, поведение
 *                  в боевой панели (`combat`): 'maxHp'|'hit'|'crit' вливаются
 *                  в базовые строки, 'row' — отдельная строка только при
 *                  надевании, null — показывается лишь на предмете.
 *   SLOT_CLASSES — слот → список классов; у класса mods[] и таблица tiers
 *                  (значения-дефолты по тирам, редактируемые в редакторе).
 * ===================================================================== */
(function () {
  const FAMILIES = {
    plate:    { label: 'Латы',     icon: '🛡', stat: 'end'  },
    leather:  { label: 'Кожа',     icon: '🧥', stat: 'luck' },
    cloth:    { label: 'Ткань',    icon: '🔮', stat: 'spi'  },
    swStr:    { label: 'Сила',     icon: '⚔', stat: 'str'  },
    swDex:    { label: 'Ловкость', icon: '🏹', stat: 'dex'  },
    swCaster: { label: 'Магия',    icon: '🪄', stat: 'int'  },
    shield:   { label: 'Щит',      icon: '🛡', stat: 'end'  },
  };

  const MODIFIERS = {
    // вливаются в БАЗОВЫЕ строки боёвки
    hpBonus:        { label: 'Доп. HP',          type: 'flat', combat: 'maxHp' },
    hit:            { label: 'Попадание',        type: 'flat', combat: 'hit'   },
    critDie:        { label: 'Куб крита',        type: 'flat', combat: 'crit'  },
    // ОТДЕЛЬНАЯ строка появляется только при надевании снаряжения
    armor:          { label: 'Защита',           type: 'flat', combat: 'row'   },
    evasion:        { label: 'Уворот',           type: 'flat', combat: 'row'   },
    bubble:         { label: 'Баблы',            type: 'flat', combat: 'row'   },
    enemyCritDown:  { label: 'Крит врага',       type: 'flat', combat: 'row'   },
    effectDuration: { label: 'Длит. эффекта',    type: 'flat', combat: 'row'   },
    effectResist:   { label: 'Сопрот. эффекта',  type: 'flat', combat: 'row'   },
    stealth:        { label: 'Скрытность',       type: 'flat', combat: 'row'   },
    manaCostDown:   { label: 'Затраты маны',     type: 'flat', combat: 'row'   },
    // оружейные — показываются на предмете/в редакторе, без боевой строки
    damageDice:     { label: 'Урон',                  type: 'dice', combat: null },
    heal:           { label: 'Лечение',               type: 'dice', combat: null },
    armorDamage:    { label: 'Урон по броне',         type: 'dice', combat: null },
    noArmorDamage:  { label: 'Урон по цели без брони', type: 'dice', combat: null },
    aoe:            { label: 'По области',             type: 'flag', combat: null },
    extraActionConsumable: { label: 'Доп. действие: расходник', type: 'flag', combat: null },
  };

  // значение модификатора показывается с минусом (это снижение показателя)
  const REDUCTION_MODS = ['enemyCritDown', 'manaCostDown'];
  // значение показывается «как есть» (количество, без знака +)
  const PLAIN_MODS = ['bubble'];

  // ---- оружейные классы (доступны и в правой, и в левой руке) ----
  const WEAPON_CLASSES = [
    { id: 'sw_str_1h', label: 'Сила (1р)', family: 'swStr', hands: 1,
      mods: ['damageDice'],
      tiers: { 1: { damageDice: '1D6' }, 2: { damageDice: '2D6' }, 3: { damageDice: '3D6' }, 4: { damageDice: '4D8' } } },
    { id: 'sw_str_2h', label: 'Сила (2р)', family: 'swStr', hands: 2,
      mods: ['damageDice', 'aoe'],
      tiers: { 1: { damageDice: '1D6', aoe: true }, 2: { damageDice: '2D6', aoe: true }, 3: { damageDice: '3D6', aoe: true }, 4: { damageDice: '4D8', aoe: true } } },
    { id: 'sw_dex_1h', label: 'Ловкость (1р)', family: 'swDex', hands: 1,
      mods: ['damageDice', 'evasion'],
      tiers: { 1: { damageDice: '1D4', evasion: 1 }, 2: { damageDice: '2D4', evasion: 1 }, 3: { damageDice: '3D4', evasion: 1 }, 4: { damageDice: '4D6', evasion: 2 } } },
    { id: 'sw_dex_2h', label: 'Ловкость (2р)', family: 'swDex', hands: 2,
      mods: ['damageDice', 'critDie'],
      tiers: { 1: { damageDice: '1D4', critDie: 1 }, 2: { damageDice: '2D4', critDie: 2 }, 3: { damageDice: '3D4', critDie: 3 }, 4: { damageDice: '4D6', critDie: 4 } } },
    { id: 'crossbow_1h', label: 'Арбалет (1р)', family: 'swStr', hands: 1,
      mods: ['damageDice'],
      tiers: { 1: { damageDice: '1D6' }, 2: { damageDice: '2D6' }, 3: { damageDice: '3D6' }, 4: { damageDice: '4D8' } } },
    { id: 'crossbow_2h', label: 'Арбалет (2р)', family: 'swStr', hands: 2,
      mods: ['damageDice', 'armorDamage'],
      tiers: { 1: { damageDice: '1D6', armorDamage: '1D4' }, 2: { damageDice: '2D6', armorDamage: '2D4' }, 3: { damageDice: '3D6', armorDamage: '3D4' }, 4: { damageDice: '4D8', armorDamage: '4D4' } } },
    { id: 'bow_1h', label: 'Лук (1р)', family: 'swDex', hands: 1,
      mods: ['damageDice', 'critDie'],
      tiers: { 1: { damageDice: '1D4', critDie: 1 }, 2: { damageDice: '2D4', critDie: 2 }, 3: { damageDice: '3D4', critDie: 3 }, 4: { damageDice: '4D6', critDie: 4 } } },
    { id: 'bow_2h', label: 'Лук (2р)', family: 'swDex', hands: 2,
      mods: ['damageDice', 'critDie', 'noArmorDamage'],
      tiers: { 1: { damageDice: '1D4', critDie: 1, noArmorDamage: '1D4' }, 2: { damageDice: '2D4', critDie: 1, noArmorDamage: '1D4' }, 3: { damageDice: '3D4', critDie: 1, noArmorDamage: '1D4' }, 4: { damageDice: '4D6', critDie: 2, noArmorDamage: '1D4' } } },
    { id: 'staff', label: 'Посох', family: 'swCaster', hands: 2,
      mods: ['manaCostDown'],
      tiers: { 1: { manaCostDown: 1 }, 2: { manaCostDown: 2 }, 3: { manaCostDown: 3 }, 4: { manaCostDown: 5 } } },
    { id: 'bell', label: 'Колокольчик', family: 'swCaster', hands: 1,
      mods: ['heal', 'effectDuration'],
      tiers: { 1: { heal: '1D4' }, 2: { heal: '1D6' }, 3: { heal: '1D8' }, 4: { heal: '1D10', effectDuration: 1 } } },
    { id: 'shield', label: 'Щит', family: 'shield', hands: 1,
      mods: ['armor'],
      tiers: { 1: { armor: 3 }, 2: { armor: 6 }, 3: { armor: 9 }, 4: { armor: 12 } } },
    { id: 'arrows', label: 'Стрелы', family: 'swDex', hands: 1,
      mods: ['damageDice'],
      tiers: { 1: { damageDice: '1D4' }, 2: { damageDice: '1D6' }, 3: { damageDice: '1D8' }, 4: { damageDice: '1D10' } } },
  ];

  const SLOT_CLASSES = {
    armor: [
      { id: 'plate', label: 'Латы', family: 'plate',
        mods: ['hpBonus'],
        tiers: { 1: { hpBonus: 6 }, 2: { hpBonus: 12 }, 3: { hpBonus: 18 }, 4: { hpBonus: 24 } } },
      { id: 'cloak', label: 'Плащ', family: 'leather',
        mods: ['evasion', 'hpBonus'],
        tiers: { 1: { evasion: 1, hpBonus: 3 }, 2: { evasion: 2, hpBonus: 6 }, 3: { evasion: 3, hpBonus: 9 }, 4: { evasion: 4, hpBonus: 12 } } },
      { id: 'mantle', label: 'Мантия', family: 'cloth',
        mods: ['bubble'],
        // баблы считаются единицами: каждая единица = 10% шанс, что бабл
        // останется (этот бросок делается в игре, не в системе)
        tiers: { 1: { bubble: 1 }, 2: { bubble: 2 }, 3: { bubble: 3 }, 4: { bubble: 4 } } },
      { id: 'robe', label: 'Ряса', family: 'cloth',
        mods: ['effectDuration'],
        tiers: { 1: { effectDuration: 1 }, 2: { effectDuration: 2 }, 3: { effectDuration: 3 }, 4: { effectDuration: 4 } } },
    ],
    helmet: [
      { id: 'helm_plate', label: 'Шлем', family: 'plate',
        mods: ['enemyCritDown'],
        tiers: { 1: { enemyCritDown: 1 }, 2: { enemyCritDown: 2 }, 3: { enemyCritDown: 3 }, 4: { enemyCritDown: 4 } } },
      { id: 'hood', label: 'Капюшон', family: 'leather',
        mods: ['stealth'],
        tiers: { 1: { stealth: 1 }, 2: { stealth: 2 }, 3: { stealth: 3 }, 4: { stealth: 4 } } },
    ],
    boots: [
      { id: 'boots_plate', label: 'Сапоги (латные)', family: 'plate',
        mods: ['effectResist'],
        tiers: { 1: { effectResist: 1 }, 2: { effectResist: 2 }, 3: { effectResist: 3 }, 4: { effectResist: 4 } } },
      { id: 'boots_leather', label: 'Сапоги (кожаные)', family: 'leather',
        mods: ['extraActionConsumable'],
        tiers: { 1: { extraActionConsumable: true }, 2: { extraActionConsumable: true }, 3: { extraActionConsumable: true }, 4: { extraActionConsumable: true } } },
    ],
    bracers: [
      { id: 'bracers_plate', label: 'Наручи (латные)', family: 'plate',
        mods: ['armor'],
        tiers: { 1: { armor: 1 }, 2: { armor: 2 }, 3: { armor: 3 }, 4: { armor: 4 } } },
      { id: 'bracers_leather', label: 'Наручи (кожаные)', family: 'leather',
        mods: ['hit'],
        tiers: { 1: { hit: 1 }, 2: { hit: 2 }, 3: { hit: 3 }, 4: { hit: 4 } } },
    ],
    rightHand: WEAPON_CLASSES,
    leftHand: WEAPON_CLASSES,
  };

  window.ItemCatalog = {
    TIER_REQ: { 1: 3, 2: 6, 3: 9, 4: 12 },
    FAMILIES,
    MODIFIERS,
    REDUCTION_MODS,
    PLAIN_MODS,
    SLOT_CLASSES,
  };
})();
