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
  const isUser = String(char.id).startsWith('u_');
  return {
    charId: char.id,
    name: String(char.name ?? '').trim(),
    portrait: String(char.portrait ?? ''),
    description: String(char.description ?? '').trim(),
    accountId: user.id,
    accountName: user.username,
    addedAt: new Date().toISOString(),
    revealed: !isUser,
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
  if (!member) return null;
  const next = normalizePartyGroup({
    ...group,
    members: group.members.filter((m) => m.charId !== charId),
  });
  store.savePartyGroup(next);
  store.removeCharFromGroup(member.accountId, charId, group.id);
  return next;
}

const MAX_GROUP_MEMBERS = 6;

function newInviteId() {
  return `inv_${crypto.randomUUID()}`;
}

function validateGroupName(name) {
  const text = String(name ?? '').trim();
  if (text.length < 2 || text.length > 48) {
    return 'Название группы: от 2 до 48 символов';
  }
  return null;
}

const BUILTIN_ACCOUNT_ID = 'builtin';
const BUILTIN_CHARACTERS_FILE = path.join(__dirname, '../public/data/characters.json');

function loadBuiltinCharacters() {
  try {
    const list = JSON.parse(fs.readFileSync(BUILTIN_CHARACTERS_FILE, 'utf8'));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
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
  const accounts = [{
    id: BUILTIN_ACCOUNT_ID,
    username: 'Классические герои',
    kind: 'builtin',
  }];

  if (sessionUser) {
    store.getUsers().forEach((u) => {
      accounts.push({
        id: u.id,
        username: u.username,
        kind: 'user',
        isSelf: u.id === sessionUser.id,
      });
    });
  }

  res.json(accounts);
});

app.get('/api/group/accounts/:accountId/characters', (req, res) => {
  const { accountId } = req.params;

  if (accountId === BUILTIN_ACCOUNT_ID) {
    const chars = loadBuiltinCharacters().map((c) => publicCharacterCard(c, { isUser: false }));
    return res.json(chars);
  }

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
  return res.json(hydratePartyGroup(group));
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

  const next = removePartyMember(group, targetCharId);
  return res.json(hydratePartyGroup(next));
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

app.listen(PORT, () => {
  console.log('Server running: http://localhost:', PORT);
});
