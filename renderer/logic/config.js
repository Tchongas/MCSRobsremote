// Configuration management
(function() {
  function getStoredConfig() {
    const defaultConfig = {
      url: 'ws://localhost:4455',
      password: 'UQXZK2ZO2hnB8Und'
    };
    
    try {
      const stored = localStorage.getItem('obsConfig');
      return stored ? { ...defaultConfig, ...JSON.parse(stored) } : defaultConfig;
    } catch (e) {
      window.uiHelpers.log('⚠️ Error loading stored config, using defaults');
      return defaultConfig;
    }
  }

  function saveConfig(config) {
    try {
      localStorage.setItem('obsConfig', JSON.stringify(config));
      window.uiHelpers.log('✅ Configuration saved');
      return true;
    } catch (e) {
      window.uiHelpers.log('❌ Error saving configuration: ' + e.message);
      return false;
    }
  }

  function showSettingsModal() {
    const modal = document.getElementById('settingsModal');
    const urlInput = document.getElementById('obsUrl');
    const passwordInput = document.getElementById('obsPassword');
    
    if (!modal || !urlInput || !passwordInput) return;
    
    // Load current config
    const config = getStoredConfig();
    urlInput.value = config.url;
    passwordInput.value = config.password;
    
    modal.style.display = 'flex';
  }

  function hideSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.style.display = 'none';
  }

  function saveSettings() {
    const urlInput = document.getElementById('obsUrl');
    const passwordInput = document.getElementById('obsPassword');
    
    if (!urlInput || !passwordInput) return;
    
    const config = {
      url: urlInput.value.trim() || 'ws://localhost:4455',
      password: passwordInput.value.trim()
    };
    
    if (saveConfig(config)) {
      hideSettingsModal();
      window.uiHelpers.log('🔧 Settings updated. Reconnect to apply changes.');
    }
  }

  function resetSettings() {
    const urlInput = document.getElementById('obsUrl');
    const passwordInput = document.getElementById('obsPassword');
    
    if (!urlInput || !passwordInput) return;
    
    urlInput.value = 'ws://localhost:4455';
    passwordInput.value = 'UQXZK2ZO2hnB8Und';
  }

  // Export to global
  window.configLogic = {
    getStoredConfig,
    saveConfig,
    showSettingsModal,
    hideSettingsModal,
    saveSettings,
    resetSettings
  };
})();
