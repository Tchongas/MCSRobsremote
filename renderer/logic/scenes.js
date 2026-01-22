// Scene management logic
(function() {
  let currentSceneName = null;

  // Function to render scene list UI
  async function refreshScenes() {
    try {
      const sceneList = await window.obsAPI.scenes.get();
      const listContainer = document.getElementById('sceneList');
      const select = document.getElementById('sceneSelect'); // Keep for compatibility
      
      if (!listContainer) return;

      // Clear existing content
      listContainer.innerHTML = '';

      if (sceneList && sceneList.scenes && sceneList.scenes.length > 0) {
        currentSceneName = sceneList.currentProgramSceneName;

        // Render scene items
        sceneList.scenes.forEach(scene => {
          const item = document.createElement('div');
          item.className = 'scene-item';
          item.dataset.sceneName = scene.sceneName;
          
          if (scene.sceneName === currentSceneName) {
            item.classList.add('active');
          }

          item.innerHTML = `
            <div class="scene-item-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>
            <span class="scene-item-name">${scene.sceneName}</span>
          `;

          item.addEventListener('click', () => switchScene(scene.sceneName));
          listContainer.appendChild(item);
        });

        // Update hidden select for compatibility
        if (select) {
          select.innerHTML = '<option value="">Select a scene...</option>';
          sceneList.scenes.forEach(scene => {
            const option = document.createElement('option');
            option.value = scene.sceneName;
            option.textContent = scene.sceneName;
            select.appendChild(option);
          });
          select.disabled = false;
          select.value = currentSceneName || '';
        }

        window.uiHelpers.logSuccess(`Loaded ${sceneList.scenes.length} scenes`, 'scenes');
        window.uiHelpers.setSceneBadge(currentSceneName);

        // Load dashboard items for current scene
        if (currentSceneName) {
          await window.dashboardLogic.loadDashboardItems(currentSceneName);
        }
      } else {
        listContainer.innerHTML = '<div class="scene-list-empty">No scenes available</div>';
        if (select) {
          select.innerHTML = '<option value="">No scenes</option>';
          select.disabled = true;
        }
      }
    } catch (e) {
      const listContainer = document.getElementById('sceneList');
      if (listContainer) {
        listContainer.innerHTML = '<div class="scene-list-empty">Connect to load scenes</div>';
      }
      window.uiHelpers.logError('Error loading scenes: ' + e.message, 'scenes');
    }
  }

  // Switch to a scene
  async function switchScene(sceneName) {
    if (!sceneName || sceneName === currentSceneName) return;
    
    try {
      await window.obsAPI.scenes.change(sceneName);
      
      // Update UI
      const listContainer = document.getElementById('sceneList');
      if (listContainer) {
        listContainer.querySelectorAll('.scene-item').forEach(item => {
          item.classList.toggle('active', item.dataset.sceneName === sceneName);
        });
      }
      
      // Update hidden select
      const select = document.getElementById('sceneSelect');
      if (select) {
        select.value = sceneName;
      }
      
      currentSceneName = sceneName;
      window.uiHelpers.setSceneBadge(sceneName);
      window.uiHelpers.logSuccess('Switched to: ' + sceneName, 'scenes');
      
      // Load dashboard items
      await window.dashboardLogic.loadDashboardItems(sceneName);
    } catch (e) {
      window.uiHelpers.logError('Failed to switch scene: ' + e.message, 'scenes');
    }
  }

  // Update scene from external event (remote change)
  function updateCurrentScene(sceneName) {
    currentSceneName = sceneName;
    const listContainer = document.getElementById('sceneList');
    if (listContainer) {
      listContainer.querySelectorAll('.scene-item').forEach(item => {
        item.classList.toggle('active', item.dataset.sceneName === sceneName);
      });
    }
    const select = document.getElementById('sceneSelect');
    if (select) {
      select.value = sceneName;
    }
  }

  // Export to global
  window.sceneLogic = {
    refreshScenes,
    switchScene,
    updateCurrentScene
  };
})();
