// PluginUtils - Shared helpers for handler plugins (built-in and external)
(function() {
  const applyRowBackground = (optionsEl, rowBg, parentBg, alsoOptionsBg = false) => {
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

  // Expose globally
  window.PluginUtils = {
    applyRowBackground,
    applySourceIcon
  };
})();
