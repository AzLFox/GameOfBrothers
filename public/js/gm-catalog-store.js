/**
 * Каталог предметов GM: папки, размещение и пользовательские предметы.
 */
(function () {
  const STORE_KEY = 'gob-gm-catalog-v1';
  const LEGACY_CUSTOM_KEY = 'gob-gm-custom-items';
  const UNTAGGED_ID = 'folder-untagged';

  const DEFAULT_FOLDERS = [
    { id: UNTAGGED_ID, name: 'Без типа', parentId: null, system: true },
    { id: 'folder-chests', name: 'Сундуки', parentId: null, system: true },
    { id: 'folder-chest-t1', name: 'Сундук Т1', parentId: 'folder-chests', system: true },
    { id: 'folder-chest-t2', name: 'Сундук Т2', parentId: 'folder-chests', system: true },
    { id: 'folder-chest-t3', name: 'Сундук Т3', parentId: 'folder-chests', system: true },
    { id: 'folder-chest-t4', name: 'Сундук Т4', parentId: 'folder-chests', system: true },
  ];

  let cache = null;

  function defaultStore() {
    return {
      folders: DEFAULT_FOLDERS.map((f) => ({ ...f })),
      placements: {},
      customItems: [],
      expanded: { [UNTAGGED_ID]: true, 'folder-chests': true },
    };
  }

  function readLegacyCustomItems() {
    try {
      const raw = sessionStorage.getItem(LEGACY_CUSTOM_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function load() {
    if (cache) return cache;
    try {
      const raw = sessionStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        cache = {
          folders: Array.isArray(parsed.folders) ? parsed.folders : defaultStore().folders,
          placements: parsed.placements && typeof parsed.placements === 'object' ? parsed.placements : {},
          customItems: Array.isArray(parsed.customItems) ? parsed.customItems : [],
          expanded: parsed.expanded && typeof parsed.expanded === 'object' ? parsed.expanded : {},
        };
      } else {
        cache = defaultStore();
        const legacy = readLegacyCustomItems();
        if (legacy.length) cache.customItems = legacy;
      }
    } catch {
      cache = defaultStore();
    }
    ensureDefaultFolders();
    return cache;
  }

  function save() {
    if (!cache) return;
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(cache));
    } catch {
      /* ignore */
    }
  }

  function ensureDefaultFolders() {
    if (!cache) return;
    DEFAULT_FOLDERS.forEach((def) => {
      if (!cache.folders.some((f) => f.id === def.id)) {
        cache.folders.push({ ...def });
      }
    });
    if (cache.expanded[UNTAGGED_ID] === undefined) cache.expanded[UNTAGGED_ID] = true;
    if (cache.expanded['folder-chests'] === undefined) cache.expanded['folder-chests'] = true;
  }

  function getFolderById(folderId) {
    return load().folders.find((f) => f.id === folderId) || null;
  }

  function getChildFolders(parentId) {
    const pid = parentId ?? null;
    return load().folders
      .filter((f) => (f.parentId ?? null) === pid)
      .sort((a, b) => {
        if (a.system && !b.system) return -1;
        if (!a.system && b.system) return 1;
        return a.name.localeCompare(b.name, 'ru');
      });
  }

  function getRootFolders() {
    return getChildFolders(null);
  }

  function getItemFolderId(itemId) {
    const placement = load().placements[itemId];
    if (placement && getFolderById(placement)) return placement;
    return UNTAGGED_ID;
  }

  function setItemFolder(itemId, folderId) {
    if (!itemId || !getFolderById(folderId)) return false;
    load().placements[itemId] = folderId;
    save();
    return true;
  }

  function getAllItems(presets) {
    const presetList = Array.isArray(presets) ? presets : [];
    return [...presetList, ...load().customItems];
  }

  function getItemsInFolder(folderId, presets) {
    return getAllItems(presets).filter((item) => {
      const id = item.id || item.name;
      return getItemFolderId(id) === folderId;
    });
  }

  function addCustomItem(item) {
    load().customItems.unshift(item);
    if (item?.id) {
      load().placements[item.id] = load().placements[item.id] || UNTAGGED_ID;
    }
    save();
  }

  function addCustomItemToFolder(item, folderId) {
    addCustomItem(item);
    if (item?.id && folderId) setItemFolder(item.id, folderId);
  }

  function addFolder(name, parentId) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return null;
    if (parentId && !getFolderById(parentId)) return null;
    const folder = {
      id: `folder-${Date.now()}`,
      name: trimmed,
      parentId: parentId || null,
      system: false,
    };
    load().folders.push(folder);
    load().expanded[folder.id] = true;
    if (parentId) load().expanded[parentId] = true;
    save();
    return folder;
  }

  function isExpanded(folderId) {
    return !!load().expanded[folderId];
  }

  function setExpanded(folderId, expanded) {
    load().expanded[folderId] = !!expanded;
    save();
  }

  function folderDepth(folderId) {
    let depth = 0;
    let current = getFolderById(folderId);
    const guard = new Set();
    while (current?.parentId) {
      if (guard.has(current.parentId)) break;
      guard.add(current.parentId);
      depth += 1;
      current = getFolderById(current.parentId);
    }
    return depth;
  }

  function folderPathLabel(folderId) {
    const parts = [];
    let current = getFolderById(folderId);
    const guard = new Set();
    while (current) {
      parts.unshift(current.name);
      if (!current.parentId || guard.has(current.parentId)) break;
      guard.add(current.parentId);
      current = getFolderById(current.parentId);
    }
    return parts.join(' / ');
  }

  function flattenFoldersForSelect() {
    const result = [];
    function walk(parentId, depth) {
      getChildFolders(parentId).forEach((folder) => {
        result.push({ folder, depth });
        walk(folder.id, depth + 1);
      });
    }
    walk(null, 0);
    return result;
  }

  function isDescendantFolder(folderId, maybeAncestorId) {
    if (!folderId || !maybeAncestorId || folderId === maybeAncestorId) return false;
    let current = getFolderById(folderId);
    const guard = new Set();
    while (current?.parentId) {
      if (current.parentId === maybeAncestorId) return true;
      if (guard.has(current.parentId)) break;
      guard.add(current.parentId);
      current = getFolderById(current.parentId);
    }
    return false;
  }

  window.GMCatalogStore = {
    UNTAGGED_ID,
    load,
    save,
    getFolderById,
    getChildFolders,
    getRootFolders,
    getItemFolderId,
    setItemFolder,
    getAllItems,
    getItemsInFolder,
    addCustomItem,
    addCustomItemToFolder,
    addFolder,
    isExpanded,
    setExpanded,
    folderDepth,
    folderPathLabel,
    flattenFoldersForSelect,
    isDescendantFolder,
  };
})();
