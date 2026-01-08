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
/*----------------------------------------------------------------------------------------
  Expose globally
  ---------------------------------------------------------------------------------------- */
  window.PluginUtils = {
    applyRowBackground,
    applySourceIcon,
    fetchJson,
    setTextSource
  };
})();
