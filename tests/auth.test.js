// helpers первым — выставляет GOB_DATA_DIR до загрузки store.
const h = require('./helpers');
const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');

const auth = require('../server/auth');
const store = require('../server/store');

beforeEach(() => h.resetData());
after(() => h.cleanup());

/** Мок res, накапливающий заголовки и статус/тело. */
function mockRes() {
  return {
    headers: {},
    statusCode: 200,
    body: undefined,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function reqWithCookie(cookie) {
  return { headers: cookie ? { cookie } : {} };
}

describe('пароли', () => {
  test('createPasswordHash даёт соль и хеш, verifyPassword подтверждает', () => {
    const { salt, passwordHash } = auth.createPasswordHash('correct horse');
    assert.ok(salt && passwordHash);
    assert.notEqual(salt, passwordHash);
    assert.equal(auth.verifyPassword('correct horse', salt, passwordHash), true);
  });

  test('verifyPassword отклоняет неверный пароль', () => {
    const { salt, passwordHash } = auth.createPasswordHash('right');
    assert.equal(auth.verifyPassword('wrong', salt, passwordHash), false);
  });

  test('соль у двух хешей одного пароля различается', () => {
    const a = auth.createPasswordHash('same');
    const b = auth.createPasswordHash('same');
    assert.notEqual(a.salt, b.salt);
    assert.notEqual(a.passwordHash, b.passwordHash);
  });

  test('verifyPassword не падает и возвращает false на битом хеше', () => {
    const { salt } = auth.createPasswordHash('x');
    assert.equal(auth.verifyPassword('x', salt, 'abcd'), false);
  });
});

describe('генераторы id/токенов', () => {
  test('generateUserId — валидный uuid', () => {
    const id = auth.generateUserId();
    assert.match(
      id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});

describe('parseCookies', () => {
  test('нет заголовка → пустой объект', () => {
    assert.deepEqual(auth.parseCookies({ headers: {} }), {});
  });

  test('несколько кук + url-декодирование', () => {
    const cookies = auth.parseCookies({
      headers: { cookie: 'a=1; gob_session=ab%20cd; b=2' },
    });
    assert.equal(cookies.a, '1');
    assert.equal(cookies.gob_session, 'ab cd');
    assert.equal(cookies.b, '2');
  });

  test('битые пары без "=" игнорируются', () => {
    const cookies = auth.parseCookies({ headers: { cookie: 'broken; ok=yes' } });
    assert.equal(cookies.ok, 'yes');
    assert.equal(cookies.broken, undefined);
  });
});

describe('cookie-заголовки сессии', () => {
  test('clearSessionCookie обнуляет куку', () => {
    const res = mockRes();
    auth.clearSessionCookie(res);
    const header = res.headers['Set-Cookie'];
    assert.match(header, /^gob_session=;/);
    assert.match(header, /Max-Age=0/);
    assert.match(header, /HttpOnly/);
  });
});

describe('валидация', () => {
  test('validateUsername: корректные проходят', () => {
    assert.equal(auth.validateUsername('good_name'), null);
    assert.equal(auth.validateUsername('abc'), null);
    assert.equal(auth.validateUsername('a'.repeat(32)), null);
  });

  test('validateUsername: короткие/длинные/символы/пусто — ошибка', () => {
    assert.ok(auth.validateUsername('ab'));
    assert.ok(auth.validateUsername('a'.repeat(33)));
    assert.ok(auth.validateUsername('bad name'));
    assert.ok(auth.validateUsername('привет'));
    assert.ok(auth.validateUsername(''));
    assert.ok(auth.validateUsername(null));
  });

  test('validatePassword: >=6 ок, короче — ошибка', () => {
    assert.equal(auth.validatePassword('123456'), null);
    assert.ok(auth.validatePassword('12345'));
    assert.ok(auth.validatePassword(''));
    assert.ok(auth.validatePassword(null));
  });
});

describe('роли', () => {
  const ORIG_ENV = process.env.GOB_GM_USERNAMES;
  after(() => {
    if (ORIG_ENV === undefined) delete process.env.GOB_GM_USERNAMES;
    else process.env.GOB_GM_USERNAMES = ORIG_ENV;
  });

  test('resolveUserRole: null → player', () => {
    assert.equal(auth.resolveUserRole(null), 'player');
  });

  test('роль gamemaster в записи → gamemaster', () => {
    assert.equal(
      auth.resolveUserRole({ username: 'x', role: 'gamemaster' }),
      'gamemaster',
    );
  });

  test('обычный игрок без env → player', () => {
    delete process.env.GOB_GM_USERNAMES;
    assert.equal(auth.resolveUserRole({ username: 'joe', role: 'player' }), 'player');
  });

  test('env GOB_GM_USERNAMES даёт роль (без учёта регистра)', () => {
    process.env.GOB_GM_USERNAMES = 'Alice, master ';
    assert.equal(auth.resolveUserRole({ username: 'alice' }), 'gamemaster');
    assert.equal(auth.resolveUserRole({ username: 'MASTER' }), 'gamemaster');
    assert.equal(auth.resolveUserRole({ username: 'bob' }), 'player');
    assert.equal(auth.isGameMasterUser({ username: 'alice' }), true);
    assert.equal(auth.isGameMasterUser({ username: 'bob' }), false);
  });
});

describe('publicUser', () => {
  test('отдаёт только id/username/role, без соли и хеша', () => {
    const pub = auth.publicUser({
      id: 'u1',
      username: 'joe',
      role: 'player',
      passwordHash: 'secret',
      salt: 'salt',
    });
    assert.deepEqual(Object.keys(pub).sort(), ['id', 'role', 'username']);
    assert.equal(pub.passwordHash, undefined);
    assert.equal(pub.salt, undefined);
  });
});

describe('сессии и middleware (со стором)', () => {
  function seedUser() {
    const user = {
      id: auth.generateUserId(),
      username: 'seed',
      role: 'player',
    };
    store.createUser(user);
    return user;
  }

  test('createSessionForUser + getSessionUser — полный цикл', () => {
    const user = seedUser();
    const res = mockRes();
    auth.createSessionForUser(res, user.id);
    const token = res.headers['Set-Cookie'].match(/gob_session=([^;]+)/)[1];

    const sessionUser = auth.getSessionUser(reqWithCookie(`gob_session=${token}`));
    assert.equal(sessionUser.id, user.id);
    assert.equal(sessionUser.username, 'seed');
    assert.equal(auth.getSessionToken(reqWithCookie(`gob_session=${token}`)), token);
  });

  test('getSessionUser → null без куки и с неизвестным токеном', () => {
    assert.equal(auth.getSessionUser(reqWithCookie('')), null);
    assert.equal(auth.getSessionUser(reqWithCookie('gob_session=nope')), null);
  });

  test('просроченная сессия удаляется и даёт null', () => {
    const user = seedUser();
    const token = 'expired-token';
    store.createSession(token, user.id, new Date(Date.now() - 1000).toISOString());
    assert.equal(
      auth.getSessionUser(reqWithCookie(`gob_session=${token}`)),
      null,
    );
    assert.equal(store.getSession(token), null); // подчищена
  });

  test('requireAuth: 401 без сессии, next() с сессией', () => {
    const user = seedUser();
    const res = mockRes();
    auth.createSessionForUser(res, user.id);
    const token = res.headers['Set-Cookie'].match(/gob_session=([^;]+)/)[1];

    const res401 = mockRes();
    let nextCalled = false;
    auth.requireAuth(reqWithCookie(''), res401, () => { nextCalled = true; });
    assert.equal(res401.statusCode, 401);
    assert.equal(nextCalled, false);

    const reqOk = reqWithCookie(`gob_session=${token}`);
    const resOk = mockRes();
    auth.requireAuth(reqOk, resOk, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(reqOk.user.id, user.id);
  });

  test('requireGameMaster: 401 без сессии, 403 игроку, next() мастеру', () => {
    const ORIG = process.env.GOB_GM_USERNAMES;
    try {
      const player = seedUser();
      const res = mockRes();
      auth.createSessionForUser(res, player.id);
      const token = res.headers['Set-Cookie'].match(/gob_session=([^;]+)/)[1];

      // без сессии → 401
      const r401 = mockRes();
      auth.requireGameMaster(reqWithCookie(''), r401, () => {});
      assert.equal(r401.statusCode, 401);

      // игрок → 403
      const r403 = mockRes();
      auth.requireGameMaster(reqWithCookie(`gob_session=${token}`), r403, () => {});
      assert.equal(r403.statusCode, 403);

      // тот же пользователь как мастер по env → next()
      process.env.GOB_GM_USERNAMES = 'seed';
      let passed = false;
      const rOk = mockRes();
      auth.requireGameMaster(
        reqWithCookie(`gob_session=${token}`),
        rOk,
        () => { passed = true; },
      );
      assert.equal(passed, true);
    } finally {
      if (ORIG === undefined) delete process.env.GOB_GM_USERNAMES;
      else process.env.GOB_GM_USERNAMES = ORIG;
    }
  });
});
