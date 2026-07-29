/**
 * Стол файта — read-only рендер боя для игрока (F6): токены бойцов с полосой HP
 * и стрелки «кто кого атакует». Без интерактива — игрок только смотрит.
 * Раскладка (seatPosition) и геометрия стрелок совпадают со столом ГМ
 * ([gm.js](gm.js) `renderBattleTokens`/`drawBattleArrows`), чтобы оба вида
 * показывали одно и то же. Роадмап — docs/fight-table-roadmap.md.
 */
const GobBattleView = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const PLACEHOLDER = '/img/char-placeholder.png';

  function portraitFor(cbt) {
    const p = String(cbt?.portrait ?? '').trim();
    return p || PLACEHOLDER;
  }

  function nameFor(cbt) {
    const name = String(cbt?.name ?? '').trim();
    return name || 'Без имени';
  }

  // Раскладка бойцов по периметру стола — идентична seatPosition из gm.js.
  function seatPosition(index, total) {
    if (total <= 0) return { left: 50, top: 50 };

    const L = 4;
    const R = 96;
    const T = 8;
    const B = 92;
    const t = (index + 0.5) / total;

    let x;
    let y;
    if (t < 0.28) {
      const p = t / 0.28;
      x = L + p * (R - L);
      y = T;
    } else if (t < 0.42) {
      const p = (t - 0.28) / 0.14;
      x = R;
      y = T + p * (B - T);
    } else if (t < 0.72) {
      const p = (t - 0.42) / 0.3;
      x = R - p * (R - L);
      y = B;
    } else {
      const p = (t - 0.72) / 0.28;
      x = L;
      y = B - p * (B - T);
    }

    return { left: x, top: y };
  }

  function hpPercent(cbt) {
    const max = Number(cbt?.maxHp) || 0;
    const hp = Number(cbt?.hp) || 0;
    if (max <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((hp / max) * 100)));
  }

  // Рисует токены в host (кроме слоя стрелок, который переиспользуем).
  // Возвращает карту cbtId → {left, top} в процентах — для стрелок.
  function renderTokens(host, battle) {
    if (!host) return {};
    host.querySelectorAll('.bv-token').forEach((el) => el.remove());

    const combatants = [...(battle?.combatants || [])]
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const targets = battle?.targets || {};
    const targetedIds = new Set(Object.values(targets));
    const attackerIds = new Set(Object.keys(targets).filter((a) => targets[a]));

    const positions = {};
    combatants.forEach((cbt, index) => {
      const pos = seatPosition(index, combatants.length);
      positions[cbt.id] = pos;

      const el = document.createElement('div');
      el.className = 'bv-token'
        + (cbt.defeated ? ' is-defeated' : '')
        + (targetedIds.has(cbt.id) ? ' is-target' : '')
        + (attackerIds.has(cbt.id) ? ' is-attacker' : '');
      el.style.left = `${pos.left}%`;
      el.style.top = `${pos.top}%`;

      const img = document.createElement('img');
      img.className = 'bv-token__portrait';
      img.alt = '';
      img.loading = 'lazy';
      img.src = portraitFor(cbt);
      img.addEventListener('error', () => { img.src = PLACEHOLDER; }, { once: true });

      const name = document.createElement('span');
      name.className = 'bv-token__name';
      name.textContent = nameFor(cbt);

      const pct = hpPercent(cbt);
      const hp = document.createElement('span');
      hp.className = 'bv-token__hp';
      hp.title = 'HP';
      const fill = document.createElement('span');
      fill.className = `bv-token__hp-fill${pct <= 30 ? ' is-low' : ''}`;
      fill.style.width = `${pct}%`;
      const text = document.createElement('span');
      text.className = 'bv-token__hp-text';
      text.textContent = `${Number(cbt.hp) || 0}/${Number(cbt.maxHp) || 0}`;
      hp.append(fill, text);

      el.append(img, name, hp);
      host.appendChild(el);
    });

    return positions;
  }

  // Стрелки «атакующий → цель» поверх токенов. Рисуем в локальных пикселях host
  // (те же проценты, что и токены) — как в gm.js drawBattleArrows.
  function drawArrows(host, battle, positions) {
    if (!host) return;
    let svg = host.querySelector('.bv-arrows');
    const targets = battle?.targets || {};
    const pairs = Object.entries(targets)
      .filter(([a, t]) => positions[a] && positions[t]);

    if (!battle?.active || !pairs.length) {
      if (svg) svg.remove();
      return;
    }

    const W = host.clientWidth;
    const H = host.clientHeight;
    if (!W || !H) return;

    if (!svg) {
      svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('class', 'bv-arrows');
    }
    host.appendChild(svg); // держим слой поверх токенов
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    const R = 40; // радиус портрета + зазор
    const HEAD = 13;
    const parts = pairs.map(([a, t]) => {
      const from = positions[a];
      const to = positions[t];
      const sx = (from.left / 100) * W;
      const sy = (from.top / 100) * H;
      const ex = (to.left / 100) * W;
      const ey = (to.top / 100) * H;
      const dx = ex - sx;
      const dy = ey - sy;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const x1 = sx + ux * R;
      const y1 = sy + uy * R;
      const tipX = ex - ux * R;
      const tipY = ey - uy * R;
      const baseX = tipX - ux * HEAD;
      const baseY = tipY - uy * HEAD;
      const nx = -uy;
      const ny = ux;
      const head = `${tipX},${tipY} ${baseX + nx * (HEAD * 0.55)},${baseY + ny * (HEAD * 0.55)} `
        + `${baseX - nx * (HEAD * 0.55)},${baseY - ny * (HEAD * 0.55)}`;
      return `<line class="bv-arrow__line" x1="${x1}" y1="${y1}" x2="${baseX}" y2="${baseY}"/>`
        + `<polygon class="bv-arrow__head" points="${head}"/>`;
    });
    svg.innerHTML = parts.join('');
  }

  // Полный перерендер: токены + стрелки. Возвращает карту позиций.
  function render(host, battle) {
    const positions = renderTokens(host, battle);
    drawArrows(host, battle, positions);
    return positions;
  }

  return { seatPosition, hpPercent, renderTokens, drawArrows, render };
})();

Object.assign(window, { GobBattleView });
