/**
 * GoB character catalog — user cards (API when authed, localStorage fallback).
 *
 * Limits: portrait file max 2 MB; after canvas compress target ≤ ~300 KB in storage;
 * JPEG max side 800 px, quality ~0.82; recommended upload 600×800 (3∶4).
 */
const GobCharacters = (() => {
  const USER_STORAGE_KEY = 'gob-user-characters';
  const PLACEHOLDER_PORTRAIT = '/img/char-placeholder.png';
  const MAX_PORTRAIT_BYTES = 2 * 1024 * 1024;
  const COMPRESS_MAX_SIDE = 800;
  const JPEG_QUALITY = 0.82;

  let authChecked = false;
  let isAuthed = false;
  let apiUserChars = null;

  let clientId = '';

  /** Идентификатор вкладки: сервер не шлёт нам эхо наших же правок. */
  function sheetClientId() {
    if (!clientId) {
      clientId = (crypto?.randomUUID?.() || `c${Date.now()}${Math.random()}`).slice(0, 36);
    }
    return clientId;
  }

  function sheetStorageKey(id) {
    return `gob_character_${id}`;
  }

  function invalidateAuthCache() {
    authChecked = false;
    isAuthed = false;
    apiUserChars = null;
  }

  async function ensureAuthState() {
    if (authChecked) return isAuthed;
    if (typeof GobAuth === 'undefined') {
      authChecked = true;
      isAuthed = false;
      return false;
    }
    const user = await GobAuth.fetchMe();
    authChecked = true;
    isAuthed = !!user;
    return isAuthed;
  }

  async function apiFetch(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(path, {
      ...options,
      headers,
      credentials: 'same-origin',
    });
  }

  async function refreshApiUserChars() {
    if (!(await ensureAuthState())) {
      apiUserChars = [];
      return [];
    }
    try {
      const res = await apiFetch('/api/me/characters');
      if (!res.ok) {
        apiUserChars = [];
        return [];
      }
      apiUserChars = await res.json();
      return Array.isArray(apiUserChars) ? apiUserChars : [];
    } catch {
      apiUserChars = [];
      return [];
    }
  }

  function loadUserCharactersLocal() {
    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveUserCharactersLocal(chars) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(chars));
  }

  function loadUserCharacters() {
    if (isAuthed && Array.isArray(apiUserChars)) return apiUserChars;
    return loadUserCharactersLocal();
  }

  async function loadUserCharactersAsync() {
    if (await ensureAuthState()) {
      return refreshApiUserChars();
    }
    return loadUserCharactersLocal();
  }

  /** Sync carousel card text when user edits name/description on the character sheet. */
  async function updateUserCharacterMeta(charId, { name, description } = {}) {
    if (await ensureAuthState()) {
      const patch = {};
      if (name !== undefined) patch.name = String(name).trim();
      if (description !== undefined) patch.description = String(description).trim();
      try {
        const res = await apiFetch(`/api/me/characters/${encodeURIComponent(charId)}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
        });
        if (res.ok) {
          await refreshApiUserChars();
          return true;
        }
      } catch {
        return false;
      }
      return false;
    }

    const chars = loadUserCharactersLocal();
    const idx = chars.findIndex((c) => c.id === charId);
    if (idx < 0) return false;
    if (name !== undefined) chars[idx].name = String(name).trim();
    if (description !== undefined) chars[idx].description = String(description).trim();
    saveUserCharactersLocal(chars);
    return true;
  }

  async function loadAllCharacters() {
    return loadUserCharactersAsync();
  }

  async function loadCarouselCharacters() {
    if (await ensureAuthState()) {
      const user = await refreshApiUserChars();
      if (user.length === 0) {
        return { type: 'guest-placeholders' };
      }
      return { type: 'characters', list: user };
    }
    return { type: 'guest-placeholders' };
  }

  async function findCharacterById(id) {
    if (!id || !id.startsWith('u_')) return null;

    if (!(await ensureAuthState())) {
      if (typeof GobAuth !== 'undefined') {
        GobAuth.redirectIfGuest(`/character?id=${encodeURIComponent(id)}`);
      }
      return null;
    }
    const user = await refreshApiUserChars();
    const own = user.find((c) => c.id === id);
    if (own) return own;

    // Не свой герой — возможно, мы мастер его группы: сервер решит, можно ли.
    try {
      const res = await apiFetch(`/api/me/characters/${encodeURIComponent(id)}`);
      if (res.ok) {
        const card = await res.json();
        return { ...card, isUser: true, isForeign: true };
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  function getPortraitUrl(char) {
    if (!char) return PLACEHOLDER_PORTRAIT;
    if (char.portrait) return char.portrait;
    return PLACEHOLDER_PORTRAIT;
  }

  function getCarouselLabel(char) {
    const name = (char?.name ?? '').trim();
    return name || char?.id || '';
  }

  function getDisplayName(char) {
    const name = (char?.name ?? '').trim();
    return name || 'Без имени';
  }

  function getDisplayDescription(char) {
    const desc = (char?.description ?? '').trim();
    return desc || 'Описание не задано';
  }

  function emptyItem() {
    return { name: '', desc: '' };
  }

  const EQUIPMENT_KEYS = [
    'helmet', 'leftHand', 'armor', 'rightHand', 'boots',
    'ring', 'necklace', 'bracers', 'pet',
  ];

  function defaultSheetForCard(card) {
    const emptyStats = { str: 0, dex: 0, int: 0, spi: 0, end: 0, luck: 0 };
    return {
      name: card.name || '',
      description: card.description || '',
      race: '',
      faction: '',
      lore: '',
      spells: [],
      stats: { ...emptyStats },
      combat: { hp: 0, ap: 0, mp: 0, hpBonus: 0, apBonus: 0, mpBonus: 0 },
      equipment: Object.fromEntries(EQUIPMENT_KEYS.map((key) => [key, emptyItem()])),
      backpack: Array.from({ length: 6 }, () => emptyItem()),
    };
  }

  function initSheetStorage(card) {
    localStorage.setItem(sheetStorageKey(card.id), JSON.stringify(defaultSheetForCard(card)));
  }

  function newUserId() {
    const uuid = crypto.randomUUID?.() || `u${Date.now()}${Math.random().toString(36).slice(2, 9)}`;
    return `u_${uuid}`;
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
      reader.readAsDataURL(file);
    });
  }

  function compressImageDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        if (img.width === 0 || img.height === 0) {
          reject(new Error('Не удалось прочитать изображение'));
          return;
        }
        const scale = Math.min(COMPRESS_MAX_SIDE / img.width, COMPRESS_MAX_SIDE / img.height, 1);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      };
      img.onerror = () => reject(new Error('Не удалось обработать изображение'));
      img.src = dataUrl;
    });
  }

  async function processPortraitFile(file) {
    if (file.size > MAX_PORTRAIT_BYTES) {
      throw new Error('FILE_TOO_LARGE');
    }
    if (!file.type.startsWith('image/')) {
      throw new Error('NOT_IMAGE');
    }
    const dataUrl = await readFileAsDataUrl(file);
    return compressImageDataUrl(dataUrl);
  }

  async function updateUserCharacterPortrait(charId, portrait) {
    if (await ensureAuthState()) {
      try {
        const res = await apiFetch(`/api/me/characters/${encodeURIComponent(charId)}`, {
          method: 'PATCH',
          body: JSON.stringify({ portrait: portrait || '' }),
        });
        if (res.ok) {
          await refreshApiUserChars();
          return true;
        }
      } catch {
        return false;
      }
      return false;
    }

    const chars = loadUserCharactersLocal();
    const idx = chars.findIndex((c) => c.id === charId);
    if (idx < 0) return false;
    chars[idx].portrait = portrait || '';
    saveUserCharactersLocal(chars);
    return true;
  }

  async function deleteUserCharacter(charId) {
    if (await ensureAuthState()) {
      try {
        const res = await apiFetch(`/api/me/characters/${encodeURIComponent(charId)}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          await refreshApiUserChars();
          localStorage.removeItem(sheetStorageKey(charId));
          return true;
        }
      } catch {
        return false;
      }
      return false;
    }

    saveUserCharactersLocal(loadUserCharactersLocal().filter((c) => c.id !== charId));
    localStorage.removeItem(sheetStorageKey(charId));
    return true;
  }

  async function createCharacter({ name = '', description = '', portraitFile } = {}) {
    if (!(await ensureAuthState())) {
      if (typeof GobAuth !== 'undefined') {
        GobAuth.redirectIfGuest('/create');
        throw new Error('AUTH_REQUIRED');
      }
    }

    const trimmedName = String(name).trim();
    const trimmedDesc = String(description).trim();
    let portrait = '';

    if (portraitFile) {
      portrait = await processPortraitFile(portraitFile);
    }

    if (isAuthed) {
      const res = await apiFetch('/api/me/characters', {
        method: 'POST',
        body: JSON.stringify({
          name: trimmedName,
          description: trimmedDesc,
          portrait,
        }),
      });
      if (!res.ok) {
        throw new Error('CREATE_FAILED');
      }
      const card = await res.json();
      await refreshApiUserChars();
      return card;
    }

    const card = {
      id: newUserId(),
      name: trimmedName,
      description: trimmedDesc,
      portrait,
      isUser: true,
      createdAt: new Date().toISOString(),
    };

    const userChars = loadUserCharactersLocal();
    userChars.push(card);
    saveUserCharactersLocal(userChars);
    initSheetStorage(card);

    return card;
  }

  async function loadUserSheet(charId) {
    if (await ensureAuthState()) {
      try {
        const res = await apiFetch(`/api/me/sheets/${encodeURIComponent(charId)}`);
        if (res.ok) return await res.json();
      } catch {
        /* fall through */
      }
    }

    try {
      const raw = localStorage.getItem(sheetStorageKey(charId));
      if (raw) return JSON.parse(raw);
    } catch {
      /* ignore */
    }
    return null;
  }

  async function saveUserSheet(charId, sheetData) {
    if (await ensureAuthState()) {
      try {
        const res = await apiFetch(`/api/me/sheets/${encodeURIComponent(charId)}`, {
          method: 'PUT',
          headers: { 'X-Sheet-Client': sheetClientId() },
          body: JSON.stringify(sheetData),
        });
        if (res.status === 409) {
          // Лист успели изменить (обычно мастер) — отдаём свежую версию наверх.
          const payload = await res.json().catch(() => ({}));
          return { ok: false, conflict: true, sheet: payload.sheet || null, error: payload.error };
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { ok: false, error: err.error || `HTTP ${res.status}` };
        }
        const data = await res.json().catch(() => ({}));
        return { ok: true, rev: data.rev };
      } catch (e) {
        return { ok: false, error: e.message || 'network error' };
      }
    }

    localStorage.setItem(sheetStorageKey(charId), JSON.stringify(sheetData));
    return { ok: true };
  }

  /** Свой лист можно слушать через SSE: сервер шлёт rev при каждой чужой правке. */
  function watchUserSheet(charId, onUpdate) {
    if (typeof EventSource === 'undefined') return () => {};
    const url = `/api/me/sheets/${encodeURIComponent(charId)}/events`
      + `?clientId=${encodeURIComponent(sheetClientId())}`;
    let source;
    try {
      source = new EventSource(url, { withCredentials: true });
    } catch {
      return () => {};
    }
    source.addEventListener('message', (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload?.type === 'sheet') onUpdate(payload);
      } catch {
        /* ignore */
      }
    });
    return () => source.close();
  }

  return {
    USER_STORAGE_KEY,
    PLACEHOLDER_PORTRAIT,
    MAX_PORTRAIT_BYTES,
    loadUserCharacters,
    loadUserCharactersAsync,
    saveUserCharacters: saveUserCharactersLocal,
    updateUserCharacterMeta,
    updateUserCharacterPortrait,
    processPortraitFile,
    deleteUserCharacter,
    loadAllCharacters,
    loadCarouselCharacters,
    findCharacterById,
    getPortraitUrl,
    getCarouselLabel,
    getDisplayName,
    getDisplayDescription,
    defaultSheetForCard,
    initSheetStorage,
    createCharacter,
    loadUserSheet,
    saveUserSheet,
    watchUserSheet,
    invalidateAuthCache,
    ensureAuthState,
  };
})();

Object.assign(window, GobCharacters);
