// Scene management logic
(function() {
  // Function to populate scene dropdown
  async function refreshScenes() {
    try {
      const sceneList = await window.obsAPI.scenes.get();
      const select = document.getElementById('sceneSelect');
      if (!select) return;

      // Clear existing options except the first one
      select.innerHTML = '<option value="">Select a scene...</option>';

      // Add scenes to dropdown
      if (sceneList && sceneList.scenes) {
        sceneList.scenes.forEach(scene => {
          const option = document.createElement('option');
          option.value = scene.sceneName;
          option.textContent = scene.sceneName;
          select.appendChild(option);
        });

        // Enable the dropdown
        select.disabled = false;

        window.uiHelpers.log(`✅ Loaded ${sceneList.scenes.length} scenes`);
        window.uiHelpers.log(`Current scene: ${sceneList.currentProgramSceneName}`);

        // Update current scene badge and selection
        window.uiHelpers.setSceneBadge(sceneList.currentProgramSceneName);
        select.value = sceneList.currentProgramSceneName || '';

        // Load dashboard items for current scene
        if (sceneList.currentProgramSceneName) {
          await window.dashboardLogic.loadDashboardItems(sceneList.currentProgramSceneName);
        }
      }
    } catch (e) {
      window.uiHelpers.log('❌ Error loading scenes: ' + e.message);
    }
  }

  // Export to global
  window.sceneLogic = {
    refreshScenes
  };
})();
