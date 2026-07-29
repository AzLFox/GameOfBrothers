/**
 * Стол файта — страница живого боя для игрока (F6). Read-only: показывает
 * расстановку бойцов, «кто кого атакует» и HP той группы, где состоит персонаж.
 * Подписка на battle-SSE — правки ГМа прилетают вживую. Роадмап — docs/fight-table-roadmap.md.
 */
(() => {
  const params = new URLSearchParams(location.search);
  const groupId = params.get('group') || '';
  const charId = params.get('char') || '';

  const els = {
    arena: document.getElementById('battle-arena'),
    field: document.getElementById('battle-field'),
    status: document.getElementById('battle-status'),
    empty: document.getElementById('battle-empty'),
    back: document.getElementById('battle-back'),
    error: document.getElementById('battle-error'),
  };

  let sub = null;
  let currentBattle = null;

  function setBackLink() {
    if (els.back) {
      els.back.href = charId ? `/character?id=${encodeURIComponent(charId)}` : '/';
    }
  }

  function showError(message) {
    if (sub) { sub.close(); sub = null; }
    if (els.arena) els.arena.hidden = true;
    if (els.empty) els.empty.hidden = true;
    if (els.status) els.status.textContent = '';
    if (els.error) {
      els.error.textContent = message;
      els.error.hidden = false;
    }
  }

  function applyBattle(battle) {
    currentBattle = battle || null;
    if (els.error) els.error.hidden = true;

    const active = !!battle?.active;
    const count = (battle?.combatants || []).length;

    if (!active || !count) {
      if (els.field) GobBattleView.render(els.field, { active: false, combatants: [], targets: {} });
      if (els.arena) els.arena.hidden = true;
      if (els.empty) {
        els.empty.textContent = active
          ? 'Бой идёт, но бойцов на столе ещё нет.'
          : 'Сейчас боя нет. Мастер начнёт его, когда придёт время.';
        els.empty.hidden = false;
      }
      if (els.status) els.status.textContent = active ? 'Бой идёт' : 'Боя нет';
      return;
    }

    if (els.empty) els.empty.hidden = true;
    if (els.arena) els.arena.hidden = false;
    if (els.status) {
      els.status.textContent = `Бой идёт · ${count} ${plural(count, 'боец', 'бойца', 'бойцов')} · раунд ${battle.round || 1}`;
    }
    if (els.field) GobBattleView.render(els.field, battle);
  }

  function plural(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  }

  async function boot() {
    setBackLink();

    if (typeof GobAuth !== 'undefined') {
      const user = await GobAuth.fetchMe();
      if (!user) {
        GobAuth.redirectIfGuest(location.pathname + location.search);
        return;
      }
    }

    if (typeof GobBattle === 'undefined' || typeof GobBattleView === 'undefined') {
      showError('Не удалось загрузить модули боя.');
      return;
    }
    if (!groupId) {
      showError('Группа не указана — открой боевой стол по ссылке с листа персонажа.');
      return;
    }

    const res = await GobBattle.loadBattle(groupId);
    if (!res.ok) {
      showError(res.status === 403
        ? 'Нет доступа к бою этой группы.'
        : 'Не удалось загрузить бой группы.');
      return;
    }

    applyBattle(res.battle);
    sub = GobBattle.subscribe(groupId, (battle) => applyBattle(battle));

    // стрелки заданы в пикселях арены — пересчитываем полным перерендером.
    window.addEventListener('resize', () => {
      if (currentBattle?.active) applyBattle(currentBattle);
    });
    window.addEventListener('beforeunload', () => { if (sub) sub.close(); });
  }

  boot();
})();
