const fs = require('fs');
const path = require('path');

// Каталог данных можно переопределить через GOB_DATA_DIR — это нужно тестам,
// чтобы писать во временную папку и не трогать реальные server/data/.
const DATA_DIR = process.env.GOB_DATA_DIR
  ? path.resolve(process.env.GOB_DATA_DIR)
  : path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJson(file, defaultValue) {
  ensureDir(path.dirname(file));
  if (!fs.existsSync(file)) {
    if (defaultValue !== undefined) {
      writeJson(file, defaultValue);
    }
    return defaultValue !== undefined
      ? JSON.parse(JSON.stringify(defaultValue))
      : null;
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return defaultValue !== undefined
      ? JSON.parse(JSON.stringify(defaultValue))
      : null;
  }
}

function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function getUsers() {
  return readJson(USERS_FILE, []);
}

function saveUsers(users) {
  writeJson(USERS_FILE, users);
}

function findUserByUsername(username) {
  return getUsers().find((u) => u.username === username) || null;
}

function findUserById(id) {
  return getUsers().find((u) => u.id === id) || null;
}

function createUser(user) {
  const users = getUsers();
  users.push(user);
  saveUsers(users);
  return user;
}

function getSessions() {
  return readJson(SESSIONS_FILE, {});
}

function saveSessions(sessions) {
  writeJson(SESSIONS_FILE, sessions);
}

function getSession(token) {
  return getSessions()[token] || null;
}

function createSession(token, userId, expiresAt) {
  const sessions = getSessions();
  sessions[token] = {
    userId,
    createdAt: new Date().toISOString(),
    expiresAt,
  };
  saveSessions(sessions);
}

function deleteSession(token) {
  const sessions = getSessions();
  if (!sessions[token]) return;
  delete sessions[token];
  saveSessions(sessions);
}

function cleanExpiredSessions() {
  const sessions = getSessions();
  const now = Date.now();
  let changed = false;
  for (const [token, session] of Object.entries(sessions)) {
    if (new Date(session.expiresAt).getTime() < now) {
      delete sessions[token];
      changed = true;
    }
  }
  if (changed) saveSessions(sessions);
}

function accountDir(userId) {
  return path.join(DATA_DIR, 'accounts', userId);
}

function charactersFile(userId) {
  return path.join(accountDir(userId), 'characters.json');
}

function sheetFile(userId, charId) {
  return path.join(accountDir(userId), 'sheets', `${charId}.json`);
}

function groupFile(userId) {
  return path.join(accountDir(userId), 'group.json');
}

function partiesDir() {
  return path.join(DATA_DIR, 'parties');
}

function partyGroupFile(groupId) {
  return path.join(partiesDir(), `${groupId}.json`);
}

function getPartyGroup(groupId) {
  if (!groupId) return null;
  return readJson(partyGroupFile(groupId), null);
}

function savePartyGroup(group) {
  if (!group?.id) return;
  writeJson(partyGroupFile(group.id), group);
}

function deletePartyGroup(groupId) {
  const file = partyGroupFile(groupId);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

function charGroupsFile(userId) {
  return path.join(accountDir(userId), 'char-groups.json');
}

function getCharGroupIds(userId, charId) {
  const all = readJson(charGroupsFile(userId), {});
  return Array.isArray(all[charId]) ? all[charId].filter(Boolean) : [];
}

function setCharGroupIds(userId, charId, groupIds) {
  const all = readJson(charGroupsFile(userId), {});
  const ids = [...new Set(groupIds.filter(Boolean))];
  if (ids.length) all[charId] = ids;
  else delete all[charId];
  writeJson(charGroupsFile(userId), all);
}

function addCharToGroup(userId, charId, groupId) {
  const ids = new Set(getCharGroupIds(userId, charId));
  ids.add(groupId);
  setCharGroupIds(userId, charId, [...ids]);
}

function removeCharFromGroup(userId, charId, groupId) {
  const ids = getCharGroupIds(userId, charId).filter((id) => id !== groupId);
  setCharGroupIds(userId, charId, ids);
}

function getPartyGroupsForChar(userId, charId) {
  return getCharGroupIds(userId, charId)
    .map((id) => getPartyGroup(id))
    .filter(Boolean);
}

function syncCharacterInParties(userId, char) {
  if (!char?.id) return;
  getCharGroupIds(userId, char.id).forEach((groupId) => {
    const group = getPartyGroup(groupId);
    if (!group?.members) return;
    const idx = group.members.findIndex((m) => m.charId === char.id);
    if (idx < 0) return;
    group.members[idx] = {
      ...group.members[idx],
      name: String(char.name ?? '').trim(),
      description: String(char.description ?? '').trim(),
      portrait: String(char.portrait ?? ''),
    };
    savePartyGroup(group);
  });
}

function defaultGroup() {
  return { ownerUserId: '', leaderCharId: '', members: [] };
}

function getUserGroup(userId) {
  return readJson(groupFile(userId), defaultGroup());
}

function saveUserGroup(userId, group) {
  writeJson(groupFile(userId), group);
}

function invitesFile(userId) {
  return path.join(accountDir(userId), 'invites.json');
}

function sentInvitesFile(userId) {
  return path.join(accountDir(userId), 'sent-invites.json');
}

function getUserInvites(userId) {
  return readJson(invitesFile(userId), []);
}

function saveUserInvites(userId, invites) {
  writeJson(invitesFile(userId), invites);
}

function getSentInvites(userId) {
  return readJson(sentInvitesFile(userId), []);
}

function saveSentInvites(userId, invites) {
  writeJson(sentInvitesFile(userId), invites);
}

function messagesFile(userId) {
  return path.join(accountDir(userId), 'messages.json');
}

function getUserMessages(userId) {
  return readJson(messagesFile(userId), []);
}

function saveUserMessages(userId, messages) {
  writeJson(messagesFile(userId), messages);
}

function gmSessionFile(userId) {
  return path.join(accountDir(userId), 'gm-session.json');
}

function getGmSession(userId) {
  return readJson(gmSessionFile(userId), { activeGroupId: '' });
}

function saveGmSession(userId, session) {
  writeJson(gmSessionFile(userId), {
    activeGroupId: String(session?.activeGroupId ?? '').trim(),
    updatedAt: new Date().toISOString(),
  });
}

function clearGmSessionIfActive(userId, groupId) {
  if (!userId || !groupId) return;
  const session = getGmSession(userId);
  if (session.activeGroupId === groupId) {
    saveGmSession(userId, { activeGroupId: '' });
  }
}

function listAllPartyGroups() {
  ensureDir(partiesDir());
  if (!fs.existsSync(partiesDir())) return [];
  return fs.readdirSync(partiesDir())
    .filter((name) => name.endsWith('.json'))
    .map((name) => readJson(path.join(partiesDir(), name), null))
    .filter(Boolean);
}

function findUserByCharId(charId) {
  if (typeof charId !== 'string' || !charId.startsWith('u_')) return null;
  for (const user of getUsers()) {
    const chars = getUserCharacters(user.id);
    if (chars.some((c) => c.id === charId)) {
      return user;
    }
  }
  return null;
}

function getUserCharacters(userId) {
  return readJson(charactersFile(userId), []);
}

function saveUserCharacters(userId, chars) {
  writeJson(charactersFile(userId), chars);
}

function getUserSheet(userId, charId) {
  return readJson(sheetFile(userId, charId), null);
}

function saveUserSheet(userId, charId, sheet) {
  writeJson(sheetFile(userId, charId), sheet);
}

function deleteUserSheet(userId, charId) {
  const file = sheetFile(userId, charId);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

function deleteSessionsForUser(userId) {
  const sessions = getSessions();
  let changed = false;
  for (const [token, session] of Object.entries(sessions)) {
    if (session.userId === userId) {
      delete sessions[token];
      changed = true;
    }
  }
  if (changed) saveSessions(sessions);
}

function deleteAccountData(userId) {
  const dir = accountDir(userId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function deleteUser(userId) {
  const users = getUsers().filter((u) => u.id !== userId);
  saveUsers(users);
  deleteSessionsForUser(userId);
  deleteAccountData(userId);
}

module.exports = {
  getUsers,
  saveUsers,
  findUserByUsername,
  findUserById,
  createUser,
  getSession,
  createSession,
  deleteSession,
  cleanExpiredSessions,
  getUserCharacters,
  saveUserCharacters,
  getUserSheet,
  saveUserSheet,
  deleteUserSheet,
  getUserGroup,
  saveUserGroup,
  getPartyGroup,
  savePartyGroup,
  deletePartyGroup,
  getCharGroupIds,
  addCharToGroup,
  removeCharFromGroup,
  getPartyGroupsForChar,
  syncCharacterInParties,
  getUserInvites,
  saveUserInvites,
  getSentInvites,
  saveSentInvites,
  getUserMessages,
  saveUserMessages,
  getGmSession,
  saveGmSession,
  clearGmSessionIfActive,
  listAllPartyGroups,
  findUserByCharId,
  deleteUser,
};
