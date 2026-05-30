// Configuration management with multi-profile support
(function() {
  const APPEARANCE_STORAGE_KEY = 'obsAppearanceSettings';
  const DEFAULT_APPEARANCE = {
    fontScale: 100,
    sidebarScale: 90,
    sceneScale: 100,
    sceneContainerHeight: 420,
    dashboardRowScale: 105,
    pluginScale: 100,
    consoleFontSize: 12,
    dashboardEmojis: true,
    highContrast: false,
    reducedMotion: true,
    hideConsole: false,
    hideStreamControls: false,
    hideDashboard: false
  };

  // Safe logging helper
  function safeLog(message) {
    if (window.uiHelpers && window.uiHelpers.logInfo) {
      window.uiHelpers.logInfo(message, 'config');
    } else if (window.uiHelpers && window.uiHelpers.log) {
      window.uiHelpers.log(message);
    } else {
      console.log(message);
    }
  }

  function sanitizeAppearanceSettings(raw) {
    const input = raw || {};
    const toSteppedScale = (value, fallback, min, max, step) => {
      const n = Number(value);
      if (!Number.isFinite(n)) return fallback;
      const snapped = Math.round(n / step) * step;
      return Math.min(max, Math.max(min, snapped));
    };

    const parsedScale = Number(input.fontScale);
    const fontScale = Number.isFinite(parsedScale)
      ? Math.min(140, Math.max(90, Math.round(parsedScale / 5) * 5))
      : DEFAULT_APPEARANCE.fontScale;

    return {
      fontScale,
      sidebarScale: toSteppedScale(input.sidebarScale, DEFAULT_APPEARANCE.sidebarScale, 85, 130, 5),
      sceneScale: toSteppedScale(input.sceneScale, DEFAULT_APPEARANCE.sceneScale, 85, 140, 5),
      sceneContainerHeight: toSteppedScale(input.sceneContainerHeight, DEFAULT_APPEARANCE.sceneContainerHeight, 220, 760, 20),
      dashboardRowScale: toSteppedScale(input.dashboardRowScale, DEFAULT_APPEARANCE.dashboardRowScale, 75, 130, 5),
      pluginScale: toSteppedScale(input.pluginScale, DEFAULT_APPEARANCE.pluginScale, 85, 130, 5),
      consoleFontSize: toSteppedScale(input.consoleFontSize, DEFAULT_APPEARANCE.consoleFontSize, 10, 18, 1),
      dashboardEmojis: input.dashboardEmojis !== false,
      highContrast: !!input.highContrast,
      reducedMotion: !!input.reducedMotion,
      hideConsole: !!input.hideConsole,
      hideStreamControls: !!input.hideStreamControls,
      hideDashboard: !!input.hideDashboard
    };
  }

  function getAppearanceSettings() {
    try {
      const raw = localStorage.getItem(APPEARANCE_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_APPEARANCE };
      return sanitizeAppearanceSettings(JSON.parse(raw));
    } catch (_) {
      return { ...DEFAULT_APPEARANCE };
    }
  }

  function persistAppearanceSettings(settings) {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(settings));
  }

  function applyAppearanceSettings(settings) {
    const safe = sanitizeAppearanceSettings(settings);
    const root = document.documentElement;
    const mainLayout = document.querySelector('.main-layout');

    root.style.setProperty('--ui-zoom', String(safe.fontScale / 100));
    root.style.setProperty('--sidebar-scale', String(safe.sidebarScale / 100));
    root.style.setProperty('--scene-scale', String(safe.sceneScale / 100));
    root.style.setProperty('--scene-container-height', `${safe.sceneContainerHeight}px`);
    root.style.setProperty('--dashboard-row-scale', String(safe.dashboardRowScale / 100));
    root.style.setProperty('--plugin-scale', String(safe.pluginScale / 100));
    root.style.setProperty('--console-font-size', `${safe.consoleFontSize}px`);

    if (safe.dashboardEmojis) root.removeAttribute('data-dashboard-emoji');
    else root.setAttribute('data-dashboard-emoji', 'off');

    if (safe.hideConsole) root.setAttribute('data-hide-console', 'true');
    else root.removeAttribute('data-hide-console');

    if (safe.hideStreamControls) root.setAttribute('data-hide-stream-controls', 'true');
    else root.removeAttribute('data-hide-stream-controls');

    if (safe.hideDashboard) root.setAttribute('data-hide-dashboard', 'true');
    else root.removeAttribute('data-hide-dashboard');

    if (mainLayout) {
      if (safe.hideDashboard) {
        mainLayout.style.gridTemplateColumns = 'var(--sidebar-width) minmax(0, 1fr)';
      } else {
        mainLayout.style.removeProperty('grid-template-columns');
        if (window.resizeLogic && typeof window.resizeLogic.loadSizes === 'function') {
          window.resizeLogic.loadSizes();
        }
      }
    }

    if (safe.highContrast) {
      root.setAttribute('data-contrast', 'high');
    } else {
      root.removeAttribute('data-contrast');
    }

    if (safe.reducedMotion) {
      root.setAttribute('data-motion', 'reduced');
    } else {
      root.removeAttribute('data-motion');
    }

    if (window.resizeLogic && typeof window.resizeLogic.updateHandlePositions === 'function') {
      window.resizeLogic.updateHandlePositions();
    }

    return safe;
  }

  function syncAppearanceControls(settings) {
    const safe = sanitizeAppearanceSettings(settings);
    const scaleInput = document.getElementById('appearanceFontScale');
    const scaleValue = document.getElementById('appearanceFontScaleValue');
    const sidebarScaleInput = document.getElementById('appearanceSidebarScale');
    const sidebarScaleValue = document.getElementById('appearanceSidebarScaleValue');
    const sceneScaleInput = document.getElementById('appearanceSceneScale');
    const sceneScaleValue = document.getElementById('appearanceSceneScaleValue');
    const sceneContainerHeightInput = document.getElementById('appearanceSceneContainerHeight');
    const sceneContainerHeightValue = document.getElementById('appearanceSceneContainerHeightValue');
    const dashboardRowScaleInput = document.getElementById('appearanceDashboardRowScale');
    const dashboardRowScaleValue = document.getElementById('appearanceDashboardRowScaleValue');
    const pluginScaleInput = document.getElementById('appearancePluginScale');
    const pluginScaleValue = document.getElementById('appearancePluginScaleValue');
    const consoleFontSizeInput = document.getElementById('appearanceConsoleFontSize');
    const consoleFontSizeValue = document.getElementById('appearanceConsoleFontSizeValue');
    const dashboardEmojisInput = document.getElementById('appearanceDashboardEmojis');
    const highContrastInput = document.getElementById('appearanceHighContrast');
    const reducedMotionInput = document.getElementById('appearanceReducedMotion');
    const hideConsoleInput = document.getElementById('appearanceHideConsole');
    const hideStreamControlsInput = document.getElementById('appearanceHideStreamControls');
    const hideDashboardInput = document.getElementById('appearanceHideDashboard');

    if (scaleInput) scaleInput.value = String(safe.fontScale);
    if (scaleValue) scaleValue.textContent = `${safe.fontScale}%`;
    if (sidebarScaleInput) sidebarScaleInput.value = String(safe.sidebarScale);
    if (sidebarScaleValue) sidebarScaleValue.textContent = `${safe.sidebarScale}%`;
    if (sceneScaleInput) sceneScaleInput.value = String(safe.sceneScale);
    if (sceneScaleValue) sceneScaleValue.textContent = `${safe.sceneScale}%`;
    if (sceneContainerHeightInput) sceneContainerHeightInput.value = String(safe.sceneContainerHeight);
    if (sceneContainerHeightValue) sceneContainerHeightValue.textContent = `${safe.sceneContainerHeight}px`;
    if (dashboardRowScaleInput) dashboardRowScaleInput.value = String(safe.dashboardRowScale);
    if (dashboardRowScaleValue) dashboardRowScaleValue.textContent = `${safe.dashboardRowScale}%`;
    if (pluginScaleInput) pluginScaleInput.value = String(safe.pluginScale);
    if (pluginScaleValue) pluginScaleValue.textContent = `${safe.pluginScale}%`;
    if (consoleFontSizeInput) consoleFontSizeInput.value = String(safe.consoleFontSize);
    if (consoleFontSizeValue) consoleFontSizeValue.textContent = `${safe.consoleFontSize}px`;
    if (dashboardEmojisInput) dashboardEmojisInput.checked = safe.dashboardEmojis;
    if (highContrastInput) highContrastInput.checked = safe.highContrast;
    if (reducedMotionInput) reducedMotionInput.checked = safe.reducedMotion;
    if (hideConsoleInput) hideConsoleInput.checked = safe.hideConsole;
    if (hideStreamControlsInput) hideStreamControlsInput.checked = safe.hideStreamControls;
    if (hideDashboardInput) hideDashboardInput.checked = safe.hideDashboard;
  }

  function saveAppearanceSettings() {
    const scaleInput = document.getElementById('appearanceFontScale');
    const sidebarScaleInput = document.getElementById('appearanceSidebarScale');
    const sceneScaleInput = document.getElementById('appearanceSceneScale');
    const sceneContainerHeightInput = document.getElementById('appearanceSceneContainerHeight');
    const dashboardRowScaleInput = document.getElementById('appearanceDashboardRowScale');
    const pluginScaleInput = document.getElementById('appearancePluginScale');
    const consoleFontSizeInput = document.getElementById('appearanceConsoleFontSize');
    const dashboardEmojisInput = document.getElementById('appearanceDashboardEmojis');
    const highContrastInput = document.getElementById('appearanceHighContrast');
    const reducedMotionInput = document.getElementById('appearanceReducedMotion');
    const hideConsoleInput = document.getElementById('appearanceHideConsole');
    const hideStreamControlsInput = document.getElementById('appearanceHideStreamControls');
    const hideDashboardInput = document.getElementById('appearanceHideDashboard');

    const next = sanitizeAppearanceSettings({
      fontScale: scaleInput ? Number(scaleInput.value) : DEFAULT_APPEARANCE.fontScale,
      sidebarScale: sidebarScaleInput ? Number(sidebarScaleInput.value) : DEFAULT_APPEARANCE.sidebarScale,
      sceneScale: sceneScaleInput ? Number(sceneScaleInput.value) : DEFAULT_APPEARANCE.sceneScale,
      sceneContainerHeight: sceneContainerHeightInput ? Number(sceneContainerHeightInput.value) : DEFAULT_APPEARANCE.sceneContainerHeight,
      dashboardRowScale: dashboardRowScaleInput ? Number(dashboardRowScaleInput.value) : DEFAULT_APPEARANCE.dashboardRowScale,
      pluginScale: pluginScaleInput ? Number(pluginScaleInput.value) : DEFAULT_APPEARANCE.pluginScale,
      consoleFontSize: consoleFontSizeInput ? Number(consoleFontSizeInput.value) : DEFAULT_APPEARANCE.consoleFontSize,
      dashboardEmojis: dashboardEmojisInput ? dashboardEmojisInput.checked : DEFAULT_APPEARANCE.dashboardEmojis,
      highContrast: highContrastInput ? highContrastInput.checked : DEFAULT_APPEARANCE.highContrast,
      reducedMotion: reducedMotionInput ? reducedMotionInput.checked : DEFAULT_APPEARANCE.reducedMotion,
      hideConsole: hideConsoleInput ? hideConsoleInput.checked : DEFAULT_APPEARANCE.hideConsole,
      hideStreamControls: hideStreamControlsInput ? hideStreamControlsInput.checked : DEFAULT_APPEARANCE.hideStreamControls,
      hideDashboard: hideDashboardInput ? hideDashboardInput.checked : DEFAULT_APPEARANCE.hideDashboard
    });

    applyAppearanceSettings(next);
    syncAppearanceControls(next);
    persistAppearanceSettings(next);
    safeLog('🎨 Appearance settings saved');
    return next;
  }

  function resetAppearanceSettings() {
    const defaults = { ...DEFAULT_APPEARANCE };
    applyAppearanceSettings(defaults);
    syncAppearanceControls(defaults);
    persistAppearanceSettings(defaults);
    safeLog('🎨 Appearance reset to defaults');
    return defaults;
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

  // ── Settings tab switching logic ──
  function switchSettingsTab(tabName) {
    const tabs = document.querySelectorAll('.settings-nav-btn');
    const panels = document.querySelectorAll('.settings-panel');
    tabs.forEach(t => {
      const isTarget = t.dataset.tab === tabName;
      t.classList.toggle('active', isTarget);
      t.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });
    panels.forEach(p => {
      p.classList.toggle('active', p.dataset.panel === tabName);
    });

    if (tabName === 'plugins' && window.pluginsLogic?.refreshPluginPackages) {
      window.pluginsLogic.refreshPluginPackages().catch((err) => {
        safeLog('⚠️ Failed to refresh plugin packages: ' + (err?.message || err));
      });
    }
  }

  function initSettingsPage() {
    document.querySelectorAll('.settings-nav-btn').forEach(tab => {
      tab.addEventListener('click', () => switchSettingsTab(tab.dataset.tab));
    });

    // Load appearance prefs when settings UI initializes
    const appearance = getAppearanceSettings();
    applyAppearanceSettings(appearance);
    syncAppearanceControls(appearance);

    const sliderMap = [
      ['appearanceFontScale', 'appearanceFontScaleValue', '%'],
      ['appearanceSidebarScale', 'appearanceSidebarScaleValue', '%'],
      ['appearanceSceneScale', 'appearanceSceneScaleValue', '%'],
      ['appearanceSceneContainerHeight', 'appearanceSceneContainerHeightValue', 'px'],
      ['appearanceDashboardRowScale', 'appearanceDashboardRowScaleValue', '%'],
      ['appearancePluginScale', 'appearancePluginScaleValue', '%'],
      ['appearanceConsoleFontSize', 'appearanceConsoleFontSizeValue', 'px']
    ];
    sliderMap.forEach(([inputId, valueId, suffix]) => {
      const inputEl = document.getElementById(inputId);
      const valueEl = document.getElementById(valueId);
      if (!inputEl || !valueEl) return;
      inputEl.addEventListener('input', () => {
        valueEl.textContent = `${inputEl.value}${suffix}`;
      });
    });

    // Password visibility toggle
    const toggleBtn = document.getElementById('togglePasswordVis');
    const pwdInput = document.getElementById('obsPassword');
    if (toggleBtn && pwdInput) {
      toggleBtn.addEventListener('click', () => {
        const showing = pwdInput.type === 'text';
        pwdInput.type = showing ? 'password' : 'text';
        toggleBtn.title = showing ? 'Show password' : 'Hide password';
      });
    }
  }

  // Initialise settings interactions once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSettingsPage);
  } else {
    initSettingsPage();
  }

  function showSettingsPage(tab) {
    const page = document.getElementById('settingsPage');
    const urlInput = document.getElementById('obsUrl');
    const passwordInput = document.getElementById('obsPassword');
    
    if (!page || !urlInput || !passwordInput) return;
    
    // Update profile list
    updateProfileList();
    
    // Load current config
    const config = getStoredConfig();
    urlInput.value = config.url;
    passwordInput.value = config.password;

    // Keep appearance controls in sync with persisted values
    syncAppearanceControls(getAppearanceSettings());

    if (window.pluginsLogic?.refreshPluginPackages) {
      window.pluginsLogic.refreshPluginPackages().catch(() => {});
    }

    // Reset password field to hidden
    passwordInput.type = 'password';
    
    // Switch to requested tab (default: connection)
    const tabName = (typeof tab === 'string') ? tab : 'connection';
    switchSettingsTab(tabName);
    
    page.classList.remove('hidden');
    page.setAttribute('aria-hidden', 'false');
    document.body.classList.add('settings-open');
  }

  function hideSettingsPage() {
    const page = document.getElementById('settingsPage');
    if (!page) return;
    page.classList.add('hidden');
    page.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('settings-open');
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
        
        hideSettingsPage();
        safeLog('🔧 New profile created and activated. Reconnect to apply changes.');
      }
    } else {
      // Update existing profile
      const config = { url, password };
      
      if (saveConfig(config)) {
        hideSettingsPage();
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
    showSettingsPage,
    hideSettingsPage,
    // Legacy aliases kept for compatibility with older modules
    showSettingsModal: showSettingsPage,
    hideSettingsModal: hideSettingsPage,
    getAppearanceSettings,
    applyAppearanceSettings,
    saveAppearanceSettings,
    resetAppearanceSettings,
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
