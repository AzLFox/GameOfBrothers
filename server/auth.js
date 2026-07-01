const crypto = require('crypto');
const store = require('./store');

const SESSION_COOKIE = 'gob_session';
const SESSION_DAYS = 7;
const SCRYPT_KEYLEN = 64;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;
const MIN_PASSWORD_LEN = 6;

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
}

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  return { salt, passwordHash };
}

function verifyPassword(password, salt, passwordHash) {
  const hash = hashPassword(password, salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(passwordHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateUserId() {
  return crypto.randomUUID();
}

function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  const cookies = {};
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx <= 0) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    cookies[key] = decodeURIComponent(val);
  });
  return cookies;
}

function setSessionCookie(res, token) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax`,
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`,
  );
}

function createSessionForUser(res, userId) {
  store.cleanExpiredSessions();
  const token = generateToken();
  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  store.createSession(token, userId, expiresAt);
  setSessionCookie(res, token);
  return token;
}

function getSessionUser(req) {
  store.cleanExpiredSessions();
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;

  const session = store.getSession(token);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    store.deleteSession(token);
    return null;
  }

  const user = store.findUserById(session.userId);
  if (!user) return null;
  return { id: user.id, username: user.username };
}

function getSessionToken(req) {
  const cookies = parseCookies(req);
  return cookies[SESSION_COOKIE] || null;
}

function requireAuth(req, res, next) {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = user;
  return next();
}

function validateUsername(username) {
  if (!username || !USERNAME_RE.test(username)) {
    return 'Имя пользователя: 3–32 символа — буквы, цифры и _';
  }
  return null;
}

function validatePassword(password) {
  if (!password || password.length < MIN_PASSWORD_LEN) {
    return 'Пароль: минимум 6 символов';
  }
  return null;
}

function publicUser(user) {
  return { id: user.id, username: user.username };
}

module.exports = {
  SESSION_COOKIE,
  createPasswordHash,
  verifyPassword,
  generateUserId,
  createSessionForUser,
  getSessionUser,
  getSessionToken,
  requireAuth,
  validateUsername,
  validatePassword,
  publicUser,
  clearSessionCookie,
  parseCookies,
};
