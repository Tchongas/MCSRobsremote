// Scene management logic — Studio Mode
// Two-state model:
//   programScene = the scene currently LIVE in OBS (what viewers see)
//   previewScene = the scene selected in our app for editing (loads its dashboard)
// Clicking a scene sets it as preview. The "Transition" button pushes preview → program.
(function() {
  let programScene = null;  // live in OBS
  let previewScene = null;  // selected for editing
  // Cache of known scenes: Map<sceneName, sceneData>
  let sceneCache = new Map();

  // ── DOM references (resolved once) ──
  function getTransitionBtn() { return document.getElementById('transitionBtn'); }
  function getTransitionBar() { return document.getElementById('transitionBar'); }

  // ── Transition bar visibility ──
  function updateTransitionBar() {
    const bar = getTransitionBar();
    const btn = getTransitionBtn();
    if (!bar || !btn) return;

    const needsTransition = previewScene && previewScene !== programScene;
    bar.classList.toggle('visible', needsTransition);
    if (needsTransition) {
      btn.textContent = `Change Scene — ${previewScene}`;
      btn.title = `Change scene to ${previewScene}`;
    }
  }

  // ── Dashboard scene tag (shows which scene is being viewed) ──
  function updateDashboardSceneTag() {
    const tag = document.getElementById('dashboardSceneTag');
    if (!tag) return;

    if (!previewScene) {
      tag.className = 'dashboard-scene-tag';
      tag.innerHTML = '';
      return;
    }

    const isLive = previewScene === programScene;
    tag.className = `dashboard-scene-tag ${isLive ? 'is-live' : 'is-preview'}`;
    tag.innerHTML = `<span class="dashboard-scene-tag-dot"></span>${previewScene}${isLive ? '' : ' (preview)'}`;
  }

  // ── Scene list item states ──
  // .active  = program (live) scene — blue highlight
  // .selected = preview (editing) scene — red/orange outline
  function applySceneStates(listContainer) {
    if (!listContainer) listContainer = document.getElementById('sceneList');
    if (!listContainer) return;
    listContainer.querySelectorAll('.scene-item').forEach(el => {
      const name = el.dataset.sceneName;
      el.classList.toggle('active', name === programScene);
      el.classList.toggle('selected', name === previewScene && name !== programScene);
    });
  }

  // Helper: create a scene item DOM element
  function createSceneElement(scene) {
    const item = document.createElement('div');
    item.className = 'scene-item';
    item.dataset.sceneName = scene.sceneName;
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'option');

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

    // Click = select for preview (not live switch)
    item.addEventListener('click', () => selectScene(scene.sceneName));
    // Double-click = select AND go live immediately
    item.addEventListener('dblclick', async () => {
      await selectScene(scene.sceneName);
      await transitionScene();
    });
    return item;
  }

  // Helper: create a select option element
  function createOptionElement(scene) {
    const option = document.createElement('option');
    option.value = scene.sceneName;
    option.textContent = scene.sceneName;
    return option;
  }

  // Diff-update the scene list UI instead of wiping and recreating
  function syncSceneListUI(scenes) {
    const listContainer = document.getElementById('sceneList');
    const select = document.getElementById('sceneSelect');
    if (!listContainer) return;

    const incomingNames = scenes.map(s => s.sceneName);
    const incomingSet = new Set(incomingNames);

    // Remove scenes that no longer exist
    const existingItems = listContainer.querySelectorAll('.scene-item');
    existingItems.forEach(el => {
      if (!incomingSet.has(el.dataset.sceneName)) {
        el.remove();
      }
    });

    // Build a map of existing DOM elements by scene name
    const domMap = new Map();
    listContainer.querySelectorAll('.scene-item').forEach(el => {
      domMap.set(el.dataset.sceneName, el);
    });

    // Remove the empty-state placeholder if present
    const emptyMsg = listContainer.querySelector('.scene-list-empty');
    if (emptyMsg) emptyMsg.remove();

    // Add missing scenes and ensure correct order
    let prevEl = null;
    for (const scene of scenes) {
      let el = domMap.get(scene.sceneName);
      if (!el) {
        el = createSceneElement(scene);
      }

      // Ensure correct order: insert after prevEl (or at start)
      const expectedNext = prevEl ? prevEl.nextElementSibling : listContainer.firstElementChild;
      if (el !== expectedNext) {
        if (prevEl) {
          prevEl.after(el);
        } else {
          listContainer.prepend(el);
        }
      }
      prevEl = el;
    }

    // Apply active/selected classes
    applySceneStates(listContainer);

    // Sync the hidden select for compatibility
    if (select) {
      const existingOptions = new Map();
      for (const opt of select.options) {
        if (opt.value) existingOptions.set(opt.value, opt);
      }

      // Ensure the placeholder option exists
      if (!select.querySelector('option[value=""]')) {
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select a scene...';
        select.prepend(placeholder);
      }

      // Remove options that no longer exist
      existingOptions.forEach((opt, name) => {
        if (!incomingSet.has(name)) opt.remove();
      });

      // Add missing options
      for (const scene of scenes) {
        if (!existingOptions.has(scene.sceneName)) {
          select.appendChild(createOptionElement(scene));
        }
      }

      select.disabled = scenes.length === 0;
      select.value = previewScene || programScene || '';
    }
  }

  // Function to render scene list UI (diff-based)
  async function refreshScenes() {
    try {
      const sceneList = await window.obsAPI.scenes.get();
      const listContainer = document.getElementById('sceneList');
      if (!listContainer) return;

      if (sceneList && sceneList.scenes && sceneList.scenes.length > 0) {
        programScene = sceneList.currentProgramSceneName;

        // On first load, preview defaults to program scene
        if (!previewScene || !sceneList.scenes.some(s => s.sceneName === previewScene)) {
          previewScene = programScene;
        }

        // Update cache
        sceneCache.clear();
        sceneList.scenes.forEach(s => sceneCache.set(s.sceneName, s));

        // Diff-update the UI
        syncSceneListUI(sceneList.scenes);

        window.uiHelpers.logSuccess(`Loaded ${sceneList.scenes.length} scenes`, 'scenes');
        window.uiHelpers.setSceneBadge(programScene);
        updateTransitionBar();
        updateDashboardSceneTag();

        // Load dashboard items for the preview scene (the one we're editing)
        if (previewScene) {
          await window.dashboardLogic.loadDashboardItems(previewScene);
        }
      } else {
        sceneCache.clear();
        // Only set empty state if there truly are no scenes
        const existingItems = listContainer.querySelectorAll('.scene-item');
        existingItems.forEach(el => el.remove());
        if (!listContainer.querySelector('.scene-list-empty')) {
          listContainer.innerHTML = '<div class="scene-list-empty">No scenes available</div>';
        }
        const select = document.getElementById('sceneSelect');
        if (select) {
          select.innerHTML = '<option value="">No scenes</option>';
          select.disabled = true;
        }
        updateTransitionBar();
        updateDashboardSceneTag();
      }
    } catch (e) {
      // Only show error state if we have no cached scenes at all
      if (sceneCache.size === 0) {
        const listContainer = document.getElementById('sceneList');
        if (listContainer) {
          listContainer.innerHTML = '<div class="scene-list-empty">Connect to load scenes</div>';
        }
      }
      window.uiHelpers.logError('Error loading scenes: ' + e.message, 'scenes');
    }
  }

  // Select a scene for preview/editing (does NOT change OBS program scene)
  async function selectScene(sceneName) {
    if (!sceneName || sceneName === previewScene) return;

    previewScene = sceneName;

    // Update visual states
    applySceneStates();
    updateTransitionBar();
    updateDashboardSceneTag();

    // Update hidden select
    const select = document.getElementById('sceneSelect');
    if (select) select.value = sceneName;

    window.uiHelpers.logInfo(`Previewing: ${sceneName}`, 'scenes');

    // Load dashboard items for the selected scene
    await window.dashboardLogic.loadDashboardItems(sceneName);
  }

  // Transition: push preview scene to program (actually change OBS scene)
  async function transitionScene() {
    if (!previewScene || previewScene === programScene) return;

    const target = previewScene;
    try {
      await window.obsAPI.scenes.change(target);

      programScene = target;

      // Update visual states
      applySceneStates();
      updateTransitionBar();
      updateDashboardSceneTag();

      window.uiHelpers.setSceneBadge(target);
      window.uiHelpers.logSuccess(`Scene changed: ${target}`, 'scenes');
    } catch (e) {
      window.uiHelpers.logError('Failed to transition: ' + e.message, 'scenes');
    }
  }

  // Update program scene from external event (remote change from another client)
  function updateProgramScene(sceneName) {
    programScene = sceneName;
    applySceneStates();
    updateTransitionBar();
    updateDashboardSceneTag();
  }

  // Get current program scene name (live in OBS)
  function getProgramScene() {
    return programScene;
  }

  // Get current preview scene name (selected for editing)
  function getPreviewScene() {
    return previewScene;
  }

  // Legacy compatibility alias
  function getCurrentScene() {
    return programScene;
  }

  // ── Scene list keyboard navigation ──
  // Toggles focus: if scene list is already focused, jump to first dashboard item.
  // Otherwise, focus the current preview scene (or first scene).
  function focusSceneList() {
    const list = document.getElementById('sceneList');
    if (!list) return;

    // If already inside the scene list, move focus to the dashboard
    if (document.activeElement?.closest('#sceneList')) {
      const firstItem = document.querySelector('#dashboardItems .dash-item:not(.is-hidden) .name-wrap');
      if (firstItem) { firstItem.focus(); return; }
      document.activeElement.blur();
      return;
    }

    const items = list.querySelectorAll('.scene-item');
    if (items.length === 0) return;

    let target = null;
    if (previewScene) {
      target = list.querySelector(`.scene-item[data-scene-name="${CSS.escape(previewScene)}"]`);
    }
    if (!target) target = items[0];
    target.focus();
  }

  // Attach keyboard handler to the scene list container (delegated)
  function initSceneListKeyboard() {
    const list = document.getElementById('sceneList');
    if (!list) return;
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', 'Scene list');

    list.addEventListener('keydown', (e) => {
      const focused = document.activeElement;
      if (!focused || !focused.classList.contains('scene-item')) return;

      const items = Array.from(list.querySelectorAll('.scene-item'));
      const idx = items.indexOf(focused);
      if (idx === -1) return;

      // Arrow Down / Tab — next scene
      if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        const next = items[idx + 1] || items[0];
        next.focus();
        return;
      }
      // Arrow Up / Shift+Tab — previous scene
      if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        const prev = items[idx - 1] || items[items.length - 1];
        prev.focus();
        return;
      }
      // Enter — preview the focused scene (plain Enter only; Ctrl+Enter falls through to global transition handler)
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const name = focused.dataset.sceneName;
        if (name) selectScene(name);
        return;
      }
      // Escape — blur out of scene list
      if (e.key === 'Escape') {
        e.preventDefault();
        focused.blur();
        return;
      }
    });
  }

  // Init keyboard on DOMContentLoaded (scene list already exists in HTML)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSceneListKeyboard);
  } else {
    initSceneListKeyboard();
  }

  // Export to global
  window.sceneLogic = {
    refreshScenes,
    selectScene,
    transitionScene,
    updateProgramScene,
    getProgramScene,
    getPreviewScene,
    getCurrentScene,
    focusSceneList,
    // Legacy aliases
    switchScene: selectScene,
    updateCurrentScene: updateProgramScene
  };
})();
