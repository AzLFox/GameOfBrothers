# Интеграция с GameOfBraza: экспорт и импорт персонажей

Этот документ описывает, как добавить в **GameOfBrothers** поддержку обмена персонажами с системой **GameOfBraza** через нейтральный JSON-формат.

---

## Содержание

1. [Формат обмена](#1-формат-обмена)
2. [Таблица соответствия полей](#2-таблица-соответствия-полей)
3. [Функция экспорта](#3-функция-экспорта)
4. [Функция импорта](#4-функция-импорта)
5. [UI: кнопки и модальное окно](#5-ui-кнопки-и-модальное-окно)
6. [Интеграция в существующий код](#6-интеграция-в-существующий-код)

---

## 1. Формат обмена

Оба проекта используют один JSON-формат. GameOfBraza его экспортирует, GameOfBrothers должна его понимать — и наоборот.

```json
{
  "schemaVersion": 1,
  "source": "GameOfBraza",
  "name": "Элара",
  "description": "Раса: Эльф | Группировка: Торговцы | Стадия квеста: 3",
  "lore": "## Квента\nИзгнана из родного леса...\n\n## Основной квест\nНайти артефакт...\n\n## Бафы\nБлагословение Луны\n\n## Дебафы\n—\n\n## Заметки\nЗнакома с Торговцами Юга",
  "stats": {
    "str": 8,
    "dex": 14,
    "int": 10,
    "spi": 6,
    "end": 12,
    "luck": 7
  },
  "combat": {
    "hp": 45,
    "hpBonus": 8,
    "ap": 3,
    "apBonus": 0,
    "mp": 18,
    "mpBonus": 0
  },
  "equipment": {
    "helmet":    { "name": "Кожаный шлем", "desc": "Потрёпанный" },
    "leftHand":  { "name": "", "desc": "" },
    "armor":     { "name": "Кольчуга", "desc": "" },
    "rightHand": { "name": "Короткий меч", "desc": "Тир 1" },
    "boots":     { "name": "Сапоги следопыта", "desc": "" },
    "ring":      { "name": "", "desc": "" },
    "necklace":  { "name": "", "desc": "" },
    "bracers":   { "name": "", "desc": "" },
    "pet":       { "name": "", "desc": "" }
  },
  "backpack": [
    { "name": "Зелье лечения", "desc": "x3" },
    { "name": "Верёвка", "desc": "10 м" },
    { "name": "", "desc": "" },
    { "name": "", "desc": "" },
    { "name": "", "desc": "" },
    { "name": "", "desc": "" }
  ],
  "spells": [
    {
      "id": "abc-123",
      "name": "Огненный шар",
      "desc": "3d6 урона",
      "spec": "damage",
      "level": 2,
      "mana": 4,
      "icon": "fireball"
    }
  ]
}
```

### Ключевые правила формата

| Поле | Тип | Примечание |
|---|---|---|
| `schemaVersion` | `1` | Жёстко зафиксировано. При изменении формата — инкрементировать |
| `source` | `"GameOfBraza"` или `"GameOfBrothers"` | Для диагностики |
| `description` | string | `"Раса: X \| Группировка: Y \| Стадия квеста: N"` — все три части опциональны |
| `lore` | string | Структурированный текст с секциями `## Квента`, `## Основной квест`, `## Бафы`, `## Дебафы`, `## Заметки` |
| `stats.luck` | number | В GameOfBraza поле называется `luc`, в формате обмена — `luck` |
| `combat.hp/ap/mp` | number | **Текущие** значения, а не максимальные |
| `combat.hpBonus` | number | Добавка к максимуму сверх формулы `str × 4` |
| `equipment.*` | `{name, desc}` | Все 9 слотов всегда присутствуют (пустые — `{name:"", desc:""}`) |
| `backpack` | массив 6 элементов | Всегда ровно 6 записей; количество обозначается `x3` (буква x), не `×` |
| `spells` | массив | `spec` — одно из `"damage"/"buff"/"heal"/"debuff"`; при импорте в GameOfBraza создаются как реальные скиллы персонажа |

---

## 2. Таблица соответствия полей

### Характеристики

| GameOfBrothers (`sheet.stats`) | Формат обмена (`stats`) | GameOfBraza |
|---|---|---|
| `str` | `str` | `attributes.strength` |
| `dex` | `dex` | `attributes.dexterity` |
| `int` | `int` | `attributes.intelligence` |
| `spi` | `spi` | `attributes.spirit` |
| `end` | `end` | `attributes.endurance` |
| `luck` | `luck` | `attributes.luck` |

### Боевые показатели

| GameOfBrothers (`sheet.combat`) | Формат | Примечание |
|---|---|---|
| `hp` | `combat.hp` | Текущее HP |
| `hpBonus` | `combat.hpBonus` | Max HP = str×4 + hpBonus |
| `ap` | `combat.ap` | Текущие ОД |
| `apBonus` | `combat.apBonus` | Max AP = end + apBonus |
| `mp` | `combat.mp` | Текущая мана |
| `mpBonus` | `combat.mpBonus` | Max MP = spi×10 + mpBonus |

> **Почему коэффициенты разные?** GameOfBraza конфигурирует их через `RuleConfig`
> (значения по умолчанию: `hpPerStr=4`, `apPerEnd=10`, `manaPerSpi=10`).
> `hpBonus` в формате — это `effectiveMax − str × 4`, т.е. разница между
> настроенным максимумом и тем, что даёт формула.

### Снаряжение

| Слот в GameOfBrothers | Ключ в формате | Слот в GameOfBraza |
|---|---|---|
| `helmet` | `equipment.helmet` | `equipped_head` |
| `leftHand` | `equipment.leftHand` | `equipped_weapon_left` |
| `armor` | `equipment.armor` | `equipped_body` |
| `rightHand` | `equipment.rightHand` | `equipped_weapon_right` |
| `boots` | `equipment.boots` | `equipped_legs` |
| `ring` | `equipment.ring` | `equipped_ring` |
| `necklace` | `equipment.necklace` | `equipped_amulet` |
| `bracers` | `equipment.bracers` | `equipped_vambraces` |
| `pet` | `equipment.pet` | `equipped_pet` |

### Нарративные поля (`description` и `lore`)

`description` содержит строку вида `"Раса: X | Группировка: Y | Стадия квеста: N"`.
При импорте в GameOfBrothers её можно сохранить как есть в `sheet.description`.

`lore` содержит секции, разделённые заголовками `## Название`:

| Секция | Поле GameOfBraza | Рекомендация для GameOfBrothers |
|---|---|---|
| `## Квента` | `character.quenta` | → `sheet.lore` (или отдельное поле) |
| `## Основной квест` | `character.mainQuest` | → добавить в `sheet.lore` или отдельное поле |
| `## Бафы` | `character.buffs` | → добавить в `sheet.lore` |
| `## Дебафы` | `character.debuffs` | → добавить в `sheet.lore` |
| `## Заметки` | `character.playerNotes` | → добавить в `sheet.lore` |

Простейший вариант — сохранить `lore` целиком как `sheet.lore`: все секции сохранятся с заголовками и будут читаемы.

### Нераспознаваемые данные

| Поле / группа | Что делать при импорте |
|---|---|
| `spells[*]` | Добавить в `sheet.spells` с иконкой-заглушкой (GameOfBraza при импорте создаёт из них реальные скиллы) |
| Репутация, валюта, классовые бонусы | Игнорировать — в формате не передаются |

---

## 3. Функция экспорта

Добавьте в `character.js` рядом с `scheduleSave`:

```javascript
/**
 * Сериализует текущий `sheet` в нейтральный JSON-формат обмена.
 * Вызывается перед скачиванием файла или копированием в буфер.
 */
function exportToSharedFormat() {
  const s = sheet;

  // Формат hpBonus: разница между override-максимумом и формульным
  // Формула GameOfBrothers: maxHp = str*4 + hpBonus
  // hpBonus уже хранится напрямую в sheet.combat.hpBonus

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
```

---

## 4. Функция импорта

```javascript
/**
 * Принимает JSON-строку в формате обмена и возвращает объект,
 * совместимый со структурой `sheet` (можно передать в `loadSheet` как base).
 *
 * Непереносимые поля (репутация, валюта и т.д.) помещаются в `lore`.
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
  // Перезаписываем текущие значения и бонусы из формата
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
  const backpack = Array.from({ length: 6 }, (_, i) => {
    const item = rawBackpack[i];
    return { name: strVal(item?.name), desc: strVal(item?.desc) };
  });

  // ── Спеллы ─────────────────────────────────────────────────────────
  const rawSpells = Array.isArray(raw.spells) ? raw.spells : [];
  const spells = rawSpells.map(s => normalizeSpell({
    id:        strVal(s?.id) || uid(),
    name:      strVal(s?.name),
    desc:      strVal(s?.desc),
    spec:      ['damage','buff','heal','debuff'].includes(s?.spec) ? s.spec : 'buff',
    level:     Math.min(5, Math.max(1, toInt(s?.level, 1))),
    mana:      Math.max(0, toInt(s?.mana, 0)),
    icon:      strVal(s?.icon) || 'default',
    iconImage: strVal(s?.iconImage),
  }));

  // ── Описание и история ──────────────────────────────────────────────
  // description из GameOfBraza: "Раса: X | Группировка: Y | Стадия квеста: N"
  // lore из GameOfBraza: структурированный текст с секциями ## Квента, ## Основной квест и т.д.
  // Сохраняем как есть — секции читаемы и без разбора.
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

// ── Вспомогательные функции ─────────────────────────────────────────────────

function toInt(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function strVal(v) {
  return typeof v === 'string' ? v : '';
}
```

> **Примечание.** Функция `defaultCombat` уже существует в вашем `character.js`.
> Она вычисляет начальные значения HP/AP/MP из статов. Мы вызываем её, а потом
> перезаписываем текущие значения и бонусы из импортируемого JSON.

---

## 5. UI: кнопки и модальное окно

Добавьте разметку перед закрывающим `</body>` в `character.html`:

```html
<!-- Кнопка в хедере страницы — добавить рядом с именем персонажа -->
<button id="btn-transfer" class="btn-transfer" title="Экспорт / Импорт">
  Перенос ↕
</button>

<!-- Модальное окно -->
<div id="transfer-modal" class="transfer-modal hidden">
  <div class="transfer-modal__backdrop"></div>
  <div class="transfer-modal__box">
    <div class="transfer-modal__header">
      <h2>Перенос данных</h2>
      <button id="btn-transfer-close" class="transfer-modal__close">✕</button>
    </div>

    <!-- Переключатель вкладок -->
    <div class="transfer-modal__tabs">
      <button class="transfer-tab active" data-tab="export">Экспорт</button>
      <button class="transfer-tab"        data-tab="import">Импорт</button>
    </div>

    <!-- Вкладка: Экспорт -->
    <div class="transfer-panel" id="transfer-panel-export">
      <p class="transfer-hint">
        JSON с данными персонажа в формате GameOfBraza.
        Скиллы экспортируются со своими иконками.
      </p>
      <textarea id="export-json" class="transfer-json" readonly rows="14"></textarea>
      <div class="transfer-actions">
        <button id="btn-export-copy">Скопировать</button>
        <button id="btn-export-download" class="btn-primary">Скачать .json</button>
      </div>
    </div>

    <!-- Вкладка: Импорт -->
    <div class="transfer-panel hidden" id="transfer-panel-import">
      <p class="transfer-hint">
        Вставьте JSON из GameOfBraza или загрузите файл.
        Скиллы переносятся как спеллы; репутация и валюта не импортируются.
      </p>
      <div class="transfer-file-row">
        <button id="btn-import-file">Загрузить файл…</button>
        <span id="import-file-info" class="transfer-file-info"></span>
        <input id="import-file-input" type="file" accept=".json,application/json" style="display:none">
      </div>
      <textarea id="import-json" class="transfer-json" rows="14"
        placeholder='{ "schemaVersion": 1, "name": "...", ... }'></textarea>
      <div id="import-error" class="transfer-error hidden"></div>
      <div id="import-success" class="transfer-success hidden">
        Персонаж загружен. <a id="import-success-link" href="#">Открыть →</a>
      </div>
      <div class="transfer-actions">
        <button id="btn-import-apply" class="btn-primary">Применить к текущему листу</button>
        <button id="btn-transfer-cancel">Отмена</button>
      </div>
    </div>
  </div>
</div>
```

CSS (добавьте в `character.css`):

```css
.btn-transfer {
  background: transparent;
  border: 1px solid var(--gold-dark);
  color: var(--gold);
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.2s;
}
.btn-transfer:hover { background: rgba(201,162,77,0.12); }

.transfer-modal { position: fixed; inset: 0; z-index: 9000; display: flex; align-items: center; justify-content: center; }
.transfer-modal.hidden { display: none; }
.transfer-modal__backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.65); }
.transfer-modal__box {
  position: relative; z-index: 1; width: min(680px, 95vw);
  background: var(--wood-mid); border: 1px solid var(--gold-dark);
  border-radius: 8px; overflow: hidden; display: flex; flex-direction: column;
}
.transfer-modal__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; border-bottom: 1px solid var(--gold-dark);
}
.transfer-modal__header h2 { margin: 0; color: var(--gold); font-size: 1rem; }
.transfer-modal__close { background: none; border: none; color: var(--gold); font-size: 1.1rem; cursor: pointer; }
.transfer-modal__tabs { display: flex; border-bottom: 1px solid var(--gold-dark); }
.transfer-tab {
  flex: 1; padding: 10px; background: none; border: none; border-bottom: 2px solid transparent;
  color: var(--gold-dark); cursor: pointer; font-size: 0.9rem; transition: color 0.2s;
}
.transfer-tab.active { border-bottom-color: var(--gold); color: var(--gold); }
.transfer-panel { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
.transfer-panel.hidden { display: none; }
.transfer-hint { margin: 0; font-size: 0.82rem; color: var(--gold-dark); }
.transfer-json {
  width: 100%; box-sizing: border-box; resize: vertical;
  background: rgba(0,0,0,0.3); border: 1px solid var(--gold-dark);
  color: var(--parchment); font-family: monospace; font-size: 0.78rem;
  padding: 10px; border-radius: 4px; outline: none; min-height: 200px;
}
.transfer-file-row { display: flex; align-items: center; gap: 10px; }
.transfer-file-info { font-size: 0.8rem; color: var(--gold-dark); }
.transfer-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.transfer-error { color: #e06060; font-size: 0.85rem; }
.transfer-success { color: #60c060; font-size: 0.85rem; }
.transfer-error.hidden, .transfer-success.hidden { display: none; }
.btn-primary {
  background: var(--gold-dark); color: var(--ink);
  border: none; padding: 7px 16px; border-radius: 4px; cursor: pointer; font-size: 0.88rem;
}
.btn-primary:hover { background: var(--gold); }
```

---

## 6. Интеграция в существующий код

Добавьте в конец `character.js` (после всех существующих функций):

```javascript
// ────────────────────────────────────────────────────────────────────────────
// TRANSFER MODULE — экспорт / импорт с GameOfBraza
// ────────────────────────────────────────────────────────────────────────────

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

  // ── Переключение вкладок ─────────────────────────────────────────────────
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const isExport = tab.dataset.tab === 'export';
      panelExport.classList.toggle('hidden', !isExport);
      panelImport.classList.toggle('hidden',  isExport);
    });
  });

  // ── Экспорт ──────────────────────────────────────────────────────────────
  btnCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(exportArea.value).then(() => {
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
    renderSheet();   // перерисовать весь лист

    importOk.classList.remove('hidden');
    // Ссылка на текущую страницу (данные уже применены)
    document.getElementById('import-success-link').href = location.href;
  });
}

// Вызвать при инициализации страницы (в том месте, где вызываются остальные init-функции)
// initTransfer();
```

### Где вызвать `initTransfer()`

Найдите в конце `character.js` точку старта — скорее всего это `DOMContentLoaded`-обработчик или прямой вызов `init()`. Добавьте `initTransfer()` туда:

```javascript
// Пример: если у вас есть функция init() или document.addEventListener('DOMContentLoaded', ...)
document.addEventListener('DOMContentLoaded', () => {
  // ... существующие вызовы ...
  initTransfer();  // ← добавить
});
```

### Примечание о `renderSheet()`

После импорта нужно перерисовать весь лист. Если в вашем коде нет функции с таким именем, используйте ту, которая у вас уже есть для полного ре-рендера (например `renderAll()`, `updateAll()` или вызов нескольких `render*` по отдельности). Найдите место, где вы перерисовываете лист при смене персонажа — то же самое нужно сделать здесь.

---

## Итоговый чеклист

- [ ] Добавить функции `exportToSharedFormat`, `downloadExportJson`, `toInt`, `strVal` в `character.js`
- [ ] Добавить функцию `importFromSharedFormat` в `character.js`
- [ ] Добавить функцию `initTransfer` в `character.js`
- [ ] Вызвать `initTransfer()` в точке старта страницы
- [ ] Добавить HTML-разметку модального окна в `character.html`
- [ ] Добавить CSS в `character.css`
- [ ] Добавить кнопку «Перенос ↕» в хедер `character.html`
- [ ] Убедиться, что вызов `renderSheet()` / аналога обновляет весь лист после импорта
- [ ] Проверить круговой трансфер: экспорт из GameOfBrothers → импорт в GameOfBraza → экспорт обратно
