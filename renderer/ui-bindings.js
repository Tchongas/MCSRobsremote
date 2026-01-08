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

    const sourceSearch = document.getElementById('sourceSearch');
    const applySourceFilter = () => {
      const q = (sourceSearch && sourceSearch.value || '').trim().toLowerCase();
      const items = document.querySelectorAll('#dashboardItems .dash-item');
      items.forEach(el => {
        const name = el.dataset?.name || el.querySelector('.name')?.textContent?.toLowerCase() || '';
        const raw = el.dataset?.rawName || '';
        const match = !q || name.includes(q) || raw.includes(q);
        el.classList.toggle('is-hidden', !match);
      });
    };
    if (sourceSearch) {
      sourceSearch.addEventListener('input', applySourceFilter);
    }

    const connectBtn = document.getElementById('connect');
    const disconnectBtn = document.getElementById('disconnect');

    const player1Btn = document.getElementById('set_player1');
    const player2Btn = document.getElementById('set_player2');

    async function runPlayerSync(playerIndex) {
      try {
        if (!window.playerSyncLogic) {
          window.uiHelpers.logError('Player Sync module not loaded', 'playersync');
          return;
        }

        const current = window.playerSyncLogic.getIdentifier(playerIndex);
        let identifier = current;
        if (!identifier) {
          identifier = window.prompt(`Enter identifier for Player ${playerIndex}:`, '') || '';
          identifier = String(identifier).trim();
          if (!identifier) return;
          window.playerSyncLogic.setIdentifier(playerIndex, identifier);
        }

        await window.playerSyncLogic.syncPlayer(playerIndex);
      } catch (e) {
        window.uiHelpers.logError(`Player ${playerIndex} sync failed: ${e.message || e}`, 'playersync');
      }
    }

    if (player1Btn) {
      player1Btn.addEventListener('click', () => runPlayerSync(1));
    }
    if (player2Btn) {
      player2Btn.addEventListener('click', () => runPlayerSync(2));
    }

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
        // Reset scene UI
        setSceneBadge('-');
        const select = document.getElementById('sceneSelect');
        if (select) {
          select.value = '';
          select.disabled = true;
        }
        // Clear dashboard
        const container = document.getElementById('dashboardItems');
        if (container) {
          container.classList.add('placeholder');
          container.textContent = 'Disconnected. Connect to load items...';
        }
        window.uiHelpers.logSuccess('Disconnected from OBS', 'conn');
      } catch (e) {
        window.uiHelpers.logError('Failed to disconnect: ' + e.message, 'conn');
      }
    });

    // Streaming controls
    document.getElementById('start').addEventListener('click', async () => {
      try {
        await window.obsAPI.streaming.start();
        window.uiHelpers.logSuccess('Streaming started', 'stream');
      } catch (e) {
        window.uiHelpers.logError('Failed to start streaming: ' + e.message, 'stream');
      }
    });

    document.getElementById('stop').addEventListener('click', async () => {
      try {
        await window.obsAPI.streaming.stop();
        window.uiHelpers.logSuccess('Streaming stopped', 'stream');
      } catch (e) {
        window.uiHelpers.logError('Failed to stop streaming: ' + e.message, 'stream');
      }
    });

    // Refresh scenes button
    document.getElementById('refreshScenes').addEventListener('click', refreshScenes);

    // Immediate scene switching on selection change
    document.getElementById('sceneSelect').addEventListener('change', async (e) => {
      const sceneName = e.target.value;
      if (!sceneName) return;
      try {
        await window.obsAPI.scenes.change(sceneName);
        window.uiHelpers.logSuccess('Switched scene to: ' + sceneName, 'scenes');
        setSceneBadge(sceneName);
        await loadDashboardItems(sceneName);
      } catch (e) {
        window.uiHelpers.logError('Failed to switch scene: ' + e.message, 'scenes');
      }
    });

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

    // Close modal when clicking outside
    document.getElementById('settingsModal').addEventListener('click', (e) => {
      if (e.target.id === 'settingsModal') {
        hideSettingsModal();
      }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        hideSettingsModal();
      }
    });

    // Set up real-time event handling for multi-user synchronization
    window.obsAPI.onEvent((eventData) => {
      const { type, data } = eventData;
      
      switch (type) {
        case 'scene-changed':
          // Update scene badge and selection
          setSceneBadge(data.sceneName);
          const sceneSelect = document.getElementById('sceneSelect');
          if (sceneSelect && sceneSelect.value !== data.sceneName) {
            sceneSelect.value = data.sceneName;
            // Load dashboard items for the new scene
            loadDashboardItems(data.sceneName).then(() => {
              const el = document.getElementById('sourceSearch');
              if (el) {
                el.dispatchEvent(new Event('input'));
              }
            });
          }
          window.uiHelpers.logInfo(`Scene changed to: ${data.sceneName} (remote)`, 'scenes');
          break;

        case 'scene-item-changed':
          // Update scene item visibility in dashboard
          updateSceneItemVisibility(data.sceneName, data.sceneItemId, data.sceneItemEnabled);
          window.uiHelpers.logInfo(`Item ${data.sceneItemId} ${data.sceneItemEnabled ? 'shown' : 'hidden'} (remote)`, 'dashboard');
          break;

        case 'scene-list-changed':
          // Refresh the scene list
          refreshScenes();
          window.uiHelpers.logInfo('Scene list updated (remote)', 'scenes');
          break;

        case 'scene-items-reordered':
          // Reload dashboard items for the affected scene
          const currentScene = document.getElementById('sceneSelect')?.value;
          if (currentScene === data.sceneName) {
            loadDashboardItems(data.sceneName);
          }
          window.uiHelpers.logInfo(`Scene items reordered in: ${data.sceneName} (remote)`, 'dashboard');
          break;

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
    function updateSceneItemVisibility(sceneName, sceneItemId, enabled) {
      const currentScene = document.getElementById('sceneSelect')?.value;
      if (currentScene !== sceneName) return;

      // Find the checkbox for this scene item
      const dashboardItems = document.getElementById('dashboardItems');
      if (!dashboardItems) return;

      const items = dashboardItems.querySelectorAll('.dash-item');
      items.forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
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
