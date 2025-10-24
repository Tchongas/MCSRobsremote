// UI helpers: logging, badges, and indicators
(function() {
  // Console Ui
  function log(msg) {
    const pre = document.getElementById('log');
    if (!pre) return;

    const maxLines = 500;
    const newLine = String(msg) + '\n';

    pre.textContent += newLine;

    let lineCount = pre.dataset.lineCount ? parseInt(pre.dataset.lineCount, 10) + 1 : ((pre.textContent.match(/\n/g) || []).length);

    while (lineCount > maxLines) {
      const idx = pre.textContent.indexOf('\n');
      if (idx === -1) break;
      pre.textContent = pre.textContent.slice(idx + 1);
      lineCount -= 1;
    }

    pre.dataset.lineCount = String(lineCount);
    pre.scrollTop = pre.scrollHeight;
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
