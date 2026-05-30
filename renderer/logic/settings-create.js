// Settings Create Tab - Scene creation UI for settings panel
(function() {
  let hasRendered = false;

  // Initialize when settings panel becomes active
  function init() {
    // Listen for tab changes in settings
    const settingsNavBtns = document.querySelectorAll('.settings-nav-btn[data-tab="create"]');
    settingsNavBtns.forEach(btn => {
      btn.addEventListener('click', onCreateTabActivated);
    });

    // Also listen for registry updates
    window.addEventListener('plugincreateutils:registry-updated', () => {
      if (isCreateTabActive()) {
        renderCreateList();
      }
    });
  }

  // Check if Create tab is currently active
  function isCreateTabActive() {
    const createPanel = document.querySelector('.settings-panel[data-panel="create"]');
    return createPanel && createPanel.classList.contains('active');
  }

  // Called when Create tab is activated
  function onCreateTabActivated() {
    console.log('[SettingsCreate] Tab activated');
    renderCreateList();
  }

  // Render the create handlers list
  function renderCreateList() {
    const container = document.getElementById('createSettingsContent');
    if (!container) {
      console.warn('[SettingsCreate] Container not found');
      return;
    }

    // Check if PluginCreateUtils is available
    if (!window.PluginCreateUtils) {
      container.innerHTML = '<div class="create-empty">PluginCreateUtils not loaded</div>';
      return;
    }

    const registry = window.PluginCreateUtils.getAllHandlers();
    console.log('[SettingsCreate] Registry size:', registry.size);

    if (registry.size === 0) {
      container.innerHTML = '<div class="create-empty">No plugins have registered scene creation handlers.<br>Plugins can register handlers via <code>PluginCreateUtils.registerSceneCreateHandler()</code></div>';
      return;
    }

    // Build the list grouped by plugin
    let html = '';
    for (const [pluginName, pluginData] of registry) {
      if (!pluginData.handlers || pluginData.handlers.length === 0) continue;

      html += `<div class="create-plugin-card">`;
      html += `<div class="create-plugin-header">`;
      html += `<span class="create-plugin-name">${escapeHtml(pluginName)}</span>`;
      if (pluginData.description) {
        html += `<span class="create-plugin-desc">${escapeHtml(pluginData.description)}</span>`;
      }
      html += `</div>`;
      html += `<div class="create-handlers-list">`;

      for (const handler of pluginData.handlers) {
        const handlerId = escapeHtml(handler.id);
        const label = escapeHtml(handler.label || handlerId);
        const description = handler.description ? escapeHtml(handler.description) : '';

        html += `<div class="create-handler-item">`;
        html += `<div class="create-handler-info">`;
        html += `<span class="create-handler-label">${label}</span>`;
        if (description) {
          html += `<span class="create-handler-desc">${description}</span>`;
        }
        html += `</div>`;
        html += `<button class="btn-accent create-handler-btn" data-plugin="${escapeHtml(pluginName)}" data-handler="${handlerId}" onclick="handleCreateClick(this)">`;
        html += `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">`;
        html += `<line x1="12" y1="5" x2="12" y2="19"></line>`;
        html += `<line x1="5" y1="12" x2="19" y2="12"></line>`;
        html += `</svg>`;
        html += `Create`;
        html += `</button>`;
        html += `</div>`;
      }

      html += `</div></div>`;
    }

    container.innerHTML = html;
    hasRendered = true;
    console.log('[SettingsCreate] Rendered handlers');
  }

  // Handle create button click
  async function handleCreateClick(btn) {
    const pluginName = btn.dataset.plugin;
    const handlerId = btn.dataset.handler;

    console.log(`[SettingsCreate] Executing handler: ${pluginName}.${handlerId}`);

    if (!window.PluginCreateUtils?.executeHandler) {
      window.uiHelpers?.logError('PluginCreateUtils not available', 'create');
      return;
    }

    // Show loading state
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Creating...`;

    try {
      const result = await window.PluginCreateUtils.executeHandler(pluginName, handlerId);

      if (result && result.sceneName) {
        window.uiHelpers?.logSuccess(
          `Created scene "${result.sceneName}" with ${result.created?.length || 0} sources`,
          'create'
        );
      } else {
        window.uiHelpers?.logSuccess('Scene created successfully', 'create');
      }
    } catch (err) {
      window.uiHelpers?.logError(`Failed to create: ${err.message}`, 'create');
      console.error('[SettingsCreate] Handler execution failed:', err);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalContent;
    }
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Public API
  window.settingsCreateLogic = {
    render: renderCreateList,
    refresh: renderCreateList
  };

  // Expose handler function globally for onclick
  window.handleCreateClick = handleCreateClick;

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('[SettingsCreate] Loaded');
})();
