/**
 * Общее боевое ядро: чистый расчёт входящего урона («получить пизды») и
 * защитные агрегаты листа. Один источник истины для листа персонажа
 * (character.js) и боевого стола мастера (gm.js) — см. docs/fight-table-roadmap.md (F5).
 *
 * Всё чистое: функции читают переданный `sheet` (+ каталог модификаторов),
 * ничего не берут из DOM и не пишут в глобальный `sheet`. Поведение обязано
 * совпадать с прежними локальными копиями character.js (регресс листа запрещён).
 */
const CombatCore = (() => {
  // Тиры классовых полей характеристики (те же пороги, что на листе).
  const STAT_CLASS_THRESHOLDS = [6, 9, 12, 20];
  const HAND_SLOTS = ['leftHand', 'rightHand'];
  const HAND_ROW_LABEL = { leftHand: 'в левой руке', rightHand: 'в правой руке' };

  function statClassTier(value) {
    let tier = 0;
    for (const th of STAT_CLASS_THRESHOLDS) if ((value || 0) >= th) tier++;
    return tier; // 0..4
  }

  // сумма видимых (по достигнутым тирам) значений классовых полей характеристики
  function statClassDiceSum(sheet, statKey) {
    const tier = statClassTier(sheet?.stats?.[statKey] || 0);
    const arr = sheet?.statClass?.[statKey] || [];
    let sum = 0;
    for (let i = 0; i < tier; i++) sum += parseInt(arr[i], 10) || 0;
    return sum;
  }

  // произвольные пользовательские источники боевой строки (данные листа, не DOM)
  function customRowSources(sheet, rowId) {
    const list = sheet?.combatCustom?.[rowId];
    return Array.isArray(list) ? list : [];
  }
  function customSourcesSum(sheet, rowId) {
    return customRowSources(sheet, rowId)
      .reduce((sum, s) => sum + (parseInt(s.value, 10) || 0), 0);
  }

  // суммирует плоские (flat) модификаторы со всех надетых предметов
  function sumEquipmentMods(sheet, catalog) {
    const MOD = catalog?.MODIFIERS || {};
    const sums = {};
    Object.values(sheet?.equipment || {}).forEach((item) => {
      if (!item || !item.classId || !item.mods) return;
      if (item.mirror) return; // зеркало двуручного оружия — не считаем дважды
      Object.entries(item.mods).forEach(([key, val]) => {
        const def = MOD[key];
        if (!def || def.type !== 'flat') return;
        sums[key] = (sums[key] || 0) + (parseInt(val, 10) || 0);
      });
    });
    return sums;
  }

  // значение щита в конкретной руке (собственный мод + пользовательские источники)
  function shieldRowValue(sheet, catalog, slotKey) {
    const item = sheet?.equipment?.[slotKey];
    const base = (item && !item.mirror && item.classId === 'shield')
      ? (parseInt(item.mods?.shieldGuard, 10) || 0)
      : 0;
    return base + customSourcesSum(sheet, `combat-row-shieldGuard-${slotKey}`);
  }

  // надетые щиты (по рукам) со значением проверки; пассивной защиты щит не даёт
  function equippedShields(sheet, catalog) {
    return HAND_SLOTS.reduce((out, slotKey) => {
      const item = sheet?.equipment?.[slotKey];
      if (item && !item.mirror && item.classId === 'shield') {
        out.push({ slot: slotKey, label: HAND_ROW_LABEL[slotKey], value: shieldRowValue(sheet, catalog, slotKey) });
      }
      return out;
    }, []);
  }

  // Защитные агрегаты — те же формулы, что updateCombatValues листа:
  // снаряга (sumEquipmentMods) + классовый вклад + пользовательские источники.
  function currentEvasion(sheet, catalog) {
    return (sumEquipmentMods(sheet, catalog).evasion || 0) + statClassDiceSum(sheet, 'dex')
      + customSourcesSum(sheet, 'combat-row-evasion');
  }
  function currentArmor(sheet, catalog) {
    return (sumEquipmentMods(sheet, catalog).armor || 0) + statClassDiceSum(sheet, 'end')
      + customSourcesSum(sheet, 'combat-row-armor');
  }
  function currentBubbleUnits(sheet, catalog) {
    return (sumEquipmentMods(sheet, catalog).bubble || 0) + statClassDiceSum(sheet, 'spi')
      + customSourcesSum(sheet, 'combat-row-bubble');
  }

  function critValue(luck) {
    return Math.floor((luck || 0) / 2);
  }
  function effectiveCrit(sheet, catalog) {
    return critValue(sheet?.stats?.luck || 0) + statClassDiceSum(sheet, 'luck')
      + customSourcesSum(sheet, 'combat-row-crit');
  }
  function maxHp(sheet, catalog) {
    return (sheet?.stats?.str || 0) * 4 + (sumEquipmentMods(sheet, catalog).hpBonus || 0)
      + statClassDiceSum(sheet, 'str') + customSourcesSum(sheet, 'combat-row-hp');
  }

  function bubbleIsActive(sheet) {
    return sheet?.combat?.bubbleActive !== false;
  }

  // Снимок защитных агрегатов для визарда урона (делается один раз при открытии).
  function damageAggregates(sheet, catalog) {
    const bubbleUnits = currentBubbleUnits(sheet, catalog);
    return {
      evasion: currentEvasion(sheet, catalog),
      armor: currentArmor(sheet, catalog),
      bubbleUnits,
      bubbleActive: bubbleIsActive(sheet) && bubbleUnits > 0,
      shields: equippedShields(sheet, catalog),
      defCrit: effectiveCrit(sheet, catalog),
      hp: parseInt(sheet?.combat?.hp, 10) || 0,
      maxHp: maxHp(sheet, catalog),
    };
  }

  // Списывает единицу бабла через системный кастом-источник строки «Баблы»
  // (как applyDamageIntake листа): декремент виден в развёртке и сохраняется,
  // не опускается ниже 1 (ниже — только сбитием bubbleActive=false).
  function spendBubbleUnit(sheet, catalog, uid) {
    const rowId = 'combat-row-bubble';
    if (!sheet.combatCustom || typeof sheet.combatCustom !== 'object') sheet.combatCustom = {};
    if (!Array.isArray(sheet.combatCustom[rowId])) sheet.combatCustom[rowId] = [];
    const list = sheet.combatCustom[rowId];
    let entry = list.find((s) => s && s.sys === 'bubbleSpend');
    if (!entry) {
      const id = typeof uid === 'function' ? uid()
        : (crypto.randomUUID?.() || `s${Date.now()}${Math.random().toString(36).slice(2, 9)}`);
      entry = { id, label: 'Пробитие бабла', value: 0, sys: 'bubbleSpend' };
      list.push(entry);
    }
    const unitsNow = currentBubbleUnits(sheet, catalog);
    const target = Math.max(1, unitsNow - 1);
    entry.value = (parseInt(entry.value, 10) || 0) + (target - unitsNow);
  }

  // Чистый редьюсер входящего урона (контестная модель С2·3):
  // попадание кидается один раз (atkRoll/atkCrit), уворот и щиты — встречные броски
  // против него; у кого больше — тот прав (при равенстве прав защитник). Криты и
  // антикрит защитника считаются авто по стату «Крит» листа и размеру кубика.
  // input: {
  //   raw, atkRoll, atkCrit, die, defCrit,           // атака + кубик + Крит защитника
  //   dodge:{value,roll}, shields:[{label,value,roll}],
  //   bubble:{active,units,roll}|null, armor
  // }
  // Порядок: уворот → щиты → бабл(0 при активном, D10-проверка) → плоская броня.
  function computeDamageIntake(input) {
    const steps = [];
    const die = parseInt(input.die, 10) || 6;
    const crit = parseInt(input.defCrit, 10) || 0;
    const atkRoll = parseInt(input.atkRoll, 10) || 0;
    const atkCrit = !!input.atkCrit;
    // крит защитника: бросок в крит-диапазоне [max(2, N−Крит), N]; антикрит — чистая 1
    const isCritRoll = (roll) => roll >= 2 && roll >= Math.max(2, die - crit);
    let dmg = Math.max(0, parseInt(input.raw, 10) || 0);
    let riposte = false;

    // — Уворот: единственный шаг, где применяется удвоение урона от крита/антикрита.
    // Крит атаки урон НЕ удваивает — удвоение кубов уже вписано в поле урона игроком;
    // галочка «Крит» влияет только на исход контеста (пробитие/сравнение бросков). —
    {
      const before = dmg;
      const v = parseInt(input.dodge?.value, 10) || 0;
      const r = parseInt(input.dodge?.roll, 10) || 0;
      const manual = input.dodge?.manual || null;   // ручной выбор исхода (кнопки)
      let after; let note;
      if (manual === 'pass') { after = before - v; note = `увернулся −${v}`; }
      else if (manual === 'fail') { after = before; note = 'не увернулся'; }
      else {
        const defCrit = r >= 1 && isCritRoll(r);
        const defAnti = r === 1;
        if (defAnti) {
          after = before * 2; note = `антикрит защитника — урон ×2 (${before}→${before * 2})`;
        } else if (atkCrit && !defCrit) {
          after = before; note = 'крит атаки — не увернулся';
        } else if (defCrit && !atkCrit) {
          after = 0; riposte = true; note = 'крит-уворот — полный уворот (0)';
        } else {
          const vv = (atkCrit && defCrit) ? v * 2 : v;   // оба крит — уворот ×2 (урон уже удвоен в поле)
          const pre = (atkCrit && defCrit) ? 'оба крит — уворот ×2 — ' : '';
          if (r >= 1 && r >= atkRoll) { after = before - vv; note = `${pre}увернулся −${vv}`; }
          else { after = before; note = `${pre}не увернулся`; }
        }
      }
      after = Math.max(0, after);
      steps.push({ label: 'Уворот', before, after, note });
      dmg = after;
    }

    // — Щиты: встречный бросок vs той же атаки; крит щита блокирует ×2 значения —
    (input.shields || []).forEach((sh) => {
      const before = dmg;
      const v = parseInt(sh.value, 10) || 0;
      const r = parseInt(sh.roll, 10) || 0;
      const manual = sh.manual || null;               // ручной выбор исхода (кнопки)
      let after; let note;
      if (manual === 'pass') { after = before - v; note = `защитился −${v}`; }
      else if (manual === 'fail') { after = before; note = 'не защитился'; }
      else {
        const shCrit = r >= 1 && isCritRoll(r);
        if (shCrit) { after = before - v * 2; note = `крит щита — блок ×2 (−${v * 2})`; }
        else if (atkCrit) { after = before; note = 'крит атаки пробил щит'; }
        else if (r >= 1 && r >= atkRoll) { after = before - v; note = `защитился −${v}`; }
        else { after = before; note = 'не защитился'; }
      }
      after = Math.max(0, after);
      steps.push({ label: `Щит ${sh.label}`, before, after, note });
      dmg = after;
    });

    // — Бабл: пока активен, урон 0; D10-проверка от 1 до текущих единиц —
    let bubbleOut = null;
    if (input.bubble && input.bubble.active) {
      const before = dmg;
      const units = parseInt(input.bubble.units, 10) || 0;
      const r = parseInt(input.bubble.roll, 10) || 0;
      const rolled = r >= 1;
      const success = rolled && r <= units;
      let note;
      if (!rolled) note = 'бабл держит удар — урон 0 (введи бросок D10)';
      else if (success) note = `бабл держит удар — урон 0, проверка ${r} ≤ ${units} (−1 ед.)`;
      else note = `бабл сбит — урон 0, проверка ${r} > ${units}`;
      steps.push({ label: 'Бабл', before, after: 0, note, bubble: true });
      dmg = 0;
      bubbleOut = { rolled, success, roll: r };
    }

    // — Плоская броня: вычитается всегда —
    {
      const before = dmg;
      const a = parseInt(input.armor, 10) || 0;
      const after = Math.max(0, before - a);
      steps.push({ label: 'Броня', before, after, note: `−${a}` });
      dmg = after;
    }

    return { steps, finalDamage: dmg, riposte, bubble: bubbleOut };
  }

  return {
    STAT_CLASS_THRESHOLDS, HAND_SLOTS, HAND_ROW_LABEL,
    statClassTier, statClassDiceSum, customRowSources, customSourcesSum,
    sumEquipmentMods, shieldRowValue, equippedShields,
    currentEvasion, currentArmor, currentBubbleUnits,
    critValue, effectiveCrit, maxHp, bubbleIsActive,
    damageAggregates, spendBubbleUnit, computeDamageIntake,
  };
})();

if (typeof window !== 'undefined') Object.assign(window, { CombatCore });
if (typeof module !== 'undefined' && module.exports) module.exports = { CombatCore };
