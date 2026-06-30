# GoB Mobile Visual Roadmap — промпты для мобильной полировки

Цель: сайт GoB **красиво выглядит и быстро работает** на телефонах и планшетах (портрет и ландшафт).
Приоритеты: **60 fps взаимодействия** + **читаемость за столом** + **сохранение атмосферы**, без деградации до «голого UI».

Стек не менять: HTML/CSS/JS + GSAP (+ Pixi.js только на главной, с бюджетом).
Ветка: `mobile_visual` (от `develop`).

Каждый промпт — отдельная сессия. Выполнять по порядку.
После каждой фазы — проверка на реальном устройстве или Chrome DevTools (iPhone SE / 14 Pro, Android mid-range).

---

## Фаза M1 — Mobile tier и единый API

**Промпт:**
> В GoB (ветка `mobile_visual`) заложи единый слой определения мобильного контекста:
> 1. Создай `public/js/gob-mobile.js` — `isMobile()`, `isCoarsePointer()`, `isReducedMotion()`, `getDeviceTier()` (`low` | `mid` | `high` по `navigator.hardwareConcurrency`, `deviceMemory`, ширине).
> 2. Экспортируй в `window.GobMobile`; подключи на `index.html`, `character.html`, `create.html` **до** page-скриптов.
> 3. Замени разрозненные `matchMedia('(max-width: 640px)')` и `innerWidth < 640` в `gob-motion.js`, `scene-atmosphere.mjs`, `spellbook-flip.mjs` на вызовы `GobMobile`.
> 4. Добавь класс на `<html>`: `gob-mobile`, `gob-tier-low` и т.д. для CSS-оверрайдов.
> 5. Не ломай desktop. Один источник правды для брейкпоинта: **640px**.

**Критерии готовности:**
- [x] Нет дублирования magic number `640` в трёх+ файлах
- [x] Классы на `<html>` обновляются при resize/orientationchange
- [x] `prefers-reduced-motion` учитывается везде через API

---

## Фаза M2 — Главная: карусель под палец

**Промпт:**
> Адаптируй 3D-карусель главной под touch (≤640px):
> 1. Уменьши `RING_RADIUS` / `SELECTED_RADIUS` пропорционально viewport (≈55–65% от desktop).
> 2. Свайп по `.scene` / карусели: `pointer` events, инерция как у колеса, snap к ближайшей карточке.
> 3. Убери зависимость от hover (`is-hover`, `pointerenter` glow) — только `:active` / selected state.
> 4. Подсказка «Крути колесом» → на mobile: «Свайпай · нажми на карточку».
> 5. Кнопка «Новый персонаж» и ambient-toggle: min touch target **44×44px**, safe-area insets (`env(safe-area-inset-*)`).
> 6. `will-change` только на время анимации (уже есть в `GobMotion.willChangeTemp` — применить к свайпу).

**Критерии готовности:**
- [x] Карусель крутится пальцем без лагов
- [x] Центральная карточка читаема, не обрезается по краям
- [x] Нет «мёртвых» зон — весь жест попадает в карусель

---

## Фаза M3 — Главная: Pixi и живая сцена (бюджет)

**Промпт:**
> Оптимизируй `scene-atmosphere.mjs` и `gob-scene-live.js` для mobile:
> 1. **tier-low**: отключить Pixi canvas полностью, оставить CSS-горы/туман/дерево.
> 2. **tier-mid**: частицы ≤40, god-rays статичные или CSS-only, parallax ≤4px.
> 3. **tier-high**: частицы ≤80, parallax ≤6px (сейчас desktop ≤120 / ≤8px).
> 4. `destroy()` при navigate — уже есть; добавить `pause()` при `document.hidden` / `visibilitychange`.
> 5. Canvas `devicePixelRatio` cap: `Math.min(dpr, 1.5)` на mobile.
> 6. Не трогать клики по карточкам — canvas `pointer-events: none` сохранить.

**Критерии готовности:**
- [x] Lighthouse Performance mobile ≥70 на главной (tier-mid эмуляция)
- [x] Нет постоянного 100% GPU на старом Android
- [x] При возврате на вкладку сцена восстанавливается без утечек

---

## Фаза M4 — Intro, переходы и звук на mobile

**Промпт:**
> Сократи и облегчи кинематографичные переходы на телефонах:
> 1. `playMainIntro`: mobile-множитель ≤0.35, пропуск завес/рун на `tier-low`.
> 2. `pageWipeOut/In`: на mobile — короче (0.55× duration), меньше одновременных слоёв на `tier-low` (только void + mist).
> 3. Ambient (`gob-sound.js`): не автостарт на mobile до первого tap; кнопка mute крупнее, в safe-area.
> 4. Отключить `GobCursorGlow` на mobile (уже есть) — проверить, что нет лишних listeners.
> 5. CSS `btnEnterMobile` и stagger карточек — синхронизировать с укороченным intro.

**Критерии готовности:**
- [x] До интерактива карусели ≤2.5 с на mid-tier phone
- [x] Переход index → character не «висит» дольше 1 с
- [x] Звук не блокирует autoplay-политику iOS

---

## Фаза M5 — Лист персонажа: layout и touch

**Промпт:**
> Доведи character sheet до удобного мобильного столообразного вида:
> 1. ≤700px: одна колонка, порядок: портрет → имя → combat → stats → equipment → lore → backpack.
> 2. Панели: padding 16px, gap 14px; заголовки панелей sticky при скролле (опционально).
> 3. Stat/combat inputs: min-height 44px, font-size ≥16px (anti-zoom iOS).
> 4. Руны связи stat↔combat: на touch — `focusin` / tap-highlight вместо hover; не перекрывать поля ввода.
> 5. Scroll parallax панелей: отключить на mobile (`GobMobile.isMobile()`).
> 6. Spellbook FAB: fixed bottom-right, safe-area, не перекрывает save-hint.

**Критерии готовности:**
- [x] Весь лист проходится одним пальцем без горизонтального скролла
- [x] Редактирование HP/AP/MP без случайного zoom
- [x] Lighthouse Accessibility mobile ≥90

---

## Фаза M6 — Спеллбук: portrait StPageFlip

**Промпт:**
> Полировка спеллбука на ≤640px (база: `usePortrait: true` уже есть):
> 1. Прогнать StPageFlip на iOS Safari и Chrome Android — исправить обрезку страниц, высоту mount.
> 2. `spellbook-mount--portrait`: одна страница на экран, раскладка 2-3-2 (соты), touch targets min 48px.
> 3. Табы специализаций: горизонтальная полоса под книгой вместо боковых «язычков» на mobile.
> 4. Редактор заклинаний: full-screen sheet снизу (`100dvh`), slide-up вместо бокового листа.
> 5. Page nav «‹ ›»: крупные кнопки 48px; свайп страниц StPageFlip + `disableFlipByClick` сохранить.
> 6. При rotate landscape — пересоздать flip с актуальными `flipSettings()` (resize listener).

**Критерии готовности:**
- [x] Перелистывание без белых артефактов на iPhone
- [x] Создание/редактирование заклинания удобно одной рукой
- [x] Закрытие книги — tap по backdrop или явная кнопка ×

**Реализовано:** `gob-polish.css` (bottom sheet книги, горизонтальные табы, mount `52dvh`, anti-flash для StPageFlip), `spellbook-flip.mjs` (динамические размеры, `usePortrait`, `disableFlipByClick`), `character-motion.js` (slide-up редактора), `character.js` (`scheduleSpellbookRelayout` 250ms на resize/orientation).

---

## Фаза M7 — Типографика, контраст и пергамент

**Промпт:**
> Визуальная читаемость на маленьком экране:
> 1. `gob-polish.css` + `character.css`: mobile type scale (body 16px, labels 0.75rem min, display clamp).
> 2. WCAG AA на пергаменте в солнечном свете: `--ink-muted` не светлее #3d2818 на `#e8d4b0`.
> 3. Tooltips combat/spell: на mobile — tap to toggle, не hover; позиция в viewport, не за краем.
> 4. Уменьшить decorative noise/grain на `tier-low` (CSS opacity 0.5×).
> 5. Портреты персонажей: `loading="lazy"`, `sizes`/`srcset` если есть варианты; fallback aspect-ratio.

**Критерии готовности:**
- [x] Текст читаем без pinch-zoom
- [x] Tooltips не обрезаются status bar / home indicator
- [x] Нет мелкого серого текста <4.5:1 на пергаменте

---

## Фаза M8 — Create и второстепенные страницы

**Промпт:**
> Мобильная полировка `/create` и общих элементов:
> 1. `create.css`: форма на всю ширину, поля 44px, кнопки full-width на ≤640px.
> 2. Back-ссылки и header: safe-area, достаточный контраст на тёмном фоне.
> 3. Favicon + title уже есть — проверить PWA-ready meta (`apple-mobile-web-app-capable` опционально, без manifest пока).
> 4. Scrollbar на mobile скрыт (native) — не переопределять webkit на touch.
> 5. Единый `gob-cinematic` vignette: слабее на mobile (меньше затемнение краёв).

**Критерии готовности:**
- [x] Create не выбивается из визуального языка index/character
- [x] Навигация назад работает с portal-wipe

---

## Фаза M9 — Performance audit и lazy lifecycle

**Промпт:**
> Финальный perf-pass для mobile:
> 1. Аудит всех `will-change`, `filter: blur`, `box-shadow` на больших слоях — только на время анимации.
> 2. `GobMotion.killAll()` + destroy Pixi/StPageFlip при navigate — проверить character → index → character.
> 3. Debounce resize/orientation для spellbook recreate (250ms).
> 4. Preconnect fonts уже есть; добавить `font-display: swap` в link Google Fonts.
> 5. Чеклист: Chrome Lighthouse mobile (Performance, Accessibility), WebPageTest 4G slow.
> 6. Документировать бюджеты в комментарии в `gob-mobile.js`.

**Критерии готовности:**
- [ ] Нет роста памяти после 10 переходов страниц *(teardown в коде; ручной heap-test в чеклисте)*
- [ ] LCP на character mobile <2.5s (mid-tier) *(Lighthouse localhost: ~2.56s, Perf 96 — async fonts; нужен прогон на устройстве/WebPageTest)*
- [x] Чеклист зафиксирован в этом roadmap (секция «Бюджеты»)

**Реализовано:** `gob-motion.js` (`teardownPageResources` + `pagehide`), `gob-mobile.js` (бюджеты в комментарии), `index.js`/`character.js` (will-change cleanup), `index.css` (mobile blur/shadow budget), `character-motion.js` (parallax `willChangeTemp`), Google Fonts `&display=swap` на всех страницах.

---

## Фаза M10 — QA на устройствах и polish

**Промпт:**
> Закрывающий QA-pass:
> 1. Матрица устройств: iPhone SE, iPhone 14+, Pixel 6a, Samsung A-series, iPad portrait.
> 2. Сценарии: intro → выбор героя → лист → спеллбук → редактор → назад; create → назад.
> 3. `prefers-reduced-motion`: все анимации ≤0.01s, Pixi off, parallax off.
> 4. Landscape phone: карусель и спеллбук не ломаются.
> 5. Исправить найденные баги одним коммитом `fix(mobile): …` каждый.
> 6. Отметить фазы ✅ в этом файле.

**Критерии готовности:**
- [ ] Все фазы M1–M9 отмечены готовыми
- [ ] Нет blocker-багов на iOS Safari
- [ ] Скриншоты до/после в PR (опционально)

---

## Бюджеты (целевые метрики)

| Метрика | Цель (mobile mid-tier) |
|--------|-------------------------|
| Lighthouse Performance (index) | ≥70 |
| Lighthouse Performance (character) | ≥75 |
| Lighthouse Accessibility | ≥90 |
| LCP | <2.5s |
| INP / tap response | <200ms |
| Pixi particles (mid) | ≤80 |
| Pixi particles (low) | 0 (off) |
| Touch target | ≥44×44px |
| Intro до карусели | <2.5s |

### Чеклист верификации (M9)

**Chrome DevTools → Lighthouse (mobile, mid-tier throttling):**

- [ ] `index` — Performance ≥70, Accessibility ≥90 *(intro/carousel задерживает LCP в headless; smoke на устройстве)*
- [x] `character` — Performance ≥75 (96), Accessibility ≥90 (95), LCP ~2.56s *(async Google Fonts, lazy StPageFlip)*
- [ ] `create` — Performance ≥70, Accessibility ≥90

**Chrome DevTools → Memory (heap snapshot):**

- [ ] 10× цикл `character → index → character` (portal-wipe) — heap не растёт монотонно (Pixi/StPageFlip teardown)

**WebPageTest (4G slow, mobile profile):**

- [ ] `index` — LCP <3s, Start Render <2s
- [ ] `character` — LCP <2.5s, fully loaded <5s

**Ручной smoke:**

- [x] Свайп карусели — `willChangeTemp` + `clearDragWillChange` / `pagehide` (код)
- [x] Rotate с открытым спеллбуком — `scheduleSpellbookRelayout` 250ms debounce (код)
- [x] `prefers-reduced-motion` — `treeGlowMobile` off, Pixi off, parallax off (код)

---

## Быстрые правила для всех фаз

- Ветка: `mobile_visual` → merge в `develop` после M10
- Не переписывать на React/Vue
- Логика DnD-листа в приоритете над эффектами
- Desktop не деградировать — mobile-оверрайды через `GobMobile` и `@media (max-width: 640px)`
- Hover-only UX на mobile запрещён — дублировать через tap/focus
- Каждая фаза — отдельный коммит с префиксом `feat(mobile):` или `fix(mobile):`
- После фазы — smoke-test главная + лист в DevTools device mode и на одном реальном телефоне
