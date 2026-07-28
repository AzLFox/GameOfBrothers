# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Документация и коммиты в этом проекте ведутся на русском. Вся документация лежит в `docs/`.
> **Перед работой открой [docs/INDEX.md](docs/INDEX.md)** — карта всех документов: баги
> ([docs/BUGS.md](docs/BUGS.md)), предложения по развитию ([docs/TO-DO.md](docs/TO-DO.md)),
> темы на подумать ([docs/TO-BS.md](docs/TO-BS.md)), кандидаты на удаление
> ([docs/TO-DEL.md](docs/TO-DEL.md)), спецификации и роадмапы.

## Команды

- **Запуск приложения:** `node server/server.js` → http://localhost:3000
  Сборки и бандлера нет; вотчера/автоперезагрузки тоже. После правок в `server/` перезапусти процесс
  вручную; правки во фронтенде (`public/`) подхватываются обычным обновлением страницы.
- **Выдать роль GameMaster:** перед запуском задать env `GOB_GM_USERNAMES` (список username через
  запятую) — иначе роль только правкой поля `role` в JSON пользователя (`/api/gm/*` под
  `requireGameMaster`).
- **Тесты:** `npm test` → `node --test "tests/*.test.js"` (встроенный раннер Node, без внешних
  зависимостей). Покрыт бэкенд: [tests/auth.test.js](tests/auth.test.js),
  [tests/store.test.js](tests/store.test.js) (юнит), [tests/server.test.js](tests/server.test.js)
  (интеграционные — поднимают Express на случайном порту, включая SSE-синхронизацию и rev-локи).
  Данные изолированы во временной папке через `GOB_DATA_DIR` — реальные `server/data/` не трогаются.
  Подробности — [tests/README.md](tests/README.md). Фронтенд (`public/js`) не покрыт: завязан на
  DOM/`window`, нужен jsdom. Линтер не настроен.
- **Тулинг ассетов** (нужен редко): `npm run generate:stat-frames`, `npm run import:steam-frame`;
  прочие разовые генераторы — `scripts/*.mjs` (обработка монет, дерева, стат-рамок).

## Архитектура (общая картина)

Три слоя, каждый — отдельный «этаж», понятный только при чтении нескольких файлов вместе:

- **Монолитный Express-сервер** — весь роутинг в одном файле [server/server.js](server/server.js)
  (~1200 строк, без разбиения на роутеры). Он же раздаёт статику из `public/` и вендор-либы
  (gsap/pixi/page-flip) по `/vendor/*` из `node_modules`. Тело запроса ограничено 4mb. Порт 3000
  зашит в коде. Группы маршрутов: `/api/auth/*`, `/api/me/characters*`, `/api/me/sheets/*`,
  `/api/me/groups*` + инвайты, `/api/gm/*`, `/api/me/messages*`, плюс отдача HTML-страниц.

- **Файловое JSON-хранилище** — БД нет, вся персистентность в [server/store.js](server/store.js),
  данные под `server/data/` (в `.gitignore`, создаётся в рантайме). Глобальные `users.json` /
  `sessions.json`; на аккаунт — каталог `accounts/<userId>/` (`characters.json`,
  `sheets/<charId>.json`, `char-groups.json`, инвайты, сообщения, `gm-session.json`); группы —
  `parties/<groupId>.json`. Запись — read-modify-write целого файла.

- **Фронтенд без сборки** — ванильный JS в `public/js/*`, по одному `<script>` на страницу,
  глобальные неймспейсы `GobXxx` (`GobAuth`, `GobCharacters`, `GobGroup`, `GobGm`, `GobInvites`…).
  Основной модуль листа — [public/js/character.js](public/js/character.js) (~156 КБ), там же
  экспорт/импорт листа персонажа в JSON (`exportToSharedFormat`/`importFromSharedFormat`).

### Сквозные механики, которые важно знать заранее

- **Живая синхронизация листа через SSE.** Сервер держит карту `sheetSubscribers`; `PUT
  /api/me/sheets/:charId` рассылает изменение всем подписчикам `GET /api/me/sheets/:charId/events`,
  кроме автора правки (`broadcastSheetUpdate`). Открытый чужой лист обновляется на лету.
- **Оптимистичная блокировка листов.** У листа есть `rev`; сервер инкрементит его при записи,
  устаревший PUT получает 409 со свежей версией. Это единственное место с защитой от гонок —
  остальные файлы (сообщения, группы) пишутся RMW без локов (см. [docs/TO-DO.md](docs/TO-DO.md)).
- **Роли и доступ мастера.** Аутентификация — [server/auth.js](server/auth.js) (scrypt+соль, кука
  `gob_session`, `requireAuth`/`requireGameMaster`). ГМ «садится за стол» одной активной группы
  (`gm-session.json`); `resolveCharAccess` даёт ему читать/писать лист любого героя этой группы
  **как владелец** — правки уходят в хранилище владельца и рассылаются по SSE. Предполагаемый
  взаимный замок группы (`gmUserId`) сейчас **не работает** — см. [docs/BUGS.md](docs/BUGS.md) (B1).

### Правила предметной области

- Персонажей создаёт **только пользователь** — встроенных («классических») героев нет.
- Производные показатели листа: **maxHp = str×4 + hpBonus**, **maxAp = end + apBonus**,
  **maxMp = spi×10 + mpBonus**.
- Группа (отряд): именованная, до **6 участников**, инвайты `pending/accepted/declined`, механика
  «reveal» (скрытые участники ещё не раскрыты).
- Префиксы id: персонажи `u_`, группы `grp_`, приглашения `inv_`; пользователи — обычный uuid.
- Экспорт/импорт листа персонажа — самодостаточный JSON-снимок структуры `sheet`
  (`schemaVersion` 2); при импорте прогоняется через те же `migrate*`-функции, что и загрузка
  сохранённого листа. Реализация — модалка «Перенос» в [public/js/character.js](public/js/character.js)
  (`exportToSharedFormat`/`importFromSharedFormat`).
