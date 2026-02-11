// Dashboard: scene items management with modular source handlers
(function() {
  // ── Request deduplication ──
  // Tracks the current in-flight load. Any new call while one is running
  // will cancel the previous one (via a generation counter) so only the
  // latest request's results are applied to the DOM.
  let loadGeneration = 0;
  let loadingScene = null; // scene name currently being loaded

  // ── Handler context cache ──
  // Avoids re-fetching sources.get() on every dashboard load.
  let cachedContext = null;
  let contextAge = 0; // timestamp of last fetch
  const CONTEXT_MAX_AGE_MS = 10000; // 10 seconds

  // ── Dashboard item cache ──
  // Map<sceneItemId, { rawName, enabled, domElement }> for the currently displayed scene
  let itemCache = new Map();
  let cachedSceneName = null;

  // Helper to show empty state
  function showEmptyState(container, message) {
    container.classList.add('placeholder');
    container.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
        <p>${message}</p>
      </div>
    `;
    itemCache.clear();
    cachedSceneName = null;
  }

  // Helper to show loading state (only when no cached items exist)
  function showLoadingState(container) {
    container.classList.remove('placeholder');
    container.innerHTML = `
      <div class="empty-state">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        <p>Loading sources...</p>
      </div>
      <style>@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }</style>
    `;
  }

  // Dashboard: list and control scene items for selected scene (diff-based)
  async function loadDashboardItems(sceneName) {
    const container = document.getElementById('dashboardItems');
    if (!container) return;

    // ── Deduplication: bump generation so any in-flight load is ignored ──
    const thisGen = ++loadGeneration;
    loadingScene = sceneName;

    // Only show loading spinner when switching to a different scene with no cache
    const isSameScene = sceneName === cachedSceneName;
    if (!isSameScene && itemCache.size === 0) {
      showLoadingState(container);
    }

    try {
      const res = await window.obsAPI.sceneItems.list(sceneName);

      // ── Stale check: if a newer load was started, discard this result ──
      if (thisGen !== loadGeneration) return;

      const items = res && (res.sceneItems || res.items || res);
      if (!Array.isArray(items)) {
        showEmptyState(container, 'No items found in this scene');
        return;
      }

      // Filter: only show sources that begin with "_"
      const filtered = items.filter(item => {
        const nm = item.sourceName || item.inputName || '';
        return typeof nm === 'string' && nm.startsWith('_');
      });
      if (filtered.length === 0) {
        showEmptyState(container, 'No controllable sources (names starting with _)');
        return;
      }

      // Build context for handlers (cached)
      const context = await buildHandlerContext();

      // ── Stale check again after async context fetch ──
      if (thisGen !== loadGeneration) return;

      // ── Diff-update: sync DOM with incoming items ──
      if (isSameScene && itemCache.size > 0) {
        // Same scene: update existing items in-place
        await syncDashboardItems(container, filtered, sceneName, context);
      } else {
        // Different scene: clean swap
        await fullRebuildDashboard(container, filtered, sceneName, context, thisGen);
      }

      cachedSceneName = sceneName;
    } catch (e) {
      // Only show error if this is still the active load
      if (thisGen === loadGeneration) {
        // If we have cached items, keep them visible and just log the error
        if (itemCache.size === 0) {
          container.textContent = 'Failed to load items: ' + e.message;
        }
        window.uiHelpers.logError('Failed to load dashboard items: ' + e.message, 'dashboard');
      }
    } finally {
      if (thisGen === loadGeneration) {
        loadingScene = null;
      }
    }
  }

  // Sync existing dashboard items in-place (same scene refresh)
  async function syncDashboardItems(container, incomingItems, sceneName, context) {
    const incomingById = new Map();
    for (const item of incomingItems) {
      incomingById.set(item.sceneItemId, item);
    }

    // Remove items that no longer exist
    for (const [id, cached] of itemCache) {
      if (!incomingById.has(id)) {
        if (cached.domElement && cached.domElement.parentNode) {
          // Cleanup handlers before removing
          if (window.HandlerRegistry) {
            window.HandlerRegistry.cleanup(cached.rawName);
          }
          cached.domElement.remove();
        }
        itemCache.delete(id);
      }
    }

    // Update existing items and add new ones
    let prevEl = null;
    for (const item of incomingItems) {
      const cached = itemCache.get(item.sceneItemId);
      const rawName = item.sourceName || item.inputName || `Item ${item.sceneItemId}`;

      if (cached && cached.domElement && cached.domElement.parentNode) {
        // Update visibility toggle if changed
        if (cached.enabled !== !!item.sceneItemEnabled) {
          const chk = cached.domElement.querySelector('input[type="checkbox"]');
          if (chk) chk.checked = !!item.sceneItemEnabled;
          cached.enabled = !!item.sceneItemEnabled;
        }

        // Re-run handlers to refresh source properties (e.g. browser URL changes)
        await refreshItemOptions(cached.domElement, rawName, rawName.length > 0 ? rawName.slice(1) : rawName, context);

        // Ensure correct order
        const expectedNext = prevEl ? prevEl.nextElementSibling : container.firstElementChild;
        if (cached.domElement !== expectedNext) {
          if (prevEl) {
            prevEl.after(cached.domElement);
          } else {
            container.prepend(cached.domElement);
          }
        }
        prevEl = cached.domElement;
      } else {
        // New item: create and insert
        const newEl = await createDashboardItem(item, sceneName, context);
        if (newEl) {
          if (prevEl) {
            prevEl.after(newEl);
          } else {
            // Insert at start, before any existing children
            container.prepend(newEl);
          }
          itemCache.set(item.sceneItemId, {
            rawName,
            enabled: !!item.sceneItemEnabled,
            domElement: newEl
          });
          prevEl = newEl;
        }
      }
    }

    // Remove any leftover empty-state / placeholder elements
    container.classList.remove('placeholder');
    const emptyState = container.querySelector('.empty-state');
    if (emptyState) emptyState.remove();
  }

  // Full rebuild when switching scenes (but still uses the cache for the new scene)
  async function fullRebuildDashboard(container, filtered, sceneName, context, thisGen) {
    // Cleanup old handlers
    for (const [, cached] of itemCache) {
      if (window.HandlerRegistry) {
        window.HandlerRegistry.cleanup(cached.rawName);
      }
    }
    itemCache.clear();

    container.classList.remove('placeholder');
    container.innerHTML = '';

    for (const item of filtered) {
      // Stale check inside the loop for responsiveness
      if (thisGen !== loadGeneration) return;

      const el = await createDashboardItem(item, sceneName, context);
      if (el) {
        container.appendChild(el);
        const rawName = item.sourceName || item.inputName || `Item ${item.sceneItemId}`;
        itemCache.set(item.sceneItemId, {
          rawName,
          enabled: !!item.sceneItemEnabled,
          domElement: el
        });
      }
    }
  }

  // Refresh the options panel of an existing cached dashboard item.
  // Instead of rebuilding the whole item, we clear the options panel and
  // re-run handlers so that source properties (URLs, text, etc.) are fresh.
  async function refreshItemOptions(itemEl, rawName, displayName, context) {
    if (!itemEl || !window.HandlerRegistry) return;

    const options = itemEl.querySelector('.dash-options');
    if (!options) return;

    // Remember expanded state
    const wasOpen = options.classList.contains('open');

    // Cleanup old handler state for this source
    window.HandlerRegistry.cleanup(rawName);

    // Clear options content and re-run handlers
    options.innerHTML = '';
    let hasOptions = false;
    try {
      hasOptions = await window.HandlerRegistry.processSource(options, rawName, displayName, context);
    } catch (err) {
      console.error('Handler registry refresh error:', err);
    }

    // Manage expand button visibility
    const nameWrap = itemEl.querySelector('.name-wrap');
    const existingExpandBtn = nameWrap?.querySelector('.expand-btn');
    const chk = itemEl.querySelector('input[type="checkbox"]');
    const optionsId = options.id;

    if (hasOptions && !existingExpandBtn && nameWrap) {
      createExpandButton(nameWrap, options, chk, optionsId);
    } else if (!hasOptions && existingExpandBtn) {
      existingExpandBtn.remove();
    }

    // Restore expanded state
    if (wasOpen && hasOptions) {
      options.classList.add('open');
      options.setAttribute('aria-hidden', 'false');
      const expandBtn = nameWrap?.querySelector('.expand-btn');
      if (expandBtn) {
        expandBtn.textContent = '▾';
        expandBtn.setAttribute('aria-expanded', 'true');
      }
      enableTabInside(options);
    } else {
      disableTabInside(options);
    }
  }

  async function buildHandlerContext(forceRefresh) {
    const now = Date.now();
    if (!forceRefresh && cachedContext && (now - contextAge) < CONTEXT_MAX_AGE_MS) {
      return cachedContext;
    }

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

    cachedContext = { inputKindMap, micNameSet };
    contextAge = now;
    return cachedContext;
  }

  // Creates a dashboard item DOM element and returns it (does NOT append to container)
  async function createDashboardItem(item, sceneName, context) {
    // Item wrapper to place row + options panel
    const itemWrap = document.createElement('div');
    itemWrap.className = 'dash-item';
    itemWrap.dataset.sceneItemId = String(item.sceneItemId);

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

    row.appendChild(nameWrap);
    row.appendChild(toggleWrap);

    itemWrap.appendChild(row);
    itemWrap.appendChild(options);

    // Create expand button AFTER nameWrap is in the DOM tree
    // (createExpandButton reads nameWrap.parentElement)
    if (hasOptions) {
      createExpandButton(nameWrap, options, chk, optionsId);
    }
    return itemWrap;
  }




  function createExpandButton(nameWrap, options, chk, optionsId) {
    const expandBtn = document.createElement('button');
    expandBtn.className = 'icon-btn expand-btn';
    expandBtn.title = 'Show source options';
    expandBtn.textContent = '▸';
    if (optionsId) expandBtn.setAttribute('aria-controls', optionsId);
    nameWrap.insertBefore(expandBtn, nameWrap.firstChild);

    // The row element is the parent of nameWrap
    const row = nameWrap.parentElement;

    let expanded = false; // default closed; user can expand via clicking the row
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

    // Clicking anywhere on the row toggles the dropdown,
    // EXCEPT clicking on the toggle switch / checkbox area
    const safeToggle = (evt) => {
      if (evt.target.closest('.dash-toggle, input, .dash-options')) return;
      expanded = !expanded;
      applyExpanded();
    };

    // Make the entire row clickable (cursor set via CSS on .dash-row)
    row.addEventListener('click', safeToggle);

    // Keep nameWrap focusable for keyboard navigation
    nameWrap.setAttribute('role', 'button');
    nameWrap.tabIndex = 0;
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
