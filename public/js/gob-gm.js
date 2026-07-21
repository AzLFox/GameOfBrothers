/**
 * GameMaster API — выбор группы, сессия стола, отправка сообщений игрокам.
 */
const GobGM = (() => {
  async function apiFetch(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(path, {
      ...options,
      headers,
      credentials: 'same-origin',
    });
  }

  async function loadGroups() {
    const res = await apiFetch('/api/gm/groups');
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async function loadGroup(groupId) {
    const res = await apiFetch(`/api/gm/groups/${encodeURIComponent(groupId)}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async function loadSession() {
    const res = await apiFetch('/api/gm/session');
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async function selectGroup(groupId) {
    const res = await apiFetch('/api/gm/session', {
      method: 'PUT',
      body: JSON.stringify({ activeGroupId: groupId || '' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || 'select_failed' };
    }
    return { ok: true, ...data };
  }

  async function sendMessage(groupId, toCharId, body) {
    const res = await apiFetch(`/api/gm/groups/${encodeURIComponent(groupId)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ toCharId, body, type: 'text' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || 'send_failed' };
    }
    return { ok: true, message: data };
  }

  async function sendItemGift(groupId, toCharId, item, body = '') {
    const res = await apiFetch(`/api/gm/groups/${encodeURIComponent(groupId)}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        toCharId,
        type: 'item_gift',
        body,
        item,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || 'send_failed' };
    }
    return { ok: true, message: data };
  }

  return {
    loadGroups,
    loadGroup,
    loadSession,
    selectGroup,
    sendMessage,
    sendItemGift,
  };
})();

Object.assign(window, { GobGM });
