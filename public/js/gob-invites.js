/**
 * Входящие приглашения в группу — голубь на листе персонажа.
 */
const GobInvites = (() => {
  const READ_KEY = 'gob-invites-read';
  const HIDDEN_INVITER_LABEL = 'Неизвестный странник';

  function loadReadIds(charId) {
    try {
      const all = JSON.parse(sessionStorage.getItem(READ_KEY) || '{}');
      return new Set(Array.isArray(all[charId]) ? all[charId] : []);
    } catch {
      return new Set();
    }
  }

  function markInvitesRead(charId, inviteIds) {
    if (!inviteIds.length) return;
    try {
      const all = JSON.parse(sessionStorage.getItem(READ_KEY) || '{}');
      const existing = new Set(Array.isArray(all[charId]) ? all[charId] : []);
      inviteIds.forEach((id) => existing.add(id));
      all[charId] = [...existing];
      sessionStorage.setItem(READ_KEY, JSON.stringify(all));
    } catch {
      /* ignore */
    }
  }

  function unreadInvites(charId, inviteList) {
    const read = loadReadIds(charId);
    return inviteList.filter((invite) => !read.has(invite.id));
  }
  async function apiFetch(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(path, { ...options, headers, credentials: 'same-origin' });
  }

  async function loadForCharacter(charId) {
    if (!charId || !String(charId).startsWith('u_')) return [];
    if (typeof GobAuth === 'undefined' || !(await GobAuth.fetchMe())) return [];
    try {
      const res = await apiFetch(`/api/me/invites?charId=${encodeURIComponent(charId)}`);
      if (res.ok) return await res.json();
    } catch {
      /* ignore */
    }
    return [];
  }

  async function accept(inviteId) {
    const res = await apiFetch(`/api/me/invites/${encodeURIComponent(inviteId)}/accept`, {
      method: 'POST',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Не удалось принять');
    return data;
  }

  async function decline(inviteId) {
    const res = await apiFetch(`/api/me/invites/${encodeURIComponent(inviteId)}/decline`, {
      method: 'POST',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Не удалось отклонить');
    return data;
  }

  function bind(charId) {
    const btn = document.getElementById('btn-invites');
    const modal = document.getElementById('invite-letter-modal');
    const backdrop = document.getElementById('invite-letter-backdrop');
    const closeBtn = document.getElementById('invite-letter-close');
    const listEl = document.getElementById('invite-letter-list');
    const emptyEl = document.getElementById('invite-letter-empty');
    if (!btn || !modal || !listEl) return;

    let invites = [];
    let knownInviteIds = new Set();
    let initialLoadDone = false;
    let toastDismissTimer = null;
    let activeToast = null;
    let pageLoadToastTimer = null;

    function markCurrentInvitesRead() {
      markInvitesRead(charId, invites.map((invite) => invite.id));
    }

    function scheduleUnreadToast(invite) {
      clearTimeout(pageLoadToastTimer);
      pageLoadToastTimer = window.setTimeout(() => {
        if (invites.some((item) => item.id === invite.id)) {
          showInviteToast(invite);
        }
      }, 700);
    }

    function openModal() {
      modal.classList.remove('hidden');
      document.body.classList.add('invite-letter-open');
    }

    function closeModal() {
      modal.classList.add('hidden');
      document.body.classList.remove('invite-letter-open');
    }

    function dismissToast() {
      if (!activeToast) return;
      const toast = activeToast;
      activeToast = null;
      clearTimeout(toastDismissTimer);
      toast.classList.remove('invite-toast--visible');
      toast.classList.add('invite-toast--leaving');
      window.setTimeout(() => toast.remove(), 420);
    }

    function showInviteToast(invite) {
      dismissToast();

      const toast = document.createElement('aside');
      toast.className = 'invite-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      toast.innerHTML = `
        <div class="invite-toast__icon-wrap">
          <img class="invite-toast__icon" src="/img/ui/dove-letter.png" alt="" width="36" height="36" draggable="false">
        </div>
        <div class="invite-toast__body">
          <p class="invite-toast__eyebrow">Голубиная почта</p>
          <p class="invite-toast__title">Вам доставлено письмо</p>
          <p class="invite-toast__text">
            <strong class="invite-hidden-name">${HIDDEN_INVITER_LABEL}</strong>
            приглашает вас в группу
            ${invite.groupName ? `<em>«${invite.groupName}»</em>` : ''}.
          </p>
        </div>
        <div class="invite-toast__actions">
          <button type="button" class="invite-toast__read">Прочитать</button>
          <button type="button" class="invite-toast__dismiss">Позже</button>
        </div>
      `;

      toast.querySelector('.invite-toast__read')?.addEventListener('click', () => {
        dismissToast();
        markCurrentInvitesRead();
        renderList();
        openModal();
      });
      toast.querySelector('.invite-toast__dismiss')?.addEventListener('click', dismissToast);

      document.body.appendChild(toast);
      requestAnimationFrame(() => toast.classList.add('invite-toast--visible'));

      activeToast = toast;
      toastDismissTimer = window.setTimeout(dismissToast, 14000);

      if (typeof GobSound !== 'undefined') {
        GobSound.playOpen?.();
      }
    }

    function detectNewInvites(nextInvites) {
      if (!initialLoadDone) return [];
      return nextInvites.filter((invite) => !knownInviteIds.has(invite.id));
    }

    function renderLetter(invite) {
      const card = document.createElement('article');
      card.className = 'invite-letter-card';
      card.innerHTML = `
        <p class="invite-letter-salute">Уважаемый${invite.toCharName ? ` ${invite.toCharName}` : ''},</p>
        <p class="invite-letter-body">
          <strong class="invite-hidden-name">${HIDDEN_INVITER_LABEL}</strong>
          (${invite.fromUsername || 'игрок'}) приглашает вас в группу
          ${invite.groupName ? `«<strong>${invite.groupName}</strong>»` : 'приключенцев'}.
        </p>
        <div class="invite-letter-actions">
          <button type="button" class="invite-letter-btn invite-letter-btn--accept" data-action="accept">Принять</button>
          <button type="button" class="invite-letter-btn invite-letter-btn--decline" data-action="decline">Отклонить</button>
        </div>
      `;

      card.querySelector('[data-action="accept"]')?.addEventListener('click', async () => {
        try {
          await accept(invite.id);
          markInvitesRead(charId, [invite.id]);
          window.dispatchEvent(new CustomEvent('gob-group-changed'));
          await refresh();
          if (invites.length === 0) closeModal();
        } catch (err) {
          window.alert(err.message || 'Ошибка');
        }
      });

      card.querySelector('[data-action="decline"]')?.addEventListener('click', async () => {
        try {
          await decline(invite.id);
          markInvitesRead(charId, [invite.id]);
          await refresh();
          if (invites.length === 0) closeModal();
        } catch (err) {
          window.alert(err.message || 'Ошибка');
        }
      });

      return card;
    }

    function renderList() {
      listEl.innerHTML = '';
      if (!invites.length) {
        emptyEl.hidden = false;
        return;
      }
      emptyEl.hidden = true;
      invites.forEach((invite) => {
        listEl.appendChild(renderLetter(invite));
      });
    }

    async function refresh() {
      const nextInvites = await loadForCharacter(charId);
      const newcomers = detectNewInvites(nextInvites);
      const pendingUnread = unreadInvites(charId, nextInvites);

      if (newcomers.length > 0) {
        showInviteToast(newcomers[newcomers.length - 1]);
      } else if (!initialLoadDone && pendingUnread.length > 0) {
        scheduleUnreadToast(pendingUnread[pendingUnread.length - 1]);
      }

      invites = nextInvites;
      knownInviteIds = new Set(invites.map((invite) => invite.id));
      initialLoadDone = true;

      btn.hidden = invites.length === 0;
      btn.classList.toggle('btn-invites--has-mail', pendingUnread.length > 0);
      renderList();
    }

    btn.addEventListener('click', () => {
      dismissToast();
      markCurrentInvitesRead();
      btn.classList.remove('btn-invites--has-mail');
      renderList();
      openModal();
    });

    closeBtn?.addEventListener('click', closeModal);
    backdrop?.addEventListener('click', closeModal);

    refresh();
    window.addEventListener('focus', refresh);
    window.setInterval(refresh, 4000);

    return { refresh };
  }

  return { loadForCharacter, accept, decline, bind };
})();

Object.assign(window, { GobInvites });
