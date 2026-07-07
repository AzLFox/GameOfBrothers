/**
 * Почта на листе персонажа — приглашения в группу и слова мастера.
 */
const GobInvites = (() => {
  const READ_KEY = 'gob-invites-read';
  const GM_READ_KEY = 'gob-messages-read';
  const HIDDEN_INVITER_LABEL = 'Неизвестный странник';

  function loadReadIds(charId, key) {
    try {
      const all = JSON.parse(sessionStorage.getItem(key) || '{}');
      return new Set(Array.isArray(all[charId]) ? all[charId] : []);
    } catch {
      return new Set();
    }
  }

  function markIdsRead(charId, ids, key) {
    if (!ids.length) return;
    try {
      const all = JSON.parse(sessionStorage.getItem(key) || '{}');
      const existing = new Set(Array.isArray(all[charId]) ? all[charId] : []);
      ids.forEach((id) => existing.add(id));
      all[charId] = [...existing];
      sessionStorage.setItem(key, JSON.stringify(all));
    } catch {
      /* ignore */
    }
  }

  function markInvitesRead(charId, inviteIds) {
    markIdsRead(charId, inviteIds, READ_KEY);
  }

  function markGmMessagesRead(charId, messageIds) {
    markIdsRead(charId, messageIds, GM_READ_KEY);
  }

  function unreadInvites(charId, inviteList) {
    const read = loadReadIds(charId, READ_KEY);
    return inviteList.filter((invite) => !read.has(invite.id));
  }

  function unreadGmMessages(charId, messageList) {
    const read = loadReadIds(charId, GM_READ_KEY);
    return messageList.filter((msg) => msg.status === 'unread' && !read.has(msg.id));
  }

  async function apiFetch(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(path, { ...options, headers, credentials: 'same-origin' });
  }

  async function loadInvitesForCharacter(charId) {
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

  async function loadGmMessagesForCharacter(charId) {
    if (!charId || !String(charId).startsWith('u_')) return [];
    if (typeof GobAuth === 'undefined' || !(await GobAuth.fetchMe())) return [];
    try {
      const res = await apiFetch(`/api/me/messages?charId=${encodeURIComponent(charId)}`);
      if (res.ok) return await res.json();
    } catch {
      /* ignore */
    }
    return [];
  }

  async function loadForCharacter(charId) {
    const [invites, gmMessages] = await Promise.all([
      loadInvitesForCharacter(charId),
      loadGmMessagesForCharacter(charId),
    ]);
    return { invites, gmMessages };
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

  async function markGmMessageRead(charId, messageId) {
    const res = await apiFetch(`/api/me/messages/${encodeURIComponent(messageId)}/read`, {
      method: 'POST',
      body: JSON.stringify({ charId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Не удалось отметить прочитанным');
    return data;
  }

  async function acceptGift(charId, messageId) {
    const res = await apiFetch(`/api/me/messages/${encodeURIComponent(messageId)}/accept`, {
      method: 'POST',
      body: JSON.stringify({ charId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Не удалось принять предмет');
    return data;
  }

  async function declineGift(charId, messageId) {
    const res = await apiFetch(`/api/me/messages/${encodeURIComponent(messageId)}/decline`, {
      method: 'POST',
      body: JSON.stringify({ charId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Не удалось отклонить');
    return data;
  }

  function mailKey(item) {
    return `${item.kind}:${item.id}`;
  }

  function isItemGiftMessage(message) {
    return message?.type === 'item_gift' || !!String(message?.item?.name ?? '').trim();
  }

  function buildMailItems(invites, gmMessages) {
    const items = [
      ...invites.map((invite) => ({
        kind: 'invite',
        id: invite.id,
        createdAt: invite.createdAt || '',
        invite,
      })),
      ...gmMessages.map((message) => ({
        kind: 'gm',
        id: message.id,
        createdAt: message.createdAt || '',
        message,
      })),
    ];
    return items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
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
    let gmMessages = [];
    let mailItems = [];
    let knownMailKeys = new Set();
    let initialLoadDone = false;
    let toastDismissTimer = null;
    let activeToast = null;
    let pageLoadToastTimer = null;

    function markCurrentInvitesRead() {
      markInvitesRead(charId, invites.map((invite) => invite.id));
    }

    function scheduleUnreadToast(item) {
      clearTimeout(pageLoadToastTimer);
      pageLoadToastTimer = window.setTimeout(() => {
        if (mailItems.some((entry) => mailKey(entry) === mailKey(item))) {
          showMailToast(item);
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

    function toastTextForItem(item) {
      if (item.kind === 'gm') {
        const msg = item.message;
        if (isItemGiftMessage(msg)) {
          const itemName = msg.item?.name || 'предмет';
          return `
            <strong>Мастер</strong>
            отправляет вам посылку
            <em>«${itemName}»</em>.
          `;
        }
        return `
          <strong>Мастер</strong>
          обращается к вам
          ${msg.groupName ? `в группе <em>«${msg.groupName}»</em>` : ''}.
        `;
      }
      const invite = item.invite;
      return `
        <strong class="invite-hidden-name">${HIDDEN_INVITER_LABEL}</strong>
        приглашает вас в группу
        ${invite.groupName ? `<em>«${invite.groupName}»</em>` : ''}.
      `;
    }

    function showMailToast(item) {
      dismissToast();

      const isGift = item.kind === 'gm' && isItemGiftMessage(item.message);
      const toast = document.createElement('aside');
      toast.className = `invite-toast${isGift ? ' invite-toast--gift' : ''}`;
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      toast.innerHTML = `
        <div class="invite-toast__icon-wrap">
          <img class="invite-toast__icon" src="/img/ui/dove-letter.png" alt="" width="36" height="36" draggable="false">
        </div>
        <div class="invite-toast__body">
          <p class="invite-toast__eyebrow">${isGift ? 'Посылка мастера' : 'Голубиная почта'}</p>
          <p class="invite-toast__title">${isGift ? 'Вам доставлен предмет' : 'Вам доставлено письмо'}</p>
          <p class="invite-toast__text">${toastTextForItem(item)}</p>
        </div>
        <div class="invite-toast__actions">
          <button type="button" class="invite-toast__read">Прочитать</button>
          <button type="button" class="invite-toast__dismiss">Позже</button>
        </div>
      `;

      toast.querySelector('.invite-toast__read')?.addEventListener('click', () => {
        dismissToast();
        markCurrentInvitesRead();
        updateMailButton();
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

    function detectNewMail(nextItems) {
      if (!initialLoadDone) return [];
      return nextItems.filter((item) => !knownMailKeys.has(mailKey(item)));
    }

    function renderInviteLetter(invite) {
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
          if (mailItems.length === 0) closeModal();
        } catch (err) {
          window.alert(err.message || 'Ошибка');
        }
      });

      card.querySelector('[data-action="decline"]')?.addEventListener('click', async () => {
        try {
          await decline(invite.id);
          markInvitesRead(charId, [invite.id]);
          await refresh();
          if (mailItems.length === 0) closeModal();
        } catch (err) {
          window.alert(err.message || 'Ошибка');
        }
      });

      return card;
    }

    function renderGmLetter(message) {
      if (isItemGiftMessage(message)) {
        return renderGmItemGift(message);
      }
      return renderGmTextLetter(message);
    }

    function renderGmTextLetter(message) {
      const isUnread = message.status === 'unread'
        && !loadReadIds(charId, GM_READ_KEY).has(message.id);
      const card = document.createElement('article');
      card.className = `invite-letter-card invite-letter-card--gm invite-letter-card--words${isUnread ? ' invite-letter-card--unread' : ''}`;
      const date = message.createdAt
        ? new Date(message.createdAt).toLocaleString('ru-RU')
        : '';
      card.innerHTML = `
        <div class="invite-letter-kind invite-letter-kind--words">Слова мастера</div>
        <p class="invite-letter-salute">Уважаемый${message.toCharName ? ` ${message.toCharName}` : ''},</p>
        <p class="invite-letter-body">
          <strong>Мастер</strong>
          ${message.groupName ? `группы «<strong>${message.groupName}</strong>»` : ''} пишет вам:
        </p>
        <blockquote class="invite-letter-gm-text invite-letter-gm-text--quote"></blockquote>
        ${date ? `<time class="invite-letter-time">${date}</time>` : ''}
      `;
      card.querySelector('.invite-letter-gm-text--quote').textContent = message.body || '';

      card.addEventListener('click', async () => {
        if (message.status !== 'unread') return;
        try {
          await markGmMessageRead(charId, message.id);
          message.status = 'read';
          markGmMessagesRead(charId, [message.id]);
          card.classList.remove('invite-letter-card--unread');
          updateMailButton();
        } catch {
          /* ignore */
        }
      });

      return card;
    }

    function renderGmItemGift(message) {
      const isUnread = message.status === 'unread';
      const item = message.item || {};
      const card = document.createElement('article');
      card.className = `invite-letter-card invite-letter-card--gift${isUnread ? ' invite-letter-card--unread' : ''}`;
      const date = message.createdAt
        ? new Date(message.createdAt).toLocaleString('ru-RU')
        : '';
      card.innerHTML = `
        <div class="invite-letter-kind invite-letter-kind--gift">Посылка</div>
        <p class="invite-letter-salute">Уважаемый${message.toCharName ? ` ${message.toCharName}` : ''},</p>
        <p class="invite-letter-body">
          <strong>Мастер</strong>
          ${message.groupName ? `из группы «<strong>${message.groupName}</strong>»` : ''}
          передаёт вам предмет:
        </p>
        <div class="invite-letter-parcel">
          <span class="invite-letter-parcel__icon" aria-hidden="true">📦</span>
          <div class="invite-letter-parcel__body">
            <span class="invite-letter-parcel__name"></span>
            <p class="invite-letter-parcel__desc"></p>
          </div>
        </div>
        <p class="invite-letter-gm-text invite-letter-gm-text--note"></p>
        ${date ? `<time class="invite-letter-time">${date}</time>` : ''}
        <div class="invite-letter-actions">
          <button type="button" class="invite-letter-btn invite-letter-btn--accept" data-action="accept-gift">Принять в рюкзак</button>
          <button type="button" class="invite-letter-btn invite-letter-btn--decline" data-action="decline-gift">Отклонить</button>
        </div>
      `;
      card.querySelector('.invite-letter-parcel__name').textContent = item.name || 'Предмет';
      const descEl = card.querySelector('.invite-letter-parcel__desc');
      const noteEl = card.querySelector('.invite-letter-gm-text--note');
      if (item.desc) {
        descEl.textContent = item.desc;
      } else {
        descEl.hidden = true;
      }
      const note = String(message.body ?? '').trim();
      const autoNote = `Мастер передаёт вам: ${item.name || ''}`;
      if (note && note !== autoNote) {
        noteEl.textContent = note;
      } else {
        noteEl.hidden = true;
      }

      card.querySelector('[data-action="accept-gift"]')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await acceptGift(charId, message.id);
          markGmMessagesRead(charId, [message.id]);
          window.dispatchEvent(new CustomEvent('gob-sheet-refresh'));
          await refresh();
          if (mailItems.length === 0) closeModal();
        } catch (err) {
          window.alert(err.message || 'Не удалось принять предмет');
        }
      });

      card.querySelector('[data-action="decline-gift"]')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await declineGift(charId, message.id);
          markGmMessagesRead(charId, [message.id]);
          await refresh();
          if (mailItems.length === 0) closeModal();
        } catch (err) {
          window.alert(err.message || 'Ошибка');
        }
      });

      return card;
    }

    function renderList() {
      listEl.innerHTML = '';
      if (!mailItems.length) {
        emptyEl.hidden = false;
        return;
      }
      emptyEl.hidden = true;
      mailItems.forEach((item) => {
        if (item.kind === 'invite') {
          listEl.appendChild(renderInviteLetter(item.invite));
        } else {
          listEl.appendChild(renderGmLetter(item.message));
        }
      });
    }

    function updateMailButton() {
      const pendingUnread = unreadInvites(charId, invites);
      const gmUnread = unreadGmMessages(charId, gmMessages);
      btn.hidden = mailItems.length === 0;
      btn.classList.toggle('btn-invites--has-mail', pendingUnread.length > 0 || gmUnread.length > 0);
    }

    async function refresh() {
      const next = await loadForCharacter(charId);
      invites = Array.isArray(next.invites) ? next.invites : [];
      gmMessages = Array.isArray(next.gmMessages) ? next.gmMessages : [];
      const nextMail = buildMailItems(invites, gmMessages);
      const newcomers = detectNewMail(nextMail);
      const pendingUnread = unreadInvites(charId, invites);
      const gmUnread = unreadGmMessages(charId, gmMessages);

      if (newcomers.length > 0) {
        showMailToast(newcomers[newcomers.length - 1]);
      } else if (!initialLoadDone && (pendingUnread.length > 0 || gmUnread.length > 0)) {
        const unreadItem = buildMailItems(pendingUnread, gmUnread)[0];
        if (unreadItem) scheduleUnreadToast(unreadItem);
      }

      mailItems = nextMail;
      knownMailKeys = new Set(mailItems.map(mailKey));
      initialLoadDone = true;

      updateMailButton();
      renderList();
    }

    btn.addEventListener('click', () => {
      dismissToast();
      markCurrentInvitesRead();
      updateMailButton();
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

  return {
    loadForCharacter,
    accept,
    decline,
    markGmMessageRead,
    acceptGift,
    declineGift,
    bind,
  };
})();

Object.assign(window, { GobInvites });
