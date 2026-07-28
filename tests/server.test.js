// helpers первым — выставляет GOB_DATA_DIR до загрузки server/store.
const h = require('./helpers');
const { test, describe, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');

let baseUrl;
let server;

before(async () => {
  const started = await h.startServer();
  server = started.server;
  baseUrl = started.baseUrl;
});

after(async () => {
  await h.stopServer(server);
  h.cleanup();
});

beforeEach(() => h.resetData());

// --- локальные хелперы --------------------------------------------------

async function newUser(prefix = 'user') {
  const username = h.uniqueUsername(prefix);
  const { client, res, user } = await h.registerUser(baseUrl, username);
  assert.equal(res.status, 201);
  return { client, user, username };
}

async function createChar(client, name = 'Гарет') {
  const res = await client.post('/api/me/characters', { name });
  assert.equal(res.status, 201);
  return res.data;
}

// --- аутентификация -----------------------------------------------------

describe('аутентификация', () => {
  test('register: успех ставит куку и возвращает публичного пользователя', async () => {
    const client = h.makeClient(baseUrl);
    const res = await client.post('/api/auth/register', {
      username: h.uniqueUsername(),
      password: 'secret123',
    });
    assert.equal(res.status, 201);
    assert.equal(res.data.user.role, 'player');
    assert.ok(res.data.user.id);
    assert.equal(res.data.user.passwordHash, undefined);
    assert.match(client.getCookie(), /^gob_session=/);
  });

  test('register: валидация имени и пароля → 400', async () => {
    const client = h.makeClient(baseUrl);
    let res = await client.post('/api/auth/register', { username: 'ab', password: 'secret123' });
    assert.equal(res.status, 400);
    res = await client.post('/api/auth/register', { username: h.uniqueUsername(), password: '123' });
    assert.equal(res.status, 400);
  });

  test('register: занятое имя → 409', async () => {
    const username = h.uniqueUsername();
    const c1 = h.makeClient(baseUrl);
    await c1.post('/api/auth/register', { username, password: 'secret123' });
    const c2 = h.makeClient(baseUrl);
    const res = await c2.post('/api/auth/register', { username, password: 'secret123' });
    assert.equal(res.status, 409);
  });

  test('login: верные данные → 200, неверные → 401', async () => {
    const username = h.uniqueUsername();
    const reg = h.makeClient(baseUrl);
    await reg.post('/api/auth/register', { username, password: 'secret123' });

    const login = h.makeClient(baseUrl);
    let res = await login.post('/api/auth/login', { username, password: 'secret123' });
    assert.equal(res.status, 200);
    assert.equal(res.data.user.username, username);

    res = await login.post('/api/auth/login', { username, password: 'wrong' });
    assert.equal(res.status, 401);

    res = await login.post('/api/auth/login', { username: 'nobody_here', password: 'x' });
    assert.equal(res.status, 401);
  });

  test('me: 401 без сессии, 200 с сессией; logout завершает сессию', async () => {
    const anon = h.makeClient(baseUrl);
    assert.equal((await anon.get('/api/auth/me')).status, 401);

    const { client } = await newUser();
    assert.equal((await client.get('/api/auth/me')).status, 200);

    await client.post('/api/auth/logout', {});
    assert.equal((await client.get('/api/auth/me')).status, 401);
  });

  test('DELETE /api/me/account удаляет аккаунт', async () => {
    const { client } = await newUser();
    await createChar(client);
    const res = await client.del('/api/me/account');
    assert.equal(res.status, 200);
    assert.equal((await client.get('/api/auth/me')).status, 401);
  });
});

// --- персонажи ----------------------------------------------------------

describe('персонажи', () => {
  test('требуют авторизации', async () => {
    const anon = h.makeClient(baseUrl);
    assert.equal((await anon.get('/api/me/characters')).status, 401);
  });

  test('CRUD: создание, список, правка, удаление', async () => {
    const { client } = await newUser();

    assert.deepEqual((await client.get('/api/me/characters')).data, []);

    const card = await createChar(client, 'Гарет');
    assert.match(card.id, /^u_/);
    assert.equal(card.isUser, true);

    // лист создаётся вместе с персонажем
    const sheet = await client.get(`/api/me/sheets/${card.id}`);
    assert.equal(sheet.status, 200);
    assert.equal(sheet.data.rev, 0);

    // правка имени
    const patched = await client.patch(`/api/me/characters/${card.id}`, { name: '  Ланс  ' });
    assert.equal(patched.status, 200);
    assert.equal(patched.data.name, 'Ланс');

    // список содержит одного
    assert.equal((await client.get('/api/me/characters')).data.length, 1);

    // удаление
    assert.equal((await client.del(`/api/me/characters/${card.id}`)).status, 200);
    assert.equal((await client.get('/api/me/characters')).data.length, 0);
  });

  test('невалидные id и отсутствующие персонажи', async () => {
    const { client } = await newUser();
    assert.equal((await client.patch('/api/me/characters/bad', { name: 'x' })).status, 400);
    assert.equal((await client.del('/api/me/characters/bad')).status, 400);
    assert.equal((await client.patch('/api/me/characters/u_missing', { name: 'x' })).status, 404);
    assert.equal((await client.del('/api/me/characters/u_missing')).status, 404);
    assert.equal((await client.get('/api/me/characters/u_missing')).status, 404);
  });

  test('импорт: пусто → 400, успех → 201, повтор → 409', async () => {
    const { client } = await newUser();

    assert.equal((await client.post('/api/me/characters/import', { characters: [] })).status, 400);

    const res = await client.post('/api/me/characters/import', {
      characters: [{ id: 'u_imp1', name: 'Импорт' }],
      sheets: {},
    });
    assert.equal(res.status, 201);
    assert.equal(res.data.imported, 1);

    // аккаунт уже не пуст → 409
    const again = await client.post('/api/me/characters/import', {
      characters: [{ id: 'u_imp2', name: 'Ещё' }],
    });
    assert.equal(again.status, 409);
  });
});

// --- листы: rev-локи и живая синхронизация ------------------------------

describe('листы персонажей', () => {
  test('rev растёт при записи, устаревший PUT → 409', async () => {
    const { client } = await newUser();
    const card = await createChar(client);

    // первый PUT без rev — применяется, rev=1
    let put = await client.put(`/api/me/sheets/${card.id}`, { lore: 'первая правка' });
    assert.equal(put.status, 200);
    assert.equal(put.data.rev, 1);

    // устаревший rev=0 → 409 со свежим листом
    const stale = await client.put(`/api/me/sheets/${card.id}`, { lore: 'x', rev: 0 });
    assert.equal(stale.status, 409);
    assert.equal(stale.data.sheet.rev, 1);

    // актуальный rev=1 → успех, rev=2
    put = await client.put(`/api/me/sheets/${card.id}`, { lore: 'вторая', rev: 1 });
    assert.equal(put.status, 200);
    assert.equal(put.data.rev, 2);
  });

  test('лист чужого/несуществующего персонажа → 404', async () => {
    const { client } = await newUser();
    assert.equal((await client.get('/api/me/sheets/u_ghost')).status, 404);
    assert.equal((await client.put('/api/me/sheets/u_ghost', { lore: 'x' })).status, 404);
  });

  test('SSE: hello при подключении и broadcast при правке', async () => {
    const { client } = await newUser();
    const card = await createChar(client);

    const sse = await h.openSse(
      baseUrl,
      `/api/me/sheets/${card.id}/events?clientId=viewer`,
      client.getCookie(),
    );
    try {
      assert.equal(sse.status, 200);

      const hello = await sse.next();
      assert.equal(hello.type, 'hello');
      assert.equal(hello.rev, 0);

      // правка от другого clientId — подписчик viewer её получает
      const put = await client.put(
        `/api/me/sheets/${card.id}`,
        { lore: 'через SSE' },
        { 'X-Sheet-Client': 'editor' },
      );
      assert.equal(put.status, 200);

      const evt = await sse.next();
      assert.equal(evt.type, 'sheet');
      assert.equal(evt.rev, 1);
    } finally {
      sse.close();
    }
  });
});

// --- аккаунты и их герои (публичный список) -----------------------------

describe('список аккаунтов', () => {
  test('/api/group/accounts помечает свой аккаунт isSelf', async () => {
    const { client, user } = await newUser();
    const res = await client.get('/api/group/accounts');
    assert.equal(res.status, 200);
    const self = res.data.find((a) => a.id === user.id);
    assert.equal(self.isSelf, true);
  });

  test('/api/group/accounts отдаёт role: мастер vs игрок (B2)', async () => {
    const ORIG = process.env.GOB_GM_USERNAMES;
    const gmName = h.uniqueUsername('master');
    process.env.GOB_GM_USERNAMES = gmName;
    try {
      const gm = h.makeClient(baseUrl);
      const gmReg = await gm.post('/api/auth/register', { username: gmName, password: 'secret123' });
      const gmId = gmReg.data.user.id;

      const { client, user } = await newUser('player');
      const res = await client.get('/api/group/accounts');
      assert.equal(res.status, 200);

      const gmAcc = res.data.find((a) => a.id === gmId);
      const playerAcc = res.data.find((a) => a.id === user.id);
      assert.equal(gmAcc.role, 'gamemaster');
      assert.equal(playerAcc.role, 'player');
    } finally {
      if (ORIG === undefined) delete process.env.GOB_GM_USERNAMES;
      else process.env.GOB_GM_USERNAMES = ORIG;
    }
  });

  test('герои аккаунта: 401 без входа, 404 неизвестный, 200 список', async () => {
    const { client, user } = await newUser();
    const card = await createChar(client, 'Виден');

    const anon = h.makeClient(baseUrl);
    assert.equal((await anon.get(`/api/group/accounts/${user.id}/characters`)).status, 401);

    assert.equal((await client.get('/api/group/accounts/nope/characters')).status, 404);

    const res = await client.get(`/api/group/accounts/${user.id}/characters`);
    assert.equal(res.status, 200);
    assert.equal(res.data[0].id, card.id);
  });
});

// --- группы (отряды) ----------------------------------------------------

describe('группы', () => {
  test('создание: валидация имени и владения лидером', async () => {
    const { client } = await newUser();
    const card = await createChar(client);

    assert.equal((await client.post('/api/me/groups', { name: 'x', leaderCharId: card.id })).status, 400);
    assert.equal((await client.post('/api/me/groups', { name: 'Братья', leaderCharId: 'u_alien' })).status, 403);

    const res = await client.post('/api/me/groups', { name: 'Братья', leaderCharId: card.id });
    assert.equal(res.status, 201);
    assert.equal(res.data.name, 'Братья');
    assert.equal(res.data.members.length, 1);
    assert.equal(res.data.members[0].charId, card.id);
  });

  test('просмотр своей группы и запрет чужому', async () => {
    const owner = await newUser('owner');
    const card = await createChar(owner.client);
    const group = (await owner.client.post('/api/me/groups', {
      name: 'Братья', leaderCharId: card.id,
    })).data;

    const mine = await owner.client.get(`/api/me/groups/${group.id}`);
    assert.equal(mine.status, 200);
    assert.equal(mine.data.isOwner, true);

    const groups = await owner.client.get(`/api/me/groups?charId=${card.id}`);
    assert.equal(groups.data.length, 1);

    const stranger = await newUser('stranger');
    assert.equal((await stranger.client.get(`/api/me/groups/${group.id}`)).status, 403);
    assert.equal((await stranger.client.get('/api/me/groups/grp_missing')).status, 404);
  });

  test('reveal и удаление участника; группа исчезает без участников', async () => {
    const owner = await newUser('owner');
    const card = await createChar(owner.client);
    const group = (await owner.client.post('/api/me/groups', {
      name: 'Братья', leaderCharId: card.id,
    })).data;

    const revealed = await owner.client.post(
      `/api/me/groups/${group.id}/members/${card.id}/reveal`, {},
    );
    assert.equal(revealed.status, 200);
    assert.equal(revealed.data.members[0].revealed, true);

    // удаляем единственного участника — группа удаляется целиком
    const removed = await owner.client.del(`/api/me/groups/${group.id}/members/${card.id}`);
    assert.equal(removed.status, 200);
    assert.equal(removed.data.deleted, true);
    assert.equal((await owner.client.get(`/api/me/groups/${group.id}`)).status, 404);
  });
});

// --- инвайты ------------------------------------------------------------

describe('инвайты', () => {
  test('полный цикл: приглашение → повтор 409 → приём → участник в группе', async () => {
    const a = await newUser('inviter');
    const charA = await createChar(a.client, 'Лидер');
    const group = (await a.client.post('/api/me/groups', {
      name: 'Отряд', leaderCharId: charA.id,
    })).data;

    const b = await newUser('invitee');
    const charB = await createChar(b.client, 'Гость');

    const invite = await a.client.post('/api/me/group/invite', {
      groupId: group.id, fromCharId: charA.id, toCharId: charB.id,
    });
    assert.equal(invite.status, 201);
    assert.equal(invite.data.status, 'pending');

    // повторное приглашение → 409
    const dup = await a.client.post('/api/me/group/invite', {
      groupId: group.id, fromCharId: charA.id, toCharId: charB.id,
    });
    assert.equal(dup.status, 409);

    // B видит входящее и исходящее у A
    assert.equal((await b.client.get(`/api/me/invites?charId=${charB.id}`)).data.length, 1);
    assert.equal((await a.client.get(`/api/me/sent-invites?groupId=${group.id}`)).data.length, 1);

    // B принимает
    const accept = await b.client.post(`/api/me/invites/${invite.data.id}/accept`, {});
    assert.equal(accept.status, 200);
    const members = accept.data.group.members.map((m) => m.charId).sort();
    assert.deepEqual(members, [charA.id, charB.id].sort());

    // инвайт больше не в pending
    assert.equal((await b.client.get(`/api/me/invites?charId=${charB.id}`)).data.length, 0);
  });

  test('отклонение инвайта', async () => {
    const a = await newUser('inv2a');
    const charA = await createChar(a.client);
    const group = (await a.client.post('/api/me/groups', {
      name: 'Отряд', leaderCharId: charA.id,
    })).data;
    const b = await newUser('inv2b');
    const charB = await createChar(b.client);

    const invite = (await a.client.post('/api/me/group/invite', {
      groupId: group.id, fromCharId: charA.id, toCharId: charB.id,
    })).data;

    const decline = await b.client.post(`/api/me/invites/${invite.id}/decline`, {});
    assert.equal(decline.status, 200);
    assert.equal((await b.client.get(`/api/me/invites?charId=${charB.id}`)).data.length, 0);
  });

  test('нельзя пригласить своего героя / самого себя', async () => {
    const a = await newUser('self');
    const charA = await createChar(a.client, 'A');
    const charA2 = await createChar(a.client, 'A2');
    const group = (await a.client.post('/api/me/groups', {
      name: 'Отряд', leaderCharId: charA.id,
    })).data;

    // сам себя
    assert.equal((await a.client.post('/api/me/group/invite', {
      groupId: group.id, fromCharId: charA.id, toCharId: charA.id,
    })).status, 400);

    // своего второго героя → 400 ("нельзя пригласить своего героя")
    assert.equal((await a.client.post('/api/me/group/invite', {
      groupId: group.id, fromCharId: charA.id, toCharId: charA2.id,
    })).status, 400);
  });
});

// --- стол мастера и посылки ---------------------------------------------

describe('стол мастера', () => {
  const ORIG_ENV = process.env.GOB_GM_USERNAMES;
  let gmName;

  before(() => {
    gmName = h.uniqueUsername('master');
    process.env.GOB_GM_USERNAMES = gmName;
  });
  after(() => {
    if (ORIG_ENV === undefined) delete process.env.GOB_GM_USERNAMES;
    else process.env.GOB_GM_USERNAMES = ORIG_ENV;
  });

  // Поднять игрока с группой и мастера, усадить мастера за стол.
  async function seatMaster() {
    const player = await newUser('player');
    const charP = await createChar(player.client, 'Игрок');
    const group = (await player.client.post('/api/me/groups', {
      name: 'Стол', leaderCharId: charP.id,
    })).data;

    const gm = h.makeClient(baseUrl);
    await gm.post('/api/auth/register', { username: gmName, password: 'secret123' });
    const me = await gm.get('/api/auth/me');
    assert.equal(me.data.user.role, 'gamemaster');

    const sit = await gm.put('/api/gm/session', { activeGroupId: group.id });
    assert.equal(sit.status, 200);
    assert.equal(sit.data.activeGroupId, group.id);

    return { player, charP, group, gm };
  }

  test('игрок не может открыть маршруты мастера', async () => {
    const player = await newUser('plain');
    assert.equal((await player.client.get('/api/gm/groups')).status, 403);
    assert.equal((await player.client.get('/api/gm/session')).status, 403);
  });

  test('усаживание за стол проставляет gmUserId и виден список групп', async () => {
    const { gm, group } = await seatMaster();

    const session = await gm.get('/api/gm/session');
    assert.equal(session.data.activeGroupId, group.id);

    const groups = await gm.get('/api/gm/groups');
    assert.equal(groups.status, 200);
    const summary = groups.data.find((g) => g.id === group.id);
    assert.ok(summary, 'группа видна мастеру в списке');
    // Характеризует баг B1 (docs/BUGS.md): normalizePartyGroup не сохраняет
    // gmUserId, поэтому isActiveGm всегда false. Когда B1 починят —
    // этот тест напомнит обновить ожидание.
    assert.equal(summary.isActiveGm, false);

    assert.equal((await gm.get(`/api/gm/groups/${group.id}`)).status, 200);
    assert.equal((await gm.put('/api/gm/session', { activeGroupId: 'grp_missing' })).status, 404);
  });

  test('мастер правит лист героя своей группы (accessRole=gm)', async () => {
    const { gm, charP } = await seatMaster();

    const sheet = await gm.get(`/api/me/sheets/${charP.id}`);
    assert.equal(sheet.status, 200);
    assert.equal(sheet.data.accessRole, 'gm');

    const put = await gm.put(`/api/me/sheets/${charP.id}`, { lore: 'правка мастера' });
    assert.equal(put.status, 200);
    assert.equal(put.data.rev, 1);
  });

  test('посылка-предмет: отправка, приём в рюкзак, повторный приём → 409', async () => {
    const { player, charP, group, gm } = await seatMaster();

    // валидация: подарок без названия
    assert.equal((await gm.post(`/api/gm/groups/${group.id}/messages`, {
      toCharId: charP.id, type: 'item_gift', item: { name: '' },
    })).status, 400);

    const gift = await gm.post(`/api/gm/groups/${group.id}/messages`, {
      toCharId: charP.id, type: 'item_gift', item: { name: 'Меч', desc: 'острый' },
    });
    assert.equal(gift.status, 201);

    // игрок видит посылку
    const inbox = await player.client.get(`/api/me/messages?charId=${charP.id}`);
    assert.equal(inbox.data.length, 1);
    const msgId = inbox.data[0].id;

    // принимает — предмет попадает в рюкзак, лист получает новый rev
    const accept = await player.client.post(`/api/me/messages/${msgId}/accept`, { charId: charP.id });
    assert.equal(accept.status, 200);
    assert.equal(accept.data.item.name, 'Меч');
    const sheet = await player.client.get(`/api/me/sheets/${charP.id}`);
    assert.equal(sheet.data.backpack[accept.data.slot].name, 'Меч');

    // повторный приём → 409
    assert.equal((await player.client.post(`/api/me/messages/${msgId}/accept`, {
      charId: charP.id,
    })).status, 409);
  });

  test('текстовое сообщение: отправка и отметка прочитанным', async () => {
    const { player, charP, group, gm } = await seatMaster();

    assert.equal((await gm.post(`/api/gm/groups/${group.id}/messages`, {
      toCharId: charP.id, type: 'text', body: '',
    })).status, 400);

    const msg = await gm.post(`/api/gm/groups/${group.id}/messages`, {
      toCharId: charP.id, type: 'text', body: 'Приготовьтесь к бою',
    });
    assert.equal(msg.status, 201);

    const read = await player.client.post(`/api/me/messages/${msg.data.id}/read`, { charId: charP.id });
    assert.equal(read.status, 200);
    assert.equal(read.data.message.status, 'read');
  });
});

// --- статические страницы -----------------------------------------------

describe('страницы', () => {
  test('корень отдаёт HTML', async () => {
    const client = h.makeClient(baseUrl);
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /html/);
  });
});
