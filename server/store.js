const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
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
  deleteUser,
};
