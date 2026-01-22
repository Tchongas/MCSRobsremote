(function() {
  const PLUGIN_NAME = 'StartTimer';
  const STORAGE_KEY = 'startTimerPluginConfig';

  function _defaultConfig() {
    return {
      fakeTimerSource: 'timerfake',
      countingTimerSource: '_timer'
    };
  }

  function getConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return _defaultConfig();
      const parsed = JSON.parse(raw);
      return {
        ..._defaultConfig(),
        ...(parsed || {})
      };
    } catch (_) {
      return _defaultConfig();
    }
  }

  async function setExclusiveTimerEnabled(enableCounting) {
    const cfg = getConfig();
    const fake = String(cfg.fakeTimerSource || '').trim();
    const counting = String(cfg.countingTimerSource || '').trim();

    if (!window.PluginUtils?.setSourceEnabled) {
      throw new Error('PluginUtils.setSourceEnabled not available');
    }
    if (!fake || !counting) {
      throw new Error('Missing timer source names in config');
    }

    // Ensure mutual exclusion. Enable one, disable the other.
    await Promise.all([
      window.PluginUtils.setSourceEnabled(counting, !!enableCounting),
      window.PluginUtils.setSourceEnabled(fake, !enableCounting)
    ]);
  }

  async function toggleTimerMode() {
    const cfg = getConfig();
    const counting = String(cfg.countingTimerSource || '').trim();
    if (!window.PluginUtils?.getSourceEnabled) {
      throw new Error('PluginUtils.getSourceEnabled not available');
    }
    if (!counting) {
      throw new Error('Missing countingTimerSource in config');
    }

    const isCountingEnabled = await window.PluginUtils.getSourceEnabled(counting);
    await setExclusiveTimerEnabled(!isCountingEnabled);
    return !isCountingEnabled;
  }

  let _enforcing = false;

  async function _getSourceNameBySceneItemId(sceneName, sceneItemId) {
    if (!window.obsAPI?.sceneItems?.list) return null;
    const res = await window.obsAPI.sceneItems.list(sceneName);
    const items = res && (res.sceneItems || res.items || res);
    if (!Array.isArray(items)) return null;
    const id = Number(sceneItemId);
    const it = items.find((x) => Number(x?.sceneItemId) === id);
    const nm = it?.sourceName ?? it?.inputName ?? null;
    return nm ? String(nm) : null;
  }

  async function _enforceExclusiveByChangedSource(sourceName, enabled) {
    const cfg = getConfig();
    const fake = String(cfg.fakeTimerSource || '').trim();
    const counting = String(cfg.countingTimerSource || '').trim();

    if (!fake || !counting) return;

    if (sourceName !== fake && sourceName !== counting) return;
    if (!enabled) return;

    if (_enforcing) return;
    _enforcing = true;
    try {
      // If one is enabled, force the other off.
      await setExclusiveTimerEnabled(sourceName === counting);
    } finally {
      // Small delay to reduce chance of feedback loops on rapid events.
      setTimeout(() => { _enforcing = false; }, 150);
    }
  }

  function _bindObsEventsOnce() {
    if (_bindObsEventsOnce._bound) return;
    _bindObsEventsOnce._bound = true;

    if (!window.obsAPI?.onEvent) return;

    window.obsAPI.onEvent(async (eventData) => {
      try {
        const type = eventData?.type;
        const data = eventData?.data || {};
        if (type !== 'scene-item-changed') return;

        const sceneName = data.sceneName;
        const sceneItemId = data.sceneItemId;
        const enabled = !!data.sceneItemEnabled;
        if (!sceneName || sceneItemId === undefined || sceneItemId === null) return;

        const sourceName = await _getSourceNameBySceneItemId(sceneName, sceneItemId);
        if (!sourceName) return;
        await _enforceExclusiveByChangedSource(sourceName, enabled);
      } catch (_) {
        // ignore
      }
    });
  }

  const registerSidebarButtons = () => {
    if (!window.PluginUtils?.registerSidebarButton) {
      window.uiHelpers?.logWarn('PluginUtils.registerSidebarButton not available', 'plugin');
      return;
    }

    window.PluginUtils.registerSidebarButton(
      PLUGIN_NAME,
      'timer_toggle',
      'Toggle Timer',
      async () => {
        try {
          const enabled = await toggleTimerMode();
          window.uiHelpers?.logInfo(
            enabled ? 'Timer: counting enabled' : 'Timer: fake 00:00 enabled',
            'timer'
          );
        } catch (e) {
          window.uiHelpers?.logError(`Timer toggle failed: ${e?.message || e}`, 'timer');
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

  if (window.CustomHandlerPlugins) {
    window.CustomHandlerPlugins.register(Plugin);
    registerSidebarButtons();
    _bindObsEventsOnce();
  } else {
    window.addEventListener('customHandlerReady', () => {
      window.CustomHandlerPlugins.register(Plugin);
      registerSidebarButtons();
      _bindObsEventsOnce();
    });
  }
})();
