document.addEventListener('DOMContentLoaded', () => {
  const shell = document.querySelector('.create-shell');
  const back = document.querySelector('.create-back');

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

  back?.addEventListener('mouseenter', () => {
    if (typeof GobSound !== 'undefined') GobSound.playHover();
  });

  back?.addEventListener('click', (e) => {
    e.preventDefault();
    GobMotion.navigateTo(back.getAttribute('href'));
  });
});
