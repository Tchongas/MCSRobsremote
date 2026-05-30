// Config Toggle Logic - Handles CONFIG scene inputs
(function() {
  const CONFIG_SCENE_NAME = 'CONFIG';
  let configSceneItems = [];
  let isConfigVisible = false;

  // Toggle config section visibility
  function toggleConfig() {
    const configSection = document.getElementById('configSection');
    const toggleBtn = document.getElementById('configToggle');
    if (!configSection) return;

    isConfigVisible = !isConfigVisible;

    if (isConfigVisible) {
      configSection.style.display = 'block';
      toggleBtn.classList.add('active');
      toggleBtn.title = 'Hide Config';
      // Close Create tab if open (mutually exclusive)
      closeCreateTab();
      // Refresh config when showing (re-check scene exists)
      checkConfigScene(); // Don't await, let UI show immediately
    } else {
      configSection.style.display = 'none';
      toggleBtn.classList.remove('active');
      toggleBtn.title = 'Show Config';
    }
  }

  // Close Create tab if it's open
  function closeCreateTab() {
    const createSection = document.getElementById('createSection');
    const createToggleBtn = document.getElementById('createToggle');
    if (createSection && createSection.style.display === 'block') {
      createSection.style.display = 'none';
      if (createToggleBtn) {
        createToggleBtn.classList.remove('active');
        createToggleBtn.title = 'Show Create';
      }
      // Update create tab state if available
      if (window.createTabLogic?.setVisible) {
        window.createTabLogic.setVisible(false);
      }
    }
  }

  // Initialize toggle button
  function initToggle() {
    const toggleBtn = document.getElementById('configToggle');
    if (!toggleBtn) return;

    toggleBtn.addEventListener('mousedown', toggleConfig);
  }

  // Check for CONFIG scene and update UI
  async function checkConfigScene() {
    try {
      if (!window.obsAPI?.scenes?.get) return;

      const sceneList = await window.obsAPI.scenes.get();
      const scenes = sceneList?.scenes || [];
      const configScene = scenes.find(s => s.sceneName === CONFIG_SCENE_NAME);

      hasConfigScene = !!configScene;

      if (configScene) {
        await loadConfigSceneItems();
      } else {
        configSceneItems = [];
        renderConfigInputs();
      }
    } catch (err) {
      if (err && (err.code === 'OBS_NOT_CONNECTED' || err.code === 'OBS_URL_MISSING')) {
        hasConfigScene = false;
        configSceneItems = [];
        renderConfigInputs('Connect to OBS to load CONFIG scene');
        return;
      }
      hasConfigScene = false;
      configSceneItems = [];
      renderConfigInputs();
    }
  }

  // Load items from CONFIG scene that start with _
  async function loadConfigSceneItems() {
    try {
      if (!window.obsAPI?.sceneItems?.list) return;

      const res = await window.obsAPI.sceneItems.list(CONFIG_SCENE_NAME);
      const items = res && (res.sceneItems || res.items || res);
      if (!Array.isArray(items)) {
        configSceneItems = [];
        renderConfigInputs();
        return;
      }

      // Filter items that start with _ (check both sourceName and inputName)
      configSceneItems = items
        .filter(item => {
          const name = item.sourceName || item.inputName || '';
          return typeof name === 'string' && name.startsWith('_');
        })
        .sort((a, b) => {
          const nameA = a.sourceName || a.inputName || '';
          const nameB = b.sourceName || b.inputName || '';
          return nameA.localeCompare(nameB);
        });

      renderConfigInputs();
    } catch (err) {
      configSceneItems = [];
      renderConfigInputs();
    }
  }

  let hasConfigScene = false;

  // Render config inputs
  function renderConfigInputs(overrideEmptyMessage) {
    const container = document.getElementById('configInputs');
    if (!container) return;

    if (overrideEmptyMessage) {
      container.innerHTML = `<div class="config-empty">${overrideEmptyMessage}</div>`;
      return;
    }

    if (!hasConfigScene) {
      container.innerHTML = '<div class="config-empty">Create a scene named "CONFIG"<br>with text sources starting with _</div>';
      return;
    }

    if (configSceneItems.length === 0) {
      container.innerHTML = '<div class="config-empty">Add text sources starting with _<br>in the CONFIG scene</div>';
      return;
    }

    container.innerHTML = configSceneItems.map(item => {
      const sourceName = item.sourceName || item.inputName || '';
      const cleanName = sourceName.substring(1); // Remove leading _
      return `
        <div class="config-input-group" data-source-name="${sourceName}">
          <label class="config-input-label">${cleanName}</label>
          <input type="text" 
                 class="config-input-field" 
                 data-source-name="${sourceName}"
                 placeholder="Enter value...">
        </div>
      `;
    }).join('');

    // Add event listeners to inputs
    container.querySelectorAll('.config-input-field').forEach(input => {
      input.addEventListener('change', handleConfigInputChange);
      input.addEventListener('blur', handleConfigInputChange);
      // Load current value from OBS
      loadSourceValue(input.dataset.sourceName, input);
    });
  }

  const _labelForKind = (kind) => {
    const k = String(kind || '').toLowerCase();
    if (k === 'browser_source') return 'URL';
    if (k === 'image_source') return 'Path';
    if (k === 'text_gdiplus_v3') return 'Text';
    return 'Value';
  };

  // Load value from OBS source (text, browser URL, image path)
  async function loadSourceValue(sourceName, inputElement) {
    try {
      if (!window.obsAPI?.sources?.getSettings) return;

      const res = await window.obsAPI.sources.getSettings(sourceName);
      const kind = res?.inputKind || '';
      inputElement.dataset.sourceKind = kind;

      const group = inputElement.closest('.config-input-group');
      const label = group ? group.querySelector('.config-input-label') : null;
      if (label) {
        const base = String(sourceName || '').startsWith('_') ? String(sourceName || '').substring(1) : String(sourceName || '');
        label.textContent = `${base} (${_labelForKind(kind)})`;
      }

      if (String(kind).toLowerCase() === 'browser_source') {
        if (window.obsAPI?.browser?.getUrl) {
          const url = await window.obsAPI.browser.getUrl(sourceName);
          if (url !== null && url !== undefined) inputElement.value = String(url);
        }
        inputElement.type = 'url';
        inputElement.placeholder = 'https://';
        return;
      }

      if (String(kind).toLowerCase() === 'image_source') {
        const file = res?.inputSettings?.file ?? res?.inputSettings?.local_file ?? '';
        if (file) inputElement.value = String(file);
        inputElement.type = 'text';
        inputElement.placeholder = 'C:\\path\\to\\image.png';
        return;
      }

      const text = res?.inputSettings?.text ?? res?.settings?.text ?? '';
      if (text !== undefined && text !== null) inputElement.value = String(text);
    } catch (err) {
      if (err && (err.code === 'OBS_NOT_CONNECTED' || err.code === 'OBS_URL_MISSING')) {
        renderConfigInputs('Connect to OBS to load CONFIG scene');
      }
    }
  }

  // Handle input change - update OBS source
  async function handleConfigInputChange(e) {
    const sourceName = e.target.dataset.sourceName;
    const value = e.target.value;
    const kind = String(e.target.dataset.sourceKind || '').toLowerCase();

    try {
      if (kind === 'browser_source') {
        if (!window.obsAPI?.browser?.setUrl) return;
        await window.obsAPI.browser.setUrl(sourceName, value);
        window.uiHelpers?.logInfo(`Updated ${sourceName} URL`, 'config');
        return;
      }

      if (!window.obsAPI?.sources?.setSettings) return;

      if (kind === 'image_source') {
        await window.obsAPI.sources.setSettings(sourceName, { file: value });
        window.uiHelpers?.logInfo(`Updated ${sourceName} path`, 'config');
        return;
      }

      await window.obsAPI.sources.setSettings(sourceName, { text: value });
      window.uiHelpers?.logInfo(`Updated ${sourceName}: ${value}`, 'config');
    } catch (err) {
      window.uiHelpers?.logError(`Failed to update ${sourceName}: ${err.message}`, 'config');
    }
  }

  // Set visibility from external control (for mutual exclusivity)
  function setVisible(visible) {
    isConfigVisible = visible;
    const configSection = document.getElementById('configSection');
    const toggleBtn = document.getElementById('configToggle');
    if (!configSection) return;

    if (visible) {
      configSection.style.display = 'block';
      if (toggleBtn) {
        toggleBtn.classList.add('active');
        toggleBtn.title = 'Hide Config';
      }
      checkConfigScene();
    } else {
      configSection.style.display = 'none';
      if (toggleBtn) {
        toggleBtn.classList.remove('active');
        toggleBtn.title = 'Show Config';
      }
    }
  }

  // Public API
  window.configTabLogic = {
    init: initToggle,
    checkConfigScene,
    loadConfigSceneItems,
    setVisible,
    refresh: async () => {
      await checkConfigScene();
    }
  };

  // Initialize when DOM is ready
  console.log('[Config] Document readyState:', document.readyState);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[Config] DOMContentLoaded fired');
      initToggle();
    });
  } else {
    console.log('[Config] DOM already loaded, initializing immediately');
    initToggle();
  }
  console.log('[Config] Script setup complete');
})();
