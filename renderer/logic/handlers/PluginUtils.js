// PluginUtils - Shared helpers for handler plugins (built-in and external)
(function() {
/*----------------------------------------------------------------------------------------
  applyRowBackground
  ---------------------------------------------------------------------------------------- */
  const applyRowBackground = (optionsEl, rowBg) => {
    if (!optionsEl) return false;
    const applyRowBg = () => {
      const parent = optionsEl.parentElement;
      const row = parent ? parent.querySelector(':scope > .dash-row') : null;
      if (row) {
        if (rowBg) row.style.setProperty('background', rowBg, 'important');
        return true;
      }
      return false;
    };

    let applied = applyRowBg();

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        applied = applied || applyRowBg();
      });
    }
    setTimeout(() => {
      if (!applied) applyRowBg();
    }, 60);

    return applied;
  };
/*----------------------------------------------------------------------------------------
  applySourceIcon
  ---------------------------------------------------------------------------------------- */

  const applySourceIcon = (optionsEl, icon) => {
    if (!optionsEl) return false;
  
    const applyIcon = () => {
      const parent = optionsEl.parentElement;
      const sourceIcon = parent
        ? parent.querySelector(':scope > .dash-row > .name-wrap > .source-icon')
        : null;
  
      if (sourceIcon) {
        sourceIcon.textContent = icon;
        return true;
      }
      return false;
    };
  
    let applied = applyIcon();
  
    setTimeout(() => {
      if (!applied) applyIcon();
    }, 60);
  
    return applied;
  };

  const fetchJson = async (url, opts) => {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      ...(opts || {})
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  };

  const setTextSource = async (sourceName, text) => {
    const name = String(sourceName || '').trim();
    if (!name) throw new Error('Missing source name');
    if (!window.obsAPI?.sources?.setSettings) throw new Error('OBS API not available');
    await window.obsAPI.sources.setSettings(name, { text: String(text ?? '') });
  };

  const getSourceText = async (sourceName) => {
    const name = String(sourceName || '').trim();
    if (!name) throw new Error('Missing source name');
    if (!window.obsAPI?.sources?.getSettings) throw new Error('OBS API not available');
    const res = await window.obsAPI.sources.getSettings(name);
    return String(res?.inputSettings?.text ?? '');
  };

  const setSourceURL = async (sourceName, url) => {
    const name = String(sourceName || '').trim();
    if (!name) throw new Error('Missing source name');
    if (!window.obsAPI?.browser?.setUrl) throw new Error('OBS API not available');
    await window.obsAPI.browser.setUrl(name, String(url ?? ''));
  };

  const getSourceURL = async (sourceName) => {
    const name = String(sourceName || '').trim();
    if (!name) throw new Error('Missing source name');
    if (!window.obsAPI?.browser?.getUrl) throw new Error('OBS API not available');
    return await window.obsAPI.browser.getUrl(name);
  };

  const setSourceVolume = async (sourceName, volume) => {
    const name = String(sourceName || '').trim();
    if (!name) throw new Error('Missing source name');
    if (!window.obsAPI?.sources?.setVolume) throw new Error('OBS API not available');
    const n = Number(volume);
    if (!Number.isFinite(n)) throw new Error('Invalid volume');
    const mul = n > 1 ? (n / 100) : n;
    const clamped = Math.max(0, Math.min(1, mul));
    await window.obsAPI.sources.setVolume(name, clamped);
  };

  const getSourceVolume = async (sourceName) => {
    const name = String(sourceName || '').trim();
    if (!name) throw new Error('Missing source name');
    if (!window.obsAPI?.sources?.getVolume) throw new Error('OBS API not available');
    const res = await window.obsAPI.sources.getVolume(name);
    const mul = typeof res?.inputVolumeMul === 'number' ? res.inputVolumeMul : 1.0;
    return mul;
  };

  const getSourceVolumePercent = async (sourceName) => {
    const mul = await getSourceVolume(sourceName);
    return Math.round(Math.max(0, Math.min(1, mul)) * 100);
  };

  const _getCurrentSceneName = () => {
    try {
      const el = document.getElementById('sceneSelect');
      const v = String(el?.value || '').trim();
      return v || null;
    } catch (_) {
      return null;
    }
  };

  const _findSceneItemBySourceName = async (sceneName, sourceName) => {
    if (!window.obsAPI?.sceneItems?.list) throw new Error('OBS API not available');
    const res = await window.obsAPI.sceneItems.list(sceneName);
    const items = res && (res.sceneItems || res.items || res);
    if (!Array.isArray(items)) throw new Error('Unexpected scene item list response');
    const target = String(sourceName || '').trim();
    return items.find((it) => {
      const nm = it?.sourceName ?? it?.inputName ?? '';
      return String(nm) === target;
    }) || null;
  };

  const getSourceEnabled = async (sourceName, sceneName) => {
    const name = String(sourceName || '').trim();
    if (!name) throw new Error('Missing source name');
    if (!window.obsAPI?.sceneItems?.list) throw new Error('OBS API not available');
    const scene = String(sceneName || '').trim() || _getCurrentSceneName();
    if (!scene) throw new Error('Missing scene name');
    const item = await _findSceneItemBySourceName(scene, name);
    if (!item) throw new Error(`Scene item not found: ${name}`);
    return !!item.sceneItemEnabled;
  };

  const setSourceEnabled = async (sourceName, enabled, sceneName) => {
    const name = String(sourceName || '').trim();
    if (!name) throw new Error('Missing source name');
    if (!window.obsAPI?.sceneItems?.setEnabled) throw new Error('OBS API not available');
    const scene = String(sceneName || '').trim() || _getCurrentSceneName();
    if (!scene) throw new Error('Missing scene name');
    const item = await _findSceneItemBySourceName(scene, name);
    if (!item) throw new Error(`Scene item not found: ${name}`);
    await window.obsAPI.sceneItems.setEnabled(scene, item.sceneItemId, !!enabled);
  };

  const toggleSourceEnabled = async (sourceName, sceneName) => {
    const current = await getSourceEnabled(sourceName, sceneName);
    await setSourceEnabled(sourceName, !current, sceneName);
    return !current;
  };

  const setSourceVisibility = async (sourceName, state, sceneName) => {
    return await setSourceEnabled(sourceName, state, sceneName);
  };

  const _sidebarRegistry = new Map();

  const addControlButton = (id, label, onClick, className) => {
    const host = document.getElementById('pluginButtons');
    if (!host) return null;

    const safeId = String(id || '').trim();
    if (!safeId) return null;

    const existing = host.querySelector(`#${CSS.escape(safeId)}`);
    if (existing) return existing;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = safeId;
    btn.textContent = String(label || safeId);
    btn.className = className || 'btn-plugin';
    btn.title = btn.textContent;
    if (typeof onClick === 'function') {
      btn.addEventListener('click', onClick);
    }
    host.appendChild(btn);
    return btn;
  };

  const removeControlButton = (id) => {
    const host = document.getElementById('pluginButtons');
    if (!host) return false;
    const safeId = String(id || '').trim();
    if (!safeId) return false;
    const el = host.querySelector(`#${CSS.escape(safeId)}`);
    if (!el) return false;
    el.remove();
    return true;
  };

  const registerSidebarButton = (pluginName, id, label, onClick, className) => {
    const btn = addControlButton(id, label, onClick, className);
    if (!btn) return null;

    const p = String(pluginName || '').trim() || 'unknown';
    if (!_sidebarRegistry.has(p)) {
      _sidebarRegistry.set(p, new Set());
    }
    _sidebarRegistry.get(p).add(btn.id);
    return btn;
  };

  const unregisterSidebarButtons = (pluginName) => {
    const p = String(pluginName || '').trim() || 'unknown';
    const ids = _sidebarRegistry.get(p);
    if (!ids) return 0;

    let removed = 0;
    ids.forEach((id) => {
      if (removeControlButton(id)) removed += 1;
    });
    _sidebarRegistry.delete(p);
    return removed;
  };
/*----------------------------------------------------------------------------------------
  Expose globally
  ---------------------------------------------------------------------------------------- */
  window.PluginUtils = {
    applyRowBackground,
    applySourceIcon,
    fetchJson,
    setTextSource,
    getSourceText,
    setSourceURL,
    getSourceURL,
    setSourceVolume,
    getSourceVolume,
    getSourceVolumePercent,
    setSourceEnabled,
    getSourceEnabled,
    toggleSourceEnabled,
    setSourceVisibility,
    addControlButton,
    removeControlButton,
    registerSidebarButton,
    unregisterSidebarButtons
  };
})();
