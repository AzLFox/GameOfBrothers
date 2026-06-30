document.addEventListener('DOMContentLoaded', () => {
  const shell = document.querySelector('.create-shell');
  const back = document.querySelector('.create-back');
  const form = document.getElementById('create-form');
  const nameInput = document.getElementById('create-name');
  const descInput = document.getElementById('create-desc');
  const portraitInput = document.getElementById('create-portrait');
  const portraitImg = document.getElementById('create-portrait-img');
  const portraitPlaceholder = document.getElementById('create-portrait-placeholder');
  const portraitRemove = document.getElementById('create-portrait-remove');
  const portraitError = document.getElementById('create-portrait-error');
  const submitBtn = document.getElementById('create-submit');

  let pendingPortraitFile = null;
  let previewObjectUrl = null;

  const runPageEnter = () => {
    if (shell && typeof GobMotion !== 'undefined' && !GobMotion.reduced()) {
      document.body.classList.add('motion-js');
      GobMotion.set(shell, { opacity: 0, y: 22 });
      GobMotion.to(shell, {
        opacity: 1,
        y: 0,
        duration: GobMotion.DUR.slow,
        ease: GobMotion.EASE.cinematic,
      });
    }
  };

  if (typeof GobMotion !== 'undefined' && GobMotion.initPageTransitionEnter) {
    GobMotion.initPageTransitionEnter({ onComplete: runPageEnter });
  } else {
    document.documentElement.classList.remove('page-enter-pending');
    runPageEnter();
  }

  back?.addEventListener('mouseenter', () => {
    if (typeof GobSound !== 'undefined') GobSound.playHover();
  });

  back?.addEventListener('click', (e) => {
    e.preventDefault();
    GobMotion.navigateTo(back.getAttribute('href'));
  });

  function clearPortraitError() {
    portraitError.hidden = true;
    portraitError.textContent = '';
  }

  function showPortraitError(message) {
    portraitError.textContent = message;
    portraitError.hidden = false;
  }

  function revokePreviewUrl() {
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
      previewObjectUrl = null;
    }
  }

  function clearPortraitPreview() {
    pendingPortraitFile = null;
    portraitInput.value = '';
    revokePreviewUrl();
    portraitImg.src = PLACEHOLDER_PORTRAIT;
    portraitImg.hidden = false;
    portraitPlaceholder.hidden = true;
    portraitRemove.hidden = true;
    clearPortraitError();
  }

  function setPortraitPreview(file) {
    revokePreviewUrl();
    previewObjectUrl = URL.createObjectURL(file);
    portraitImg.src = previewObjectUrl;
    portraitImg.hidden = false;
    portraitPlaceholder.hidden = true;
    portraitRemove.hidden = false;
  }

  function validatePortraitFile(file) {
    if (file.size > MAX_PORTRAIT_BYTES) {
      showPortraitError('Файл больше 2 МБ — выберите изображение меньше.');
      return false;
    }
    if (!file.type.startsWith('image/')) {
      showPortraitError('Нужен файл изображения (JPEG, PNG или WebP).');
      return false;
    }
    clearPortraitError();
    return true;
  }

  portraitInput?.addEventListener('change', () => {
    const file = portraitInput.files?.[0];
    if (!file) return;
    if (!validatePortraitFile(file)) {
      portraitInput.value = '';
      return;
    }
    pendingPortraitFile = file;
    setPortraitPreview(file);
  });

  portraitRemove?.addEventListener('click', () => {
    clearPortraitPreview();
  });

  async function handleCreate() {
    clearPortraitError();
    submitBtn.disabled = true;

    try {
      const card = await createCharacter({
        name: nameInput?.value ?? '',
        description: descInput?.value ?? '',
        portraitFile: pendingPortraitFile ?? undefined,
      });
      GobMotion.navigateTo(`/character?id=${encodeURIComponent(card.id)}`);
    } catch (err) {
      if (err?.message === 'FILE_TOO_LARGE') {
        showPortraitError('Файл больше 2 МБ — выберите изображение меньше.');
      } else if (err?.message === 'NOT_IMAGE') {
        showPortraitError('Нужен файл изображения (JPEG, PNG или WebP).');
      } else {
        showPortraitError('Не удалось создать персонажа. Попробуйте ещё раз.');
      }
      submitBtn.disabled = false;
    }
  }

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleCreate();
  });
});
