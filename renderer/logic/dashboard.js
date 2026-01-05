// Dashboard: scene items management with modular source handlers
(function() {
  // Dashboard: list and control scene items for selected scene
  async function loadDashboardItems(sceneName) {
    const container = document.getElementById('dashboardItems');
    if (!container) return;
    container.classList.remove('placeholder');
    container.textContent = 'Loading items...';
    try {
      const res = await window.obsAPI.sceneItems.list(sceneName);
      const items = res && (res.sceneItems || res.items || res);
      if (!Array.isArray(items)) {
        container.textContent = 'No items found.';
        return;
      }

      // Filter: only show sources that begin with "_"
      const filtered = items.filter(item => {
        const nm = item.sourceName || item.inputName || '';
        return typeof nm === 'string' && nm.startsWith('_');
      });
      if (filtered.length === 0) {
        container.textContent = 'No matching items (names starting with _).';
        return;
      }
      container.innerHTML = '';

      // Build context for handlers
      const context = await buildHandlerContext();

      for (const item of filtered) {
        await createDashboardItem(container, item, sceneName, context);
      }
    } catch (e) {
      container.textContent = 'Failed to load items: ' + e.message;
      window.uiHelpers.logError('Failed to load dashboard items: ' + e.message, 'dashboard');
    }
  }

  async function buildHandlerContext() {
    let micNameSet = new Set();
    let inputKindMap = new Map();
    
    try {
      const srcRes = await window.obsAPI.sources.get();
      const inputs = srcRes && (srcRes.inputs || srcRes.sources || []);
      if (window.sourceTypes?.collectInputMaps) {
        const maps = window.sourceTypes.collectInputMaps(inputs);
        inputKindMap = maps.kindByName || inputKindMap;
        micNameSet = maps.micNameSet || micNameSet;
      }
    } catch (_) { /* ignore */ }

    return { inputKindMap, micNameSet };
  }

  async function createDashboardItem(container, item, sceneName, context) {
    // Item wrapper to place row + options panel
    const itemWrap = document.createElement('div');
    itemWrap.className = 'dash-item';

    const row = document.createElement('div');
    row.className = 'dash-row';

    const name = document.createElement('div');
    name.className = 'name';
    const rawName = item.sourceName || item.inputName || `Item ${item.sceneItemId}`;
    const displayName = typeof rawName === 'string' && rawName.length > 0 ? rawName.slice(1) : rawName;
    name.textContent = displayName;
    name.title = rawName; // tooltip shows full original name
    itemWrap.dataset.name = String(displayName || '').toLowerCase();
    itemWrap.dataset.rawName = String(rawName || '').toLowerCase();

    const nameWrap = document.createElement('div');
    nameWrap.className = 'name-wrap';
    // Add source-type icon before the name for quick visual scanning
    const iconSpan = document.createElement('span');
    iconSpan.className = 'source-icon';
    const sourceKind = context.inputKindMap?.get(rawName) || '';
    const icon = window.sourceTypes?.getIcon ? window.sourceTypes.getIcon(sourceKind, rawName) : '📦';
    iconSpan.textContent = icon;
    nameWrap.appendChild(iconSpan);
    nameWrap.appendChild(name);

    const toggleWrap = document.createElement('div');
    toggleWrap.className = 'dash-toggle';

    const label = document.createElement('label');
    label.className = 'flex-center';

    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.className = 'switch';
    chk.checked = !!item.sceneItemEnabled;
    chk.title = 'Toggle visibility';
    chk.dataset.sceneItemId = item.sceneItemId;
    chk.tabIndex = -1; // keep tab order on the row only

    chk.addEventListener('change', async (ev) => {
      const desired = ev.target.checked;
      try {
        await window.obsAPI.sceneItems.setEnabled(sceneName, item.sceneItemId, desired);
        window.uiHelpers.logSuccess(`${desired ? 'Shown' : 'Hidden'}: ${name.textContent}`, 'dashboard');
      } catch (err) {
        ev.target.checked = !desired; // revert on failure
        window.uiHelpers.logError('Failed to toggle visibility: ' + err.message, 'dashboard');
      }
    });

    label.appendChild(chk);
    toggleWrap.appendChild(label);

    // Options panel (hidden by default)
    const options = document.createElement('div');
    options.className = 'dash-options';
    const optionsId = `dash-options-${String(item.sceneItemId)}`;
    options.id = optionsId;
    options.setAttribute('role', 'region');
    options.setAttribute('aria-label', `${displayName} options`);
    options.setAttribute('aria-hidden', 'true');

    // Use handler registry to process source controls
    let hasOptions = false;
    if (window.HandlerRegistry) {
      try {
        hasOptions = await window.HandlerRegistry.processSource(options, rawName, displayName, context);
      } catch (err) {
        console.error('Handler registry error:', err);
      }
    }

    // Make every focusable element inside options non-tabbable so only the row enters tab order
    disableTabInside(options);

    // Create arrow now that we know options exist
    if (hasOptions) {
      createExpandButton(nameWrap, options, chk, optionsId);
    }

    row.appendChild(nameWrap);
    row.appendChild(toggleWrap);

    itemWrap.appendChild(row);
    itemWrap.appendChild(options);
    container.appendChild(itemWrap);
  }




  function createExpandButton(nameWrap, options, chk, optionsId) {
    const expandBtn = document.createElement('button');
    expandBtn.className = 'icon-btn expand-btn';
    expandBtn.title = 'Show source options';
    expandBtn.textContent = '▸';
    if (optionsId) expandBtn.setAttribute('aria-controls', optionsId);
    nameWrap.insertBefore(expandBtn, nameWrap.firstChild);

    let expanded = false; // default closed; user can expand via arrow or name click
    const setArrow = () => expandBtn.textContent = expanded ? '▾' : '▸';
    const applyExpanded = () => {
      options.classList.toggle('open', expanded);
      expandBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      options.setAttribute('aria-hidden', expanded ? 'false' : 'true');
      setArrow();
      if (expanded) enableTabInside(options);
      else disableTabInside(options);
    };
    applyExpanded();

    // Allow exiting edit mode with Escape anywhere inside options
    options.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        expanded = false;
        applyExpanded();
        disableTabInside(options);
        nameWrap.focus();
      }
    });

    // Make arrow non-tabbable; row handles focus
    expandBtn.tabIndex = -1;
    // Toggle via arrow button (mouse)
    expandBtn.addEventListener('click', () => {
      expanded = !expanded;
      applyExpanded();
    });

    // Also toggle by clicking the name area for better accessibility
    nameWrap.style.cursor = 'pointer';
    nameWrap.setAttribute('role', 'button');
    nameWrap.tabIndex = 0;
    const safeToggle = (evt) => {
      // Avoid toggling when interacting with inputs or buttons inside
      if (evt.target.closest('input, button, .dash-options')) return;
      expanded = !expanded;
      applyExpanded();
    };
    nameWrap.addEventListener('click', safeToggle);
    nameWrap.addEventListener('keydown', (e) => {
      // Expand/collapse
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        safeToggle(e);
        return;
      }
      // Enter edit mode with 'e': open options, enable tabbing inside, focus first control
      if (e.key.toLowerCase() === 'e') {
        e.preventDefault();
        if (!expanded) {
          expanded = true;
          applyExpanded();
        }
        enableTabInside(options);
        focusFirstFocusable(options) || options.focus();
        return;
      }
      // Toggle visibility with 'v'
      if (e.key.toLowerCase() === 'v') {
        e.preventDefault();
        if (chk) {
          chk.checked = !chk.checked;
          chk.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return;
      }
      // Navigate across items
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = Array.from(document.querySelectorAll('#dashboardItems .dash-item:not(.is-hidden) .name-wrap'));
        const idx = items.indexOf(nameWrap);
        const next = e.key === 'ArrowDown' ? items[idx + 1] : items[idx - 1];
        if (next) next.focus();
      }
    });
  }

  // Ensure no element inside the options panel is tabbable
  function disableTabInside(rootEl) {
    if (!rootEl) return;
    const focusables = rootEl.querySelectorAll('a, button, input, select, textarea, [tabindex]');
    focusables.forEach(n => { try { n.tabIndex = -1; } catch(_){} });
  }

  function enableTabInside(rootEl) {
    if (!rootEl) return;
    const focusables = rootEl.querySelectorAll('a, button, input, select, textarea, [tabindex]');
    focusables.forEach(n => { try { n.tabIndex = 0; } catch(_){} });
  }

  function focusFirstFocusable(rootEl) {
    const focusables = rootEl.querySelectorAll('button, input, select, textarea, a, [tabindex]:not([tabindex="-1"])');
    for (const el of focusables) {
      if (!el.disabled && el.offsetParent !== null) {
        try { el.focus(); return true; } catch(_) { /* no-op */ }
      }
    }
    return false;
  }

  // Public: update microphone mute state via handler registry
  function updateMicrophoneMuteState(inputName, muted) {
    if (window.HandlerRegistry) {
      window.HandlerRegistry.handleRemoteUpdate(inputName, 'input-mute-changed', { inputMuted: muted });
    }
  }

  // Export to global
  window.dashboardLogic = {
    loadDashboardItems,
    updateMicrophoneMuteState
  };
})();
