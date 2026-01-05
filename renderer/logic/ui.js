// UI helpers: logging, badges, and indicators
(function() {
  // Console Ui
  function _pad2(n) {
    return String(n).padStart(2, '0');
  }

  function _timestamp() {
    const d = new Date();
    return `${_pad2(d.getHours())}:${_pad2(d.getMinutes())}:${_pad2(d.getSeconds())}`;
  }

  function _normalizeMessage(msg) {
    if (msg === null || msg === undefined) return '';
    if (typeof msg === 'string') return msg;
    try {
      return JSON.stringify(msg);
    } catch (_) {
      return String(msg);
    }
  }

  function _formatLine(level, scope, msg) {
    const parts = [`[${_timestamp()}]`, `[${String(level || 'INFO').toUpperCase()}]`];
    if (scope) parts.push(`[${String(scope).toUpperCase()}]`);
    parts.push(_normalizeMessage(msg));
    return parts.join(' ');
  }

  function _write(level, msg, scope) {
    const pre = document.getElementById('log');
    if (!pre) return;

    if (pre.dataset.mode !== 'rich') {
      const existing = pre.textContent || '';
      pre.textContent = '';
      if (existing.trim()) {
        const lines = existing.split('\n').filter(Boolean);
        for (const line of lines) {
          const span = document.createElement('span');
          span.className = 'log-line log-info';
          span.textContent = line;
          pre.appendChild(span);
        }
      }
      pre.dataset.mode = 'rich';
      pre.dataset.lineCount = String(pre.childElementCount);
    }

    const maxLines = 500;
    const emoji = ({
      info: 'ℹ️',
      success: '✅',
      warn: '⚠️',
      error: '❌'
    }[String(level || 'info').toLowerCase()] || 'ℹ️');

    const line = document.createElement('span');
    line.className = `log-line log-${String(level || 'info').toLowerCase()}`;
    line.textContent = `${emoji} ${_formatLine(level, scope, msg)}`;
    pre.appendChild(line);

    let lineCount = pre.dataset.lineCount
      ? parseInt(pre.dataset.lineCount, 10) + 1
      : pre.childElementCount;

    while (lineCount > maxLines) {
      if (!pre.firstElementChild) break;
      pre.removeChild(pre.firstElementChild);
      lineCount -= 1;
    }

    pre.dataset.lineCount = String(lineCount);
    window.requestAnimationFrame(() => {
      try { pre.scrollTop = pre.scrollHeight; } catch (_) { /* ignore */ }
    });
  }

  // Backward compatible: log(msg) or log(msg, scope)
  function log(msg, scope) {
    _write('info', msg, scope);
  }

  function logInfo(msg, scope) {
    _write('info', msg, scope);
  }

  function logSuccess(msg, scope) {
    _write('success', msg, scope);
  }

  function logWarn(msg, scope) {
    _write('warn', msg, scope);
  }

  function logError(msg, scope) {
    _write('error', msg, scope);
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
    logInfo,
    logSuccess,
    logWarn,
    logError,
    setConnBadge,
    setSceneBadge,
    setIndicator
  };
})();
