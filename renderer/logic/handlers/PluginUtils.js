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
      let body = '';
      try {
        body = await res.text();
      } catch (_) {
        // ignore
      }
      throw new Error(`HTTP ${res.status} for ${url}${body ? `: ${body}` : ''}`);
    }
    return await res.json();
  };

  let _dashboardRefreshTimer = null;
  const requestDashboardRefresh = (reason) => {
    if (_dashboardRefreshTimer) {
      clearTimeout(_dashboardRefreshTimer);
    }

    _dashboardRefreshTimer = setTimeout(async () => {
      _dashboardRefreshTimer = null;

      const sceneName = _getCurrentSceneName();
      if (!sceneName) return;
      if (!window.dashboardLogic?.loadDashboardItems) return;

      try {
        await window.dashboardLogic.loadDashboardItems(sceneName);
        const el = document.getElementById('sourceSearch');
        if (el) {
          el.dispatchEvent(new Event('input'));
        }
      } catch (e) {
        window.uiHelpers?.logError(
          'Failed to refresh dashboard' + (reason ? ` (${reason})` : '') + ': ' + (e?.message || e),
          'dashboard'
        );
      }
    }, 200);
  };

  const setTextSource = async (sourceName, text) => {
    const name = String(sourceName || '').trim();
    if (!name) throw new Error('Missing source name');
    if (!window.obsAPI?.sources?.setSettings) throw new Error('OBS API not available');
    await window.obsAPI.sources.setSettings(name, { text: String(text ?? '') });
    requestDashboardRefresh('setTextSource');
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
    requestDashboardRefresh('setSourceURL');
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
    requestDashboardRefresh('setSourceVolume');
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
    requestDashboardRefresh('setSourceEnabled');
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
    const wrappedOnClick = async (...args) => {
      try {
        return await onClick?.(...args);
      } finally {
        requestDashboardRefresh('plugin-button');
      }
    };
    const btn = addControlButton(id, label, wrappedOnClick, className);
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
  createVolumeControl — shared volume UI builder for all audio handlers
  Returns { container, slider, numInput, muteBtn } so the caller can append & wire events.
  opts: { sourceName, displayName, logTag }
  ---------------------------------------------------------------------------------------- */
  const createVolumeControl = (opts = {}) => {
    const { sourceName, displayName, logTag = 'audio' } = opts;

    const wrap = document.createElement('div');
    wrap.className = 'volume-control';

    // Mute button with SVG icon
    const muteBtn = document.createElement('button');
    muteBtn.className = 'mute-btn';
    muteBtn.type = 'button';
    muteBtn.title = 'Toggle mute';
    muteBtn.dataset.inputName = sourceName;
    muteBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;

    // Slider wrap
    const sliderWrap = document.createElement('div');
    sliderWrap.className = 'volume-slider-wrap';

    // Minus step
    const minusBtn = document.createElement('button');
    minusBtn.className = 'volume-step-btn';
    minusBtn.type = 'button';
    minusBtn.textContent = '−';
    minusBtn.title = 'Decrease volume';

    // Range slider
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = '100';
    slider.className = 'volume-slider';
    slider.dataset.inputName = sourceName;
    slider.setAttribute('aria-label', `Volume for ${displayName}`);

    // Plus step
    const plusBtn = document.createElement('button');
    plusBtn.className = 'volume-step-btn';
    plusBtn.type = 'button';
    plusBtn.textContent = '+';
    plusBtn.title = 'Increase volume';

    // Numeric input
    const numInput = document.createElement('input');
    numInput.type = 'number';
    numInput.min = '0';
    numInput.max = '100';
    numInput.value = '100';
    numInput.className = 'volume-num';
    numInput.setAttribute('aria-label', `Volume % for ${displayName}`);

    // Sync helpers
    const STEP = 5;
    const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));

    const setVolume = async (pct) => {
      pct = clamp(pct);
      slider.value = String(pct);
      numInput.value = String(pct);
      const mul = pct / 100;
      try {
        await window.obsAPI.sources.setVolume(sourceName, mul);
      } catch (err) {
        if (window.uiHelpers) window.uiHelpers.logError('Error setting volume: ' + err.message, logTag);
      }
    };

    slider.addEventListener('input', () => {
      const v = Number(slider.value);
      numInput.value = String(v);
      setVolume(v);
    });

    numInput.addEventListener('change', () => {
      setVolume(Number(numInput.value));
    });

    numInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); setVolume(Number(numInput.value) + STEP); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setVolume(Number(numInput.value) - STEP); }
    });

    minusBtn.addEventListener('click', () => setVolume(Number(slider.value) - STEP));
    plusBtn.addEventListener('click', () => setVolume(Number(slider.value) + STEP));

    // Mute toggle
    const applyMuteVisual = (muted) => {
      muteBtn.classList.toggle('is-muted', muted);
      muteBtn.title = muted ? 'Unmute' : 'Mute';
      muteBtn.innerHTML = muted
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
    };

    muteBtn.addEventListener('click', async () => {
      try {
        const current = await window.obsAPI.sources.getMute(sourceName);
        const isMuted = !!(current && (current.inputMuted ?? current.muted));
        await window.obsAPI.sources.setMute(sourceName, !isMuted);
        applyMuteVisual(!isMuted);
        if (window.uiHelpers) window.uiHelpers.logInfo(`${displayName} ${!isMuted ? 'muted' : 'unmuted'}`, logTag);
      } catch (e) {
        if (window.uiHelpers) window.uiHelpers.logError('Error toggling mute: ' + e.message, logTag);
      }
    });

    // Assemble
    sliderWrap.appendChild(minusBtn);
    sliderWrap.appendChild(slider);
    sliderWrap.appendChild(plusBtn);
    sliderWrap.appendChild(numInput);

    wrap.appendChild(muteBtn);
    wrap.appendChild(sliderWrap);

    return { container: wrap, slider, numInput, muteBtn, applyMuteVisual, setVolume };
  };

/*----------------------------------------------------------------------------------------
  Expose globally
  ---------------------------------------------------------------------------------------- */
  window.PluginUtils = {
    createVolumeControl,
    applyRowBackground,
    applySourceIcon,
    fetchJson,
    requestDashboardRefresh,
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
