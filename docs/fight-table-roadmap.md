# Стол файта — общий живой боевой стол (v1: персонажи игроков)

**Ветка:** `feature/fight-table` (от `develop`, merge в `develop`)
**Цель:** общий боевой стол группы, где ГМ и игроки в реальном времени видят расстановку
бойцов, «кто кого атакует» и результат атаки через готовый расчёт «получить пизды».
**Хранилище (v1):** состояние боя — отдельный файл `parties/battles/<groupId>.json`
(не трогаем `normalizePartyGroup`), `rev`-лок как у листов.
**Стек:** тот же — монолитный `server/server.js`, файловый JSON `server/store.js`,
ванильные `GobXxx`-модули, SSE-синхронизация как у листа.

Каждая фаза — отдельная сессия работы. Выполнять по порядку.

## Принципы

- **v1 — только персонажи игроков текущей группы.** НПС (враги/союзники) — будущая фаза;
  поля модели под них заложены (`side: 'party' | 'foe' | 'ally'`), но в v1 всегда `party`.
  Модель НПС ≠ лист игрока — её вводим отдельно (см. [TO-DO.md](TO-DO.md), «Шаблоны НПС»).
- **Ядро v1 — расстановка + «кто кого атакует» + проброс в «получить пизды».** Передача
  предметов, каст спелов, ближняя/дальняя дистанция — отдельные будущие фазы.
- **Общий живой бой.** Состояние боя живёт на сервере и рассылается по SSE — как лист
  (`sheetSubscribers`/`broadcastSheetUpdate`, [server/server.js:43](../server/server.js#L43)).
  ГМ правит, игроки-участники видят вживую (read-only).
- **Не переписывать боевую логику листа.** `computeDamageIntake`
  ([character.js:1002](../public/js/character.js#L1002)) и производные показатели
  (`maxHp = str×4 + hpBonus` и т.д.) — не менять; в фазе F5 логику только **выносим** в общий
  модуль без изменения поведения (регресс «получить пизды» на листе обязателен).
- **Урон применяется через существующий флоу листа.** Атака списывает HP/бабл с листа цели
  через `PUT /api/me/sheets/:charId` (ГМ имеет доступ как владелец, `resolveCharAccess`) —
  открытый лист игрока обновляется штатным sheet-SSE. Новый эндпоинт урона не заводим.
- **rev-лок и RMW.** У боя есть `rev`; сервер инкрементит при записи, устаревший PUT → 409 со
  свежим состоянием (как листы). Запись — read-modify-write целого файла.
- Не React/Vue; ванильные `GobXxx`-модули. Префикс id бойца — `cbt_`. Desktop не ломать;
  анимации уважают `prefers-reduced-motion`.

## Модель данных (бой, v1)

**Файл:** `parties/battles/<groupId>.json` (создаётся в рантайме, под `.gitignore` как и `parties/`).
**Ключи в `store.js`:** `getPartyBattle(groupId)` / `savePartyBattle(battle)` / `deletePartyBattle(groupId)`.

```json
{
  "groupId": "grp_…",
  "rev": 4,
  "active": true,
  "round": 1,
  "combatants": [
    {
      "id": "cbt_…",
      "charId": "u_…",
      "side": "party",
      "name": "Михалыч",
      "portrait": "/img/…",
      "hp": 12,
      "maxHp": 20,
      "zone": "front",
      "defeated": false,
      "order": 0
    }
  ],
  "targets": { "cbt_A": "cbt_B" },
  "updatedAt": "2026-07-29T…",
  "updatedBy": "gm"
}
```

| Поле | Смысл |
| --- | --- |
| `combatants[].charId` | персонаж группы; v1 — все `side: 'party'` |
| `combatants[].hp/maxHp` | **снимок** для токена; источник истины — лист (обновляется при старте и при атаке) |
| `combatants[].zone` | v1 одна зона `'front'`; ближняя/дальняя — поздняя фаза |
| `combatants[].defeated` | `hp = 0` |
| `targets` | карта «атакующий cbtId → цель cbtId» («кто кого атакует») |
| `rev` | оптимистичный лок, как у листа |

**Доступ:** читать (`GET`, SSE) — любой участник группы (`canAccessParty`) или ГМ
(`canGmAccessGroup`); писать (`POST`/`PUT`/`DELETE`) — владелец группы (`group.ownerUserId`)
или ГМ с доступом.

---

## Фаза F1 — Модель боя и REST (сервер, без UI) (✅ готово)

**Промпт:**
> 1. В [server/store.js](../server/store.js) рядом с `partiesDir`/`partyGroupFile`
>    ([:123](../server/store.js#L123)) добавь `battlesDir()` = `parties/battles/`,
>    `battleFile(groupId)`, `getPartyBattle(groupId)`, `savePartyBattle(battle)`,
>    `deletePartyBattle(groupId)` (по образцу `getPartyGroup`/`savePartyGroup`/`deletePartyGroup`);
>    экспортируй в `module.exports`.
> 2. В [server/server.js](../server/server.js): `normalizeBattle(body)` — валидирует форму
>    (обрезает поля бойца, `side` из белого списка, `defeated`/`order` типы, `targets` —
>    только между существующими `cbt_`-id); `battleRev`/`writeBattleWithRev` по образцу
>    `sheetRev`/`writeSheetWithRev` ([:76](../server/server.js#L76)).
> 3. `buildBattleFromGroup(group)` — собирает `combatants` из `group.members` (v1 `side:'party'`),
>    снимок `hp/maxHp` из `store.getUserSheet(owner, charId).combat` (owner — `store.findUserByCharId`);
>    id бойца `cbt_${crypto.randomUUID()}`.
> 4. Хелперы доступа: `canReadBattle(group, user)` (участник/владелец/ГМ через `canAccessParty`
>    + `canGmAccessGroup`), `canWriteBattle(group, user)` (владелец группы или ГМ с доступом).
> 5. Маршруты (`auth.requireAuth`, проверка доступа + существования группы):
>    `POST /api/battle/:groupId` (начать/пересобрать), `GET /api/battle/:groupId`
>    (или `{active:false}`), `PUT /api/battle/:groupId` (rev-лок → 409 со свежим состоянием),
>    `DELETE /api/battle/:groupId`.
> 6. В [tests/server.test.js](../tests/server.test.js) добавь кейсы (данные изолированы `GOB_DATA_DIR`).

**Критерии готовности:**
- [x] `POST` собирает `combatants` из участников группы со снимком `hp/maxHp`.
- [x] `GET`/`PUT`/`DELETE` работают; устаревший `PUT` → 409 со свежим боем.
- [x] Не-участник получает 403; участник читает, владелец/ГМ пишет.
- [x] `npm test` зелёный; реальные `server/data/` не тронуты.

**Реализовано:** хранилище — `getPartyBattle`/`savePartyBattle`/`deletePartyBattle`
(`parties/battles/<groupId>.json`) в [store.js](../server/store.js); модель и доступ —
`normalizeBattle`/`buildBattleFromGroup`/`writeBattleWithRev`/`canReadBattle`/`canWriteBattle`
и маршруты `POST|GET|PUT|DELETE /api/battle/:groupId` в [server.js](../server/server.js);
тесты — «стол файта — модель боя (F1)» в [tests/server.test.js](../tests/server.test.js).

---

## Фаза F2 — Живой бой по SSE + клиентский модуль (✅ готово)

**Промпт:**
> 1. В [server/server.js](../server/server.js) по образцу `sheetSubscribers`
>    ([:43](../server/server.js#L43)): `battleSubscribers` (Map `groupId → Set<{res,clientId}>`),
>    `subscribeToBattle`/`unsubscribeFromBattle`, `broadcastBattleUpdate(groupId, payload, exceptClientId)`.
> 2. `GET /api/battle/:groupId/events` — SSE (read-доступ; заголовки как у
>    `/api/me/sheets/:charId/events` [:366](../server/server.js#L366); `hello` с текущим боем,
>    ping 25с, очистка по `close`).
> 3. `POST`/`PUT`/`DELETE` из F1 рассылают `{ type: 'battle', battle }` всем подписчикам
>    группы, кроме автора (заголовок `X-Battle-Client`).
> 4. Новый [public/js/gob-battle.js](../public/js/gob-battle.js) — `GobBattle`
>    (по образцу [gob-gm.js](../public/js/gob-gm.js)): `loadBattle`, `startBattle`, `saveBattle(rev)`,
>    `endBattle`, `subscribe(groupId, onUpdate)` (EventSource на `/events`, свой `clientId`).
>    Экспорт в `window`.
> 5. Тест в [tests/server.test.js](../tests/server.test.js): `/events` отдаёт `hello`; `PUT`
>    доставляет обновление второму подписчику и не шлёт эхо автору.

**Критерии готовности:**
- [x] Открытый `/events` получает `hello` и обновления при `PUT`.
- [x] Автор правки (свой `clientId`) не получает эхо.
- [x] `GobBattle` грузит/сохраняет/подписывается на бой.

**Реализовано:** `battleSubscribers`/`broadcastBattleUpdate`/`GET /api/battle/:groupId/events`
(+ рассылка из `POST`/`PUT`/`DELETE`, `X-Battle-Client`) в [server.js](../server/server.js);
клиент — [public/js/gob-battle.js](../public/js/gob-battle.js) (`GobBattle`); тесты —
«стол файта — живой бой (F2)» в [tests/server.test.js](../tests/server.test.js).

---

## Фаза F3 — Стол на экране ГМ: токены + старт боя (✅ готово)

**Промпт:**
> 1. В [public/gm.html](../public/gm.html) на столе (рядом с `#gm-table-seats`) добавь панель
>    «Бой»: контейнер `#gm-battle`, кнопки `#gm-battle-start` и `#gm-battle-end`.
> 2. В [public/js/gm.js](../public/js/gm.js) при активной группе: `GobBattle.loadBattle(groupId)`,
>    рендер токенов бойцов (портрет, имя, `hp/maxHp`), подписка `GobBattle.subscribe` —
>    перерисовка по обновлению. «Начать бой» → `startBattle`; «Завершить» → `endBattle`.
> 3. Раскладку токенов переиспользуй из `seatPosition` ([gm.js:36](../public/js/gm.js#L36))
>    (ближняя/дальняя зона — поздняя фаза).
> 4. Живой HP v1: токен показывает снимок; кнопка «Обновить стол» пересобирает снимок (`POST`).
>    Авто-обновление HP по правкам листа — в F5/позже.

**Критерии готовности:**
- [x] «Начать бой» строит стол из участников; токены с портретом/именем/HP.
- [x] Второй экран той же группы видит старт и изменения вживую.
- [x] «Завершить» убирает бой; повторный старт работает.

**Реализовано:** режим боя на столе ГМ — кнопка `#gm-battle-toggle` + статус в тулбаре
([public/gm.html](../public/gm.html)); `renderBattleTokens`/`renderSeats`/`renderBattleControls`
и жизненный цикл `initBattle`/`teardownBattle`/`applyBattle`/`onBattleToggle` через `GobBattle`
([public/js/gm.js](../public/js/gm.js)); стили токенов с полосой HP и `is-low`/`is-defeated`
([public/css/gm.css](../public/css/gm.css)). Проверено в браузере: старт строит токен
12/20; правка HP из второй вкладки-подписчика прилетает вживую (5/20, полоса 25%).

---

## Фаза F4 — «Кто кого атакует» (цели) (✅ готово)

**Промпт:**
> 1. В [public/js/gm.js](../public/js/gm.js): клик по токену выбирает атакующего; клик по
>    другому токену ставит цель — `targets[attackerCbtId] = targetCbtId`, затем `saveBattle`.
> 2. Рисуй связь атакующий→цель (стрелка/подсветка) поверх стола; запрещай цель на себя,
>    повторный клик снимает цель.
> 3. `targets` — часть боя, синхронизируется по SSE (видно и на втором экране).

**Критерии готовности:**
- [x] Выбор атакующего и цели сохраняется и виден вживую на обоих экранах.
- [x] Стрелка/подсветка отражает текущую цель; снятие цели работает.

**Реализовано:** выбор атакующего/цели — `onCombatantClick`/`persistTargets` (оптимистичный
показ + PUT с rev-локом и одним повтором при 409), классы `is-attacker`/`is-target` на токенах
и SVG-стрелки `drawBattleArrows` в локальных координатах хоста (совмещаются с токенами при 3D-
трансформе сцены; пересчёт при ресайзе) — всё в [public/js/gm.js](../public/js/gm.js); стили
подсветки и `.gm-battle-arrows` в [public/css/gm.css](../public/css/gm.css). Выбор атакующего —
локальный для вкладки; `targets` — общее состояние, синхронизируется по battle-SSE (проверено на
двух вкладках: цель, поставленная одной, прилетает второй; стрелка активна-золотая только у
вкладки-автора выбора, у остальных — общая красная).

---

## Фаза F5 — Проброс в «получить пизды» (расчёт урона по цели) (✅ готово)

**Промпт:**
> 1. Вынеси чистую боевую логику из [character.js](../public/js/character.js) в новый
>    [public/js/combat-core.js](../public/js/combat-core.js): `computeDamageIntake`
>    ([:1002](../public/js/character.js#L1002), уже чистый) + функции агрегатов, принимающие
>    `sheet` (уворот/броня/бабл/щиты из `sumEquipmentMods` + классовый вклад + `customSourcesSum`).
>    `character.js` подключает общий модуль вместо локальных копий — **поведение листа не меняется**.
> 2. В [public/js/gm.js](../public/js/gm.js) «Атаковать» по выбранной цели: загрузить лист цели
>    (`GET /api/me/sheets/:charId` — ГМ имеет доступ как владелец), открыть тот же визард урона,
>    привязанный к агрегатам цели.
> 3. Применение как в `applyDamageIntake` ([character.js:1577](../public/js/character.js#L1577)):
>    `PUT` листа цели (`hp`, при бабле — `bubbleActive`/списание единицы); затем обновить снимок
>    `hp` в бою и `broadcastBattleUpdate`. `hp = 0` → `defeated = true`.
> 4. Открытый лист игрока обновляется штатным sheet-SSE; токен на столе — battle-SSE.

**Критерии готовности:**
- [x] Лист персонажа считает урон так же, как до рефактора (регресс «получить пизды» цел).
- [x] Атака по цели открывает визард с её агрегатами; применение списывает HP с её листа.
- [x] Поверженный (`hp = 0`) помечается на столе; игрок видит новый HP на своём листе.

**Реализовано:** общий модуль [combat-core.js](../public/js/combat-core.js) (`CombatCore`) —
чистый `computeDamageIntake` + агрегаты `currentEvasion/Armor/BubbleUnits`, `equippedShields`,
`effectiveCrit`, `maxHp`, `damageAggregates(sheet, catalog)`, `spendBubbleUnit`; character.js
делегирует свои локальные копии в него (поведение листа не меняется, регресс проверен: визард
на листе считает и списывает HP как раньше). Общий визард вынесен в
[combat-wizard.js](../public/js/combat-wizard.js) (`CombatWizard.open(ctx)`, рендерит шаги в
переданный `<dialog>`, применение отдаётся наружу через `onApply(result)`); используется и листом,
и столом мастера. Стили визарда — самодостаточный [combat-wizard.css](../public/css/combat-wizard.css)
(литеральные цвета, без токенов страницы) — подключён на обеих страницах. На столе:
`onAttack`/`openAttackWizard`/`applyAttack` в [gm.js](../public/js/gm.js) грузят лист цели
(`GET /api/me/sheets/:charId`), открывают визард на её агрегатах, применяют `PUT`-ом её листа
(rev-лок, один повтор при 409) и обновляют снимок HP бойца (`persistCombatantHp` → battle-SSE);
`hp = 0` → `defeated`. Проверено в браузере: лист цели 13→8 (rev↑), токен 8/12, добивание → 0/12
`is-defeated`; регресс листа 20→11 цел; `npm test` — 80/80.

---

## Фаза F5.1 — Общий визард и стили (детали реализации)

- **Скрипты:** обе страницы грузят `combat-core.js` и `combat-wizard.js` перед своим модулем
  (`character.html`, `gm.html`); лист — модалка `#damage-modal`, стол — `#gm-damage-modal`
  (одинаковая структура `damage-modal__*`, кнопки навигации `damage-nav-btn`).
- **CSS:** `.damage-*` перенесены из `character.css` в общий `combat-wizard.css` (панель/кнопки —
  копии `.panel`/`.effect-btn` литеральными цветами, чтобы стиль совпадал и на столе мастера, где
  токенов листа нет). `.damage-intake-btn` (кнопка листа) осталась в `character.css`.

---

## Фаза F6 — Игрок видит живой бой (✅ готово)

**Промпт:**
> 1. Точка входа игрока: на [public/index.html](../public/index.html) (список персонажей) и/или
>    [public/character.html](../public/character.html) — баннер «Идёт бой» для группы, где состоит
>    персонаж (проверка `GET /api/battle/:groupId` активных групп персонажа), ссылка на стол.
> 2. Read-only вид стола для игрока: переиспользуй рендер токенов/целей (общий модуль рендера
>    или лёгкая страница `/battle`), подписка на battle-SSE, без кнопок правки.
> 3. Доступ уже открыт сервером (участник читает `GET`/`events`): игрок видит позиции, цели,
>    HP и поверженных вживую.

**Критерии готовности:**
- [x] Игрок группы видит активный бой (токены, цели, HP) без прав правки.
- [x] Обновления ГМа доходят к игроку вживую по SSE.

**Реализовано:** лёгкая страница `/battle` (роут в [server.js](../server/server.js), отдаёт
[public/battle.html](../public/battle.html)) — read-only живой вид: `?group=<grp>&char=<u_>`,
загрузка через `GobBattle.loadBattle`, подписка `GobBattle.subscribe` (battle-SSE), без кнопок
правки. Рендер вынесен в общий модуль [public/js/battle-view.js](../public/js/battle-view.js)
(`GobBattleView` — `seatPosition`/`hpPercent`/`renderTokens`/`drawArrows`/`render`, та же
раскладка и геометрия стрелок, что и на столе ГМ); контроллер страницы —
[public/js/battle.js](../public/js/battle.js) (auth-гейт, пустое/завершённое состояние,
перерендер при ресайзе). Токены/арена — [public/css/battle.css](../public/css/battle.css)
(самодостаточно, без зависимости от `gm.css`; бойцы в отступ-слое `.battle-field`, чтобы токены
у края не резались закруглением арены; мобильная адаптация). Точка входа игрока — баннер
«Идёт бой» на листе ([public/character.html](../public/character.html) `#battle-banner` +
`initBattleBanner` в [public/js/character.js](../public/js/character.js)): подписка на battle-SSE
всех групп своего героя, баннер появляется при старте боя и исчезает при завершении, ведёт на
`/battle?group=…&char=…`. Проверено в браузере (сессия игрока-участника): read-only стол показал
2 токена с HP-полосами (3/12 low, 7/12); правка ГМа (цель) прилетела вживую по SSE — золотой
атакующий, красная цель и стрелка; баннер на листе с верной ссылкой; мобильная раскладка без
обрезки токенов; `npm test` — 80/80.

---

## Фаза F7 — Раунды, завершение, оформление поверженных (опционально)

**Промпт:**
> 1. Счётчик `round` + кнопки «+раунд»/сброс (пишутся в бой, синхронизируются по SSE).
> 2. Оформление поверженных (затемнение/иконка), убор со стола/сортировка.
> 3. Плавные анимации токенов и стрелок с учётом `prefers-reduced-motion`.

**Критерии готовности:**
- [ ] Раунд растёт, поверженные визуально выделены.
- [ ] Анимации уважают `prefers-reduced-motion`; desktop не сломан.

---

## Порядок

```
F1 → F2 → F3 → F4 → F5 → F6 → (F7)
```

MVP «общего живого боя» — **F1–F6** (расстановка + «кто кого атакует» + урон, видимый ГМу и
игрокам вживую). **F7** — полировка, можно отложить. НПС, передача предметов и каст спелов по
целям, ближняя/дальняя дистанция — отдельные будущие фазы поверх этой модели.

## Быстрые правила для всех фаз

- Ветка: `feature/fight-table` → merge в `develop` после закрытия F1–F6.
- Коммиты: `feat(battle): <фаза/суть>` / `fix(battle): …`.
- Не добавлять React/Vue; не трогать игровые формулы листа и поведение «получить пизды»
  (в F5 — только вынос логики без изменения результата).
- Состояние боя — отдельный файл `parties/battles/<groupId>.json`; `normalizePartyGroup` не трогать.
- rev-лок и SSE — по образцу листа; каждая фаза — маленький коммит; после фазы — smoke-проверка
  (`node server/server.js` → http://localhost:3000) на двух вкладках (ГМ + игрок).

## Smoke-сценарии (приёмка MVP)

1. ГМ садится за стол группы, жмёт «Начать бой» → появляются токены участников с HP.
2. Вторая вкладка (игрок-участник) видит тот же бой вживую (F6).
3. ГМ выбирает атакующего и цель → стрелка видна на обеих вкладках (F4).
4. ГМ «Атакует» цель, проходит визард урона → HP цели падает на её листе и на токене; при
   `hp = 0` боец помечен поверженным (F5).
5. Регресс: на листе персонажа кнопка «получить пизды» считает урон как раньше (F5).
6. ГМ «Завершает бой» → стол очищается на обеих вкладках; повторный старт работает.
