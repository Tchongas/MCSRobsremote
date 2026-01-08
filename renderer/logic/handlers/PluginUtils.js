// PluginUtils - Shared helpers for handler plugins (built-in and external)
(function() {
/*----------------------------------------------------------------------------------------
  applyRowBackground
  ---------------------------------------------------------------------------------------- */
  const applyRowBackground = (optionsEl, rowBg) => {
    if (!optionsEl) return false;
    const applyRowBg = () => {
      const parent = optionsEl.parentElement;
      const row = parent ? parent.querySelector(':scope > .dash-row') : null;
      if (row) {
        if (rowBg) row.style.setProperty('background', rowBg, 'important');
        return true;
      }
      return false;
    };

    let applied = applyRowBg();

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        applied = applied || applyRowBg();
      });
    }
    setTimeout(() => {
      if (!applied) applyRowBg();
    }, 60);

    return applied;
  };
/*----------------------------------------------------------------------------------------
  applySourceIcon
  ---------------------------------------------------------------------------------------- */

  const applySourceIcon = (optionsEl, icon) => {
    if (!optionsEl) return false;
  
    const applyIcon = () => {
      const parent = optionsEl.parentElement;
      const sourceIcon = parent
        ? parent.querySelector(':scope > .dash-row > .name-wrap > .source-icon')
        : null;
  
      if (sourceIcon) {
        sourceIcon.textContent = icon;
        return true;
      }
      return false;
    };
  
    let applied = applyIcon();
  
    setTimeout(() => {
      if (!applied) applyIcon();
    }, 60);
  
    return applied;
  };

  const fetchJson = async (url, opts) => {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      ...(opts || {})
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  };

  const setTextSource = async (sourceName, text) => {
    const name = String(sourceName || '').trim();
    if (!name) throw new Error('Missing source name');
    if (!window.obsAPI?.sources?.setSettings) throw new Error('OBS API not available');
    await window.obsAPI.sources.setSettings(name, { text: String(text ?? '') });
  };

  const _sidebarRegistry = new Map();

  const addControlButton = (id, label, onClick, className) => {
    const host = document.getElementById('pluginButtons');
    if (!host) return null;

    const safeId = String(id || '').trim();
    if (!safeId) return null;

    const existing = host.querySelector(`#${CSS.escape(safeId)}`);
    if (existing) return existing;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = safeId;
    btn.textContent = String(label || safeId);
    btn.className = className || 'btn-plugin';
    btn.title = btn.textContent;
    if (typeof onClick === 'function') {
      btn.addEventListener('click', onClick);
    }
    host.appendChild(btn);
    return btn;
  };

  const removeControlButton = (id) => {
    const host = document.getElementById('pluginButtons');
    if (!host) return false;
    const safeId = String(id || '').trim();
    if (!safeId) return false;
    const el = host.querySelector(`#${CSS.escape(safeId)}`);
    if (!el) return false;
    el.remove();
    return true;
  };

  const registerSidebarButton = (pluginName, id, label, onClick, className) => {
    const btn = addControlButton(id, label, onClick, className);
    if (!btn) return null;

    const p = String(pluginName || '').trim() || 'unknown';
    if (!_sidebarRegistry.has(p)) {
      _sidebarRegistry.set(p, new Set());
    }
    _sidebarRegistry.get(p).add(btn.id);
    return btn;
  };

  const unregisterSidebarButtons = (pluginName) => {
    const p = String(pluginName || '').trim() || 'unknown';
    const ids = _sidebarRegistry.get(p);
    if (!ids) return 0;

    let removed = 0;
    ids.forEach((id) => {
      if (removeControlButton(id)) removed += 1;
    });
    _sidebarRegistry.delete(p);
    return removed;
  };
/*----------------------------------------------------------------------------------------
  Expose globally
  ---------------------------------------------------------------------------------------- */
  window.PluginUtils = {
    applyRowBackground,
    applySourceIcon,
    fetchJson,
    setTextSource,
    addControlButton,
    removeControlButton,
    registerSidebarButton,
    unregisterSidebarButtons
  };
})();
