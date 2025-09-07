// UI helpers: logging, badges, and indicators
(function() {
  function log(msg) {
    const pre = document.getElementById('log');
    if (pre) pre.textContent += msg + '\n';
  }

  // Badge helpers
  function setConnBadge(connected) {
    const connBadge = document.getElementById('connBadge');
    if (!connBadge) return;
    connBadge.textContent = connected ? 'Connected' : 'Disconnected';
    connBadge.classList.toggle('badge-on', connected);
    connBadge.classList.toggle('badge-off', !connected);
  }

  function setSceneBadge(sceneName) {
    const sceneBadge = document.getElementById('sceneBadge');
    if (!sceneBadge) return;
    sceneBadge.textContent = `Scene: ${sceneName || '-'}`;
  }

  // Generic indicator helper
  function setIndicator(el, color /* 'green' | 'red' */) {
    if (!el) return;
    el.classList.toggle('is-green', color === 'green');
    el.classList.toggle('is-red', color === 'red');
  }

  // Export to global
  window.uiHelpers = {
    log,
    setConnBadge,
    setSceneBadge,
    setIndicator
  };
})();
