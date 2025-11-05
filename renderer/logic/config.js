// Configuration management with multi-profile support
(function() {
  // Safe logging helper
  function safeLog(message) {
    if (window.uiHelpers && window.uiHelpers.log) {
      window.uiHelpers.log(message);
    } else {
      console.log(message);
    }
  }
  
  // Profile management
  function getProfiles() {
    try {
      const stored = localStorage.getItem('obsProfiles');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      safeLog('⚠️ Error loading profiles');
    }
    
    // Default profile
    return {
      'Default': {
        name: 'Default',
        url: 'ws://localhost:4455',
        password: 'UQXZK2ZO2hnB8Und'
      }
    };
  }

  function saveProfiles(profiles) {
    try {
      localStorage.setItem('obsProfiles', JSON.stringify(profiles));
      return true;
    } catch (e) {
      safeLog('❌ Error saving profiles: ' + e.message);
      return false;
    }
  }

  function getActiveProfileName() {
    return localStorage.getItem('activeProfile') || 'Default';
  }

  function setActiveProfile(profileName) {
    localStorage.setItem('activeProfile', profileName);
  }

  function getStoredConfig() {
    const profiles = getProfiles();
    const activeProfileName = getActiveProfileName();
    const profile = profiles[activeProfileName];
    
    if (profile) {
      return { url: profile.url, password: profile.password };
    }
    
    // Fallback to default
    return {
      url: 'ws://localhost:4455',
      password: 'UQXZK2ZO2hnB8Und'
    };
  }

  function saveConfig(config) {
    const profiles = getProfiles();
    const activeProfileName = getActiveProfileName();
    
    if (profiles[activeProfileName]) {
      profiles[activeProfileName].url = config.url;
      profiles[activeProfileName].password = config.password;
      
      if (saveProfiles(profiles)) {
        safeLog('✅ Configuration saved');
        return true;
      }
    }
    
    return false;
  }

  function createProfile(name, url, password) {
    const profiles = getProfiles();
    
    if (profiles[name]) {
      safeLog('❌ Profile "' + name + '" already exists');
      return false;
    }
    
    profiles[name] = { name, url, password };
    
    if (saveProfiles(profiles)) {
      safeLog('✅ Profile "' + name + '" created');
      return true;
    }
    
    return false;
  }

  function deleteProfile(name) {
    if (name === 'Default') {
      safeLog('❌ Cannot delete Default profile');
      return false;
    }
    
    const profiles = getProfiles();
    
    if (!profiles[name]) {
      safeLog('❌ Profile "' + name + '" not found');
      return false;
    }
    
    delete profiles[name];
    
    // If deleting active profile, switch to Default
    if (getActiveProfileName() === name) {
      setActiveProfile('Default');
    }
    
    if (saveProfiles(profiles)) {
      safeLog('✅ Profile "' + name + '" deleted');
      return true;
    }
    
    return false;
  }

  function switchProfile(name) {
    const profiles = getProfiles();
    
    if (!profiles[name]) {
      safeLog('❌ Profile "' + name + '" not found');
      return false;
    }
    
    setActiveProfile(name);
    safeLog('✅ Switched to profile "' + name + '"');
    return true;
  }

  function updateProfileList() {
    const profileSelect = document.getElementById('profileSelect');
    if (!profileSelect) return;
    
    const profiles = getProfiles();
    const activeProfileName = getActiveProfileName();
    
    profileSelect.innerHTML = '';
    
    Object.keys(profiles).forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      if (name === activeProfileName) {
        option.selected = true;
      }
      profileSelect.appendChild(option);
    });
  }

  function showSettingsModal() {
    const modal = document.getElementById('settingsModal');
    const urlInput = document.getElementById('obsUrl');
    const passwordInput = document.getElementById('obsPassword');
    
    if (!modal || !urlInput || !passwordInput) return;
    
    // Update profile list
    updateProfileList();
    
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
    const profileNameInput = document.getElementById('profileName');
    const profileNameGroup = document.getElementById('profileNameGroup');
    const profileSelect = document.getElementById('profileSelect');
    
    if (!urlInput || !passwordInput) return;
    
    const url = urlInput.value.trim() || 'ws://localhost:4455';
    const password = passwordInput.value.trim();
    
    // Check if we're creating a new profile
    if (profileNameInput && profileNameInput.dataset.creatingNew === 'true') {
      const profileName = profileNameInput.value.trim();
      
      if (!profileName) {
        alert('Please enter a profile name');
        return;
      }
      
      // Create new profile
      if (createProfile(profileName, url, password)) {
        // Switch to the new profile
        setActiveProfile(profileName);
        updateProfileList();
        
        // Hide profile name field and re-enable selector
        profileNameGroup.style.display = 'none';
        profileNameInput.value = '';
        delete profileNameInput.dataset.creatingNew;
        if (profileSelect) {
          profileSelect.disabled = false;
        }
        
        hideSettingsModal();
        safeLog('🔧 New profile created and activated. Reconnect to apply changes.');
      }
    } else {
      // Update existing profile
      const config = { url, password };
      
      if (saveConfig(config)) {
        hideSettingsModal();
        safeLog('🔧 Settings updated. Reconnect to apply changes.');
      }
    }
  }

  function resetSettings() {
    const urlInput = document.getElementById('obsUrl');
    const passwordInput = document.getElementById('obsPassword');
    
    if (!urlInput || !passwordInput) return;
    
    urlInput.value = 'ws://localhost:4455';
    passwordInput.value = 'UQXZK2ZO2hnB8Und';
  }

  function handleProfileChange() {
    const profileSelect = document.getElementById('profileSelect');
    if (!profileSelect) return;
    
    const selectedProfile = profileSelect.value;
    
    if (switchProfile(selectedProfile)) {
      // Load the new profile's config
      const config = getStoredConfig();
      const urlInput = document.getElementById('obsUrl');
      const passwordInput = document.getElementById('obsPassword');
      
      if (urlInput && passwordInput) {
        urlInput.value = config.url;
        passwordInput.value = config.password;
      }
    }
  }

  function showNewProfileDialog() {
    // Show profile name input field
    const profileNameGroup = document.getElementById('profileNameGroup');
    const profileNameInput = document.getElementById('profileName');
    const profileSelect = document.getElementById('profileSelect');
    const urlInput = document.getElementById('obsUrl');
    const passwordInput = document.getElementById('obsPassword');
    
    if (!profileNameGroup || !profileNameInput) return;
    
    // Show the profile name field
    profileNameGroup.style.display = 'block';
    
    // Clear all inputs for new profile
    profileNameInput.value = '';
    urlInput.value = 'ws://localhost:4455';
    passwordInput.value = '';
    
    // Disable profile selector while creating new
    if (profileSelect) {
      profileSelect.disabled = true;
    }
    
    // Mark that we're in "new profile" mode
    profileNameInput.dataset.creatingNew = 'true';
    
    safeLog('🆕 Enter details for new profile');
  }

  function handleDeleteProfile() {
    const profileSelect = document.getElementById('profileSelect');
    if (!profileSelect) return;
    
    const selectedProfile = profileSelect.value;
    
    if (selectedProfile === 'Default') {
      alert('Cannot delete the Default profile');
      return;
    }
    
    if (confirm('Delete profile "' + selectedProfile + '"?')) {
      if (deleteProfile(selectedProfile)) {
        updateProfileList();
        // Reload current profile config
        const config = getStoredConfig();
        const urlInput = document.getElementById('obsUrl');
        const passwordInput = document.getElementById('obsPassword');
        
        if (urlInput && passwordInput) {
          urlInput.value = config.url;
          passwordInput.value = config.password;
        }
      }
    }
  }

  // Export to global
  window.configLogic = {
    getStoredConfig,
    saveConfig,
    showSettingsModal,
    hideSettingsModal,
    saveSettings,
    resetSettings,
    getProfiles,
    getActiveProfileName,
    createProfile,
    deleteProfile,
    switchProfile,
    updateProfileList,
    handleProfileChange,
    showNewProfileDialog,
    handleDeleteProfile
  };
})();
