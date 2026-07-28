const express = require('express');
const path = require('path');
const fs = require('fs');
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

const BACKPACK_SLOTS = 6;

/** charId -> Set<{ res, clientId }>: открытые SSE-подписки на изменения листа. */
const sheetSubscribers = new Map();

function subscribeToSheet(charId, entry) {
  if (!sheetSubscribers.has(charId)) sheetSubscribers.set(charId, new Set());
  sheetSubscribers.get(charId).add(entry);
}

function unsubscribeFromSheet(charId, entry) {
  const set = sheetSubscribers.get(charId);
  if (!set) return;
  set.delete(entry);
  if (!set.size) sheetSubscribers.delete(charId);
}

/** Разослать всем открытым листам этого героя, кроме самого автора правки. */
function broadcastSheetUpdate(charId, payload, exceptClientId) {
  const set = sheetSubscribers.get(charId);
  if (!set) return;
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const entry of set) {
    if (exceptClientId && entry.clientId === exceptClientId) continue;
    try {
      entry.res.write(data);
    } catch {
      /* мёртвое соединение подчистит close-хендлер */
    }
  }
}

/**
 * Лист хранится одним блобом, поэтому правки мастера и игрока могут затирать
 * друг друга. rev инкрементится сервером и проверяется при записи.
 */
function sheetRev(sheet) {
  const rev = Number(sheet?.rev);
  return Number.isFinite(rev) && rev > 0 ? rev : 0;
}

function writeSheetWithRev(ownerUserId, charId, incoming, actorRole) {
  const current = store.getUserSheet(ownerUserId, charId);
  const next = { ...incoming };
  next.rev = sheetRev(current) + 1;
  next.updatedAt = new Date().toISOString();
  next.updatedBy = actorRole;
  store.saveUserSheet(ownerUserId, charId, next);
  return next;
}

function normalizeBackpackItem(raw) {
  const name = String(raw?.name ?? '').trim();
  const desc = String(raw?.desc ?? raw?.description ?? '').trim();
  const item = { name, desc };
  if (raw?.classId) {
    item.classId = String(raw.classId).trim();
    const tier = Number(raw.tier);
    item.tier = Number.isFinite(tier) ? Math.min(4, Math.max(1, tier)) : 1;
    item.mods = raw.mods && typeof raw.mods === 'object' ? { ...raw.mods } : {};
  }
  return item;
}

function isBackpackSlotEmpty(slot) {
  if (!slot || typeof slot !== 'object') return true;
  return !String(slot.name ?? '').trim() && !slot.classId;
}

function findFirstFreeBackpackSlot(backpack) {
  if (!Array.isArray(backpack)) return -1;
  return backpack.findIndex(isBackpackSlotEmpty);
}

function ensureBackpack(sheet) {
  const empty = { name: '', desc: '' };
  if (!sheet || typeof sheet !== 'object') return;
  if (!Array.isArray(sheet.backpack)) {
    sheet.backpack = Array.from({ length: BACKPACK_SLOTS }, () => ({ ...empty }));
    return;
  }
  while (sheet.backpack.length < BACKPACK_SLOTS) {
    sheet.backpack.push({ ...empty });
  }
  if (sheet.backpack.length > BACKPACK_SLOTS) {
    sheet.backpack = sheet.backpack.slice(0, BACKPACK_SLOTS);
  }
}

function isItemGiftMessage(message) {
  return message?.type === 'item_gift' || !!String(message?.item?.name ?? '').trim();
}

function isPendingMailMessage(message) {
  if (isItemGiftMessage(message)) {
    return message.status === 'unread';
  }
  return true;
}

function isUserCharId(id) {
  return typeof id === 'string' && id.startsWith('u_');
}

function findOwnedCharacter(userId, charId) {
  const chars = store.getUserCharacters(userId);
  return chars.find((c) => c.id === charId) || null;
}

/**
 * Кто и на каком основании может читать/писать лист персонажа.
 * Владелец — всегда; мастер — для героев своей активной группы.
 * Возвращает { ownerUserId, char, role } либо null.
 */
function resolveCharAccess(user, charId) {
  if (!user || !isUserCharId(charId)) return null;

  const own = findOwnedCharacter(user.id, charId);
  if (own) return { ownerUserId: user.id, char: own, role: 'owner' };

  if (!auth.isGameMasterUser(user)) return null;

  const activeGroupId = String(store.getGmSession(user.id).activeGroupId || '').trim();
  if (!activeGroupId) return null;

  const group = store.getPartyGroup(activeGroupId);
  if (!group || !canGmAccessGroup(group, user.id) || !charInParty(group, charId)) return null;

  const owner = store.findUserByCharId(charId);
  if (!owner) return null;

  const char = findOwnedCharacter(owner.id, charId);
  if (!char) return null;

  return { ownerUserId: owner.id, char, role: 'gm' };
}

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
    role: 'player',
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
  store.syncCharacterInParties(req.user.id, chars[idx]);
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

app.get('/api/me/characters/:charId', auth.requireAuth, (req, res) => {
  const access = resolveCharAccess(req.user, req.params.charId);
  if (!access) {
    return res.status(404).json({ error: 'Character not found' });
  }
  return res.json({ ...access.char, accessRole: access.role });
});

app.get('/api/me/sheets/:charId', auth.requireAuth, (req, res) => {
  const { charId } = req.params;
  const access = resolveCharAccess(req.user, charId);
  if (!access) {
    return res.status(404).json({ error: 'Character not found' });
  }

  const sheet = store.getUserSheet(access.ownerUserId, charId);
  if (!sheet) {
    return res.status(404).json({ error: 'Sheet not found' });
  }
  return res.json({ ...sheet, rev: sheetRev(sheet), accessRole: access.role });
});

app.put('/api/me/sheets/:charId', auth.requireAuth, (req, res) => {
  const { charId } = req.params;
  const access = resolveCharAccess(req.user, charId);
  if (!access) {
    return res.status(404).json({ error: 'Character not found' });
  }

  const current = store.getUserSheet(access.ownerUserId, charId);
  const clientRev = Number(req.body?.rev);
  // rev присылают не все клиенты; проверяем только когда он указан.
  if (current && Number.isFinite(clientRev) && clientRev !== sheetRev(current)) {
    return res.status(409).json({
      error: 'Лист изменён другим участником',
      sheet: { ...current, rev: sheetRev(current), accessRole: access.role },
    });
  }

  const incoming = { ...req.body };
  delete incoming.accessRole;
  const saved = writeSheetWithRev(access.ownerUserId, charId, incoming, access.role);

  broadcastSheetUpdate(
    charId,
    { type: 'sheet', rev: saved.rev, updatedBy: access.role, at: saved.updatedAt },
    String(req.get('X-Sheet-Client') || '').trim(),
  );

  return res.json({ ok: true, rev: saved.rev });
});

app.get('/api/me/sheets/:charId/events', auth.requireAuth, (req, res) => {
  const { charId } = req.params;
  const access = resolveCharAccess(req.user, charId);
  if (!access) {
    return res.status(404).json({ error: 'Character not found' });
  }

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  const entry = { res, clientId: String(req.query.clientId || '').trim() };
  subscribeToSheet(charId, entry);

  const sheet = store.getUserSheet(access.ownerUserId, charId);
  res.write(`data: ${JSON.stringify({ type: 'hello', rev: sheetRev(sheet) })}\n\n`);

  // Комментарий-пинг держит соединение живым через прокси.
  const ping = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      /* ignore */
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(ping);
    unsubscribeFromSheet(charId, entry);
  });
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

function normalizePartyGroup(body) {
  const members = Array.isArray(body?.members) ? body.members : [];
  return {
    id: String(body?.id ?? '').trim(),
    name: String(body?.name ?? '').trim(),
    ownerUserId: String(body?.ownerUserId ?? '').trim(),
    leaderCharId: String(body?.leaderCharId ?? '').trim(),
    members: members
      .filter((m) => m && typeof m.charId === 'string' && m.charId.trim())
      .map((m) => ({
        charId: String(m.charId).trim(),
        name: String(m.name ?? '').trim(),
        portrait: String(m.portrait ?? ''),
        description: String(m.description ?? '').trim(),
        accountId: String(m.accountId ?? '').trim(),
        accountName: String(m.accountName ?? '').trim(),
        addedAt: m.addedAt || new Date().toISOString(),
        revealed: m.revealed === true,
      })),
    createdAt: body?.createdAt || new Date().toISOString(),
  };
}

function newGroupId() {
  return `grp_${crypto.randomUUID()}`;
}

function memberEntryFromChar(char, user) {
  return {
    charId: char.id,
    name: String(char.name ?? '').trim(),
    portrait: String(char.portrait ?? ''),
    description: String(char.description ?? '').trim(),
    accountId: user.id,
    accountName: user.username,
    addedAt: new Date().toISOString(),
    revealed: false,
  };
}

function charInParty(group, charId) {
  return (group?.members || []).some((m) => m.charId === charId);
}

function userInParty(group, userId) {
  return (group?.members || []).some((m) => m.accountId === userId);
}

function canAccessParty(group, userId, charId = '') {
  if (!group) return false;
  if (group.ownerUserId === userId) return true;
  if (charId && charInParty(group, charId)) return true;
  return userInParty(group, userId);
}

function linkMemberToParty(group, member) {
  if (group?.id && member?.accountId && member?.charId) {
    store.addCharToGroup(member.accountId, member.charId, group.id);
  }
}

function savePartyWithLinks(group) {
  const normalized = normalizePartyGroup(group);
  store.savePartyGroup(normalized);
  normalized.members.forEach((member) => linkMemberToParty(normalized, member));
  return normalized;
}

function ensureMemberInParty(group, charId, userId) {
  if (!charId || charInParty(group, charId)) return group;
  const char = findOwnedCharacter(userId, charId);
  const user = store.findUserById(userId);
  if (!char || !user) return group;
  group.members.push(memberEntryFromChar(char, user));
  return group;
}

function hydratePartyMember(member) {
  if (!member?.charId || !String(member.charId).startsWith('u_')) {
    return member;
  }
  const owner = store.findUserByCharId(member.charId);
  if (!owner) return member;
  const char = findOwnedCharacter(owner.id, member.charId);
  if (!char) return member;
  return {
    ...member,
    name: String(char.name ?? '').trim(),
    portrait: String(char.portrait ?? ''),
    description: String(char.description ?? '').trim(),
    accountId: owner.id,
    accountName: owner.username,
  };
}

function hydratePartyGroup(group) {
  if (!group) return group;
  return normalizePartyGroup({
    ...group,
    members: (group.members || []).map(hydratePartyMember),
  });
}

function removePartyMember(group, charId) {
  const member = group.members.find((m) => m.charId === charId);
  if (!member) return { deleted: false, group: null };
  const next = normalizePartyGroup({
    ...group,
    members: group.members.filter((m) => m.charId !== charId),
  });
  store.removeCharFromGroup(member.accountId, charId, group.id);

  if (!next.members.length) {
    store.deletePartyGroup(group.id);
    store.clearGmSessionIfActive(group.gmUserId, group.id);
    return { deleted: true, groupId: group.id };
  }

  store.savePartyGroup(next);
  return { deleted: false, group: next };
}

const MAX_GROUP_MEMBERS = 6;

function newInviteId() {
  return `inv_${crypto.randomUUID()}`;
}

function newMessageId() {
  return `msg_${crypto.randomUUID()}`;
}

function gmGroupSummary(group, gmUserId) {
  return {
    id: group.id,
    name: group.name || 'Без названия',
    memberCount: (group.members || []).length,
    ownerUserId: group.ownerUserId,
    gmUserId: group.gmUserId || '',
    isActiveGm: group.gmUserId === gmUserId,
    createdAt: group.createdAt,
  };
}

function canGmAccessGroup(group, userId) {
  if (!group) return false;
  if (!group.gmUserId || group.gmUserId === userId) return true;
  return false;
}

function validateGroupName(name) {
  const text = String(name ?? '').trim();
  if (text.length < 2 || text.length > 48) {
    return 'Название группы: от 2 до 48 символов';
  }
  return null;
}

function publicCharacterCard(char, { isUser = false } = {}) {
  return {
    id: char.id,
    name: String(char.name ?? '').trim(),
    description: String(char.description ?? '').trim(),
    portrait: String(char.portrait ?? ''),
    isUser,
  };
}

app.get('/api/group/accounts', (req, res) => {
  const sessionUser = auth.getSessionUser(req);
  const accounts = [];

  if (sessionUser) {
    store.getUsers().forEach((u) => {
      accounts.push({
        id: u.id,
        username: u.username,
        kind: 'user',
        role: auth.resolveUserRole(u),
        isSelf: u.id === sessionUser.id,
      });
    });
  }

  res.json(accounts);
});

app.get('/api/group/accounts/:accountId/characters', (req, res) => {
  const { accountId } = req.params;

  if (!auth.getSessionUser(req)) {
    return res.status(401).json({ error: 'Войдите, чтобы смотреть героев аккаунтов' });
  }

  const owner = store.findUserById(accountId);
  if (!owner) {
    return res.status(404).json({ error: 'Аккаунт не найден' });
  }

  const chars = store.getUserCharacters(accountId).map((c) => publicCharacterCard(c, { isUser: true }));
  return res.json(chars);
});

app.get('/api/me/groups', auth.requireAuth, (req, res) => {
  const charId = String(req.query.charId ?? '').trim();
  if (!isUserCharId(charId) || !findOwnedCharacter(req.user.id, charId)) {
    return res.status(400).json({ error: 'Некорректный персонаж' });
  }

  const groups = store.getPartyGroupsForChar(req.user.id, charId).map((group) => ({
    id: group.id,
    name: group.name,
    leaderCharId: group.leaderCharId,
    memberCount: group.members.length,
    ownerUserId: group.ownerUserId,
    isOwner: group.ownerUserId === req.user.id,
    createdAt: group.createdAt,
  }));

  return res.json(groups);
});

app.post('/api/me/groups', auth.requireAuth, (req, res) => {
  const nameError = validateGroupName(req.body?.name);
  if (nameError) return res.status(400).json({ error: nameError });

  const leaderCharId = String(req.body?.leaderCharId ?? '').trim();
  if (!isUserCharId(leaderCharId) || !findOwnedCharacter(req.user.id, leaderCharId)) {
    return res.status(403).json({ error: 'Это не ваш герой' });
  }

  const leaderChar = findOwnedCharacter(req.user.id, leaderCharId);
  const user = store.findUserById(req.user.id);
  const group = savePartyWithLinks({
    id: newGroupId(),
    name: String(req.body.name).trim(),
    ownerUserId: req.user.id,
    leaderCharId,
    members: [memberEntryFromChar(leaderChar, user)],
    createdAt: new Date().toISOString(),
  });

  return res.status(201).json(group);
});

app.get('/api/me/groups/:groupId', auth.requireAuth, (req, res) => {
  const { groupId } = req.params;
  const charId = String(req.query.charId ?? '').trim();
  const group = store.getPartyGroup(groupId);
  if (!group) {
    return res.status(404).json({ error: 'Группа не найдена' });
  }
  if (!canAccessParty(group, req.user.id, charId)) {
    return res.status(403).json({ error: 'Нет доступа к группе' });
  }
  return res.json({
    ...hydratePartyGroup(group),
    isOwner: group.ownerUserId === req.user.id,
  });
});

app.delete('/api/me/groups/:groupId/members/:charId', auth.requireAuth, (req, res) => {
  const { groupId, charId } = req.params;
  const targetCharId = String(charId ?? '').trim();
  const group = store.getPartyGroup(groupId);
  if (!group) {
    return res.status(404).json({ error: 'Группа не найдена' });
  }
  if (!charInParty(group, targetCharId)) {
    return res.status(404).json({ error: 'Герой не в группе' });
  }

  const isOwner = group.ownerUserId === req.user.id;
  const ownsChar = !!findOwnedCharacter(req.user.id, targetCharId);
  if (!isOwner && !ownsChar) {
    return res.status(403).json({ error: 'Нельзя убрать этого героя' });
  }

  const result = removePartyMember(group, targetCharId);
  if (result.deleted) {
    return res.json({ deleted: true, id: result.groupId });
  }
  return res.json(hydratePartyGroup(result.group));
});

app.post('/api/me/groups/:groupId/members/:charId/reveal', auth.requireAuth, (req, res) => {
  const { groupId, charId } = req.params;
  const targetCharId = String(charId ?? '').trim();
  const group = store.getPartyGroup(groupId);
  if (!group) {
    return res.status(404).json({ error: 'Группа не найдена' });
  }
  if (!charInParty(group, targetCharId)) {
    return res.status(404).json({ error: 'Герой не в группе' });
  }
  if (!findOwnedCharacter(req.user.id, targetCharId)) {
    return res.status(403).json({ error: 'Это не ваш герой' });
  }

  const next = normalizePartyGroup({
    ...group,
    members: group.members.map((m) => {
      if (m.charId !== targetCharId) return m;
      const char = findOwnedCharacter(req.user.id, targetCharId);
      return {
        ...m,
        revealed: true,
        name: String(char?.name ?? m.name ?? '').trim(),
        description: String(char?.description ?? m.description ?? '').trim(),
        portrait: String(char?.portrait ?? m.portrait ?? ''),
      };
    }),
  });
  store.savePartyGroup(next);
  return res.json(hydratePartyGroup(next));
});

app.post('/api/me/group/invite', auth.requireAuth, (req, res) => {
  const groupId = String(req.body?.groupId ?? '').trim();
  const fromCharId = String(req.body?.fromCharId ?? '').trim();
  const toCharId = String(req.body?.toCharId ?? '').trim();

  if (!groupId) {
    return res.status(400).json({ error: 'Не указана группа' });
  }
  if (!isUserCharId(fromCharId) || !isUserCharId(toCharId)) {
    return res.status(400).json({ error: 'Некорректный персонаж' });
  }
  if (fromCharId === toCharId) {
    return res.status(400).json({ error: 'Нельзя пригласить себя' });
  }
  if (!findOwnedCharacter(req.user.id, fromCharId)) {
    return res.status(403).json({ error: 'Это не ваш герой' });
  }

  const group = store.getPartyGroup(groupId);
  if (!group) {
    return res.status(404).json({ error: 'Группа не найдена' });
  }
  if (!canAccessParty(group, req.user.id, fromCharId)) {
    return res.status(403).json({ error: 'Нет доступа к группе' });
  }

  let party = normalizePartyGroup(group);
  party = ensureMemberInParty(party, fromCharId, req.user.id);

  if (party.members.some((m) => m.charId === toCharId)) {
    return res.status(409).json({ error: 'Уже в группе' });
  }
  if (party.members.length >= MAX_GROUP_MEMBERS) {
    return res.status(409).json({ error: 'Группа полна' });
  }
  savePartyWithLinks(party);

  const targetOwner = store.findUserByCharId(toCharId);
  if (!targetOwner) {
    return res.status(404).json({ error: 'Персонаж не найден' });
  }
  if (targetOwner.id === req.user.id) {
    return res.status(400).json({ error: 'Нельзя пригласить своего героя' });
  }

  const incoming = store.getUserInvites(targetOwner.id);
  const duplicate = incoming.find((i) => (
    i.status === 'pending'
    && i.toCharId === toCharId
    && i.fromUserId === req.user.id
    && i.groupId === groupId
  ));
  if (duplicate) {
    return res.status(409).json({ error: 'Приглашение уже отправлено' });
  }

  const fromChar = findOwnedCharacter(req.user.id, fromCharId);
  const toChar = findOwnedCharacter(targetOwner.id, toCharId);
  const invite = {
    id: newInviteId(),
    groupId,
    groupName: party.name,
    toCharId,
    toCharName: String(toChar?.name ?? '').trim(),
    fromUserId: req.user.id,
    fromUsername: req.user.username,
    fromCharId,
    fromCharName: String(fromChar?.name ?? '').trim(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  incoming.push(invite);
  store.saveUserInvites(targetOwner.id, incoming);

  const sent = store.getSentInvites(req.user.id);
  sent.push({ ...invite });
  store.saveSentInvites(req.user.id, sent);

  return res.status(201).json(invite);
});

app.get('/api/me/invites', auth.requireAuth, (req, res) => {
  const charId = String(req.query.charId ?? '').trim();
  const invites = store.getUserInvites(req.user.id)
    .filter((i) => i.status === 'pending')
    .filter((i) => !charId || i.toCharId === charId);
  return res.json(invites);
});

app.get('/api/me/sent-invites', auth.requireAuth, (req, res) => {
  const groupId = String(req.query.groupId ?? '').trim();
  const invites = store.getSentInvites(req.user.id)
    .filter((i) => i.status === 'pending')
    .filter((i) => !groupId || i.groupId === groupId);
  return res.json(invites);
});

app.post('/api/me/invites/:id/accept', auth.requireAuth, (req, res) => {
  const { id } = req.params;
  const invites = store.getUserInvites(req.user.id);
  const idx = invites.findIndex((i) => i.id === id && i.status === 'pending');
  if (idx < 0) {
    return res.status(404).json({ error: 'Приглашение не найдено' });
  }

  const invite = invites[idx];
  if (!findOwnedCharacter(req.user.id, invite.toCharId)) {
    return res.status(403).json({ error: 'Это не ваш герой' });
  }

  const party = store.getPartyGroup(invite.groupId);
  if (!party) {
    return res.status(404).json({ error: 'Группа не найдена' });
  }
  if (party.members.length >= MAX_GROUP_MEMBERS
    && !charInParty(party, invite.toCharId)) {
    return res.status(409).json({ error: 'Группа отправителя уже полна' });
  }

  let next = normalizePartyGroup(party);
  next = ensureMemberInParty(next, invite.toCharId, req.user.id);
  savePartyWithLinks(next);

  invites[idx].status = 'accepted';
  store.saveUserInvites(req.user.id, invites);

  const sent = store.getSentInvites(invite.fromUserId);
  const sentIdx = sent.findIndex((i) => i.id === id);
  if (sentIdx >= 0) {
    sent[sentIdx].status = 'accepted';
    store.saveSentInvites(invite.fromUserId, sent);
  }

  return res.json({ ok: true, group: hydratePartyGroup(next) });
});

app.post('/api/me/invites/:id/decline', auth.requireAuth, (req, res) => {
  const { id } = req.params;
  const invites = store.getUserInvites(req.user.id);
  const idx = invites.findIndex((i) => i.id === id && i.status === 'pending');
  if (idx < 0) {
    return res.status(404).json({ error: 'Приглашение не найдено' });
  }

  const invite = invites[idx];
  invites[idx].status = 'declined';
  store.saveUserInvites(req.user.id, invites);

  const sent = store.getSentInvites(invite.fromUserId);
  const sentIdx = sent.findIndex((i) => i.id === id);
  if (sentIdx >= 0) {
    sent[sentIdx].status = 'declined';
    store.saveSentInvites(invite.fromUserId, sent);
  }

  return res.json({ ok: true });
});

app.get('/api/gm/session', auth.requireGameMaster, (req, res) => {
  const session = store.getGmSession(req.user.id);
  const activeGroupId = String(session.activeGroupId || '').trim();
  if (!activeGroupId) {
    return res.json({ activeGroupId: '', group: null });
  }
  const group = store.getPartyGroup(activeGroupId);
  if (!group || !canGmAccessGroup(group, req.user.id)) {
    store.saveGmSession(req.user.id, { activeGroupId: '' });
    return res.json({ activeGroupId: '', group: null });
  }
  return res.json({
    activeGroupId,
    group: {
      ...hydratePartyGroup(group),
      isOwner: false,
    },
  });
});

app.put('/api/gm/session', auth.requireGameMaster, (req, res) => {
  const activeGroupId = String(req.body?.activeGroupId ?? '').trim();
  if (!activeGroupId) {
    store.saveGmSession(req.user.id, { activeGroupId: '' });
    return res.json({ activeGroupId: '', group: null });
  }

  const group = store.getPartyGroup(activeGroupId);
  if (!group) {
    return res.status(404).json({ error: 'Группа не найдена' });
  }
  if (!canGmAccessGroup(group, req.user.id)) {
    return res.status(403).json({ error: 'Группа ведётся другим мастером' });
  }

  const next = normalizePartyGroup({
    ...group,
    gmUserId: req.user.id,
    gmAssignedAt: group.gmAssignedAt || new Date().toISOString(),
  });
  store.savePartyGroup(next);
  store.saveGmSession(req.user.id, { activeGroupId });

  return res.json({
    activeGroupId,
    group: {
      ...hydratePartyGroup(next),
      isOwner: false,
    },
  });
});

app.get('/api/gm/groups', auth.requireGameMaster, (req, res) => {
  const groups = store.listAllPartyGroups()
    .map((group) => gmGroupSummary(group, req.user.id))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return res.json(groups);
});

app.get('/api/gm/groups/:groupId', auth.requireGameMaster, (req, res) => {
  const { groupId } = req.params;
  const group = store.getPartyGroup(groupId);
  if (!group) {
    return res.status(404).json({ error: 'Группа не найдена' });
  }
  if (!canGmAccessGroup(group, req.user.id)) {
    return res.status(403).json({ error: 'Группа ведётся другим мастером' });
  }
  return res.json({
    ...hydratePartyGroup(group),
    isOwner: false,
  });
});

app.post('/api/gm/groups/:groupId/messages', auth.requireGameMaster, (req, res) => {
  const { groupId } = req.params;
  const toCharId = String(req.body?.toCharId ?? '').trim();
  const type = String(req.body?.type ?? 'text').trim();
  const body = String(req.body?.body ?? '').trim();

  if (!isUserCharId(toCharId)) {
    return res.status(400).json({ error: 'Некорректный персонаж' });
  }

  const group = store.getPartyGroup(groupId);
  if (!group) {
    return res.status(404).json({ error: 'Группа не найдена' });
  }
  if (!canGmAccessGroup(group, req.user.id)) {
    return res.status(403).json({ error: 'Группа ведётся другим мастером' });
  }
  if (!charInParty(group, toCharId)) {
    return res.status(404).json({ error: 'Герой не в этой группе' });
  }

  const targetOwner = store.findUserByCharId(toCharId);
  if (!targetOwner) {
    return res.status(404).json({ error: 'Владелец персонажа не найден' });
  }

  const member = group.members.find((m) => m.charId === toCharId);
  const base = {
    id: newMessageId(),
    groupId,
    groupName: group.name || 'Группа',
    fromUserId: req.user.id,
    fromUsername: req.user.username,
    fromRole: 'gamemaster',
    toCharId,
    toCharName: String(member?.name ?? '').trim(),
    status: 'unread',
    createdAt: new Date().toISOString(),
  };

  let message;
  if (type === 'item_gift') {
    const item = normalizeBackpackItem(req.body?.item ?? {});
    if (!item.name) {
      return res.status(400).json({ error: 'Укажите название предмета' });
    }
    if (item.name.length > 120) {
      return res.status(400).json({ error: 'Название предмета слишком длинное' });
    }
    if (item.desc.length > 2000) {
      return res.status(400).json({ error: 'Описание предмета слишком длинное' });
    }
    message = {
      ...base,
      type: 'item_gift',
      body: body || `Мастер передаёт вам: ${item.name}`,
      item,
    };
  } else {
    if (!body) {
      return res.status(400).json({ error: 'Введите текст сообщения' });
    }
    if (body.length > 2000) {
      return res.status(400).json({ error: 'Сообщение слишком длинное (макс. 2000)' });
    }
    message = {
      ...base,
      type: 'text',
      body,
    };
  }

  const inbox = store.getUserMessages(targetOwner.id);
  inbox.push(message);
  store.saveUserMessages(targetOwner.id, inbox);

  return res.status(201).json(message);
});

app.get('/api/me/messages', auth.requireAuth, (req, res) => {
  const charId = String(req.query.charId ?? '').trim();
  if (!charId || !isUserCharId(charId) || !findOwnedCharacter(req.user.id, charId)) {
    return res.status(400).json({ error: 'Некорректный персонаж' });
  }
  const messages = store.getUserMessages(req.user.id)
    .filter((m) => m.toCharId === charId)
    .filter(isPendingMailMessage)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return res.json(messages);
});

app.post('/api/me/messages/:id/accept', auth.requireAuth, (req, res) => {
  const { id } = req.params;
  const charId = String(req.body?.charId ?? req.query?.charId ?? '').trim();
  const messages = store.getUserMessages(req.user.id);
  const idx = messages.findIndex((m) => m.id === id);
  if (idx < 0) {
    return res.status(404).json({ error: 'Сообщение не найдено' });
  }

  const message = messages[idx];
  if (!isItemGiftMessage(message)) {
    return res.status(400).json({ error: 'Это не посылка с предметом' });
  }
  if (message.status !== 'unread') {
    return res.status(409).json({ error: 'Посылка уже обработана' });
  }
  if (charId && message.toCharId !== charId) {
    return res.status(403).json({ error: 'Это сообщение другому герою' });
  }
  if (!findOwnedCharacter(req.user.id, message.toCharId)) {
    return res.status(403).json({ error: 'Нет доступа' });
  }

  const char = findOwnedCharacter(req.user.id, message.toCharId);
  let sheet = store.getUserSheet(req.user.id, message.toCharId);
  if (!sheet) {
    sheet = defaultSheetForCard(char);
  }
  ensureBackpack(sheet);

  const slotIdx = findFirstFreeBackpackSlot(sheet.backpack);
  if (slotIdx < 0) {
    return res.status(409).json({ error: 'Рюкзак полон — освободите слот' });
  }

  sheet.backpack[slotIdx] = normalizeBackpackItem(message.item);
  const savedSheet = writeSheetWithRev(req.user.id, message.toCharId, sheet, 'owner');
  broadcastSheetUpdate(message.toCharId, {
    type: 'sheet',
    rev: savedSheet.rev,
    updatedBy: 'owner',
    at: savedSheet.updatedAt,
  });

  messages[idx].status = 'accepted';
  messages[idx].acceptedAt = new Date().toISOString();
  messages[idx].backpackSlot = slotIdx;
  store.saveUserMessages(req.user.id, messages);

  return res.json({
    ok: true,
    slot: slotIdx,
    item: sheet.backpack[slotIdx],
    message: messages[idx],
  });
});

app.post('/api/me/messages/:id/decline', auth.requireAuth, (req, res) => {
  const { id } = req.params;
  const charId = String(req.body?.charId ?? req.query?.charId ?? '').trim();
  const messages = store.getUserMessages(req.user.id);
  const idx = messages.findIndex((m) => m.id === id);
  if (idx < 0) {
    return res.status(404).json({ error: 'Сообщение не найдено' });
  }

  const message = messages[idx];
  if (!isItemGiftMessage(message)) {
    return res.status(400).json({ error: 'Это не посылка с предметом' });
  }
  if (message.status !== 'unread') {
    return res.status(409).json({ error: 'Посылка уже обработана' });
  }
  if (charId && message.toCharId !== charId) {
    return res.status(403).json({ error: 'Это сообщение другому герою' });
  }
  if (!findOwnedCharacter(req.user.id, message.toCharId)) {
    return res.status(403).json({ error: 'Нет доступа' });
  }

  messages[idx].status = 'declined';
  messages[idx].declinedAt = new Date().toISOString();
  store.saveUserMessages(req.user.id, messages);

  return res.json({ ok: true, message: messages[idx] });
});

app.post('/api/me/messages/:id/read', auth.requireAuth, (req, res) => {
  const { id } = req.params;
  const charId = String(req.body?.charId ?? req.query?.charId ?? '').trim();
  const messages = store.getUserMessages(req.user.id);
  const idx = messages.findIndex((m) => m.id === id);
  if (idx < 0) {
    return res.status(404).json({ error: 'Сообщение не найдено' });
  }
  if (charId && messages[idx].toCharId !== charId) {
    return res.status(403).json({ error: 'Это сообщение другому герою' });
  }
  if (!findOwnedCharacter(req.user.id, messages[idx].toCharId)) {
    return res.status(403).json({ error: 'Нет доступа' });
  }
  if (isItemGiftMessage(messages[idx])) {
    return res.status(400).json({ error: 'Примите или отклоните посылку' });
  }
  messages[idx].status = 'read';
  messages[idx].readAt = new Date().toISOString();
  store.saveUserMessages(req.user.id, messages);
  return res.json({ ok: true, message: messages[idx] });
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

app.get('/group', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/group.html'));
});

app.get('/gm', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/gm.html'));
});

// Слушаем порт только при прямом запуске (node server/server.js).
// При require из тестов приложение поднимается на случайном порту самим тестом.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('Server running: http://localhost:', PORT);
  });
}

module.exports = app;
