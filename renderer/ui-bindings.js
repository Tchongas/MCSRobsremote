// DOM event bindings that use uiLogic and window.obsAPI
(function() {
  // Wait for uiLogic to be ready before setting up bindings
  function initializeBindings() {
    const { log,
            setConnBadge, 
            setSceneBadge, 
            setIndicator, 
            refreshScenes, 
            loadDashboardItems, 
            getStoredConfig, 
            showSettingsModal, 
            hideSettingsModal, 
            saveSettings, 
            resetSettings, 
            handleProfileChange, 
            showNewProfileDialog, 
            handleDeleteProfile 
          } = window.uiLogic;

    // ── Source search bar ──
    const sourceSearch = document.getElementById('sourceSearch');
    const applySourceFilter = () => {
      const q = (sourceSearch && sourceSearch.value || '').trim().toLowerCase();
      const items = document.querySelectorAll('#dashboardItems .dash-item');
      let visibleCount = 0;
      items.forEach(el => {
        const name = el.dataset?.name || el.querySelector('.name')?.textContent?.toLowerCase() || '';
        const raw = el.dataset?.rawName || '';
        const match = !q || name.includes(q) || raw.includes(q);
        el.classList.toggle('is-hidden', !match);
        if (match) visibleCount++;
      });
    };
    const clearSearch = () => {
      if (sourceSearch) {
        sourceSearch.value = '';
        applySourceFilter();
      }
    };
    if (sourceSearch) {
      sourceSearch.addEventListener('input', applySourceFilter);
      // Escape clears the search and blurs
      sourceSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          clearSearch();
          sourceSearch.blur();
        }
      });
    }
    // ── Global keyboard shortcuts ──
    document.addEventListener('keydown', (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';

      // Ctrl+F / Cmd+F — focus search bar
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        if (sourceSearch) { sourceSearch.focus(); sourceSearch.select(); }
        return;
      }
      // Ctrl+G — focus scene list for keyboard navigation
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        if (window.sceneLogic?.focusSceneList) window.sceneLogic.focusSceneList();
        return;
      }
      // Ctrl+Enter — transition scene (change scene)
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (window.sceneLogic?.transitionScene) window.sceneLogic.transitionScene();
        return;
      }
      // F5 — refresh scenes + dashboard
      if (e.key === 'F5') {
        e.preventDefault();
        if (window.sceneLogic?.refreshScenes) window.sceneLogic.refreshScenes();
        return;
      }
      // Escape — close settings modal if open, or blur active input
      if (e.key === 'Escape' && !isInput) {
        const modal = document.getElementById('settingsModal');
        if (modal && modal.style.display !== 'none') {
          e.preventDefault();
          if (window.configLogic?.hideSettingsModal) window.configLogic.hideSettingsModal();
          return;
        }
      }
      // F1 — open settings / info
      if (e.key === 'F1') {
        e.preventDefault();
        if (window.configLogic?.showSettingsModal) window.configLogic.showSettingsModal('info');
        return;
      }
    });

    const connectBtn = document.getElementById('connect');
    const disconnectBtn = document.getElementById('disconnect');

    // Connect to OBS
    connectBtn.addEventListener('click', async () => {
      window.uiHelpers.logInfo('Connecting to OBS…', 'conn');
      try {
        const config = getStoredConfig();
        const result = await window.obsAPI.connect(config.url, config.password);
        window.uiHelpers.logSuccess('Connected to OBS', 'conn');
        window.uiHelpers.logInfo('Connection details: ' + JSON.stringify(result, null, 2), 'conn');
        setConnBadge(true);
        setIndicator(connectBtn, 'green');

        // Auto-refresh scenes after successful connection
        window.uiHelpers.logInfo('Loading available scenes…', 'scenes');
        await refreshScenes();

      } catch (e) {
        window.uiHelpers.logError('Connection failed: ' + e.message, 'conn');
        setConnBadge(false);
        setIndicator(connectBtn, 'red');

        if (e.message.includes('ETIMEDOUT') || e.message.includes('connect ECONNREFUSED')) {
          window.uiHelpers.logInfo('Troubleshooting:', 'conn');
          window.uiHelpers.logInfo('1. Make sure OBS Studio is running', 'conn');
          window.uiHelpers.logInfo('2. In OBS: Tools → WebSocket Server Settings', 'conn');
          window.uiHelpers.logInfo('3. Enable "WebSocket server"', 'conn');
          window.uiHelpers.logInfo('4. Check connection settings in Settings (⚙️)', 'conn');
          window.uiHelpers.logInfo('5. Verify network connectivity', 'conn');
        }
      }
    });

    // Disconnect from OBS
    disconnectBtn.addEventListener('click', async () => {
      window.uiHelpers.logInfo('Disconnecting from OBS…', 'conn');
      try {
        await window.obsAPI.disconnect();
        setConnBadge(false);
        setIndicator(connectBtn, 'red');
        // Reset stream toggle
        const streamToggle = document.getElementById('streamToggle');
        if (streamToggle) {
          streamToggle.dataset.streaming = 'false';
          streamToggle.querySelector('.stream-toggle-text').textContent = 'Start Stream';
        }
        // Reset scene UI
        setSceneBadge('-');
        const sceneList = document.getElementById('sceneList');
        if (sceneList) {
          sceneList.innerHTML = '<div class="scene-list-empty">Connect to load scenes</div>';
        }
        const select = document.getElementById('sceneSelect');
        if (select) {
          select.value = '';
          select.disabled = true;
        }
        // Clear dashboard with proper empty state
        const container = document.getElementById('dashboardItems');
        if (container) {
          container.classList.add('placeholder');
          container.innerHTML = `
            <div class="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <line x1="1" y1="1" x2="23" y2="23"></line>
                <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
                <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
                <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
                <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                <line x1="12" y1="20" x2="12.01" y2="20"></line>
              </svg>
              <p>Connect to OBS to view sources</p>
            </div>
          `;
        }
        window.uiHelpers.logSuccess('Disconnected from OBS', 'conn');
      } catch (e) {
        window.uiHelpers.logError('Failed to disconnect: ' + e.message, 'conn');
      }
    });

    // Stream toggle button
    const streamToggle = document.getElementById('streamToggle');
    if (streamToggle) {
      streamToggle.addEventListener('click', async () => {
        const isStreaming = streamToggle.dataset.streaming === 'true';
        try {
          if (isStreaming) {
            await window.obsAPI.streaming.stop();
            streamToggle.dataset.streaming = 'false';
            streamToggle.querySelector('.stream-toggle-text').textContent = 'Start Stream';
            window.uiHelpers.logSuccess('Streaming stopped', 'stream');
          } else {
            await window.obsAPI.streaming.start();
            streamToggle.dataset.streaming = 'true';
            streamToggle.querySelector('.stream-toggle-text').textContent = 'Stop Stream';
            window.uiHelpers.logSuccess('Streaming started', 'stream');
          }
        } catch (e) {
          window.uiHelpers.logError('Stream toggle failed: ' + e.message, 'stream');
        }
      });
    }

    // Refresh scenes button
    document.getElementById('refreshScenes').addEventListener('click', refreshScenes);

    // Hidden select change — select scene for preview (studio mode)
    document.getElementById('sceneSelect').addEventListener('change', async (e) => {
      const sceneName = e.target.value;
      if (!sceneName) return;
      clearSearch();
      if (window.sceneLogic?.selectScene) {
        await window.sceneLogic.selectScene(sceneName);
      }
    });

    // Transition button — push preview scene to program (go live)
    const transitionBtn = document.getElementById('transitionBtn');
    if (transitionBtn) {
      transitionBtn.addEventListener('click', async () => {
        clearSearch();
        if (window.sceneLogic?.transitionScene) {
          await window.sceneLogic.transitionScene();
        }
      });
    }

    // Settings modal event handlers
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', showSettingsModal);
    } else {
      console.error('settings button not found');
    }

    const closeSettings = document.getElementById('closeSettings');
    if (closeSettings) {
      closeSettings.addEventListener('click', hideSettingsModal);
    } else {
      console.error('close settings button not found');
    }

    const saveSettingsBtn = document.getElementById('saveSettings');
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', saveSettings);
    } else {
      console.error('save settings button not found');
    }

    const resetSettingsBtn = document.getElementById('resetSettings');
    if (resetSettingsBtn) {
      resetSettingsBtn.addEventListener('click', resetSettings);
    } else {
      console.error('reset settings button not found');
    }
    
    // Profile management event handlers
    const profileSelect = document.getElementById('profileSelect');
    const newProfileBtn = document.getElementById('newProfile');
    const deleteProfileBtn = document.getElementById('deleteProfile');
    
    if (profileSelect) {
      profileSelect.addEventListener('change', handleProfileChange);
    }
    if (newProfileBtn) {
      newProfileBtn.addEventListener('click', showNewProfileDialog);
    }
    if (deleteProfileBtn) {
      deleteProfileBtn.addEventListener('click', handleDeleteProfile);
    }

    // Clear console button
    const clearConsoleBtn = document.getElementById('clearConsole');
    if (clearConsoleBtn) {
      clearConsoleBtn.addEventListener('click', () => {
        window.uiHelpers.clearConsole();
      });
    }

    // Open plugin folder button
    const openPluginFolderBtn = document.getElementById('openPluginFolder');
    if (openPluginFolderBtn) {
      openPluginFolderBtn.addEventListener('click', async () => {
        try {
          if (window.pluginAPI?.openPluginFolder) {
            const dir = await window.pluginAPI.openPluginFolder();
            window.uiHelpers.logInfo('Opened plugins folder: ' + dir, 'plugin');
          } else {
            window.uiHelpers.logError('Plugin API not available', 'plugin');
          }
        } catch (e) {
          window.uiHelpers.logError('Failed to open plugins folder: ' + e.message, 'plugin');
        }
      });
    }

    // Quick refresh button (refreshes scenes and dashboard)
    const quickRefreshBtn = document.getElementById('quickRefresh');
    if (quickRefreshBtn) {
      quickRefreshBtn.addEventListener('click', async () => {
        window.uiHelpers.logInfo('Refreshing...', 'system');
        try {
          // refreshScenes already loads dashboard items for the current scene
          await refreshScenes();
          window.uiHelpers.logSuccess('Refresh complete', 'system');
        } catch (e) {
          window.uiHelpers.logError('Refresh failed: ' + e.message, 'system');
        }
      });
    }

    // Set up real-time event handling for multi-user synchronization
    window.obsAPI.onEvent((eventData) => {
      const { type, data } = eventData;
      
      switch (type) {
        case 'scene-changed':
          // Remote program scene change — update program state and badge,
          // but do NOT change what we're previewing (studio mode)
          setSceneBadge(data.sceneName);
          if (window.sceneLogic?.updateProgramScene) {
            window.sceneLogic.updateProgramScene(data.sceneName);
          }
          window.uiHelpers.logInfo(`Live scene: ${data.sceneName} (remote)`, 'scenes');
          break;

        case 'scene-item-changed': {
          // Update scene item visibility — only if it's the scene we're previewing
          const previewScene = window.sceneLogic?.getPreviewScene?.() || document.getElementById('sceneSelect')?.value;
          updateSceneItemVisibility(previewScene, data.sceneItemId, data.sceneItemEnabled);
          window.uiHelpers.logInfo(`Item ${data.sceneItemId} ${data.sceneItemEnabled ? 'shown' : 'hidden'} (remote)`, 'dashboard');
          break;
        }

        case 'scene-list-changed':
          // Refresh the scene list sidebar (also reloads dashboard for preview scene)
          refreshScenes();
          window.uiHelpers.logInfo('Scene list updated (remote)', 'scenes');
          break;

        case 'scene-items-reordered': {
          // Reload dashboard only if the reordered scene is the one we're previewing
          const previewScene2 = window.sceneLogic?.getPreviewScene?.() || document.getElementById('sceneSelect')?.value;
          if (previewScene2 === data.sceneName) {
            loadDashboardItems(data.sceneName);
          }
          window.uiHelpers.logInfo(`Scene items reordered in: ${data.sceneName} (remote)`, 'dashboard');
          break;
        }

        case 'scene-item-created': {
          // A source was added — refresh dashboard if it's the scene we're previewing
          const previewScene3 = window.sceneLogic?.getPreviewScene?.() || document.getElementById('sceneSelect')?.value;
          if (previewScene3 === data.sceneName) {
            loadDashboardItems(data.sceneName);
          }
          window.uiHelpers.logInfo(`Source added: ${data.sourceName} in ${data.sceneName} (remote)`, 'dashboard');
          break;
        }

        case 'scene-item-removed': {
          // A source was removed — refresh dashboard if it's the scene we're previewing
          const previewScene4 = window.sceneLogic?.getPreviewScene?.() || document.getElementById('sceneSelect')?.value;
          if (previewScene4 === data.sceneName) {
            loadDashboardItems(data.sceneName);
          }
          window.uiHelpers.logInfo(`Source removed: ${data.sourceName} from ${data.sceneName} (remote)`, 'dashboard');
          break;
        }

        case 'input-mute-changed':
          // Update microphone UI in dashboard if present
          if (window.uiLogic.updateMicrophoneMuteState) {
            window.uiLogic.updateMicrophoneMuteState(data.inputName, data.inputMuted);
          }
          window.uiHelpers.logInfo(`Input ${data.inputName} ${data.inputMuted ? 'muted' : 'unmuted'} (remote)`, 'audio');
          break;
        case 'input-volume-changed':
          // Broadcast to handlers to update any volume sliders
          if (window.HandlerRegistry) {
            window.HandlerRegistry.handleRemoteUpdate(data.inputName, 'input-volume-changed', data);
          }
          window.uiHelpers.logInfo(`Volume changed for ${data.inputName} to ${Math.round((data.inputVolumeMul ?? 0) * 100)}% (remote)`, 'audio');
          break;
      }
    });

    // Helper function to update scene item visibility without full reload
    function updateSceneItemVisibility(activeSceneName, sceneItemId, enabled) {
      // Find the checkbox for this scene item by sceneItemId data attribute
      const dashboardItems = document.getElementById('dashboardItems');
      if (!dashboardItems) return;

      // Use the data attribute on the dash-item for faster lookup
      const item = dashboardItems.querySelector(`.dash-item[data-scene-item-id="${sceneItemId}"]`);
      if (item) {
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox) checkbox.checked = enabled;
        return;
      }

      // Fallback: search by checkbox dataset
      const items = dashboardItems.querySelectorAll('.dash-item');
      items.forEach(el => {
        const checkbox = el.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.dataset && checkbox.dataset.sceneItemId == sceneItemId) {
          checkbox.checked = enabled;
        }
      });
    }
  }

  // Initialize bindings when uiLogic is ready
  if (window.uiLogic) {
    initializeBindings();
  } else {
    window.addEventListener('uiLogicReady', initializeBindings);
  }
})();
