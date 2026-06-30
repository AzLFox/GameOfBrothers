/** Block CSS enter animations until page wipe completes (sync in <head>). */
(function () {
  if (sessionStorage.getItem('gob-page-transition')) {
    document.documentElement.classList.add('page-enter-pending');
  }
})();
