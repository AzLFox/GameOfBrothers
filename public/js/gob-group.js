/**
 * Party / group roster — несколько именованных групп на персонажа.
 */
const GobGroup = (() => {
  const LOCAL_KEY = 'gob-parties-v2';
  const MAX_MEMBERS = 6;

  let authChecked = false;
  let isAuthed = false;

  async function ensureAuthState() {
    if (authChecked) return isAuthed;
    if (typeof GobAuth === 'undefined') {
      authChecked = true;
      isAuthed = false;
      return false;
    }
    const user = await GobAuth.fetchMe();
    authChecked = true;
    isAuthed = !!user;
    return isAuthed;
  }

  function defaultGroup() {
    return { id: '', name: '', ownerUserId: '', leaderCharId: '', members: [] };
  }

  function normalizeGroup(data) {
    const members = Array.isArray(data?.members) ? data.members : [];
    return {
      id: String(data?.id ?? '').trim(),
      name: String(data?.name ?? '').trim(),
      ownerUserId: String(data?.ownerUserId ?? '').trim(),
      leaderCharId: String(data?.leaderCharId ?? '').trim(),
      members: members
        .filter((m) => m && m.charId)
        .map((m) => ({
          charId: String(m.charId),
          name: String(m.name ?? '').trim(),
          portrait: String(m.portrait ?? ''),
          description: String(m.description ?? '').trim(),
          accountId: String(m.accountId ?? '').trim(),
          accountName: String(m.accountName ?? '').trim(),
          addedAt: m.addedAt || new Date().toISOString(),
          revealed: m.revealed === true,
        })),
      createdAt: data?.createdAt || '',
    };
  }

  function loadLocalGroups(charId) {
    if (!charId) return [];
    try {
      const all = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
      const list = Array.isArray(all[charId]) ? all[charId] : [];
      return list.map(normalizeGroup);
    } catch {
      return [];
    }
  }

  function saveLocalGroups(charId, groups) {
    if (!charId) return;
    const all = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
    all[charId] = groups.map(normalizeGroup);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
  }

  function saveLocalGroup(charId, group) {
    const groups = loadLocalGroups(charId);
    const normalized = normalizeGroup(group);
    const idx = groups.findIndex((g) => g.id === normalized.id);
    if (idx >= 0) groups[idx] = normalized;
    else groups.push(normalized);
    saveLocalGroups(charId, groups);
    return normalized;
  }

  async function apiFetch(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(path, { ...options, headers, credentials: 'same-origin' });
  }

  async function loadGroupsForChar(charId) {
    if (charId && (await ensureAuthState())) {
      try {
        const res = await apiFetch(`/api/me/groups?charId=${encodeURIComponent(charId)}`);
        if (res.ok) return await res.json();
      } catch {
        /* fall through */
      }
    }
    return loadLocalGroups(charId).map((group) => ({
      id: group.id,
      name: group.name,
      leaderCharId: group.leaderCharId,
      memberCount: group.members.length,
      isOwner: true,
    }));
  }

  async function loadGroup(groupId, charId) {
    if (!groupId) return defaultGroup();
    if (await ensureAuthState()) {
      try {
        const query = charId ? `?charId=${encodeURIComponent(charId)}` : '';
        const res = await apiFetch(`/api/me/groups/${encodeURIComponent(groupId)}${query}`);
        if (res.ok) return normalizeGroup(await res.json());
      } catch {
        /* fall through */
      }
    }
    const local = loadLocalGroups(charId).find((g) => g.id === groupId);
    return local ? normalizeGroup(local) : defaultGroup();
  }

  async function createGroup(name, leaderCharId) {
    const trimmed = String(name ?? '').trim();
    if (trimmed.length < 2) {
      return { ok: false, error: 'name' };
    }
    if (!(await ensureAuthState())) {
      return { ok: false, error: 'auth' };
    }

    try {
      const res = await apiFetch('/api/me/groups', {
        method: 'POST',
        body: JSON.stringify({ name: trimmed, leaderCharId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data.error || 'create_failed' };
      }
      return { ok: true, group: normalizeGroup(data) };
    } catch {
      return { ok: false, error: 'network' };
    }
  }

  function memberFromCharacter(char, account = null) {
    if (!char?.id) return null;
    const portrait = typeof GobCharacters !== 'undefined' && GobCharacters.getPortraitUrl
      ? GobCharacters.getPortraitUrl(char)
      : (char.portrait || `/characters/${char.id}.jpg`);
    const displayName = typeof GobCharacters !== 'undefined' && GobCharacters.getDisplayName
      ? GobCharacters.getDisplayName(char)
      : (char.name || 'Без имени');
    return {
      charId: char.id,
      name: displayName,
      portrait,
      description: String(char?.description ?? '').trim(),
      accountId: account?.id ? String(account.id) : '',
      accountName: account?.username ? String(account.username) : '',
      addedAt: new Date().toISOString(),
      revealed: !String(char.id).startsWith('u_'),
    };
  }

  async function ensureLeaderInGroup(group, leaderCharId) {
    if (!leaderCharId || group.members.some((m) => m.charId === leaderCharId)) {
      return group;
    }
    let leaderChar = null;
    if (typeof GobCharacters !== 'undefined' && GobCharacters.findCharacterById) {
      leaderChar = await GobCharacters.findCharacterById(leaderCharId);
    }
    if (!leaderChar) return group;
    const leaderEntry = memberFromCharacter(leaderChar);
    if (!leaderEntry) return group;
    group.members.push(leaderEntry);
    if (!group.leaderCharId) group.leaderCharId = leaderCharId;
    return group;
  }

  async function addMember(groupId, char, account = null, leaderCharId = null) {
    const entry = memberFromCharacter(char, account);
    if (!entry || !groupId) return { ok: false, error: 'invalid' };
    if (leaderCharId && entry.charId === leaderCharId) {
      return { ok: false, error: 'self' };
    }

    let group = await loadGroup(groupId, leaderCharId);
    group = await ensureLeaderInGroup(group, leaderCharId);
    if (group.members.some((m) => m.charId === entry.charId)) {
      return { ok: false, error: 'exists' };
    }
    if (group.members.length >= MAX_MEMBERS) {
      return { ok: false, error: 'full' };
    }

    group.members.push(entry);
    if (leaderCharId) saveLocalGroup(leaderCharId, group);
    return { ok: true, group };
  }

  async function sendInvite(groupId, char, fromCharId, account = null) {
    if (!groupId || !char?.id) return { ok: false, error: 'invalid' };
    if (fromCharId && char.id === fromCharId) {
      return { ok: false, error: 'self' };
    }

    if (!String(char.id).startsWith('u_')) {
      return addMember(groupId, char, account, fromCharId);
    }

    if (!(await ensureAuthState())) {
      return { ok: false, error: 'auth' };
    }

    try {
      const res = await apiFetch('/api/me/group/invite', {
        method: 'POST',
        body: JSON.stringify({ groupId, fromCharId, toCharId: char.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data.error || 'invite_failed' };
      }
      return { ok: true, pending: true, invite: data };
    } catch {
      return { ok: false, error: 'network' };
    }
  }

  async function loadSentInvites(groupId = null) {
    if (!(await ensureAuthState())) return [];
    try {
      const query = groupId ? `?groupId=${encodeURIComponent(groupId)}` : '';
      const res = await apiFetch(`/api/me/sent-invites${query}`);
      if (res.ok) return await res.json();
    } catch {
      /* ignore */
    }
    return [];
  }

  function hasPendingSentInvite(sentInvites, toCharId) {
    return sentInvites.some((i) => i.status === 'pending' && i.toCharId === toCharId);
  }

  async function removeMember(groupId, charId, viewerCharId = null) {
    if (!groupId || !charId) return { ok: false, error: 'invalid' };

    if (await ensureAuthState()) {
      try {
        const res = await apiFetch(
          `/api/me/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(charId)}`,
          { method: 'DELETE' },
        );
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          return { ok: true, group: normalizeGroup(data), removedSelf: charId === viewerCharId };
        }
        if (res.status !== 404) {
          return { ok: false, error: data.error || 'remove_failed' };
        }
      } catch {
        return { ok: false, error: 'network' };
      }
    }

    const groups = loadLocalGroups(viewerCharId);
    const idx = groups.findIndex((g) => g.id === groupId);
    if (idx < 0) return { ok: false, error: 'missing' };
    const group = groups[idx];
    const next = {
      ...group,
      members: group.members.filter((m) => m.charId !== charId),
    };
    if (!next.members.length) groups.splice(idx, 1);
    else groups[idx] = next;
    saveLocalGroups(viewerCharId, groups);
    return { ok: true, group: next, removedSelf: charId === viewerCharId };
  }

  async function revealMember(groupId, charId) {
    if (!groupId || !charId) return { ok: false, error: 'invalid' };
    if (!(await ensureAuthState())) {
      return { ok: false, error: 'auth' };
    }
    try {
      const res = await apiFetch(
        `/api/me/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(charId)}/reveal`,
        { method: 'POST' },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data.error || 'reveal_failed' };
      }
      return { ok: true, group: normalizeGroup(data) };
    } catch {
      return { ok: false, error: 'network' };
    }
  }

  function isInGroup(group, charId) {
    return (group?.members || []).some((m) => m.charId === charId);
  }

  return {
    MAX_MEMBERS,
    loadGroupsForChar,
    loadGroup,
    createGroup,
    addMember,
    sendInvite,
    loadSentInvites,
    hasPendingSentInvite,
    removeMember,
    revealMember,
    isInGroup,
    memberFromCharacter,
  };
})();

Object.assign(window, { GobGroup });
