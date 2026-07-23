/**
 * Общие утилиты для тестов бэкенда.
 *
 * ВАЖНО: этот модуль подключают ПЕРВЫМ в каждом тест-файле — он выставляет
 * GOB_DATA_DIR во временную папку до того, как загрузится server/store.js
 * (store читает переменную на этапе require). Так тесты никогда не пишут в
 * реальные server/data/.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

// Всегда своя свежая временная папка на процесс — даже если во внешнем
// окружении GOB_DATA_DIR уже задан (его мы намеренно перекрываем, чтобы
// resetData() не удалил чужие данные).
const DATA_DIR = path.join(
  os.tmpdir(),
  'gob-tests',
  `${process.pid}-${crypto.randomUUID()}`,
);
process.env.GOB_DATA_DIR = DATA_DIR;

/** Полностью очистить хранилище между тестами (store читает файлы заново). */
function resetData() {
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/** Убрать временную папку целиком (в самом конце). */
function cleanup() {
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
}

/** Поднять Express-приложение на случайном порту 127.0.0.1. */
function startServer() {
  const app = require('../server/server');
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

/** Закрыть сервер, вернув промис. */
function stopServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

/**
 * HTTP-клиент с собственным cookie-jar (один клиент = одна «сессия браузера»).
 * Возвращает { status, data, headers } на каждый вызов.
 */
function makeClient(baseUrl) {
  let cookie = '';

  async function request(method, urlPath, body, extraHeaders = {}) {
    const headers = { ...extraHeaders };
    if (cookie) headers.Cookie = cookie;
    const opts = { method, headers };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(baseUrl + urlPath, opts);

    const setCookies = res.headers.getSetCookie?.() ?? [];
    for (const raw of setCookies) {
      cookie = raw.split(';')[0]; // берём пару name=value, атрибуты отбрасываем
    }

    let data = null;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    return { status: res.status, data, headers: res.headers };
  }

  return {
    get: (p, h) => request('GET', p, undefined, h),
    post: (p, b, h) => request('POST', p, b, h),
    put: (p, b, h) => request('PUT', p, b, h),
    patch: (p, b, h) => request('PATCH', p, b, h),
    del: (p, b, h) => request('DELETE', p, b, h),
    getCookie: () => cookie,
    setCookie: (c) => {
      cookie = c;
    },
  };
}

/**
 * Зарегистрировать пользователя и вернуть авторизованный клиент + данные.
 * Имя делаем уникальным, чтобы тесты не конфликтовали внутри одного прогона.
 */
async function registerUser(baseUrl, username, password = 'secret123') {
  const client = makeClient(baseUrl);
  const res = await client.post('/api/auth/register', { username, password });
  return { client, res, user: res.data?.user };
}

let counter = 0;
/** Уникальное валидное имя пользователя (буквы/цифры/_, 3–32). */
function uniqueUsername(prefix = 'user') {
  counter += 1;
  return `${prefix}_${counter}_${crypto.randomBytes(3).toString('hex')}`;
}

/**
 * Открыть SSE-поток и дать удобный доступ к событиям.
 * .next(timeoutMs) резолвится следующим событием (или реджектится по таймауту),
 * .close() рвёт соединение (сервер отпишет подписчика в req.on('close')).
 */
async function openSse(baseUrl, urlPath, cookie) {
  const controller = new AbortController();
  const res = await fetch(baseUrl + urlPath, {
    headers: cookie ? { Cookie: cookie } : {},
    signal: controller.signal,
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const queue = [];
  const waiters = [];

  (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sep;
        while ((sep = buffer.indexOf('\n\n')) >= 0) {
          const frame = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const dataLine = frame
            .split('\n')
            .find((line) => line.startsWith('data:'));
          if (!dataLine) continue; // комментарии-пинги (": ping") пропускаем
          let evt;
          try {
            evt = JSON.parse(dataLine.slice(5).trim());
          } catch {
            continue;
          }
          if (waiters.length) waiters.shift().resolve(evt);
          else queue.push(evt);
        }
      }
    } catch {
      /* соединение оборвано через abort — это нормально */
    }
  })();

  return {
    status: res.status,
    next(timeoutMs = 2000) {
      if (queue.length) return Promise.resolve(queue.shift());
      return new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('SSE: событие не пришло за отведённое время')),
          timeoutMs,
        );
        waiters.push({
          resolve: (evt) => {
            clearTimeout(timer);
            resolve(evt);
          },
        });
      });
    },
    close() {
      controller.abort();
      reader.cancel?.().catch(() => {});
    },
  };
}

module.exports = {
  DATA_DIR,
  resetData,
  cleanup,
  startServer,
  stopServer,
  makeClient,
  registerUser,
  uniqueUsername,
  openSse,
};
