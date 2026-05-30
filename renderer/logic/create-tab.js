// Create Tab Logic - Handles plugin scene creation UI
(function() {
  let isCreateVisible = false;

  // Toggle create section visibility
  function toggleCreate() {
    const createSection = document.getElementById('createSection');
    const toggleBtn = document.getElementById('createToggle');
    if (!createSection) return;

    isCreateVisible = !isCreateVisible;

    if (isCreateVisible) {
      createSection.style.display = 'block';
      toggleBtn.classList.add('active');
      toggleBtn.title = 'Hide Create';
      // Close Config tab if open (mutually exclusive)
      closeConfigTab();
      // Refresh the create list when showing
      renderCreateList();
    } else {
      createSection.style.display = 'none';
      toggleBtn.classList.remove('active');
      toggleBtn.title = 'Show Create';
    }
  }

  // Close Config tab if it's open
  function closeConfigTab() {
    const configSection = document.getElementById('configSection');
    const configToggleBtn = document.getElementById('configToggle');
    if (configSection && configSection.style.display === 'block') {
      configSection.style.display = 'none';
      if (configToggleBtn) {
        configToggleBtn.classList.remove('active');
        configToggleBtn.title = 'Show Config';
      }
      // Update config tab state if available
      if (window.configTabLogic?.setVisible) {
        window.configTabLogic.setVisible(false);
      }
    }
  }

  // Set visibility from external control (for mutual exclusivity)
  function setVisible(visible) {
    isCreateVisible = visible;
    const createSection = document.getElementById('createSection');
    const toggleBtn = document.getElementById('createToggle');
    if (!createSection) return;

    if (visible) {
      createSection.style.display = 'block';
      if (toggleBtn) {
        toggleBtn.classList.add('active');
        toggleBtn.title = 'Hide Create';
      }
      renderCreateList();
    } else {
      createSection.style.display = 'none';
      if (toggleBtn) {
        toggleBtn.classList.remove('active');
        toggleBtn.title = 'Show Create';
      }
    }
  }

  // Initialize toggle button
  function initToggle() {
    const toggleBtn = document.getElementById('createToggle');
    if (!toggleBtn) return;

    toggleBtn.addEventListener('mousedown', toggleCreate);
  }

  // Render the create handlers list
  function renderCreateList(overrideMessage) {
    const container = document.getElementById('createInputs');
    if (!container) return;

    if (overrideMessage) {
      container.innerHTML = `<div class="config-empty">${overrideMessage}</div>`;
      return;
    }

    // Check if PluginCreateUtils is available
    if (!window.PluginCreateUtils) {
      container.innerHTML = '<div class="config-empty">PluginCreateUtils not loaded</div>';
      return;
    }

    const registry = window.PluginCreateUtils.getAllHandlers();
    
    if (registry.size === 0) {
      container.innerHTML = '<div class="config-empty">No plugins have registered scene creation handlers.<br>Plugins can register handlers via PluginCreateUtils.registerSceneCreateHandler()</div>';
      return;
    }

    // Build the list grouped by plugin
    let html = '';
    for (const [pluginName, pluginData] of registry) {
      if (!pluginData.handlers || pluginData.handlers.length === 0) continue;

      html += `
        <div class="create-plugin-group" data-plugin-name="${escapeHtml(pluginName)}">
          <div class="create-plugin-header">${escapeHtml(pluginName)}</div>
          <div class="create-handler-list">
      `;

      for (const handler of pluginData.handlers) {
        const tooltip = handler.description ? `title="${escapeHtml(handler.description)}"` : '';
        html += `
          <div class="create-handler-row" data-plugin="${escapeHtml(pluginName)}" data-handler="${escapeHtml(handler.id)}">
            <span class="create-handler-label" ${tooltip}>${escapeHtml(handler.label)}</span>
            <button class="quick-action-btn create-handler-btn" ${tooltip}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Create</span>
            </button>
          </div>
        `;
      }

      html += '</div></div>';
    }

    container.innerHTML = html || '<div class="config-empty">No creation handlers registered</div>';

    // Add event listeners to buttons
    container.querySelectorAll('.create-handler-btn').forEach(btn => {
      btn.addEventListener('click', handleCreateClick);
    });
  }

  // Handle create button click
  async function handleCreateClick(e) {
    const row = e.target.closest('.create-handler-row');
    if (!row) return;

    const pluginName = row.dataset.plugin;
    const handlerId = row.dataset.handler;
    const btn = row.querySelector('.create-handler-btn');

    if (!pluginName || !handlerId) return;

    // Check OBS connection
    if (!window.obsAPI?.sceneCreate?.createScene) {
      window.uiHelpers?.logError('Scene creation API not available. Connect to OBS first.', 'create');
      return;
    }

    // Disable button and show loading state
    btn.disabled = true;
    const originalContent = btn.innerHTML;
    btn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 6v6l4 2"></path>
      </svg>
      <span>Creating...</span>
    `;

    try {
      const result = await window.PluginCreateUtils.executeHandler(pluginName, handlerId);
      
      if (result && result.sceneName) {
        window.uiHelpers?.logSuccess(
          `Created scene "${result.sceneName}" with ${result.created?.length || 0} sources`,
          'create'
        );
        
        // Add a helpful message about dragging
        if (result.created && result.created.length > 0) {
          window.uiHelpers?.logInfo(
            `Sources created: ${result.created.join(', ')}. Drag them into your scenes from the "${result.sceneName}" scene.`,
            'create'
          );
        }
      } else {
        window.uiHelpers?.logSuccess('Scene created successfully', 'create');
      }

      // Refresh scenes list if available
      if (window.uiLogic?.refreshScenes) {
        await window.uiLogic.refreshScenes();
      }

    } catch (err) {
      window.uiHelpers?.logError(`Failed to create scene: ${err.message}`, 'create');
      console.error('[CreateTab] Handler execution failed:', err);
    } finally {
      // Restore button state
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

  // Listen for registry updates from PluginCreateUtils
  function initRegistryListener() {
    window.addEventListener('plugincreateutils:registry-updated', () => {
      if (isCreateVisible) {
        renderCreateList();
      }
    });
  }

  // Refresh function exposed to window
  async function refresh() {
    if (isCreateVisible) {
      renderCreateList();
    }
  }

  // Public API
  window.createTabLogic = {
    init: initToggle,
    refresh,
    render: renderCreateList,
    setVisible
  };

  // Initialize when DOM is ready
  console.log('[Create] Document readyState:', document.readyState);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[Create] DOMContentLoaded fired');
      initToggle();
      initRegistryListener();
    });
  } else {
    console.log('[Create] DOM already loaded, initializing immediately');
    initToggle();
    initRegistryListener();
  }
  console.log('[Create] Script setup complete');
})();
