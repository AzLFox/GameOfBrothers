// helpers первым — выставляет GOB_DATA_DIR до загрузки store.
const h = require('./helpers');
const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const store = require('../server/store');

beforeEach(() => h.resetData());
after(() => h.cleanup());

function makeUser(id, username) {
  return { id, username, role: 'player', passwordHash: 'ph', salt: 's' };
}

describe('пользователи', () => {
  test('createUser / getUsers / поиск по имени и id', () => {
    assert.deepEqual(store.getUsers(), []);
    store.createUser(makeUser('u1', 'alice'));
    store.createUser(makeUser('u2', 'bob'));

    assert.equal(store.getUsers().length, 2);
    assert.equal(store.findUserByUsername('alice').id, 'u1');
    assert.equal(store.findUserById('u2').username, 'bob');
    assert.equal(store.findUserByUsername('ghost'), null);
    assert.equal(store.findUserById('nope'), null);
  });
});

describe('сессии', () => {
  test('create / get / delete', () => {
    store.createSession('tok', 'u1', new Date(Date.now() + 10000).toISOString());
    const s = store.getSession('tok');
    assert.equal(s.userId, 'u1');
    assert.ok(s.createdAt && s.expiresAt);

    store.deleteSession('tok');
    assert.equal(store.getSession('tok'), null);
    // повторное удаление безопасно
    store.deleteSession('tok');
  });

  test('cleanExpiredSessions удаляет просроченные, оставляет живые', () => {
    store.createSession('old', 'u1', new Date(Date.now() - 1000).toISOString());
    store.createSession('new', 'u2', new Date(Date.now() + 10000).toISOString());
    store.cleanExpiredSessions();
    assert.equal(store.getSession('old'), null);
    assert.ok(store.getSession('new'));
  });
});

describe('персонажи и листы', () => {
  test('save/get персонажей', () => {
    assert.deepEqual(store.getUserCharacters('u1'), []);
    const chars = [{ id: 'u_a', name: 'Гарет' }];
    store.saveUserCharacters('u1', chars);
    assert.deepEqual(store.getUserCharacters('u1'), chars);
  });

  test('save/get/delete листа', () => {
    assert.equal(store.getUserSheet('u1', 'u_a'), null);
    store.saveUserSheet('u1', 'u_a', { hp: 10 });
    assert.deepEqual(store.getUserSheet('u1', 'u_a'), { hp: 10 });
    store.deleteUserSheet('u1', 'u_a');
    assert.equal(store.getUserSheet('u1', 'u_a'), null);
    // удаление несуществующего безопасно
    store.deleteUserSheet('u1', 'u_a');
  });

  test('findUserByCharId находит владельца и отсекает не-u_', () => {
    store.createUser(makeUser('u1', 'alice'));
    store.saveUserCharacters('u1', [{ id: 'u_x', name: 'X' }]);
    assert.equal(store.findUserByCharId('u_x').id, 'u1');
    assert.equal(store.findUserByCharId('u_missing'), null);
    assert.equal(store.findUserByCharId('grp_1'), null);
    assert.equal(store.findUserByCharId(null), null);
  });
});

describe('пользовательская группа (group.json)', () => {
  test('дефолт и сохранение', () => {
    assert.deepEqual(store.getUserGroup('u1'), {
      ownerUserId: '',
      leaderCharId: '',
      members: [],
    });
    store.saveUserGroup('u1', { ownerUserId: 'u1', leaderCharId: 'u_a', members: [] });
    assert.equal(store.getUserGroup('u1').ownerUserId, 'u1');
  });
});

describe('отряды (parties) и связи char↔group', () => {
  test('save/get/delete отряда', () => {
    assert.equal(store.getPartyGroup('grp_1'), null);
    assert.equal(store.getPartyGroup(''), null);
    store.savePartyGroup({ id: 'grp_1', name: 'Братья', members: [] });
    assert.equal(store.getPartyGroup('grp_1').name, 'Братья');
    store.deletePartyGroup('grp_1');
    assert.equal(store.getPartyGroup('grp_1'), null);
  });

  test('savePartyGroup без id — no-op', () => {
    store.savePartyGroup({ name: 'нет id' });
    assert.deepEqual(store.listAllPartyGroups(), []);
  });

  test('listAllPartyGroups перечисляет все отряды', () => {
    store.savePartyGroup({ id: 'grp_1', name: 'A', members: [] });
    store.savePartyGroup({ id: 'grp_2', name: 'B', members: [] });
    const names = store.listAllPartyGroups().map((g) => g.name).sort();
    assert.deepEqual(names, ['A', 'B']);
  });

  test('связи char↔group: add/remove/get с дедупликацией', () => {
    store.addCharToGroup('u1', 'u_a', 'grp_1');
    store.addCharToGroup('u1', 'u_a', 'grp_1'); // дубль
    store.addCharToGroup('u1', 'u_a', 'grp_2');
    assert.deepEqual(store.getCharGroupIds('u1', 'u_a').sort(), ['grp_1', 'grp_2']);

    store.removeCharFromGroup('u1', 'u_a', 'grp_1');
    assert.deepEqual(store.getCharGroupIds('u1', 'u_a'), ['grp_2']);
  });

  test('удаление последней связи очищает список групп персонажа', () => {
    store.addCharToGroup('u1', 'u_a', 'grp_1');
    store.removeCharFromGroup('u1', 'u_a', 'grp_1');
    assert.deepEqual(store.getCharGroupIds('u1', 'u_a'), []);
  });

  test('getPartyGroupsForChar возвращает только существующие отряды', () => {
    store.savePartyGroup({ id: 'grp_1', name: 'A', members: [] });
    store.addCharToGroup('u1', 'u_a', 'grp_1');
    store.addCharToGroup('u1', 'u_a', 'grp_ghost'); // отряда нет
    const groups = store.getPartyGroupsForChar('u1', 'u_a');
    assert.equal(groups.length, 1);
    assert.equal(groups[0].id, 'grp_1');
  });

  test('syncCharacterInParties обновляет данные участника в связанных отрядах', () => {
    store.savePartyGroup({
      id: 'grp_1',
      name: 'A',
      members: [{ charId: 'u_a', name: 'Старое', description: 'x', portrait: '' }],
    });
    store.addCharToGroup('u1', 'u_a', 'grp_1');

    store.syncCharacterInParties('u1', {
      id: 'u_a',
      name: '  Новое  ',
      description: '  Описание  ',
      portrait: 'p.png',
    });

    const member = store.getPartyGroup('grp_1').members[0];
    assert.equal(member.name, 'Новое');
    assert.equal(member.description, 'Описание');
    assert.equal(member.portrait, 'p.png');
  });
});

describe('инвайты и сообщения', () => {
  test('входящие/исходящие инвайты — round trip', () => {
    assert.deepEqual(store.getUserInvites('u1'), []);
    store.saveUserInvites('u1', [{ id: 'inv_1', status: 'pending' }]);
    assert.equal(store.getUserInvites('u1')[0].id, 'inv_1');

    assert.deepEqual(store.getSentInvites('u1'), []);
    store.saveSentInvites('u1', [{ id: 'inv_1' }]);
    assert.equal(store.getSentInvites('u1').length, 1);
  });

  test('сообщения — round trip', () => {
    assert.deepEqual(store.getUserMessages('u1'), []);
    store.saveUserMessages('u1', [{ id: 'msg_1', body: 'привет' }]);
    assert.equal(store.getUserMessages('u1')[0].body, 'привет');
  });
});

describe('сессия мастера (gm-session.json)', () => {
  test('дефолт, сохранение с обрезкой и updatedAt', () => {
    assert.deepEqual(store.getGmSession('u1'), { activeGroupId: '' });
    store.saveGmSession('u1', { activeGroupId: '  grp_1  ' });
    const s = store.getGmSession('u1');
    assert.equal(s.activeGroupId, 'grp_1');
    assert.ok(s.updatedAt);
  });

  test('clearGmSessionIfActive чистит только совпадающую группу', () => {
    store.saveGmSession('u1', { activeGroupId: 'grp_1' });
    store.clearGmSessionIfActive('u1', 'grp_other');
    assert.equal(store.getGmSession('u1').activeGroupId, 'grp_1');
    store.clearGmSessionIfActive('u1', 'grp_1');
    assert.equal(store.getGmSession('u1').activeGroupId, '');
  });
});

describe('удаление пользователя (каскад)', () => {
  test('deleteUser убирает запись, сессии и каталог аккаунта', () => {
    store.createUser(makeUser('u1', 'alice'));
    store.createUser(makeUser('u2', 'bob'));
    store.createSession('t1', 'u1', new Date(Date.now() + 10000).toISOString());
    store.createSession('t2', 'u2', new Date(Date.now() + 10000).toISOString());
    store.saveUserCharacters('u1', [{ id: 'u_a', name: 'X' }]);
    store.saveUserSheet('u1', 'u_a', { hp: 1 });

    store.deleteUser('u1');

    // Каталог аккаунта удалён. Проверяем это ДО любого чтения данных u1:
    // readJson() пересоздаёт каталог (ensureDir + запись дефолта).
    assert.equal(
      fs.existsSync(path.join(h.DATA_DIR, 'accounts', 'u1')),
      false,
    );
    assert.equal(store.findUserById('u1'), null);
    assert.ok(store.findUserById('u2')); // чужого не тронули
    assert.equal(store.getSession('t1'), null);
    assert.ok(store.getSession('t2'));
  });
});

describe('устойчивость readJson', () => {
  test('битый JSON → возвращается дефолт', () => {
    fs.mkdirSync(path.join(h.DATA_DIR), { recursive: true });
    fs.writeFileSync(path.join(h.DATA_DIR, 'users.json'), '{ не json', 'utf8');
    assert.deepEqual(store.getUsers(), []);
  });

  test('возвращаемый дефолт — глубокая копия (мутация не протекает)', () => {
    const first = store.getUserGroup('u_fresh');
    first.members.push('мусор');
    const second = store.getUserGroup('u_fresh');
    assert.deepEqual(second.members, []);
  });
});
