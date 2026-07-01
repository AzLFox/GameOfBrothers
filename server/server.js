const express = require('express');
const path = require('path');
const crypto = require('crypto');
const store = require('./store');
const auth = require('./auth');

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '4mb' }));
app.use(express.static(path.join(__dirname, '../public')));
app.use('/vendor/gsap', express.static(path.join(__dirname, '../node_modules/gsap/dist')));
app.use('/vendor/pixi', express.static(path.join(__dirname, '../node_modules/pixi.js/dist')));
app.use('/vendor/page-flip', express.static(path.join(__dirname, '../node_modules/page-flip/dist/js')));

function newUserCharId() {
  return `u_${crypto.randomUUID()}`;
}

function defaultSheetForCard(card) {
  const emptyItem = () => ({ name: '', desc: '' });
  const emptyStats = { str: 0, dex: 0, int: 0, spi: 0, end: 0, luck: 0 };
  const equipmentKeys = [
    'helmet', 'leftHand', 'armor', 'rightHand', 'boots',
    'ring', 'necklace', 'bracers', 'pet',
  ];
  return {
    name: card.name || '',
    description: card.description || '',
    lore: '',
    spells: [],
    stats: { ...emptyStats },
    combat: { hp: 0, ap: 0, mp: 0, hpBonus: 0, apBonus: 0, mpBonus: 0 },
    equipment: Object.fromEntries(equipmentKeys.map((key) => [key, emptyItem()])),
    backpack: Array.from({ length: 6 }, () => emptyItem()),
  };
}

function isUserCharId(id) {
  return typeof id === 'string' && id.startsWith('u_');
}

function findOwnedCharacter(userId, charId) {
  const chars = store.getUserCharacters(userId);
  return chars.find((c) => c.id === charId) || null;
}

app.get('/api/characters', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/data/characters.json'));
});

app.post('/api/auth/register', (req, res) => {
  const username = String(req.body?.username ?? '').trim();
  const password = String(req.body?.password ?? '');

  const usernameError = auth.validateUsername(username);
  if (usernameError) {
    return res.status(400).json({ error: usernameError });
  }
  const passwordError = auth.validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }
  if (store.findUserByUsername(username)) {
    return res.status(409).json({ error: 'Имя пользователя уже занято' });
  }

  const { salt, passwordHash } = auth.createPasswordHash(password);
  const user = store.createUser({
    id: auth.generateUserId(),
    username,
    passwordHash,
    salt,
    createdAt: new Date().toISOString(),
  });

  auth.createSessionForUser(res, user.id);
  return res.status(201).json({ user: auth.publicUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const username = String(req.body?.username ?? '').trim();
  const password = String(req.body?.password ?? '');

  const user = store.findUserByUsername(username);
  if (!user || !auth.verifyPassword(password, user.salt, user.passwordHash)) {
    return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
  }

  auth.createSessionForUser(res, user.id);
  return res.json({ user: auth.publicUser(user) });
});

app.post('/api/auth/logout', (req, res) => {
  const token = auth.getSessionToken(req);
  if (token) store.deleteSession(token);
  auth.clearSessionCookie(res);
  return res.json({ ok: true });
});

app.delete('/api/me/account', auth.requireAuth, (req, res) => {
  const userId = req.user.id;
  const token = auth.getSessionToken(req);
  store.deleteUser(userId);
  if (token) store.deleteSession(token);
  auth.clearSessionCookie(res);
  return res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  const user = auth.getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return res.json({ user });
});

app.get('/api/me/characters', auth.requireAuth, (req, res) => {
  res.json(store.getUserCharacters(req.user.id));
});

app.post('/api/me/characters', auth.requireAuth, (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  const description = String(req.body?.description ?? '').trim();
  const portrait = String(req.body?.portrait ?? '');

  const card = {
    id: newUserCharId(),
    name,
    description,
    portrait,
    isUser: true,
    createdAt: new Date().toISOString(),
  };

  const chars = store.getUserCharacters(req.user.id);
  chars.push(card);
  store.saveUserCharacters(req.user.id, chars);
  store.saveUserSheet(req.user.id, card.id, defaultSheetForCard(card));

  return res.status(201).json(card);
});

app.patch('/api/me/characters/:id', auth.requireAuth, (req, res) => {
  const { id } = req.params;
  if (!isUserCharId(id)) {
    return res.status(400).json({ error: 'Invalid character id' });
  }

  const chars = store.getUserCharacters(req.user.id);
  const idx = chars.findIndex((c) => c.id === id);
  if (idx < 0) {
    return res.status(404).json({ error: 'Character not found' });
  }

  if (req.body?.name !== undefined) {
    chars[idx].name = String(req.body.name).trim();
  }
  if (req.body?.description !== undefined) {
    chars[idx].description = String(req.body.description).trim();
  }
  if (req.body?.portrait !== undefined) {
    chars[idx].portrait = String(req.body.portrait);
  }

  store.saveUserCharacters(req.user.id, chars);
  return res.json(chars[idx]);
});

app.delete('/api/me/characters/:id', auth.requireAuth, (req, res) => {
  const { id } = req.params;
  if (!isUserCharId(id)) {
    return res.status(400).json({ error: 'Invalid character id' });
  }

  const chars = store.getUserCharacters(req.user.id);
  const next = chars.filter((c) => c.id !== id);
  if (next.length === chars.length) {
    return res.status(404).json({ error: 'Character not found' });
  }

  store.saveUserCharacters(req.user.id, next);
  store.deleteUserSheet(req.user.id, id);
  return res.json({ ok: true });
});

app.get('/api/me/sheets/:charId', auth.requireAuth, (req, res) => {
  const { charId } = req.params;
  if (!isUserCharId(charId)) {
    return res.status(400).json({ error: 'Invalid character id' });
  }
  if (!findOwnedCharacter(req.user.id, charId)) {
    return res.status(404).json({ error: 'Character not found' });
  }

  const sheet = store.getUserSheet(req.user.id, charId);
  if (!sheet) {
    return res.status(404).json({ error: 'Sheet not found' });
  }
  return res.json(sheet);
});

app.put('/api/me/sheets/:charId', auth.requireAuth, (req, res) => {
  const { charId } = req.params;
  if (!isUserCharId(charId)) {
    return res.status(400).json({ error: 'Invalid character id' });
  }
  if (!findOwnedCharacter(req.user.id, charId)) {
    return res.status(404).json({ error: 'Character not found' });
  }

  store.saveUserSheet(req.user.id, charId, req.body);
  return res.json({ ok: true });
});

app.post('/api/me/characters/import', auth.requireAuth, (req, res) => {
  const incoming = Array.isArray(req.body?.characters) ? req.body.characters : [];
  const sheets = req.body?.sheets && typeof req.body.sheets === 'object'
    ? req.body.sheets
    : {};

  if (incoming.length === 0) {
    return res.status(400).json({ error: 'No characters to import' });
  }

  const existing = store.getUserCharacters(req.user.id);
  if (existing.length > 0) {
    return res.status(409).json({ error: 'Account already has characters' });
  }

  const imported = incoming
    .filter((c) => c && isUserCharId(c.id))
    .map((c) => ({
      id: c.id,
      name: String(c.name ?? '').trim(),
      description: String(c.description ?? '').trim(),
      portrait: String(c.portrait ?? ''),
      isUser: true,
      createdAt: c.createdAt || new Date().toISOString(),
    }));

  store.saveUserCharacters(req.user.id, imported);
  imported.forEach((card) => {
    const sheet = sheets[card.id] || defaultSheetForCard(card);
    store.saveUserSheet(req.user.id, card.id, sheet);
  });

  return res.status(201).json({ imported: imported.length });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/character', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/character.html'));
});

app.get('/create', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/create.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/register.html'));
});

app.listen(PORT, () => {
  console.log('Server running: http://localhost:', PORT);
});
