/**
 * GoB auth client — session cookie API, header UI, localStorage migration.
 */
const GobAuth = (() => {
  const USER_STORAGE_KEY = 'gob-user-characters';
  let currentUser = null;
  let meFetched = false;
  let mePromise = null;

  async function api(path, options = {}) {
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

  function sheetStorageKey(id) {
    return `gob_character_${id}`;
  }

  function getReturnUrl() {
    const params = new URLSearchParams(location.search);
    const ret = params.get('return');
    if (ret && ret.startsWith('/') && !ret.startsWith('//')) return ret;
    return '/';
  }

  function navigate(url) {
    if (typeof GobMotion !== 'undefined') {
      GobMotion.navigateTo(url);
    } else {
      window.location.href = url;
    }
  }

  async function migrateLocalCharactersIfNeeded() {
    if (!currentUser) return;

    const res = await api('/api/me/characters');
    if (!res.ok) return;
    const serverChars = await res.json();
    if (Array.isArray(serverChars) && serverChars.length > 0) return;

    let localChars = [];
    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) localChars = parsed;
      }
    } catch {
      return;
    }
    if (localChars.length === 0) return;

    const sheets = {};
    localChars.forEach((c) => {
      if (!c?.id) return;
      try {
        const rawSheet = localStorage.getItem(sheetStorageKey(c.id));
        if (rawSheet) sheets[c.id] = JSON.parse(rawSheet);
      } catch {
        /* skip invalid sheet */
      }
    });

    const importRes = await api('/api/me/characters/import', {
      method: 'POST',
      body: JSON.stringify({ characters: localChars, sheets }),
    });
    if (!importRes.ok) return;

    localStorage.removeItem(USER_STORAGE_KEY);
    localChars.forEach((c) => {
      if (c?.id) localStorage.removeItem(sheetStorageKey(c.id));
    });

    if (typeof GobCharacters !== 'undefined' && GobCharacters.invalidateAuthCache) {
      GobCharacters.invalidateAuthCache();
    }
  }

  async function fetchMe(force = false) {
    if (!force && meFetched) return currentUser;
    if (!force && mePromise) return mePromise;

    mePromise = (async () => {
      try {
        const res = await api('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          currentUser = data.user || null;
        } else {
          currentUser = null;
        }
      } catch {
        currentUser = null;
      }
      meFetched = true;
      mePromise = null;

      return currentUser;
    })();

    return mePromise;
  }

  async function login(username, password) {
    const res = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Не удалось войти');
    }
    currentUser = data.user || null;
    meFetched = true;
    return currentUser;
  }

  async function register(username, password) {
    const res = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Не удалось зарегистрироваться');
    }
    currentUser = data.user || null;
    meFetched = true;
    return currentUser;
  }

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    currentUser = null;
    meFetched = true;
    if (typeof GobCharacters !== 'undefined' && GobCharacters.invalidateAuthCache) {
      GobCharacters.invalidateAuthCache();
    }
  }

  async function deleteAccount() {
    const res = await api('/api/me/account', { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Не удалось удалить аккаунт');
    }
    currentUser = null;
    meFetched = true;
    if (typeof GobCharacters !== 'undefined' && GobCharacters.invalidateAuthCache) {
      GobCharacters.invalidateAuthCache();
    }
  }

  function getCurrentUser() {
    return currentUser;
  }

  function isLoggedIn() {
    return !!currentUser;
  }

  function redirectIfGuest(returnUrl) {
    if (currentUser) return false;
    const dest = `/login?return=${encodeURIComponent(returnUrl || location.pathname + location.search)}`;
    navigate(dest);
    return true;
  }

  function updateAuthHeader() {
    const guestEl = document.getElementById('authGuest');
    const userEl = document.getElementById('authUser');
    const usernameEl = document.getElementById('authUsername');
    const logoutBtn = document.getElementById('authLogout');
    const deleteBtn = document.getElementById('authDeleteAccount');
    if (!guestEl || !userEl) return;

    if (currentUser) {
      guestEl.hidden = true;
      userEl.hidden = false;
      if (usernameEl) usernameEl.textContent = currentUser.username;
      if (logoutBtn) logoutBtn.hidden = false;
      if (deleteBtn) deleteBtn.hidden = false;
    } else {
      guestEl.hidden = false;
      userEl.hidden = true;
      if (logoutBtn) logoutBtn.hidden = true;
      if (deleteBtn) deleteBtn.hidden = true;
    }

    if (logoutBtn && !logoutBtn.dataset.bound) {
      logoutBtn.dataset.bound = '1';
      logoutBtn.addEventListener('click', async () => {
        await logout();
        updateAuthHeader();
        window.dispatchEvent(new CustomEvent('gob-auth-logout'));
      });
    }

    document.querySelectorAll('[data-auth-nav]').forEach((link) => {
      if (link.dataset.authNavBound) return;
      link.dataset.authNavBound = '1';
      link.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(link.getAttribute('href'));
      });
    });
  }

  function initDeleteAccountDialog() {
    const modal = document.getElementById('delete-account-modal');
    const openBtn = document.getElementById('authDeleteAccount');
    const confirmBtn = document.getElementById('delete-account-confirm');
    const cancelBtn = document.getElementById('delete-account-cancel');
    if (!modal || !openBtn || openBtn.dataset.bound) return;

    openBtn.dataset.bound = '1';

    openBtn.addEventListener('click', () => {
      if (typeof modal.showModal === 'function') {
        modal.showModal();
      }
    });

    cancelBtn?.addEventListener('click', () => {
      modal.close();
    });

    confirmBtn?.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      try {
        await deleteAccount();
        modal.close();
        updateAuthHeader();
        window.dispatchEvent(new CustomEvent('gob-auth-logout'));
        navigate('/');
      } catch (err) {
        confirmBtn.disabled = false;
        window.alert(err.message || 'Не удалось удалить аккаунт');
      }
    });

    modal.addEventListener('cancel', (e) => {
      e.preventDefault();
      modal.close();
    });
  }

  async function initAuthHeader() {
    await fetchMe();
    updateAuthHeader();
    initDeleteAccountDialog();
  }

  return {
    fetchMe,
    login,
    register,
    logout,
    deleteAccount,
    getCurrentUser,
    isLoggedIn,
    redirectIfGuest,
    getReturnUrl,
    initAuthHeader,
    initDeleteAccountDialog,
    migrateLocalCharactersIfNeeded,
  };
})();

Object.assign(window, { GobAuth });
