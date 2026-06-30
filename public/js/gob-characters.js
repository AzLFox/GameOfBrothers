/**
 * GoB character catalog — builtin heroes + user cards (localStorage).
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

  function sheetStorageKey(id) {
    return `gob_character_${id}`;
  }

  function loadUserCharacters() {
    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveUserCharacters(chars) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(chars));
  }

  /** Sync carousel card text when user edits name/description on the character sheet. */
  function updateUserCharacterMeta(charId, { name, description } = {}) {
    const chars = loadUserCharacters();
    const idx = chars.findIndex((c) => c.id === charId);
    if (idx < 0) return false;
    if (name !== undefined) chars[idx].name = String(name).trim();
    if (description !== undefined) chars[idx].description = String(description).trim();
    saveUserCharacters(chars);
    return true;
  }

  async function loadAllCharacters() {
    let builtin = [];
    try {
      const res = await fetch('/api/characters');
      if (res.ok) builtin = await res.json();
    } catch {
      builtin = [];
    }
    const user = loadUserCharacters();
    // User cards AFTER builtin heroes — custom entries append to the carousel ring.
    return [...builtin, ...user];
  }

  async function findCharacterById(id) {
    if (!id) return null;
    const user = loadUserCharacters().find((c) => c.id === id);
    if (user) return user;
    try {
      const res = await fetch('/api/characters');
      if (!res.ok) return null;
      const list = await res.json();
      return list.find((c) => c.id === id) || null;
    } catch {
      return null;
    }
  }

  function getPortraitUrl(char) {
    if (!char) return PLACEHOLDER_PORTRAIT;
    if (char.portrait) return char.portrait;
    if (char.isUser) return PLACEHOLDER_PORTRAIT;
    return `/characters/${char.id}.jpg`;
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

  function updateUserCharacterPortrait(charId, portrait) {
    const chars = loadUserCharacters();
    const idx = chars.findIndex((c) => c.id === charId);
    if (idx < 0) return false;
    chars[idx].portrait = portrait || '';
    saveUserCharacters(chars);
    return true;
  }

  function deleteUserCharacter(charId) {
    saveUserCharacters(loadUserCharacters().filter((c) => c.id !== charId));
    localStorage.removeItem(sheetStorageKey(charId));
    return true;
  }

  async function createCharacter({ name = '', description = '', portraitFile } = {}) {
    const trimmedName = String(name).trim();
    const trimmedDesc = String(description).trim();
    let portrait = '';

    if (portraitFile) {
      portrait = await processPortraitFile(portraitFile);
    }

    const card = {
      id: newUserId(),
      name: trimmedName,
      description: trimmedDesc,
      portrait,
      isUser: true,
      createdAt: new Date().toISOString(),
    };

    const userChars = loadUserCharacters();
    userChars.push(card);
    saveUserCharacters(userChars);
    initSheetStorage(card);

    return card;
  }

  return {
    USER_STORAGE_KEY,
    PLACEHOLDER_PORTRAIT,
    MAX_PORTRAIT_BYTES,
    loadUserCharacters,
    saveUserCharacters,
    updateUserCharacterMeta,
    updateUserCharacterPortrait,
    processPortraitFile,
    deleteUserCharacter,
    loadAllCharacters,
    findCharacterById,
    getPortraitUrl,
    getCarouselLabel,
    getDisplayName,
    getDisplayDescription,
    defaultSheetForCard,
    initSheetStorage,
    createCharacter,
  };
})();

Object.assign(window, GobCharacters);
