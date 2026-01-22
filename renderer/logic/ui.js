// UI helpers: logging, badges, and indicators
(function() {
  // Console UI - Professional log formatting
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

  function _getLevelLabel(level) {
    const labels = {
      info: 'INFO',
      success: 'OK',
      warn: 'WARN',
      error: 'ERR'
    };
    return labels[String(level || 'info').toLowerCase()] || 'INFO';
  }

  function _write(level, msg, scope) {
    const container = document.getElementById('log');
    if (!container) return;

    // Initialize container if needed
    if (container.dataset.mode !== 'rich') {
      const existing = container.textContent || '';
      container.innerHTML = '';
      if (existing.trim()) {
        const lines = existing.split('\n').filter(Boolean);
        for (const line of lines) {
          _appendLine(container, 'info', line, null);
        }
      }
      container.dataset.mode = 'rich';
      container.dataset.lineCount = String(container.childElementCount);
    }

    _appendLine(container, level, msg, scope);

    // Limit lines
    const maxLines = 500;
    let lineCount = parseInt(container.dataset.lineCount || '0', 10) + 1;
    while (lineCount > maxLines && container.firstElementChild) {
      container.removeChild(container.firstElementChild);
      lineCount -= 1;
    }
    container.dataset.lineCount = String(lineCount);

    // Auto-scroll to bottom
    window.requestAnimationFrame(() => {
      try { container.scrollTop = container.scrollHeight; } catch (_) { /* ignore */ }
    });
  }

  function _appendLine(container, level, msg, scope) {
    const levelKey = String(level || 'info').toLowerCase();
    
    const line = document.createElement('div');
    line.className = `log-line log-${levelKey}`;

    // Timestamp
    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-time';
    timeSpan.textContent = _timestamp();
    line.appendChild(timeSpan);

    // Level badge
    const levelSpan = document.createElement('span');
    levelSpan.className = `log-level log-level-${levelKey}`;
    levelSpan.textContent = _getLevelLabel(level);
    line.appendChild(levelSpan);

    // Message (with optional scope)
    const msgSpan = document.createElement('span');
    msgSpan.className = 'log-message';
    const scopePrefix = scope ? `[${String(scope).toUpperCase()}] ` : '';
    msgSpan.textContent = scopePrefix + _normalizeMessage(msg);
    line.appendChild(msgSpan);

    container.appendChild(line);
  }

  // Clear console
  function clearConsole() {
    const container = document.getElementById('log');
    if (!container) return;
    container.innerHTML = '';
    container.dataset.lineCount = '0';
    logInfo('Console cleared', 'system');
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

  // Connection status - Updates both top bar and sidebar status card
  function setConnBadge(connected) {
    // Update top bar connection status
    const connectionStatus = document.getElementById('connectionStatus');
    if (connectionStatus) {
      const indicator = connectionStatus.querySelector('.status-indicator');
      const text = connectionStatus.querySelector('.status-text');
      if (indicator) {
        indicator.classList.remove('disconnected', 'connected', 'connecting');
        indicator.classList.add(connected ? 'connected' : 'disconnected');
      }
      if (text) {
        text.textContent = connected ? 'Connected' : 'Disconnected';
      }
    }

    // Update sidebar status card
    const connStatusCard = document.getElementById('connStatusCard');
    if (connStatusCard) {
      const icon = connStatusCard.querySelector('.status-card-icon');
      const value = document.getElementById('connStatusText');
      if (icon) {
        icon.classList.remove('disconnected', 'connected');
        icon.classList.add(connected ? 'connected' : 'disconnected');
      }
      if (value) {
        value.textContent = connected ? 'Online' : 'Offline';
      }
    }

    // Legacy badge support
    const connBadge = document.getElementById('connBadge');
    if (connBadge) {
      connBadge.textContent = connected ? 'Connected' : 'Disconnected';
      connBadge.classList.toggle('badge-on', connected);
      connBadge.classList.toggle('badge-off', !connected);
    }
  }

  // Scene badge - Updates scene current display
  function setSceneBadge(sceneName) {
    // Update new scene current element
    const sceneCurrent = document.getElementById('sceneBadge');
    if (sceneCurrent) {
      sceneCurrent.textContent = sceneName ? `Active: ${sceneName}` : 'No scene selected';
    }
  }

  // Stream status - Updates sidebar status card
  function setStreamStatus(isLive) {
    const streamStatusCard = document.getElementById('streamStatusCard');
    if (streamStatusCard) {
      const icon = streamStatusCard.querySelector('.status-card-icon');
      const value = document.getElementById('streamStatusText');
      if (icon) {
        icon.classList.remove('idle', 'live');
        icon.classList.add(isLive ? 'live' : 'idle');
      }
      if (value) {
        value.textContent = isLive ? 'Live' : 'Idle';
      }
    }
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
    clearConsole,
    setConnBadge,
    setSceneBadge,
    setStreamStatus,
    setIndicator
  };
})();
