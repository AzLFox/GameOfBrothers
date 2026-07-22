const state = {
  groups: [],
  activeGroup: null,
  selectedCharId: '',
  draftItemExtras: null,
};

const GM_SLOT_LABELS = {
  armor: 'Доспех',
  helmet: 'Шлем',
  boots: 'Сапоги',
  bracers: 'Наручи',
  rightHand: 'Правая рука',
  leftHand: 'Левая рука',
};

const GM_CATALOG_MOVE_MIME = 'application/x-gob-gm-catalog-move';

const createItemForm = {
  classId: null,
  tier: 1,
  mods: {},
  folderId: null,
};

function portraitFor(member) {
  if (member?.portrait) return member.portrait;
  return '/img/char-placeholder.png';
}

function nameFor(member) {
  const name = String(member?.name ?? '').trim();
  return name || 'Без имени';
}

function seatPosition(index, total) {
  if (total <= 0) return { left: '50%', top: '50%' };

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

  return { left: `${x}%`, top: `${y}%` };
}

function showPicker() {
  document.getElementById('gm-picker-panel').hidden = false;
  document.getElementById('gm-desk').hidden = true;
  document.getElementById('gm-page-title').textContent = 'Стол мастера';
}

function showTable() {
  document.getElementById('gm-picker-panel').hidden = true;
  document.getElementById('gm-desk').hidden = false;
  document.getElementById('gm-page-title').textContent = state.activeGroup?.name || 'Игровой стол';
}

function renderGroupList() {
  const list = document.getElementById('gm-group-list');
  const empty = document.getElementById('gm-group-empty');
  list.innerHTML = '';

  if (!state.groups.length) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  state.groups.forEach((group) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'gm-group-card';
    card.innerHTML = `
      <span class="gm-group-card__name">${group.name || 'Без названия'}</span>
      <span class="gm-group-card__meta">${group.memberCount || 0} героев</span>
      ${group.isActiveGm ? '<span class="gm-group-card__badge">Ваш стол</span>' : ''}
    `;
    card.addEventListener('click', () => selectGroup(group.id));
    list.appendChild(card);
  });
}

function renderTable() {
  const group = state.activeGroup;
  if (!group) return;

  document.getElementById('gm-active-group-name').textContent = group.name || 'Группа';
  document.getElementById('gm-active-group-meta').textContent =
    `${(group.members || []).length} героев за столом`;

  const seatsHost = document.getElementById('gm-table-seats');
  seatsHost.innerHTML = '';
  const members = group.members || [];

  members.forEach((member, index) => {
    const pos = seatPosition(index, members.length);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `gm-seat${state.selectedCharId === member.charId ? ' is-selected' : ''}`;
    btn.style.left = pos.left;
    btn.style.top = pos.top;
    btn.innerHTML = `
      <img class="gm-seat__portrait" src="${portraitFor(member)}" alt="">
      <span class="gm-seat__name">${nameFor(member)}</span>
    `;
    btn.addEventListener('click', () => selectSeat(member));
    seatsHost.appendChild(btn);
  });

  updateComposePanel();
}

function selectSeat(member) {
  state.selectedCharId = member?.charId || '';
  renderTable();
}

function selectedMember() {
  return (state.activeGroup?.members || []).find((m) => m.charId === state.selectedCharId) || null;
}

let lastComposeCharId = '';

function updateComposePanel({ clearFeedback = false } = {}) {
  const member = selectedMember();
  const hasMember = !!member;
  const memberLabel = hasMember ? `Кому: ${nameFor(member)}` : 'Выберите героя за столом';
  const charChanged = state.selectedCharId !== lastComposeCharId;
  if (charChanged) {
    lastComposeCharId = state.selectedCharId;
    clearFeedback = true;
  }

  const targetEl = document.getElementById('gm-compose-target');
  const bodyEl = document.getElementById('gm-compose-body');
  const sendBtn = document.getElementById('gm-compose-send');

  const itemTargetEl = document.getElementById('gm-item-target');
  const itemNameEl = document.getElementById('gm-item-name');
  const itemDescEl = document.getElementById('gm-item-desc');
  const itemNoteEl = document.getElementById('gm-item-note');
  const itemSendBtn = document.getElementById('gm-item-send');

  if (clearFeedback) {
    document.getElementById('gm-compose-ok')?.classList.add('hidden');
    document.getElementById('gm-compose-error')?.classList.add('hidden');
    document.getElementById('gm-item-ok')?.classList.add('hidden');
    document.getElementById('gm-item-error')?.classList.add('hidden');
  }

  if (targetEl) targetEl.textContent = memberLabel;
  if (itemTargetEl) itemTargetEl.textContent = memberLabel;

  // Мастер открывает лист героя своей группы и правит его как владелец.
  const sheetLink = document.getElementById('gm-open-sheet');
  if (sheetLink) {
    sheetLink.hidden = !hasMember;
    if (hasMember) {
      sheetLink.href = `/character?id=${encodeURIComponent(member.charId)}`;
    }
  }

  if (!hasMember) {
    if (bodyEl) {
      bodyEl.value = '';
      bodyEl.disabled = true;
    }
    if (sendBtn) sendBtn.disabled = true;
    if (itemNameEl) {
      itemNameEl.value = '';
      itemNameEl.disabled = true;
    }
    if (itemDescEl) itemDescEl.disabled = true;
    if (itemNoteEl) itemNoteEl.disabled = true;
    if (itemSendBtn) itemSendBtn.disabled = true;
    document.getElementById('gm-item-dropzone')?.classList.remove('has-item');
    return;
  }

  if (bodyEl) bodyEl.disabled = false;
  if (sendBtn) sendBtn.disabled = !bodyEl?.value.trim();
  if (itemNameEl) itemNameEl.disabled = false;
  if (itemDescEl) itemDescEl.disabled = false;
  if (itemNoteEl) itemNoteEl.disabled = false;
  if (itemSendBtn) itemSendBtn.disabled = !itemNameEl?.value.trim();
}

function showComposeFeedback(kind, text, isError = false) {
  const okId = kind === 'item' ? 'gm-item-ok' : 'gm-compose-ok';
  const errId = kind === 'item' ? 'gm-item-error' : 'gm-compose-error';
  const okEl = document.getElementById(okId);
  const errEl = document.getElementById(errId);
  okEl?.classList.add('hidden');
  errEl?.classList.add('hidden');
  if (isError) {
    if (errEl) {
      errEl.textContent = text;
      errEl.classList.remove('hidden');
    }
    return;
  }
  if (okEl) {
    okEl.textContent = text;
    okEl.classList.remove('hidden');
    window.setTimeout(() => okEl.classList.add('hidden'), 2600);
  }
}

const GM_ITEM_MIME = 'application/x-gob-gm-item';

function getAllItemClasses() {
  const catalog = window.ItemCatalog;
  if (!catalog?.SLOT_CLASSES) return [];
  const seen = new Set();
  const list = [];
  Object.entries(catalog.SLOT_CLASSES).forEach(([slotKey, classes]) => {
    (classes || []).forEach((cls) => {
      if (seen.has(cls.id)) return;
      seen.add(cls.id);
      list.push({
        slotKey,
        slotLabel: GM_SLOT_LABELS[slotKey] || slotKey,
        ...cls,
      });
    });
  });
  return list;
}

function findGmItemClass(classId) {
  if (!classId) return null;
  return getAllItemClasses().find((cls) => cls.id === classId) || null;
}

function gmClassDefaults(cls, tier) {
  return { ...(cls?.tiers?.[tier] || {}) };
}

function iconForCatalogItem(item) {
  if (item?.icon) return item.icon;
  const cls = findGmItemClass(item?.classId);
  const fam = cls && window.ItemCatalog?.FAMILIES?.[cls.family];
  return fam?.icon || '📦';
}

function formatModValue(modKey, value) {
  const def = window.ItemCatalog?.MODIFIERS?.[modKey];
  if (!def) return String(value ?? '');
  if (def.type === 'flag') return value ? 'да' : 'нет';
  if (def.type === 'dice') return String(value ?? '');
  const num = Number(value) || 0;
  if (window.ItemCatalog?.REDUCTION_MODS?.includes(modKey)) return `−${num}`;
  if (window.ItemCatalog?.PLAIN_MODS?.includes(modKey)) return String(num);
  return num > 0 ? `+${num}` : String(num);
}

function itemClassSummary(item) {
  const cls = findGmItemClass(item?.classId);
  if (!cls) return '';
  const tier = item.tier || 1;
  const mods = item.mods || gmClassDefaults(cls, tier);
  const parts = (cls.mods || [])
    .map((modKey) => {
      const def = window.ItemCatalog?.MODIFIERS?.[modKey];
      if (!def) return '';
      return `${def.label}: ${formatModValue(modKey, mods[modKey])}`;
    })
    .filter(Boolean);
  return `${cls.label} · Т${tier}${parts.length ? ` · ${parts.join(', ')}` : ''}`;
}

function catalogStore() {
  return window.GMCatalogStore;
}

function getCatalogPresets() {
  return typeof GM_ITEM_PRESETS !== 'undefined' ? GM_ITEM_PRESETS : [];
}

function catalogItemId(item) {
  return item?.id || item?.name || '';
}

function populateFolderSelect(selectEl, selectedId) {
  if (!selectEl || !catalogStore()) return;
  const store = catalogStore();
  const current = selectedId || store.UNTAGGED_ID;
  selectEl.innerHTML = '';
  store.flattenFoldersForSelect().forEach(({ folder, depth }) => {
    const opt = document.createElement('option');
    opt.value = folder.id;
    opt.textContent = `${'  '.repeat(depth)}${depth ? '↳ ' : ''}${folder.name}`;
    if (folder.id === current) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

function loadCustomItems() {
  return catalogStore()?.load().customItems || [];
}

function saveCustomItems(items) {
  if (!catalogStore()) return;
  catalogStore().load().customItems = Array.isArray(items) ? items : [];
  catalogStore().save();
}

function buildItemPayload(item) {
  const payload = {
    name: String(item.name || '').trim(),
    desc: String(item.desc ?? '').trim(),
  };
  if (item.classId) {
    payload.classId = item.classId;
    payload.tier = item.tier || 1;
    payload.mods = { ...(item.mods || {}) };
  }
  return payload;
}

function setDraftItemExtras(extras) {
  if (!extras?.classId) {
    state.draftItemExtras = null;
  } else {
    state.draftItemExtras = {
      classId: extras.classId,
      tier: extras.tier || 1,
      mods: { ...(extras.mods || {}) },
    };
  }
  updateItemClassPreview();
}

function updateItemClassPreview() {
  const preview = document.getElementById('gm-item-class-preview');
  if (!preview) return;
  const summary = state.draftItemExtras
    ? itemClassSummary(state.draftItemExtras)
    : '';
  preview.textContent = summary;
  preview.classList.toggle('hidden', !summary);
  preview.hidden = !summary;
}

function applyPresetItem(item) {
  const itemNameEl = document.getElementById('gm-item-name');
  const itemDescEl = document.getElementById('gm-item-desc');
  const dropzone = document.getElementById('gm-item-dropzone');
  if (!item?.name || !itemNameEl || !itemDescEl) return;

  switchComposeTab('item');
  itemNameEl.value = String(item.name).trim();
  itemDescEl.value = String(item.desc ?? '').trim();
  if (item.classId) {
    setDraftItemExtras({
      classId: item.classId,
      tier: item.tier || 1,
      mods: item.mods || gmClassDefaults(findGmItemClass(item.classId), item.tier || 1),
    });
  } else {
    setDraftItemExtras(null);
  }
  updateComposePanel();

  if (dropzone) {
    dropzone.classList.add('is-filled', 'has-item');
    window.setTimeout(() => dropzone.classList.remove('is-filled'), 900);
  }
}

function appendCatalogCard(host, preset) {
  const itemId = catalogItemId(preset);
  const card = document.createElement('button');
  card.type = 'button';
  card.className = `gm-catalog__item${preset.custom ? ' gm-catalog__item--custom' : ''}`;
  card.draggable = true;
  card.dataset.itemId = itemId;
  if (preset.id) card.dataset.presetId = preset.id;
  const classSummary = itemClassSummary(preset);
  card.innerHTML = `
    <span class="gm-catalog__icon" aria-hidden="true">${iconForCatalogItem(preset)}</span>
    <span class="gm-catalog__body">
      <span class="gm-catalog__name"></span>
      <span class="gm-catalog__desc"></span>
      ${classSummary ? '<span class="gm-catalog__class"></span>' : ''}
    </span>
  `;
  card.querySelector('.gm-catalog__name').textContent = preset.name;
  card.querySelector('.gm-catalog__desc').textContent = preset.desc || '';
  const classEl = card.querySelector('.gm-catalog__class');
  if (classEl) classEl.textContent = classSummary;

  const payload = buildItemPayload(preset);
  card.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData(GM_ITEM_MIME, JSON.stringify(payload));
    e.dataTransfer.setData(GM_CATALOG_MOVE_MIME, itemId);
    e.dataTransfer.setData('text/plain', preset.name);
    e.dataTransfer.effectAllowed = 'copyMove';
    card.classList.add('is-dragging');
  });

  card.addEventListener('dragend', () => {
    card.classList.remove('is-dragging');
    document.querySelectorAll('.gm-catalog__folder.is-drop-target').forEach((el) => {
      el.classList.remove('is-drop-target');
    });
  });

  card.addEventListener('click', () => {
    applyPresetItem(preset);
  });

  host.appendChild(card);
}

function bindFolderDropTarget(row, folderId) {
  row.addEventListener('dragover', (e) => {
    if (!e.dataTransfer.types.includes(GM_CATALOG_MOVE_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    row.classList.add('is-drop-target');
  });

  row.addEventListener('dragleave', (e) => {
    if (!row.contains(e.relatedTarget)) row.classList.remove('is-drop-target');
  });

  row.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    row.classList.remove('is-drop-target');
    const itemId = e.dataTransfer.getData(GM_CATALOG_MOVE_MIME);
    if (!itemId || !catalogStore()) return;
    catalogStore().setItemFolder(itemId, folderId);
    renderItemCatalog();
  });
}

function createFolderRow(folder, depth) {
  const store = catalogStore();
  const expanded = store?.isExpanded(folder.id);
  const itemCount = store?.getItemsInFolder(folder.id, getCatalogPresets()).length || 0;
  const childCount = store?.getChildFolders(folder.id).length || 0;

  const row = document.createElement('div');
  row.className = 'gm-catalog__folder';
  row.dataset.folderId = folder.id;
  row.style.setProperty('--depth', String(depth));

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'gm-catalog__folder-toggle';
  toggle.setAttribute('aria-expanded', String(!!expanded));
  toggle.setAttribute('aria-label', expanded ? 'Свернуть папку' : 'Развернуть папку');
  toggle.textContent = expanded ? '▾' : '▸';

  const icon = document.createElement('span');
  icon.className = 'gm-catalog__folder-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '📁';

  const name = document.createElement('span');
  name.className = 'gm-catalog__folder-name';
  name.textContent = folder.name;

  const meta = document.createElement('span');
  meta.className = 'gm-catalog__folder-meta';
  const parts = [];
  if (itemCount) parts.push(`${itemCount} предм.`);
  if (childCount) parts.push(`${childCount} пап.`);
  meta.textContent = parts.join(' · ');

  row.appendChild(toggle);
  row.appendChild(icon);
  row.appendChild(name);
  row.appendChild(meta);

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    store.setExpanded(folder.id, !store.isExpanded(folder.id));
    renderItemCatalog();
  });

  bindFolderDropTarget(row, folder.id);
  return row;
}

function renderFolderBranch(host, parentId, depth) {
  const store = catalogStore();
  if (!store) return;

  store.getChildFolders(parentId).forEach((folder) => {
    host.appendChild(createFolderRow(folder, depth));

    if (!store.isExpanded(folder.id)) return;

    const body = document.createElement('div');
    body.className = 'gm-catalog__folder-body';
    body.style.setProperty('--depth', String(depth + 1));

    renderFolderBranch(body, folder.id, depth + 1);
    store.getItemsInFolder(folder.id, getCatalogPresets()).forEach((item) => {
      appendCatalogCard(body, item);
    });

    host.appendChild(body);
  });
}

function renderItemCatalog() {
  const list = document.getElementById('gm-catalog-list');
  if (!list || !catalogStore()) return;

  list.innerHTML = '';
  renderFolderBranch(list, null, 0);
}

function populateCreateFolderSelect() {
  populateFolderSelect(
    document.getElementById('gm-create-folder'),
    createItemForm.folderId || catalogStore()?.UNTAGGED_ID,
  );
}

function populateParentFolderSelect(selectEl, selectedId) {
  if (!selectEl || !catalogStore()) return;
  const store = catalogStore();
  selectEl.innerHTML = '';
  const rootOpt = document.createElement('option');
  rootOpt.value = '';
  rootOpt.textContent = '— Корень каталога';
  if (!selectedId) rootOpt.selected = true;
  selectEl.appendChild(rootOpt);

  store.flattenFoldersForSelect().forEach(({ folder, depth }) => {
    const opt = document.createElement('option');
    opt.value = folder.id;
    opt.textContent = `${'  '.repeat(depth)}${depth ? '↳ ' : ''}${folder.name}`;
    if (folder.id === selectedId) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

function populateCreateClassSelect() {
  const select = document.getElementById('gm-create-class');
  if (!select) return;

  const current = select.value;
  select.innerHTML = '<option value="">— Без класса</option>';

  const bySlot = {};
  getAllItemClasses().forEach((cls) => {
    if (!bySlot[cls.slotKey]) bySlot[cls.slotKey] = [];
    bySlot[cls.slotKey].push(cls);
  });

  Object.entries(bySlot).forEach(([slotKey, classes]) => {
    const group = document.createElement('optgroup');
    group.label = GM_SLOT_LABELS[slotKey] || slotKey;
    classes.forEach((cls) => {
      const fam = window.ItemCatalog?.FAMILIES?.[cls.family];
      const opt = document.createElement('option');
      opt.value = cls.id;
      const icon = fam?.icon ? `${fam.icon} ` : '';
      opt.textContent = `${icon}${cls.label}`;
      group.appendChild(opt);
    });
    select.appendChild(group);
  });

  if (current && findGmItemClass(current)) select.value = current;
}

function renderCreateTierPicker() {
  const picker = document.getElementById('gm-create-tier-picker');
  if (!picker) return;
  picker.innerHTML = '';
  [1, 2, 3, 4].forEach((tier) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `gm-create-tier-btn${createItemForm.tier === tier ? ' is-selected' : ''}`;
    btn.textContent = `Т${tier}`;
    btn.addEventListener('click', () => {
      createItemForm.tier = tier;
      const cls = findGmItemClass(createItemForm.classId);
      createItemForm.mods = gmClassDefaults(cls, tier);
      renderCreateTierPicker();
      renderCreateModFields();
    });
    picker.appendChild(btn);
  });
}

function renderCreateModFields() {
  const host = document.getElementById('gm-create-mods');
  if (!host) return;
  host.innerHTML = '';
  const cls = findGmItemClass(createItemForm.classId);
  if (!cls) return;

  cls.mods.forEach((modKey) => {
    const def = window.ItemCatalog?.MODIFIERS?.[modKey];
    if (!def) return;
    const cur = createItemForm.mods[modKey];
    const row = document.createElement('div');
    row.className = 'gm-create-mod-field';

    const label = document.createElement('label');
    label.className = 'gm-create-mod-label';
    label.textContent = def.label;

    let input;
    if (def.type === 'flag') {
      input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = !!cur;
      input.addEventListener('change', () => {
        createItemForm.mods[modKey] = input.checked;
      });
    } else if (def.type === 'dice') {
      input = document.createElement('input');
      input.type = 'text';
      input.className = 'gm-create-mod-input';
      input.value = cur ?? '';
      input.spellcheck = false;
      input.addEventListener('input', () => {
        createItemForm.mods[modKey] = input.value;
      });
    } else {
      input = document.createElement('input');
      input.type = 'number';
      input.className = 'gm-create-mod-input';
      input.value = cur ?? 0;
      input.addEventListener('input', () => {
        createItemForm.mods[modKey] = parseInt(input.value, 10) || 0;
      });
    }

    row.appendChild(label);
    row.appendChild(input);
    host.appendChild(row);
  });
}

function renderCreateClassSection() {
  const section = document.getElementById('gm-create-class-section');
  const hasClass = !!createItemForm.classId;
  section?.classList.toggle('hidden', !hasClass);
  if (section) section.hidden = !hasClass;
  if (!hasClass) return;
  renderCreateTierPicker();
  renderCreateModFields();
}

function resetCreateItemForm() {
  document.getElementById('gm-create-name').value = '';
  document.getElementById('gm-create-desc').value = '';
  const select = document.getElementById('gm-create-class');
  if (select) select.value = '';
  createItemForm.classId = null;
  createItemForm.tier = 1;
  createItemForm.mods = {};
  createItemForm.folderId = catalogStore()?.UNTAGGED_ID || null;
  populateCreateFolderSelect();
  renderCreateClassSection();
  const errEl = document.getElementById('gm-item-modal-error');
  errEl?.classList.add('hidden');
  if (errEl) errEl.textContent = '';
}

function openCreateItemModal() {
  const modal = document.getElementById('gm-item-modal');
  if (!modal) return;
  populateCreateClassSelect();
  resetCreateItemForm();
  modal.classList.remove('hidden');
  modal.hidden = false;
  document.getElementById('gm-create-name')?.focus();
}

function closeCreateItemModal() {
  const modal = document.getElementById('gm-item-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.hidden = true;
}

function saveCreateItem() {
  const nameEl = document.getElementById('gm-create-name');
  const descEl = document.getElementById('gm-create-desc');
  const errEl = document.getElementById('gm-item-modal-error');
  const name = nameEl?.value.trim() || '';
  if (!name) {
    if (errEl) {
      errEl.textContent = 'Укажите название предмета.';
      errEl.classList.remove('hidden');
    }
    nameEl?.focus();
    return;
  }

  const item = {
    id: `custom-${Date.now()}`,
    custom: true,
    name,
    desc: descEl?.value.trim() || '',
  };
  if (createItemForm.classId) {
    item.classId = createItemForm.classId;
    item.tier = createItemForm.tier;
    item.mods = { ...createItemForm.mods };
  }

  const folderId = document.getElementById('gm-create-folder')?.value
    || catalogStore()?.UNTAGGED_ID;
  if (catalogStore()) {
    catalogStore().addCustomItemToFolder(item, folderId);
  } else {
    const custom = loadCustomItems();
    custom.unshift(item);
    saveCustomItems(custom);
  }
  renderItemCatalog();
  closeCreateItemModal();
  applyPresetItem(item);
}

function openCreateFolderModal() {
  const modal = document.getElementById('gm-folder-modal');
  if (!modal) return;
  document.getElementById('gm-folder-name').value = '';
  populateParentFolderSelect(document.getElementById('gm-folder-parent'), '');
  const errEl = document.getElementById('gm-folder-modal-error');
  errEl?.classList.add('hidden');
  if (errEl) errEl.textContent = '';
  modal.classList.remove('hidden');
  modal.hidden = false;
  document.getElementById('gm-folder-name')?.focus();
}

function closeCreateFolderModal() {
  const modal = document.getElementById('gm-folder-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.hidden = true;
}

function saveCreateFolder() {
  const nameEl = document.getElementById('gm-folder-name');
  const parentEl = document.getElementById('gm-folder-parent');
  const errEl = document.getElementById('gm-folder-modal-error');
  const name = nameEl?.value.trim() || '';
  if (!name) {
    if (errEl) {
      errEl.textContent = 'Укажите название папки.';
      errEl.classList.remove('hidden');
    }
    nameEl?.focus();
    return;
  }
  const parentId = parentEl?.value || null;
  const folder = catalogStore()?.addFolder(name, parentId);
  if (!folder) {
    if (errEl) {
      errEl.textContent = 'Не удалось создать папку.';
      errEl.classList.remove('hidden');
    }
    return;
  }
  renderItemCatalog();
  closeCreateFolderModal();
}

function initCreateItemModal() {
  document.getElementById('gm-catalog-create')?.addEventListener('click', openCreateItemModal);
  document.getElementById('gm-catalog-create-folder')?.addEventListener('click', openCreateFolderModal);
  document.getElementById('gm-item-modal-cancel')?.addEventListener('click', closeCreateItemModal);
  document.getElementById('gm-item-modal-backdrop')?.addEventListener('click', closeCreateItemModal);
  document.getElementById('gm-item-modal-save')?.addEventListener('click', saveCreateItem);
  document.getElementById('gm-folder-modal-cancel')?.addEventListener('click', closeCreateFolderModal);
  document.getElementById('gm-folder-modal-backdrop')?.addEventListener('click', closeCreateFolderModal);
  document.getElementById('gm-folder-modal-save')?.addEventListener('click', saveCreateFolder);

  const classSelect = document.getElementById('gm-create-class');
  classSelect?.addEventListener('change', () => {
    const classId = classSelect.value || null;
    createItemForm.classId = classId;
    createItemForm.tier = 1;
    const cls = findGmItemClass(classId);
    createItemForm.mods = cls ? gmClassDefaults(cls, 1) : {};
    renderCreateClassSection();
  });

  document.getElementById('gm-create-folder')?.addEventListener('change', (e) => {
    createItemForm.folderId = e.target.value || catalogStore()?.UNTAGGED_ID;
  });

  document.addEventListener('keydown', (e) => {
    const itemModal = document.getElementById('gm-item-modal');
    const folderModal = document.getElementById('gm-folder-modal');
    if (itemModal && !itemModal.hidden && e.key === 'Escape') closeCreateItemModal();
    if (folderModal && !folderModal.hidden && e.key === 'Escape') closeCreateFolderModal();
  });
}

function initCatalogDock() {
  const dock = document.getElementById('gm-catalog-dock');
  const toggle = document.getElementById('gm-catalog-toggle');
  const KEY = 'gob-gm-catalog-collapsed';
  if (!dock || !toggle) return;

  const setCollapsed = (collapsed) => {
    dock.classList.toggle('is-collapsed', collapsed);
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.title = collapsed ? 'Развернуть каталог' : 'Свернуть каталог';
    try {
      sessionStorage.setItem(KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  let collapsed = false;
  try {
    collapsed = sessionStorage.getItem(KEY) === '1';
  } catch {
    /* ignore */
  }
  setCollapsed(collapsed);

  toggle.addEventListener('click', () => {
    setCollapsed(!dock.classList.contains('is-collapsed'));
  });
}

function initItemDragAndDrop() {
  const dropzone = document.getElementById('gm-item-dropzone');
  const itemNameEl = document.getElementById('gm-item-name');
  const itemDescEl = document.getElementById('gm-item-desc');
  if (!dropzone) return;

  const markHasItem = () => {
    const hasItem = !!itemNameEl?.value.trim() || !!itemDescEl?.value.trim();
    dropzone.classList.toggle('has-item', hasItem);
  };

  itemNameEl?.addEventListener('input', markHasItem);
  itemDescEl?.addEventListener('input', markHasItem);

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    dropzone.classList.add('is-dragover');
  });

  dropzone.addEventListener('dragleave', (e) => {
    if (!dropzone.contains(e.relatedTarget)) {
      dropzone.classList.remove('is-dragover');
    }
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('is-dragover');

    let item = null;
    const raw = e.dataTransfer.getData(GM_ITEM_MIME);
    if (raw) {
      try {
        item = JSON.parse(raw);
      } catch {
        /* ignore */
      }
    }
    if (!item?.name) {
      const name = e.dataTransfer.getData('text/plain')?.trim();
      if (name) item = { name, desc: '' };
    }
    if (item?.name) {
      applyPresetItem(item);
      markHasItem();
    }
  });

  markHasItem();
}

function buildComposeItemPayload(name, desc) {
  const payload = { name, desc };
  if (state.draftItemExtras?.classId) {
    payload.classId = state.draftItemExtras.classId;
    payload.tier = state.draftItemExtras.tier || 1;
    payload.mods = { ...state.draftItemExtras.mods };
  }
  return payload;
}

function switchComposeTab(tab) {
  document.querySelectorAll('.gm-compose__tab').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.tab === tab);
  });
  const messagePanel = document.getElementById('gm-compose-message');
  const itemPanel = document.getElementById('gm-compose-item');
  const showMessage = tab === 'message';
  if (messagePanel) {
    messagePanel.classList.toggle('hidden', !showMessage);
    messagePanel.hidden = !showMessage;
  }
  if (itemPanel) {
    itemPanel.classList.toggle('hidden', showMessage);
    itemPanel.hidden = showMessage;
  }
}

async function selectGroup(groupId) {
  const errEl = document.getElementById('gm-picker-error');
  errEl.hidden = true;

  const result = await GobGM.selectGroup(groupId);
  if (!result.ok) {
    errEl.textContent = result.error === 'Группа ведётся другим мастером'
      ? 'Эту группу уже ведёт другой мастер.'
      : 'Не удалось открыть группу.';
    errEl.hidden = false;
    return;
  }

  state.activeGroup = result.group;
  state.selectedCharId = '';
  showTable();
  renderTable();
}

async function loadGroups() {
  const errEl = document.getElementById('gm-picker-error');
  errEl.hidden = true;
  try {
    state.groups = await GobGM.loadGroups();
    renderGroupList();
  } catch (err) {
    errEl.textContent = err.message || 'Не удалось загрузить группы';
    errEl.hidden = false;
  }
}

async function restoreSession() {
  try {
    const session = await GobGM.loadSession();
    if (session?.activeGroupId && session.group) {
      state.activeGroup = session.group;
      state.selectedCharId = '';
      showTable();
      renderTable();
      return true;
    }
  } catch {
    /* show picker */
  }
  return false;
}

async function init() {
  const user = await GobAuth.fetchMe();
  if (!user) {
    GobAuth.redirectIfGuest('/gm');
    return;
  }
  if (user.role !== 'gamemaster') {
    window.location.href = '/';
    return;
  }

  document.getElementById('gm-username').textContent = user.username;

  document.getElementById('gm-logout')?.addEventListener('click', async () => {
    await GobAuth.logout();
    window.location.href = '/login';
  });

  document.getElementById('gm-change-group')?.addEventListener('click', async () => {
    await GobGM.selectGroup('');
    state.activeGroup = null;
    state.selectedCharId = '';
    showPicker();
    await loadGroups();
  });

  document.querySelectorAll('.gm-compose__tab').forEach((btn) => {
    btn.addEventListener('click', () => switchComposeTab(btn.dataset.tab || 'message'));
  });

  const bodyEl = document.getElementById('gm-compose-body');
  const sendBtn = document.getElementById('gm-compose-send');
  const itemNameEl = document.getElementById('gm-item-name');
  const itemDescEl = document.getElementById('gm-item-desc');
  const itemNoteEl = document.getElementById('gm-item-note');
  const itemSendBtn = document.getElementById('gm-item-send');

  bodyEl?.addEventListener('input', updateComposePanel);
  itemNameEl?.addEventListener('input', updateComposePanel);

  sendBtn?.addEventListener('click', () => sendTextMessage());
  itemSendBtn?.addEventListener('click', () => sendItemGift());

  itemNameEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendItemGift();
    }
  });

  async function sendTextMessage() {
    const okEl = document.getElementById('gm-compose-ok');
    const errEl = document.getElementById('gm-compose-error');
    okEl?.classList.add('hidden');
    errEl?.classList.add('hidden');

    if (!state.activeGroup?.id || !state.selectedCharId) return;

    sendBtn.disabled = true;
    try {
      const result = await GobGM.sendMessage(
        state.activeGroup.id,
        state.selectedCharId,
        bodyEl.value.trim(),
      );
      if (!result.ok) {
        showComposeFeedback('message', result.error || 'Не удалось отправить', true);
        return;
      }
      bodyEl.value = '';
      updateComposePanel();
      showComposeFeedback('message', 'Сообщение отправлено.');
    } catch (err) {
      showComposeFeedback('message', err.message || 'Не удалось отправить', true);
    } finally {
      sendBtn.disabled = !bodyEl.value.trim();
    }
  }

  async function sendItemGift() {
    if (!state.activeGroup?.id || !state.selectedCharId) {
      showComposeFeedback('item', 'Сначала выберите героя за столом.', true);
      return;
    }

    const itemName = itemNameEl.value.trim();
    if (!itemName) {
      showComposeFeedback('item', 'Укажите название предмета.', true);
      return;
    }

    itemSendBtn.disabled = true;
    try {
      const result = await GobGM.sendItemGift(
        state.activeGroup.id,
        state.selectedCharId,
        buildComposeItemPayload(itemName, itemDescEl.value.trim()),
        itemNoteEl.value.trim(),
      );
      if (!result.ok) {
        showComposeFeedback('item', result.error || 'Не удалось отправить предмет', true);
        return;
      }
      itemNameEl.value = '';
      itemDescEl.value = '';
      itemNoteEl.value = '';
      setDraftItemExtras(null);
      document.getElementById('gm-item-dropzone')?.classList.remove('has-item');
      updateComposePanel();
      showComposeFeedback('item', `Предмет «${itemName}» отправлен.`);
    } catch (err) {
      showComposeFeedback('item', err.message || 'Не удалось отправить предмет', true);
    } finally {
      itemSendBtn.disabled = !itemNameEl.value.trim();
    }
  }

  switchComposeTab('message');
  catalogStore()?.load();
  renderItemCatalog();
  initCatalogDock();
  initCreateItemModal();
  initItemDragAndDrop();

  const hasSession = await restoreSession();
  await loadGroups();
  if (!hasSession) showPicker();
}

if (typeof GobGM === 'undefined' || typeof GobAuth === 'undefined' || typeof GMCatalogStore === 'undefined') {
  document.body.innerHTML = '<p style="color:#e8c97a;text-align:center;padding:40px;font-family:Cinzel,serif">Не удалось загрузить модули мастера.</p>';
} else {
  init();
}
