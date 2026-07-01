# Auth — регистрация, вход и персонажи по пользователю

**Ветка:** `create-hero` (далее `auth` / merge в `develop`)  
**Хранилище (v1):** JSON-файлы на сервере; БД — позже.

## Принципы

- Встроенные герои (`public/data/characters.json`) — общие для всех, только чтение.
- Пользовательские карточки и листы — **per-user** в `server/data/accounts/{userId}/`.
- Пароли: `scrypt` + salt (Node `crypto`), не plain text.
- Сессия: httpOnly cookie `gob_session`, токен в `server/data/sessions.json`.
- Desktop/mobile UI в стиле create/index (gob-tokens, gob-art).
- Не коммитить `server/data/users.json` с реальными паролями в публичный репо — `.gitignore` для `server/data/users.json`, `server/data/accounts/` и `sessions.json`.

---

## Фаза A1 — Сервер: auth API

**Промпт:**
> 1. `server/auth.js` + `server/store.js`: чтение/запись JSON с file lock (sync ok для v1).
> 2. `server/data/users.json` — `[{ id, username, passwordHash, salt, createdAt }]`.
> 3. `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
> 4. Middleware `requireAuth` для защищённых routes.
> 5. `express.json()`, cookie parsing без лишних deps (parse Cookie header вручную или minimal).
> 6. `.gitignore`: `server/data/sessions.json`, `server/data/users.json`, `server/data/accounts/**`.

**Критерии:**
- [x] Регистрация и логин работают
- [x] `/api/auth/me` возвращает user или 401
- [x] Пароль не хранится в открытом виде

---

## Фаза A2 — UI: login / register

**Промпт:**
> 1. `login.html`, `register.html`, `login.css` (или общий `auth.css`).
> 2. `gob-auth.js`: `fetchMe`, `login`, `register`, `logout`, `redirectIfGuest`.
> 3. Ссылки на главной: «Войти» / «Регистрация» или имя пользователя + «Выйти».
> 4. Portal-wipe навигация через `GobMotion`.

**Критерии:**
- [x] Можно зарегистрироваться и войти
- [x] После входа на главной виден username
- [x] Выход сбрасывает сессию

---

## Фаза A3 — Per-user персонажи (JSON API)

**Промпт:**
> 1. `server/data/accounts/{userId}/characters.json` — массив карточек (как `gob-user-characters`).
> 2. `server/data/accounts/{userId}/sheets/{charId}.json` — лист персонажа.
> 3. API: `GET/POST /api/me/characters`, `PATCH/DELETE /api/me/characters/:id`, `GET/PUT /api/me/sheets/:charId`.
> 4. `gob-characters.js`: при авторизации — API; гость — только builtin на главной, create/лист user — редирект на login.
> 5. `character.js`: `scheduleSave` → PUT sheet на сервер для auth user.

**Критерии:**
- [x] Два пользователя видят разные своих героев
- [x] Builtin герои у обоих одинаковые
- [x] Создание/редактирование/удаление синхронизируется с сервером

---

## Фаза A4 — Миграция localStorage (опционально)

**Промпт:**
> При первом логине: если на сервере пусто, а в `localStorage` есть `gob-user-characters` — импорт на сервер и очистка local keys.

**Критерии:**
- [x] Существующие локальные герои не теряются при первом входе

---

## Порядок

A1 → A2 → A3 → (A4)
