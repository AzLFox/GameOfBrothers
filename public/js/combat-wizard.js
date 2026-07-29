/**
 * Общий визард «получить пизды»: пошаговое списание входящего урона
 * (урон → уворот → щиты → бабл → броня → итог). Рендерит шаги в переданный
 * `<dialog>`, считает через CombatCore.computeDamageIntake, а применение
 * отдаёт наружу через `onApply(result)` — вызывающий сам меняет свой лист и
 * сохраняет. Используется листом персонажа (character.js) и боевым столом
 * мастера (gm.js). См. docs/fight-table-roadmap.md (F5).
 *
 * ctx: {
 *   els: { modal, title, step, actions },   // DOM-элементы диалога
 *   dice: number[],                          // кубики для селекта урона
 *   loadDie(): number, saveDie(die),         // персист последнего кубика
 *   aggregates: { evasion, armor, bubbleUnits, bubbleActive, shields, defCrit, hp },
 *   onApply(result),                         // применить итог к своему листу
 * }
 */
const CombatWizard = (() => {
  let w = null; // активный визард (на страницу — один диалог)

  function open(ctx) {
    const a = ctx.aggregates || {};
    const dice = ctx.dice && ctx.dice.length ? ctx.dice : [6, 12, 20, 60, 100];
    const die = (ctx.loadDie && ctx.loadDie()) || dice[0] || 6;
    w = {
      ctx,
      dice,
      index: 0,
      raw: 0,
      atkRoll: '',                 // бросок попадания атаки (один на всю атаку)
      atkCrit: false,              // крит атаки (с чужого листа — только вручную)
      die,                         // кубик броска (для крит/антикрит защитника)
      defCrit: a.defCrit || 0,     // Крит защитника — снимок при открытии
      dodge: { value: a.evasion || 0, roll: '', manual: null },
      shields: (a.shields || []).map((s) => ({ ...s, roll: '', manual: null })),
      bubble: a.bubbleActive ? { active: true, units: a.bubbleUnits || 0, roll: '' } : null,
      armor: a.armor || 0,
      hp: a.hp || 0,
      plan: [{ type: 'raw' }, { type: 'dodge' }],
    };
    w.shields.forEach((_, i) => w.plan.push({ type: 'shield', i }));
    if (w.bubble) w.plan.push({ type: 'bubble' });
    w.plan.push({ type: 'armor' }, { type: 'summary' });
    renderStep();
    ctx.els.modal?.showModal();
  }

  function close() {
    const modal = w?.ctx?.els?.modal;
    if (modal?.open) modal.close();
    w = null;
  }

  function isOpen() {
    return !!w;
  }

  // текущий вход для computeDamageIntake из введённых бросков
  function intakeInput() {
    return {
      raw: w.raw, atkRoll: w.atkRoll, atkCrit: w.atkCrit, die: w.die, defCrit: w.defCrit,
      dodge: { value: w.dodge.value, roll: w.dodge.roll, manual: w.dodge.manual },
      shields: w.shields.map((s) => ({ label: s.label, value: s.value, roll: s.roll, manual: s.manual })),
      bubble: w.bubble ? { active: w.bubble.active, units: w.bubble.units, roll: w.bubble.roll } : null,
      armor: w.armor,
    };
  }

  // шаг редьюсера, соответствующий текущему шагу плана (raw=0, дальше по порядку)
  function currentComputeStep() {
    return CombatCore.computeDamageIntake(intakeInput()).steps[w.index - 1] || null;
  }

  function renderStep() {
    if (!w) return;
    const step = w.plan[w.index];
    const host = w.ctx.els.step;
    const title = w.ctx.els.title;
    if (!host || !step) return;
    host.innerHTML = '';

    switch (step.type) {
      case 'raw':     renderRawStep(host, title); break;
      case 'dodge':   renderContestStep(host, title, w.dodge, { heading: 'Уворот', valueLabel: 'Уворот', passLabel: 'Увернулся', failLabel: 'Не увернулся' }); break;
      case 'shield':  renderContestStep(host, title, w.shields[step.i], { heading: `Щит ${w.shields[step.i].label}`, valueLabel: 'Щит', passLabel: 'Защитился', failLabel: 'Не защитился' }); break;
      case 'bubble':  renderBubbleStep(host, title); break;
      case 'armor':   renderArmorStep(host, title); break;
      case 'summary': renderSummaryStep(host, title); break;
      default: break;
    }
    renderNav(step);
  }

  function renderRawStep(host, title) {
    title.textContent = 'Сколько тебе прилетело?';
    const dieOpts = w.dice.map((n) => `<option value="${n}"${n === w.die ? ' selected' : ''}>D${n}</option>`).join('');
    host.innerHTML = `
      <p class="damage-step__hint">Урон и бросок попадания атаки (один — общий для уворота и щитов).</p>
      <label class="damage-field-label" for="damage-raw">Урон</label>
      <input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4"
             class="damage-input-big" id="damage-raw" aria-label="Входящий урон">
      <div class="damage-atk-row">
        <label class="damage-field">Кубик
          <select class="damage-select" id="damage-die" aria-label="Кубик броска">${dieOpts}</select>
        </label>
        <label class="damage-field">Бросок атаки
          <input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" class="damage-num" id="damage-atk-roll" aria-label="Бросок попадания атаки">
        </label>
        <label class="damage-field damage-field--check">Крит
          <input type="checkbox" class="damage-check-box" id="damage-atk-crit" aria-label="Крит атаки">
        </label>
      </div>
    `;
    const raw = host.querySelector('#damage-raw');
    raw.value = w.raw || '';
    raw.addEventListener('input', () => {
      const clean = raw.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 4);
      if (clean !== raw.value) raw.value = clean;
      w.raw = parseInt(clean, 10) || 0;
      if (w.nextBtn) w.nextBtn.disabled = !(w.raw > 0);
    });
    const die = host.querySelector('#damage-die');
    die.addEventListener('change', () => { w.die = parseInt(die.value, 10) || 6; w.ctx.saveDie?.(w.die); });
    const atk = host.querySelector('#damage-atk-roll');
    atk.value = w.atkRoll || '';
    atk.addEventListener('input', () => {
      const clean = atk.value.replace(/\D/g, '').slice(0, 3);
      if (clean !== atk.value) atk.value = clean;
      w.atkRoll = clean;
    });
    const crit = host.querySelector('#damage-atk-crit');
    crit.checked = !!w.atkCrit;
    crit.addEventListener('change', () => { w.atkCrit = crit.checked; });
    requestAnimationFrame(() => raw.focus());
  }

  // Встречный бросок защиты (уворот/щит) против единственного броска атаки.
  // Два способа задать исход: кнопки «прошло/не прошло» (ручной выбор) ИЛИ бросок
  // защиты — крит/антикрит защитника тогда считаются авто. Способы взаимоисключающие.
  function renderContestStep(host, title, state, opts) {
    title.textContent = opts.heading;
    const critInfo = w.atkCrit ? 'крит' : 'обычный';
    host.innerHTML = `
      <p class="damage-running" data-role="before"></p>
      <p class="damage-step__hint">Атака: бросок <strong>${w.atkRoll || '—'}</strong> на D${w.die} (${critInfo}). ${opts.valueLabel}: <strong>${state.value}</strong>.</p>
      <div class="damage-choice">
        <button type="button" class="damage-choice-btn damage-choice-btn--yes" data-choice="pass">${opts.passLabel}</button>
        <button type="button" class="damage-choice-btn damage-choice-btn--no" data-choice="fail">${opts.failLabel}</button>
      </div>
      <div class="damage-alt">
        <span class="damage-alt__rule"></span>
        <span class="damage-alt__label">или бросок защиты (D${w.die})</span>
        <span class="damage-alt__rule"></span>
      </div>
      <div class="damage-dice">
        <label>Бросок защиты
          <input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" class="damage-num" data-role="def-roll" value="${state.roll}">
        </label>
      </div>
      <p class="damage-verdict" data-role="verdict"></p>
      <p class="damage-running" data-role="after"></p>
    `;
    const rollI = host.querySelector('[data-role="def-roll"]');
    const beforeEl = host.querySelector('[data-role="before"]');
    const afterEl = host.querySelector('[data-role="after"]');
    const verdictEl = host.querySelector('[data-role="verdict"]');
    const yesBtn = host.querySelector('[data-choice="pass"]');
    const noBtn = host.querySelector('[data-choice="fail"]');
    const syncButtons = () => {
      yesBtn.classList.toggle('is-on', state.manual === 'pass');
      noBtn.classList.toggle('is-on', state.manual === 'fail');
    };
    const refresh = () => {
      const cs = currentComputeStep();
      if (!cs) return;
      beforeEl.innerHTML = `Входящий урон: <strong>${cs.before}</strong>`;
      afterEl.innerHTML = `Станет: <strong>${cs.after}</strong>`;
      verdictEl.textContent = cs.note || '';
    };
    const pick = (choice) => {
      state.manual = state.manual === choice ? null : choice;  // повторный клик снимает выбор
      if (state.manual) { state.roll = ''; rollI.value = ''; } // ручной выбор отменяет бросок
      syncButtons();
      refresh();
    };
    yesBtn.addEventListener('click', () => pick('pass'));
    noBtn.addEventListener('click', () => pick('fail'));
    rollI.addEventListener('input', () => {
      const clean = rollI.value.replace(/\D/g, '').slice(0, 3);
      if (clean !== rollI.value) rollI.value = clean;
      state.roll = clean;
      if (clean) state.manual = null;   // ввод броска отменяет ручной выбор
      syncButtons();
      refresh();
    });
    syncButtons();
    refresh();
    requestAnimationFrame(() => rollI.focus());
  }

  function renderBubbleStep(host, title) {
    title.textContent = 'Бабл держит удар';
    host.innerHTML = `
      <p class="damage-running">Бабл активен: <strong>${w.bubble.units} ед.</strong> — входящий урон 0.</p>
      <p class="damage-step__hint">Брось D10: проверка от 1 до текущих единиц. Успех (≤ единиц) → бабл держит удар, −1 ед. (не ниже 1); провал → бабл сбит (выключается).</p>
      <div class="damage-dice">
        <label>Бросок D10
          <input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" class="damage-num" data-role="bubble-roll" value="${w.bubble.roll}">
        </label>
      </div>
      <p class="damage-verdict" data-role="verdict"></p>
    `;
    const rollI = host.querySelector('[data-role="bubble-roll"]');
    const verdictEl = host.querySelector('[data-role="verdict"]');
    const refresh = () => { verdictEl.textContent = currentComputeStep()?.note || ''; };
    rollI.addEventListener('input', () => {
      let clean = rollI.value.replace(/\D/g, '').slice(0, 2);
      if (clean !== '' && parseInt(clean, 10) > 10) clean = '10';
      if (clean !== rollI.value) rollI.value = clean;
      w.bubble.roll = clean;
      refresh();
    });
    refresh();
    requestAnimationFrame(() => rollI.focus());
  }

  function renderArmorStep(host, title) {
    title.textContent = 'Плоская броня';
    const cs = currentComputeStep();
    host.innerHTML = `
      <p class="damage-running">Входящий урон: <strong>${cs?.before ?? 0}</strong></p>
      <p class="damage-step__hint">Броня поглощает <strong>−${w.armor}</strong> плоско.</p>
      <p class="damage-running">Останется: <strong>${cs?.after ?? 0}</strong></p>
    `;
  }

  function renderSummaryStep(host, title) {
    title.textContent = 'Итог';
    const result = CombatCore.computeDamageIntake(intakeInput());
    w.result = result;
    const rows = result.steps.map((s) => {
      const delta = s.after - s.before;
      const sign = delta === 0 ? '±0' : (delta > 0 ? '+' : '−') + Math.abs(delta);
      const note = s.note ? ` <span class="damage-summary__note">${s.note}</span>` : '';
      return `<li class="damage-summary__row"><span>${s.label}${note}</span><span>${sign} → ${s.after}</span></li>`;
    }).join('');
    const hp = w.hp;
    const newHp = Math.max(0, hp - result.finalDamage);
    host.innerHTML = `
      <p class="damage-running">Исходный урон: <strong>${w.raw}</strong> · атака ${w.atkCrit ? 'крит' : 'обычная'}, бросок ${w.atkRoll || '—'} (D${w.die})</p>
      <ul class="damage-summary">${rows}</ul>
      <p class="damage-summary__final">Итоговый урон: <strong>${result.finalDamage}</strong></p>
      <p class="damage-hp">HP: <strong>${hp}</strong> → <strong>${newHp}</strong></p>
    `;
  }

  function renderNav(step) {
    const host = w.ctx.els.actions;
    if (!host) return;
    host.innerHTML = '';
    w.nextBtn = null;

    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'damage-nav-btn damage-nav-btn--back';
    back.textContent = 'Назад';
    back.disabled = w.index === 0;
    back.addEventListener('click', () => { if (w.index > 0) { w.index--; renderStep(); } });
    host.appendChild(back);

    const spacer = document.createElement('span');
    spacer.className = 'damage-modal__spacer';
    host.appendChild(spacer);

    if (step.type === 'summary') {
      const apply = document.createElement('button');
      apply.type = 'button';
      apply.className = 'damage-nav-btn damage-nav-btn--apply';
      apply.textContent = 'Применить';
      apply.addEventListener('click', applyResult);
      host.appendChild(apply);
    } else {
      const next = document.createElement('button');
      next.type = 'button';
      next.className = 'damage-nav-btn damage-nav-btn--apply';
      next.textContent = 'Далее';
      if (step.type === 'raw') next.disabled = !(w.raw > 0);
      next.addEventListener('click', () => { w.index++; renderStep(); });
      host.appendChild(next);
      w.nextBtn = next;
    }
  }

  // Финал: посчитать итог, отдать наружу для применения к листу, закрыть.
  function applyResult() {
    if (!w) return;
    const result = w.result || CombatCore.computeDamageIntake(intakeInput());
    const onApply = w.ctx.onApply;
    close();
    onApply?.(result);
  }

  return { open, close, isOpen };
})();

if (typeof window !== 'undefined') Object.assign(window, { CombatWizard });
