(function() {
  const PLUGIN_NAME = 'OverlayReset';
  const TARGET_SOURCE_NAMES = ['Randomban', 'Landban', 'Oceanban', 'Ocean', 'Random', 'Land'];
  const TARGET_GROUP_NAMES = ['Ban1', 'Ban2', 'Seed1', 'Seed2', 'Seed3', 'Seed4', 'Seed5'];

  function _targetSet() {
    return new Set(TARGET_SOURCE_NAMES.map((name) => String(name || '').trim().toLowerCase()));
  }

  function _sceneNames(sceneList) {
    const scenes = Array.isArray(sceneList?.scenes) ? sceneList.scenes : [];
    return scenes
      .map((scene) => String(scene?.sceneName || '').trim())
      .filter(Boolean);
  }

  function _groupNames() {
    return TARGET_GROUP_NAMES.map((name) => String(name || '').trim()).filter(Boolean);
  }

  async function resetOverlayVisibility() {
    if (!window.obsAPI?.scenes?.get || !window.obsAPI?.sceneItems?.list || !window.obsAPI?.sceneItems?.setEnabled) {
      throw new Error('OBS API not available');
    }
    if (!window.obsAPI?.sceneItems?.listGroup || !window.obsAPI?.sceneItems?.setGroupEnabled) {
      throw new Error('OBS group API not available');
    }

    const targetNames = _targetSet();
    const sceneList = await window.obsAPI.scenes.get();
    const scenes = _sceneNames(sceneList);
    const groups = _groupNames();

    let updated = 0;

    for (const containerScene of scenes) {
      let items = [];
      try {
        const listRes = await window.obsAPI.sceneItems.list(containerScene);
        items = Array.isArray(listRes?.sceneItems) ? listRes.sceneItems : [];
      } catch (_) {
        continue;
      }

      for (const item of items) {
        const sourceName = String(item?.sourceName || '').trim().toLowerCase();
        if (!targetNames.has(sourceName)) continue;
        const id = Number(item?.sceneItemId);
        if (!Number.isFinite(id) || !containerScene) continue;

        await window.obsAPI.sceneItems.setEnabled(containerScene, id, false);
        updated += 1;
      }
    }

    for (const groupName of groups) {
      let items = [];
      try {
        const listRes = await window.obsAPI.sceneItems.listGroup(groupName);
        items = Array.isArray(listRes?.sceneItems) ? listRes.sceneItems : [];
      } catch (_) {
        continue;
      }

      for (const item of items) {
        const sourceName = String(item?.sourceName || '').trim().toLowerCase();
        if (!targetNames.has(sourceName)) continue;
        const id = Number(item?.sceneItemId);
        if (!Number.isFinite(id)) continue;

        await window.obsAPI.sceneItems.setGroupEnabled(groupName, id, false);
        updated += 1;
      }
    }

    window.uiHelpers?.logSuccess(`Overlay reset complete: ${updated} scene items hidden`, 'overlayreset');
    return updated;
  }

  const registerSidebarButtons = () => {
    if (!window.PluginUtils?.registerSidebarButton) {
      window.uiHelpers?.logWarn('PluginUtils.registerSidebarButton not available', 'plugin');
      return;
    }

    window.PluginUtils.registerSidebarButton(
      PLUGIN_NAME,
      'overlay_reset_hide',
      'Overlay Reset',
      async () => {
        try {
          window.uiHelpers?.logInfo('Overlay reset started...', 'overlayreset');
          await resetOverlayVisibility();
        } catch (e) {
          window.uiHelpers?.logError(`Overlay reset failed: ${e?.message || e}`, 'overlayreset');
        }
      }
    );
  };

  const Plugin = {
    name: PLUGIN_NAME,
    version: '1.0.0',
    canHandle() {
      return false;
    },
    async execute() {},
    cleanup() {
      window.PluginUtils?.unregisterSidebarButtons?.(PLUGIN_NAME);
    }
  };

  window.overlayResetLogic = {
    resetOverlayVisibility
  };

  if (window.CustomHandlerPlugins) {
    window.CustomHandlerPlugins.register(Plugin);
    registerSidebarButtons();
  } else {
    window.addEventListener('customHandlerReady', () => {
      window.CustomHandlerPlugins.register(Plugin);
      registerSidebarButtons();
    });
  }
})();
