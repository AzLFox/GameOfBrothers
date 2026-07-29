/**
 * Стол файта — клиент боя группы: загрузка/старт/сохранение состояния и живая
 * подписка по SSE. Состояние боя общее для группы (ГМ + игроки видят вживую).
 * Роадмап — docs/fight-table-roadmap.md.
 */
const GobBattle = (() => {
  // id вкладки: уходит в заголовке правок и в query SSE, чтобы автор правки
  // не получал эхо собственной рассылки (сервер сравнивает clientId).
  const clientId = `battle-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

  async function apiFetch(path, options = {}) {
    const headers = { 'X-Battle-Client': clientId, ...(options.headers || {}) };
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(path, { ...options, headers, credentials: 'same-origin' });
  }

  async function parse(res) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || `HTTP ${res.status}`, status: res.status };
    }
    return { ok: true, battle: data };
  }

  async function loadBattle(groupId) {
    return parse(await apiFetch(`/api/battle/${encodeURIComponent(groupId)}`));
  }

  async function startBattle(groupId) {
    return parse(await apiFetch(`/api/battle/${encodeURIComponent(groupId)}`, { method: 'POST' }));
  }

  async function saveBattle(groupId, battle) {
    return parse(await apiFetch(`/api/battle/${encodeURIComponent(groupId)}`, {
      method: 'PUT',
      body: JSON.stringify(battle),
    }));
  }

  async function endBattle(groupId) {
    const res = await apiFetch(`/api/battle/${encodeURIComponent(groupId)}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || `HTTP ${res.status}` };
    return { ok: true };
  }

  // onUpdate(battle, type): type — 'hello' (первое состояние) или 'battle' (правка).
  function subscribe(groupId, onUpdate) {
    const url = `/api/battle/${encodeURIComponent(groupId)}/events`
      + `?clientId=${encodeURIComponent(clientId)}`;
    const source = new EventSource(url, { withCredentials: true });
    source.onmessage = (e) => {
      let payload;
      try {
        payload = JSON.parse(e.data);
      } catch {
        return;
      }
      if (payload && (payload.type === 'hello' || payload.type === 'battle')) {
        onUpdate(payload.battle, payload.type);
      }
    };
    return { close: () => source.close(), source };
  }

  return { clientId, loadBattle, startBattle, saveBattle, endBattle, subscribe };
})();

Object.assign(window, { GobBattle });
