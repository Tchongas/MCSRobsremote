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

  const readJsonConfig = async (nameOrFile, defaults = {}, options = {}) => {
    const fallback = (defaults && typeof defaults === 'object') ? defaults : {};
    const api = (options && typeof options === 'object' && options.pluginAPI)
      ? options.pluginAPI
      : window.pluginAPI;
    try {
      if (!api?.readFile) return { ...fallback };
      const rawName = String(nameOrFile || '').trim();
      if (!rawName) return { ...fallback };
      const fileName = rawName.toLowerCase().endsWith('.json') ? rawName : `${rawName}.json`;
      const raw = await api.readFile(fileName);
      const parsed = JSON.parse(String(raw || ''));
      if (!parsed || typeof parsed !== 'object') return { ...fallback };
      return { ...fallback, ...parsed };
    } catch (_) {
      return { ...fallback };
    }
  };

  const buildUrlWithParams = (baseUrl, params = {}) => {
    const base = String(baseUrl || '').trim();
    if (!base) return '';
    const p = (params && typeof params === 'object') ? params : {};

    try {
      const u = new URL(base);
      Object.entries(p).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') {
          u.searchParams.delete(k);
        } else {
          u.searchParams.set(k, String(v));
        }
      });
      return u.toString();
    } catch (_) {
      const parts = base.split('?');
      const path = parts[0];
      const query = parts.slice(1).join('?');
      const sp = new URLSearchParams(query || '');
      Object.entries(p).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') {
          sp.delete(k);
        } else {
          sp.set(k, String(v));
        }
      });
      const qs = sp.toString();
      return qs ? `${path}?${qs}` : path;
    }
  };

  const setBrowserSourceUrlWithParams = async (sourceName, baseUrl, params = {}) => {
    const src = String(sourceName || '').trim();
    if (!src) throw new Error('Missing source name');
    const nextUrl = buildUrlWithParams(baseUrl, params);
    if (!nextUrl) throw new Error('Missing URL');
    await setSourceURL(src, nextUrl);
    return nextUrl;
  };

  const parseSimpleYaml = (yamlText) => {
    const raw = String(yamlText || '').replace(/\r\n/g, '\n');
    const lines = raw
      .split('\n')
      .map((l) => l.replace(/\t/g, '  '))
      .filter((l) => l.trim() && !l.trim().startsWith('#'));

    const out = {};
    let currentArrayKey = '';
    let currentArray = null;
    let currentItem = null;

    const coerce = (v) => {
      const s = String(v ?? '').trim();
      if (!s) return '';
      if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        return s.slice(1, -1);
      }
      if (/^-?\d+(\.\d+)?$/.test(s)) {
        const n = Number(s);
        if (Number.isFinite(n)) return n;
      }
      if (s === 'true') return true;
      if (s === 'false') return false;
      if (s === 'null') return null;
      return s;
    };

    const assignKeyVal = (obj, key, val) => {
      const k = String(key || '').trim();
      if (!k) return;
      obj[k] = coerce(val);
    };

    for (const line of lines) {
      const indent = line.match(/^\s*/)?.[0]?.length || 0;
      const trimmed = line.trim();

      if (indent === 0) {
        currentArrayKey = '';
        currentArray = null;
        currentItem = null;

        const idx = trimmed.indexOf(':');
        if (idx < 0) continue;
        const key = trimmed.slice(0, idx).trim();
        const rest = trimmed.slice(idx + 1).trim();

        if (!rest) {
          out[key] = [];
          currentArrayKey = key;
          currentArray = out[key];
          continue;
        }

        assignKeyVal(out, key, rest);
        continue;
      }

      if (indent === 2 && currentArray && trimmed.startsWith('-')) {
        const afterDash = trimmed.slice(1).trim();
        currentItem = {};
        currentArray.push(currentItem);

        if (afterDash) {
          const idx = afterDash.indexOf(':');
          if (idx >= 0) {
            const k = afterDash.slice(0, idx).trim();
            const v = afterDash.slice(idx + 1).trim();
            assignKeyVal(currentItem, k, v);
          }
        }
        continue;
      }

      if (indent >= 4 && currentItem) {
        const idx = trimmed.indexOf(':');
        if (idx < 0) continue;
        const k = trimmed.slice(0, idx).trim();
        const v = trimmed.slice(idx + 1).trim();
        assignKeyVal(currentItem, k, v);
      }
    }

    return out;
  };

  const readYamlConfig = async (defaults = {}, options = {}) => {
    const fallback = (defaults && typeof defaults === 'object') ? defaults : {};
    const api = (options && typeof options === 'object' && options.pluginAPI)
      ? options.pluginAPI
      : window.pluginAPI;
    try {
      let raw = '';
      if (api?.readConfig) {
        raw = await api.readConfig();
      } else if (api?.readFile) {
        raw = await api.readFile('config.yaml');
      } else {
        return { ...fallback };
      }

      const parsed = parseSimpleYaml(raw);
      if (!parsed || typeof parsed !== 'object') return { ...fallback };
      return { ...fallback, ...parsed };
    } catch (_) {
      return { ...fallback };
    }
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

  const swapSourceURLs = async (sourceA, sourceB) => {
    const a = String(sourceA || '').trim();
    const b = String(sourceB || '').trim();
    if (!a || !b) throw new Error('Missing source names');
    if (a === b) return;

    const [aRes, bRes] = await Promise.all([
      getSourceURL(a),
      getSourceURL(b)
    ]);

    const aUrl = typeof aRes === 'string' ? aRes : String(aRes?.inputSettings?.url || '');
    const bUrl = typeof bRes === 'string' ? bRes : String(bRes?.inputSettings?.url || '');

    await Promise.all([
      setSourceURL(a, bUrl),
      setSourceURL(b, aUrl)
    ]);
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

  const listSceneItems = async (sceneName) => {
    if (!window.obsAPI?.sceneItems?.list) throw new Error('OBS API not available');
    const scene = String(sceneName || '').trim() || _getCurrentSceneName();
    if (!scene) throw new Error('Missing scene name');
    const res = await window.obsAPI.sceneItems.list(scene);
    const items = res && (res.sceneItems || res.items || res);
    if (!Array.isArray(items)) throw new Error('Unexpected scene item list response');
    return items;
  };

  const getSourceSceneItem = async (sourceName, sceneName) => {
    const name = String(sourceName || '').trim();
    if (!name) throw new Error('Missing source name');
    const scene = String(sceneName || '').trim() || _getCurrentSceneName();
    if (!scene) throw new Error('Missing scene name');
    const item = await _findSceneItemBySourceName(scene, name);
    if (!item) throw new Error(`Scene item not found: ${name}`);
    return item;
  };

  const getSourceTransform = async (sourceName, sceneName) => {
    const scene = String(sceneName || '').trim() || _getCurrentSceneName();
    if (!scene) throw new Error('Missing scene name');
    if (!window.obsAPI?.sceneItems?.getTransform) throw new Error('OBS API not available');
    const item = await getSourceSceneItem(sourceName, scene);
    const res = await window.obsAPI.sceneItems.getTransform(scene, item.sceneItemId);
    return res?.sceneItemTransform || res || null;
  };

  const setSourceTransform = async (sourceName, transform, sceneName, options = {}) => {
    const scene = String(sceneName || '').trim() || _getCurrentSceneName();
    if (!scene) throw new Error('Missing scene name');
    if (!window.obsAPI?.sceneItems?.setTransform) throw new Error('OBS API not available');
    const item = await getSourceSceneItem(sourceName, scene);
    const input = transform && typeof transform === 'object' ? transform : {};
    const payload = {};
    Object.entries(input).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (typeof value === 'number' && !Number.isFinite(value)) return;
      if (key === 'sourceWidth' || key === 'sourceHeight' || key === 'width' || key === 'height') return;
      payload[key] = value;
    });

    if (typeof payload.boundsWidth === 'number' && payload.boundsWidth < 1) {
      delete payload.boundsWidth;
    }
    if (typeof payload.boundsHeight === 'number' && payload.boundsHeight < 1) {
      delete payload.boundsHeight;
    }

    await window.obsAPI.sceneItems.setTransform(scene, item.sceneItemId, payload);
    if (options?.refreshDashboard) {
      requestDashboardRefresh('setSourceTransform');
    }
  };

  const setSourcePosition = async (sourceName, x, y, sceneName, options = {}) => {
    await setSourceTransform(sourceName, {
      positionX: Number(x),
      positionY: Number(y)
    }, sceneName, options);
  };

  const swapSourcePositions = async (sourceA, sourceB, sceneName) => {
    const [ta, tb] = await Promise.all([
      getSourceTransform(sourceA, sceneName),
      getSourceTransform(sourceB, sceneName)
    ]);

    const ax = Number(ta?.positionX ?? 0);
    const ay = Number(ta?.positionY ?? 0);
    const bx = Number(tb?.positionX ?? 0);
    const by = Number(tb?.positionY ?? 0);

    await Promise.all([
      setSourcePosition(sourceA, bx, by, sceneName),
      setSourcePosition(sourceB, ax, ay, sceneName)
    ]);
  };

  const swapSourceTransforms = async (sourceA, sourceB, sceneName) => {
    const a = String(sourceA || '').trim();
    const b = String(sourceB || '').trim();
    if (!a || !b) throw new Error('Missing source names');
    if (a === b) return;

    const [ta, tb] = await Promise.all([
      getSourceTransform(a, sceneName),
      getSourceTransform(b, sceneName)
    ]);

    await Promise.all([
      setSourceTransform(a, tb || {}, sceneName),
      setSourceTransform(b, ta || {}, sceneName)
    ]);
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

  const addControlButton = (id, label, onClick, classNameOrOptions) => {
    const host = document.getElementById('pluginButtons');
    if (!host) return null;

    const safeId = String(id || '').trim();
    if (!safeId) return null;

    const existing = host.querySelector(`#${CSS.escape(safeId)}`);
    if (existing) return existing;

    const options = (classNameOrOptions && typeof classNameOrOptions === 'object') ? classNameOrOptions : {};
    const className = (typeof classNameOrOptions === 'string' && classNameOrOptions.trim()) ? classNameOrOptions.trim() : '';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = safeId;
    btn.className = className || 'btn-plugin';

    const tint = String(options.tint || '').trim().toLowerCase();
    if (tint) {
      btn.classList.add(`btn-plugin--tint-${tint}`);
    }

    const icon = options.icon;
    if (icon !== undefined && icon !== null && String(icon).trim()) {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'btn-plugin-icon';
      iconSpan.textContent = String(icon);
      iconSpan.setAttribute('aria-hidden', 'true');
      btn.appendChild(iconSpan);
    }

    const labelSpan = document.createElement('span');
    labelSpan.className = 'btn-plugin-label';
    labelSpan.textContent = String(label || safeId);
    btn.appendChild(labelSpan);

    btn.title = labelSpan.textContent;
    if (typeof onClick === 'function') {
      btn.addEventListener('mousedown', onClick);
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

  const registerSidebarButton = (pluginName, id, label, onClick, classNameOrOptions) => {
    const wrappedOnClick = async (...args) => {
      try {
        return await onClick?.(...args);
      } finally {
        requestDashboardRefresh('plugin-button');
      }
    };
    const btn = addControlButton(id, label, wrappedOnClick, classNameOrOptions);
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
  listHotkeys / triggerHotkeyByName / triggerHotkeyBySequence
  ---------------------------------------------------------------------------------------- */
  const listHotkeys = async () => {
    if (!window.obsAPI?.hotkeys?.list) throw new Error('OBS hotkeys API not available');
    const res = await window.obsAPI.hotkeys.list();
    return res?.hotkeys ?? res ?? [];
  };

  const triggerHotkeyByName = async (hotkeyName, contextName) => {
    const name = String(hotkeyName || '').trim();
    if (!name) throw new Error('triggerHotkeyByName: hotkeyName is required');
    if (!window.obsAPI?.hotkeys?.triggerByName) throw new Error('OBS hotkeys API not available');
    return await window.obsAPI.hotkeys.triggerByName(name, contextName || undefined);
  };

  const triggerHotkeyBySequence = async (keyId, keyModifiers) => {
    if (!window.obsAPI?.hotkeys?.triggerBySequence) throw new Error('OBS hotkeys API not available');
    const mods = (keyModifiers && typeof keyModifiers === 'object') ? keyModifiers : undefined;
    return await window.obsAPI.hotkeys.triggerBySequence(keyId || undefined, mods);
  };

/*----------------------------------------------------------------------------------------
  callVendorRequest
  Send a CallVendorRequest to OBS and return the response data.
  vendorName  — name of the vendor (e.g. 'obs-browser')
  requestType — the request type string the vendor registered
  requestData — optional object payload (defaults to {})
  Returns { vendorName, requestType, responseData }
  ---------------------------------------------------------------------------------------- */
  const callVendorRequest = async (vendorName, requestType, requestData) => {
    const vn = String(vendorName || '').trim();
    const rt = String(requestType || '').trim();
    if (!vn) throw new Error('callVendorRequest: vendorName is required');
    if (!rt) throw new Error('callVendorRequest: requestType is required');
    if (!window.obsAPI?.vendor?.callRequest) throw new Error('OBS vendor API not available');
    const rd = (requestData && typeof requestData === 'object') ? requestData : {};
    return await window.obsAPI.vendor.callRequest(vn, rt, rd);
  };

/*----------------------------------------------------------------------------------------
  onVendorEvent / offVendorEvent
  Subscribe to VendorEvent emissions from OBS.
  filter  — optional { vendorName, eventType } to narrow which events trigger the callback
  Returns the unsubscribe function.
  ---------------------------------------------------------------------------------------- */
  const _vendorEventListeners = new Set();

  const _handleVendorObsEvent = (evt) => {
    if (evt?.type !== 'vendor-event') return;
    _vendorEventListeners.forEach((entry) => {
      const { filter, callback } = entry;
      if (filter.vendorName && filter.vendorName !== evt.data?.vendorName) return;
      if (filter.eventType && filter.eventType !== evt.data?.eventType) return;
      try { callback(evt.data); } catch (_) {}
    });
  };

  let _vendorObsEventBound = false;
  const _ensureVendorObsBound = () => {
    if (_vendorObsEventBound) return;
    _vendorObsEventBound = true;
    if (window.obsAPI?.onEvent) {
      window.obsAPI.onEvent(_handleVendorObsEvent);
    }
  };

  const onVendorEvent = (filter, callback) => {
    if (typeof filter === 'function') {
      callback = filter;
      filter = {};
    }
    if (typeof callback !== 'function') throw new Error('onVendorEvent: callback must be a function');
    const f = (filter && typeof filter === 'object') ? filter : {};
    const entry = { filter: f, callback };
    _vendorEventListeners.add(entry);
    _ensureVendorObsBound();
    return () => _vendorEventListeners.delete(entry);
  };

  const offVendorEvent = (callback) => {
    _vendorEventListeners.forEach((entry) => {
      if (entry.callback === callback) _vendorEventListeners.delete(entry);
    });
  };

/*----------------------------------------------------------------------------------------
  Expose globally
  ---------------------------------------------------------------------------------------- */
  // Store reference to plugin sandbox windows
  const pluginSandboxWindows = new Map();

  /**
   * Register a plugin's sandbox window for script loading
   * @param {string} pluginId - The plugin ID/folder name
   * @param {Object} sandboxWindow - The plugin's sandboxed window object
   */
  const registerPluginSandbox = (pluginId, sandboxWindow) => {
    pluginSandboxWindows.set(pluginId, sandboxWindow);
    console.log(`[PluginUtils] Registered sandbox for ${pluginId}`);
  };

  /**
   * Load a companion script for a plugin (e.g., create.js, config.js)
   * @param {string} pluginId - The plugin ID/folder name
   * @param {string} filename - The script filename to load (e.g., 'create.js')
   * @returns {Promise<boolean>} - True if loaded successfully
   */
  const loadPluginScript = async (pluginId, filename) => {
    console.log(`[PluginUtils] loadPluginScript called: pluginId=${pluginId}, filename=${filename}`);
    try {
      if (!window.pluginAPI?.readPackageFile) {
        console.warn('[PluginUtils] readPackageFile not available');
        return false;
      }
      console.log(`[PluginUtils] Calling readPackageFile for ${pluginId}/${filename}`);

      const raw = await window.pluginAPI.readPackageFile(pluginId, filename);
      console.log(`[PluginUtils] readPackageFile returned content length:`, raw?.length || 0);

      if (!raw) {
        console.warn(`[PluginUtils] ${filename} not found in ${pluginId}`);
        return false;
      }

      // Get the plugin's sandbox window, fallback to main window
      const targetWindow = pluginSandboxWindows.get(pluginId) || window;
      console.log(`[PluginUtils] Using window for ${pluginId}:`, targetWindow === window ? 'main window' : 'sandbox window');

      // Execute the script in the plugin's sandbox context
      console.log(`[PluginUtils] Executing ${filename} in plugin context...`);
      const scriptFunction = new Function('window', 'document', 'console', `
        ${raw}
      `);
      scriptFunction(targetWindow, document, console);

      console.log(`[PluginUtils] Successfully loaded ${filename} for ${pluginId}`);
      return true;
    } catch (err) {
      console.error(`[PluginUtils] Failed to load ${filename} for ${pluginId}:`, err);
      return false;
    }
  };

  window.PluginUtils = {
    createVolumeControl,
    applyRowBackground,
    applySourceIcon,
    fetchJson,
    readJsonConfig,
    parseSimpleYaml,
    readYamlConfig,
    buildUrlWithParams,
    setBrowserSourceUrlWithParams,
    requestDashboardRefresh,
    setTextSource,
    getSourceText,
    setSourceURL,
    getSourceURL,
    swapSourceURLs,
    setSourceVolume,
    getSourceVolume,
    getSourceVolumePercent,
    setSourceEnabled,
    getSourceEnabled,
    toggleSourceEnabled,
    setSourceVisibility,
    listSceneItems,
    getSourceSceneItem,
    getSourceTransform,
    setSourceTransform,
    setSourcePosition,
    swapSourcePositions,
    swapSourceTransforms,
    addControlButton,
    removeControlButton,
    registerSidebarButton,
    unregisterSidebarButtons,
    loadPluginScript,
    registerPluginSandbox,
    listHotkeys,
    triggerHotkeyByName,
    triggerHotkeyBySequence,
    callVendorRequest,
    onVendorEvent,
    offVendorEvent
  };
})();
