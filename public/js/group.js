const params = new URLSearchParams(location.search);
const charId = params.get('id');
const groupId = params.get('group');

if (charId) {
  try { sessionStorage.setItem('gob-party-leader', charId); } catch { /* ignore */ }
}
const leaderCharId = charId || (() => {
  try { return sessionStorage.getItem('gob-party-leader'); } catch { return null; }
})();

function isLeaderChar(id) {
  return leaderCharId && id === leaderCharId;
}

let selectedAccount = null;
let inviteStep = 'accounts';
let lastRosterKey = '';
let activeGroupId = groupId || '';

const HIDDEN_HERO_NAME = 'Неизвестный герой';
const HIDDEN_HERO_DESC = 'Личность скрыта. Откроется, когда герой сам этого захочет.';
const HIDDEN_INVITER_LABEL = 'Неизвестный странник';

function isOwnRosterMember(member) {
  return leaderCharId && member.charId === leaderCharId;
}

function isUserHero(charId) {
  return String(charId || '').startsWith('u_');
}

function isIdentityHidden(member) {
  if (!isUserHero(member.charId)) return false;
  if (isOwnRosterMember(member)) return false;
  return member.revealed !== true;
}

function shouldHideInviteChar(char, account) {
  if (account?.isSelf) return false;
  return isUserHero(char?.id);
}

function memberSyncKey(member) {
  const portrait = String(member?.portrait || '');
  const portraitSig = portrait ? `${portrait.length}:${portrait.slice(-20)}` : '0';
  return [
    member.charId,
    member.revealed ? 1 : 0,
    String(member.name || ''),
    String(member.description || ''),
    portraitSig,
  ].join(':');
}

function rosterKey(group) {
  const membersKey = (group?.members || [])
    .map(memberSyncKey)
    .sort()
    .join('|');
  return `${group?.id || ''}:${membersKey}`;
}

let rosterRenderToken = 0;
let groupViewRefreshToken = 0;
let lastGroupsListKey = '';

function groupsListKey(groups) {
  return (groups || [])
    .map((g) => `${g.id}:${g.memberCount ?? 0}:${g.name ?? ''}`)
    .sort()
    .join('|');
}

function groupUrl(nextGroupId = activeGroupId) {
  const query = new URLSearchParams();
  if (charId) query.set('id', charId);
  if (nextGroupId) query.set('group', nextGroupId);
  const text = query.toString();
  return text ? `/group?${text}` : '/group';
}

async function navigateToGroup(nextGroupId, { replace = false } = {}) {
  const next = nextGroupId || '';
  const url = groupUrl(next);
  const current = location.pathname + location.search;

  if (next !== activeGroupId) {
    lastRosterKey = '';
    if (!next) lastGroupsListKey = '';
  }

  activeGroupId = next;
  updateViewMode();
  selectedAccount = null;
  setInviteStep('accounts');

  if (current !== url) {
    const state = { groupId: next };
    if (replace) history.replaceState(state, '', url);
    else history.pushState(state, '', url);
  }

  if (activeGroupId) {
    await refreshGroupView({ force: true });
    await renderAccounts();
  } else {
    await renderGroupsList({ force: true });
  }
}

function portraitFor(char) {
  if (typeof GobCharacters !== 'undefined' && GobCharacters.getPortraitUrl) {
    return GobCharacters.getPortraitUrl(char);
  }
  return char?.portrait || '/img/char-placeholder.png';
}

function nameFor(char) {
  if (typeof GobCharacters !== 'undefined' && GobCharacters.getDisplayName) {
    return GobCharacters.getDisplayName(char);
  }
  return (char?.name || '').trim() || 'Без имени';
}

function descFor(char) {
  if (typeof GobCharacters !== 'undefined' && GobCharacters.getDisplayDescription) {
    return GobCharacters.getDisplayDescription(char);
  }
  return (char?.description || '').trim() || '';
}

async function apiFetch(path) {
  const res = await fetch(path, { credentials: 'same-origin' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

function setInviteStep(step) {
  inviteStep = step;
  const accountsPanel = document.getElementById('group-step-accounts');
  const heroesPanel = document.getElementById('group-step-heroes');
  accountsPanel.hidden = step !== 'accounts';
  heroesPanel.hidden = step !== 'heroes';

  document.querySelectorAll('.group-step').forEach((el) => {
    el.classList.toggle('group-step--active', el.dataset.step === step);
  });
}

function accountInitial(username) {
  const text = String(username || '?').trim();
  return text.charAt(0).toUpperCase();
}

function updateViewMode() {
  const hasGroup = !!activeGroupId;
  document.getElementById('group-list-panel').hidden = hasGroup;
  document.getElementById('group-detail-panel').hidden = !hasGroup;
  document.getElementById('group-invite-panel').hidden = !hasGroup;
}

async function rosterMemberCard(member, { isOwner = false } = {}) {
  const card = document.createElement('article');
  const isSelf = isOwnRosterMember(member);
  const hidden = isIdentityHidden(member);
  card.className = `group-hero-card${isSelf ? ' group-hero-card--self' : ''}`;
  card.dataset.charId = member.charId;

  let charData = null;
  if (!hidden && typeof GobCharacters !== 'undefined' && GobCharacters.findCharacterById) {
    charData = await GobCharacters.findCharacterById(member.charId);
  } else if (isSelf && typeof GobCharacters !== 'undefined' && GobCharacters.findCharacterById) {
    charData = await GobCharacters.findCharacterById(member.charId);
  }

  const displayName = hidden
    ? HIDDEN_HERO_NAME
    : (charData ? nameFor(charData) : (member.name || 'Без имени'));
  let description = hidden
    ? HIDDEN_HERO_DESC
    : (charData ? descFor(charData) : String(member.description || '').trim());
  if (!hidden && (!description || description === 'Описание не задано')) {
    description = 'Описание не задано';
  }

  const portrait = portraitFor(charData || {
    id: member.charId,
    isUser: isUserHero(member.charId),
    portrait: member.portrait,
  });

  const showReveal = isSelf && isUserHero(member.charId) && member.revealed !== true;
  const showLeave = isSelf;
  const showKick = !isSelf && isOwner;
  const actionButtons = [
    showReveal ? '<button type="button" class="group-hero-card__reveal">Раскрыть личность</button>' : '',
    showLeave ? '<button type="button" class="group-hero-card__kick">Съебаться</button>' : '',
    showKick ? '<button type="button" class="group-hero-card__kick">Турнуть</button>' : '',
  ].filter(Boolean).join('');

  card.innerHTML = `
    <div class="group-hero-card__frame">
      <div class="group-hero-card__flip">
        <div class="group-hero-card__face group-hero-card__front">
          <img class="group-hero-card__portrait" src="" alt="" draggable="false">
          <button type="button" class="group-hero-card__expand" aria-expanded="false" aria-label="Развернуть">⤢</button>
        </div>
        <div class="group-hero-card__face group-hero-card__back">
          <button type="button" class="group-hero-card__collapse" aria-label="Свернуть">×</button>
          <h3 class="group-hero-card__name${hidden ? ' group-hero-card__name--hidden' : ''}"></h3>
          <p class="group-hero-card__desc${hidden ? ' group-hero-card__desc--hidden' : ''}"></p>
          ${actionButtons ? `<div class="group-hero-card__actions">${actionButtons}</div>` : ''}
        </div>
      </div>
    </div>
  `;

  const img = card.querySelector('.group-hero-card__portrait');
  img.src = portrait;
  img.alt = hidden ? HIDDEN_HERO_NAME : displayName;
  img.addEventListener('error', () => {
    if (typeof GobCharacters !== 'undefined' && GobCharacters.getPortraitUrl) {
      img.src = GobCharacters.getPortraitUrl({ isUser: true });
    } else {
      img.src = '/img/char-placeholder.png';
    }
  }, { once: true });

  card.querySelector('.group-hero-card__name').textContent = displayName;
  card.querySelector('.group-hero-card__desc').textContent = description;

  const expandBtn = card.querySelector('.group-hero-card__expand');
  const collapseBtn = card.querySelector('.group-hero-card__collapse');

  function setExpanded(open) {
    card.classList.toggle('group-hero-card--flipped', open);
    expandBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  expandBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setExpanded(true);
  });

  collapseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setExpanded(false);
  });

  card.querySelector('.group-hero-card__reveal')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const revealBtn = e.currentTarget;
    revealBtn.disabled = true;
    const result = await GobGroup.revealMember(activeGroupId, member.charId);
    if (!result.ok) {
      revealBtn.disabled = false;
      return;
    }
    await refreshGroupView({ force: true });
  });

  card.querySelector('.group-hero-card__kick')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const kickBtn = e.currentTarget;
    kickBtn.disabled = true;
    const result = await GobGroup.removeMember(activeGroupId, member.charId, leaderCharId);
    window.dispatchEvent(new CustomEvent('gob-group-changed'));
    if (result.removedSelf || result.deleted) {
      navigateToGroup('');
      return;
    }
    await refreshGroupView({ force: true });
    if (inviteStep === 'heroes' && selectedAccount) {
      await renderHeroes(selectedAccount);
    }
  });

  return card;
}

function memberCard(member, { onInvite = null, char = null, account = null } = {}) {
  const card = document.createElement('article');
  const hideIdentity = char ? shouldHideInviteChar(char, account) : false;
  card.className = 'group-card';
  card.dataset.charId = member.charId;

  const portraitSrc = char ? portraitFor(char) : portraitFor({
    id: member.charId,
    isUser: isUserHero(member.charId),
    portrait: member.portrait,
  });

  const img = document.createElement('img');
  img.className = 'group-card-portrait';
  img.src = portraitSrc;
  img.alt = '';
  img.draggable = false;
  img.addEventListener('error', () => {
    img.src = '/img/char-placeholder.png';
  }, { once: true });

  const name = document.createElement('span');
  name.className = 'group-card-name';
  if (hideIdentity) {
    name.classList.add('group-card-name--hidden');
    name.textContent = HIDDEN_HERO_NAME;
  } else {
    name.textContent = member.name || 'Без имени';
  }

  card.appendChild(img);
  card.appendChild(name);

  if (member.accountName && !hideIdentity) {
    const account = document.createElement('p');
    account.className = 'group-member-account';
    account.textContent = member.accountName;
    card.appendChild(account);
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'group-card-btn';
  btn.textContent = 'Пригласить';
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const result = onInvite ? await onInvite() : { ok: false };
    if (!result.ok && result.error === 'full') {
      btn.textContent = 'Группа полна';
    } else if (result.ok && result.pending) {
      btn.textContent = 'Отправлено';
    } else if (result.ok) {
      btn.textContent = 'В группе';
    } else {
      btn.disabled = false;
      btn.textContent = 'Пригласить';
    }
    await refreshGroupView({ force: true });
    if (selectedAccount) await renderHeroes(selectedAccount);
  });
  card.appendChild(btn);
  return card;
}

function inviteCard(char, account, { disabled = false, inGroup = false, isSelf = false, pending = false } = {}) {
  const member = GobGroup.memberFromCharacter(char, account);
  const card = memberCard(member, {
    char,
    account,
    onInvite: () => GobGroup.sendInvite(activeGroupId, char, leaderCharId, account),
  });
  const btn = card.querySelector('.group-card-btn');

  if (!shouldHideInviteChar(char, account)) {
    const desc = descFor(char);
    if (desc && desc !== 'Описание не задано') {
      const p = document.createElement('p');
      p.className = 'group-card-desc';
      p.textContent = desc;
      card.insertBefore(p, btn);
    }
  } else {
    const p = document.createElement('p');
    p.className = 'group-card-desc group-card-desc--hidden';
    p.textContent = HIDDEN_HERO_DESC;
    card.insertBefore(p, btn);
  }

  if (isSelf) {
    btn.disabled = true;
    btn.textContent = 'Это вы';
  } else if (pending) {
    btn.disabled = true;
    btn.textContent = 'Отправлено';
  } else if (disabled) {
    btn.disabled = true;
    btn.textContent = 'Группа полна';
  } else if (inGroup) {
    btn.disabled = true;
    btn.textContent = 'В группе';
  }

  return card;
}

function accountCard(account) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'group-account-card';
  card.innerHTML = `
    <span class="group-account-icon" aria-hidden="true">${accountInitial(account.username)}</span>
    <span class="group-account-name">${account.username}</span>
  `;

  const meta = document.createElement('p');
  meta.className = 'group-account-meta';
  if (account.isSelf) {
    meta.textContent = 'Ваш аккаунт';
  } else {
    meta.textContent = 'Аккаунт игрока';
  }
  card.appendChild(meta);

  card.addEventListener('click', async () => {
    selectedAccount = account;
    setInviteStep('heroes');
    await renderHeroes(account);
  });

  return card;
}

function groupListCard(summary) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'group-list-card';
  card.innerHTML = `
    <span class="group-list-card__name">${summary.name || 'Без названия'}</span>
    <span class="group-list-card__meta">${summary.memberCount || 0} / ${GobGroup.MAX_MEMBERS}</span>
  `;
  card.addEventListener('click', () => navigateToGroup(summary.id));
  return card;
}

async function renderGroupsList({ force = false } = {}) {
  const list = document.getElementById('group-list');
  const empty = document.getElementById('group-list-empty');

  if (!leaderCharId) {
    if (!force && lastGroupsListKey === 'no-leader') return;
    lastGroupsListKey = 'no-leader';
    list.innerHTML = '';
    empty.hidden = false;
    empty.textContent = 'Откройте страницу с листа персонажа, чтобы управлять группами.';
    return;
  }

  const groups = await GobGroup.loadGroupsForChar(leaderCharId);
  const key = groupsListKey(groups);
  if (!force && key === lastGroupsListKey) return;
  lastGroupsListKey = key;

  list.innerHTML = '';

  if (!groups.length) {
    empty.hidden = false;
    empty.textContent = 'Вы ещё не состоите ни в одной группе — создайте новую ниже.';
    return;
  }

  empty.hidden = true;
  groups.forEach((summary) => {
    list.appendChild(groupListCard(summary));
  });
}

async function renderAccounts() {
  const list = document.getElementById('group-account-list');
  const empty = document.getElementById('group-accounts-empty');
  list.innerHTML = '';

  try {
    const accounts = await apiFetch('/api/group/accounts');
    if (!accounts.length) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    accounts
      .filter((account) => !account.isSelf)
      .forEach((account) => {
        list.appendChild(accountCard(account));
      });
    if (!list.children.length) {
      empty.hidden = false;
      empty.textContent = 'Нельзя пригласить самого себя — выберите другой аккаунт.';
    }
  } catch {
    empty.hidden = false;
    empty.textContent = 'Не удалось загрузить список аккаунтов.';
  }
}

async function renderHeroes(account) {
  const list = document.getElementById('group-invite-list');
  const empty = document.getElementById('group-invite-empty');
  const hint = document.getElementById('group-heroes-hint');
  const group = await GobGroup.loadGroup(activeGroupId, leaderCharId);
  const inGroup = new Set(group.members.map((m) => m.charId));
  const full = group.members.length >= GobGroup.MAX_MEMBERS;
  const sentInvites = await GobGroup.loadSentInvites(activeGroupId);
  const pendingSet = new Set(
    sentInvites.filter((i) => i.status === 'pending').map((i) => i.toCharId),
  );

  hint.textContent = `Герои аккаунта «${account.username}»`;
  list.innerHTML = '';

  try {
    const chars = await apiFetch(`/api/group/accounts/${encodeURIComponent(account.id)}/characters`);
    const invitees = chars.filter((c) => c?.id && !isLeaderChar(c.id));

    if (!invitees.length) {
      empty.hidden = false;
      empty.textContent = 'У этого аккаунта нет доступных героев.';
      return;
    }

    const available = invitees.filter((c) => !inGroup.has(c.id));
    if (!available.length) {
      empty.hidden = false;
      empty.textContent = 'Все герои этого аккаунта уже в группе.';
    } else {
      empty.hidden = true;
    }

    invitees.forEach((char) => {
      list.appendChild(inviteCard(char, account, {
        disabled: full,
        inGroup: inGroup.has(char.id),
        isSelf: isLeaderChar(char.id),
        pending: pendingSet.has(char.id),
      }));
    });
  } catch (err) {
    empty.hidden = false;
    empty.textContent = err.message || 'Не удалось загрузить героев.';
  }
}

async function refreshGroupView({ force = false } = {}) {
  const refreshToken = ++groupViewRefreshToken;

  if (!activeGroupId) {
    await renderGroupsList({ force });
    return false;
  }

  const group = await GobGroup.loadGroup(activeGroupId, leaderCharId);
  if (refreshToken !== groupViewRefreshToken) return false;

  if (!group) {
    navigateToGroup('');
    return false;
  }

  const key = rosterKey(group);
  if (!force && key === lastRosterKey) return false;
  lastRosterKey = key;

  const nameEl = document.getElementById('group-active-name');
  if (nameEl) nameEl.textContent = group.name || 'Группа';
  document.title = group.name ? `GoB — ${group.name}` : 'GoB — Группа';

  await renderRoster(refreshToken);
  if (refreshToken !== groupViewRefreshToken) return false;

  if (inviteStep === 'heroes' && selectedAccount) {
    await renderHeroes(selectedAccount);
  }
  return true;
}

async function renderRoster(refreshToken = groupViewRefreshToken) {
  const renderToken = ++rosterRenderToken;
  const group = await GobGroup.loadGroup(activeGroupId, leaderCharId);
  const max = GobGroup.MAX_MEMBERS;
  const roster = document.getElementById('group-roster');
  const rosterEmpty = document.getElementById('group-empty');
  const capacity = document.getElementById('group-capacity');

  if (refreshToken !== groupViewRefreshToken || renderToken !== rosterRenderToken) return;

  capacity.textContent = `${group.members.length} / ${max}`;

  const cards = await Promise.all(
    group.members.map((m) => rosterMemberCard(m, { isOwner: group.isOwner === true })),
  );
  if (refreshToken !== groupViewRefreshToken || renderToken !== rosterRenderToken) return;

  roster.innerHTML = '';
  if (group.members.length === 0) {
    rosterEmpty.hidden = false;
  } else {
    rosterEmpty.hidden = true;
    cards.forEach((card) => roster.appendChild(card));
  }
}

async function init() {
  const back = document.getElementById('group-back');
  if (charId) {
    back.href = `/character?id=${encodeURIComponent(charId)}`;
  } else {
    back.href = '/';
  }

  document.getElementById('group-step-back')?.addEventListener('click', () => {
    selectedAccount = null;
    setInviteStep('accounts');
  });

  document.getElementById('group-detail-back')?.addEventListener('click', () => {
    navigateToGroup('');
  });

  const createForm = document.getElementById('group-create-form');
  const createInput = document.getElementById('group-create-name');
  const createError = document.getElementById('group-create-error');
  createForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!leaderCharId) {
      createError.textContent = 'Откройте страницу с листа персонажа.';
      createError.classList.remove('hidden');
      return;
    }
    createError.classList.add('hidden');
    const result = await GobGroup.createGroup(createInput.value, leaderCharId);
    if (!result.ok) {
      createError.textContent = result.error === 'name'
        ? 'Название: от 2 до 48 символов'
        : (result.error || 'Не удалось создать группу');
      createError.classList.remove('hidden');
      return;
    }
    createInput.value = '';
    navigateToGroup(result.group.id);
  });

  if (charId && typeof GobCharacters !== 'undefined') {
    const char = await GobCharacters.findCharacterById(charId);
    if (char) {
      const sub = document.getElementById('group-subtitle');
      if (sub) sub.textContent = `Группы героя ${nameFor(char)}`;
    }
  }

  updateViewMode();
  setInviteStep('accounts');
  history.replaceState({ groupId: activeGroupId }, '', groupUrl(activeGroupId));

  if (activeGroupId) {
    const group = await GobGroup.loadGroup(activeGroupId, leaderCharId);
    if (!group) {
      await navigateToGroup('', { replace: true });
      return;
    }
    await refreshGroupView({ force: true });
    await renderAccounts();
  } else {
    await renderGroupsList({ force: true });
  }

  window.addEventListener('popstate', () => {
    const params = new URLSearchParams(location.search);
    const next = params.get('group') || '';
    if (next === activeGroupId) return;

    activeGroupId = next;
    updateViewMode();
    selectedAccount = null;
    setInviteStep('accounts');

    if (activeGroupId) {
      lastRosterKey = '';
      refreshGroupView({ force: true });
      renderAccounts();
    } else {
      renderGroupsList();
    }
  });

  setInterval(() => {
    if (document.hidden || !activeGroupId) return;
    refreshGroupView();
  }, 4000);
  window.addEventListener('focus', () => {
    if (activeGroupId) refreshGroupView();
    else renderGroupsList();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    if (activeGroupId) refreshGroupView();
    else renderGroupsList();
  });
  window.addEventListener('gob-group-changed', () => {
    lastGroupsListKey = '';
    refreshGroupView({ force: true });
  });
}

if (typeof GobGroup === 'undefined') {
  document.body.innerHTML = '<p style="color:#e8c97a;text-align:center;padding:40px;font-family:Cinzel,serif">Не удалось загрузить модуль группы.</p>';
} else {
  init();
}
