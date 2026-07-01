document.addEventListener('DOMContentLoaded', () => {
  const shell = document.querySelector('.auth-shell');
  const back = document.querySelector('.auth-back');
  const form = document.getElementById('register-form');
  const usernameInput = document.getElementById('register-username');
  const passwordInput = document.getElementById('register-password');
  const errorEl = document.getElementById('register-error');
  const submitBtn = document.getElementById('register-submit');
  const loginLink = document.getElementById('login-link');

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
      const brand = shell.querySelector('.auth-brand');
      const panel = shell.querySelector('.auth-panel');
      if (brand) {
        GobMotion.set(brand, { opacity: 0, y: 14 });
        GobMotion.to(brand, {
          opacity: 1,
          y: 0,
          duration: GobMotion.DUR.normal,
          delay: 0.12,
          ease: GobMotion.EASE.cinematic,
        });
      }
      if (panel) {
        GobMotion.set(panel, { opacity: 0, y: 18 });
        GobMotion.to(panel, {
          opacity: 1,
          y: 0,
          duration: GobMotion.DUR.normal,
          delay: 0.22,
          ease: GobMotion.EASE.cinematic,
        });
      }
    }
  };

  if (typeof GobMotion !== 'undefined' && GobMotion.initPageTransitionEnter) {
    GobMotion.initPageTransitionEnter({ onComplete: runPageEnter });
  } else {
    document.documentElement.classList.remove('page-enter-pending');
    runPageEnter();
  }

  back?.addEventListener('click', (e) => {
    e.preventDefault();
    GobMotion.navigateTo(back.getAttribute('href'));
  });

  loginLink?.addEventListener('click', (e) => {
    e.preventDefault();
    GobMotion.navigateTo(loginLink.getAttribute('href'));
  });

  async function submitRegister() {
    errorEl.hidden = true;
    submitBtn.disabled = true;

    try {
      await GobAuth.register(usernameInput.value.trim(), passwordInput.value);
      GobMotion.navigateTo(GobAuth.getReturnUrl());
    } catch (err) {
      errorEl.textContent = err.message || 'Не удалось зарегистрироваться';
      errorEl.hidden = false;
      submitBtn.disabled = false;
    }
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitRegister();
  });
});
