// Main logic coordinator - combines all logic modules
(function() {
  // Wait for all modules to load, then expose unified API
  function waitForModules() {
    return new Promise((resolve) => {
      const checkModules = () => {
        if (window.uiHelpers && window.sceneLogic && window.dashboardLogic && window.configLogic) {
          resolve();
        } else {
          setTimeout(checkModules, 10);
        }
      };
      checkModules();
    });
  }

  // Initialize and expose unified API
  waitForModules().then(() => {
    // Expose unified logic API to maintain compatibility
    window.uiLogic = {
      // UI helpers
      log: window.uiHelpers.log,
      setConnBadge: window.uiHelpers.setConnBadge,
      setSceneBadge: window.uiHelpers.setSceneBadge,
      setIndicator: window.uiHelpers.setIndicator,
      
      // Scene management
      refreshScenes: window.sceneLogic.refreshScenes,
      switchScene: window.sceneLogic.switchScene,
      updateCurrentScene: window.sceneLogic.updateCurrentScene,
      
      // Dashboard management
      loadDashboardItems: window.dashboardLogic.loadDashboardItems,
      
      // Configuration management
      getStoredConfig: window.configLogic.getStoredConfig,
      saveConfig: window.configLogic.saveConfig,
      showSettingsModal: window.configLogic.showSettingsModal,
      hideSettingsModal: window.configLogic.hideSettingsModal,
      saveSettings: window.configLogic.saveSettings,
      resetSettings: window.configLogic.resetSettings,
      
      // Profile management
      getProfiles: window.configLogic.getProfiles,
      getActiveProfileName: window.configLogic.getActiveProfileName,
      createProfile: window.configLogic.createProfile,
      deleteProfile: window.configLogic.deleteProfile,
      switchProfile: window.configLogic.switchProfile,
      updateProfileList: window.configLogic.updateProfileList,
      handleProfileChange: window.configLogic.handleProfileChange,
      showNewProfileDialog: window.configLogic.showNewProfileDialog,
      handleDeleteProfile: window.configLogic.handleDeleteProfile,

      // Audio/microphone updates (embedded in dashboard items)
      updateMicrophoneMuteState: window.dashboardLogic.updateMicrophoneMuteState
    };

    // Signal that the unified API is ready
    window.dispatchEvent(new CustomEvent('uiLogicReady'));
  });
})();
