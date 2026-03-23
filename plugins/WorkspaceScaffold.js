(function() {
  const PLUGIN_NAME = 'LiveStreamManager';
  const SOURCE_PATTERN = /^_\*stream\d*$/i;
  const CHANNEL_LIST_FILES = [
    'LiveStreamManager.channels.txt',
    'LiveStreamManagerChannels.txt',
    'channels.txt'
  ];

  const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const getChannelLabel = (url, fallback) => {
    const pretty = (value) => {
      const text = String(value || '').trim();
      if (!text) return text;
      return text.charAt(0).toUpperCase() + text.slice(1);
    };

    const raw = String(url || '').trim();
    if (!raw) return fallback || '(empty)';
    try {
      const parsed = new URL(raw);
      const host = parsed.hostname.toLowerCase();
      if (host.includes('twitch.tv')) {
        const channel = parsed.searchParams.get('channel');
        if (channel) return pretty(channel);
      }
      const pathName = parsed.pathname.replace(/^\/+/, '').split('/')[0] || '';
      return pretty(pathName || parsed.hostname || fallback || raw);
    } catch (_) {
      return pretty(raw || fallback || '(empty)');
    }
  };

  const getChannelFromUrl = (url) => {
    const raw = String(url || '').trim();
    if (!raw) return '';
    try {
      const parsed = new URL(raw);
      const host = parsed.hostname.toLowerCase();
      if (host.includes('twitch.tv')) {
        const fromQuery = String(parsed.searchParams.get('channel') || '').trim();
        if (fromQuery) return fromQuery;
      }
      return String(parsed.pathname || '').replace(/^\/+/, '').split('/')[0] || '';
    } catch (_) {
      return '';
    }
  };

  const byStreamIndex = (a, b) => {
    const aNum = Number(String(a?.sourceName || '').match(/(\d+)/)?.[1] || 0);
    const bNum = Number(String(b?.sourceName || '').match(/(\d+)/)?.[1] || 0);
    return aNum - bNum;
  };

  let activeWorkspaceCleanup = null;
  let channelListCache = null;

  const getCurrentSceneName = () => String(document.getElementById('sceneSelect')?.value || '').trim();

  async function loadStreamState(sceneName) {
    const items = await window.PluginUtils.listSceneItems(sceneName);
    const allNames = items.map((it) => String(it?.sourceName || it?.inputName || '').trim()).filter(Boolean);
    const streamItems = items
      .filter((it) => SOURCE_PATTERN.test(String(it?.sourceName || it?.inputName || '').trim()))
      .map((it) => ({
        sourceName: String(it.sourceName || it.inputName),
        sceneItemId: it.sceneItemId
      }))
      .sort(byStreamIndex);

    const data = await Promise.all(streamItems.map(async (it) => {
      let url = '';
      let transform = {};

      try {
        const urlRes = await window.PluginUtils.getSourceURL(it.sourceName);
        url = typeof urlRes === 'string' ? urlRes : String(urlRes?.inputSettings?.url || '');
      } catch (_) {
        url = '';
      }

      try {
        transform = await window.PluginUtils.getSourceTransform(it.sourceName, sceneName) || {};
      } catch (_) {
        transform = {};
      }

      return {
        ...it,
        url,
        transform: transform || {}
      };
    }));

    return { data, allNames };
  }

  async function getStreamStatePayload(sceneName) {
    const scene = String(sceneName || '').trim() || getCurrentSceneName();
    const channels = await loadChannelList();
    if (!scene) {
      return { sceneName: '', streams: [], allNames: [], channels };
    }
    const { data, allNames } = await loadStreamState(scene);
    const streams = data.map((stream) => ({
      sourceName: stream.sourceName,
      url: stream.url,
      label: getChannelLabel(stream.url, stream.sourceName),
      transform: stream.transform || {}
    }));
    return { sceneName: scene, streams, allNames, channels };
  }

  function parseChannelList(rawText) {
    return String(rawText || '')
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
  }

  async function loadChannelList(forceReload = false) {
    if (!forceReload && Array.isArray(channelListCache)) {
      return channelListCache;
    }

    if (!window.pluginAPI?.readFile) {
      channelListCache = [];
      return channelListCache;
    }

    for (const fileName of CHANNEL_LIST_FILES) {
      try {
        const raw = await window.pluginAPI.readFile(fileName);
        const parsed = parseChannelList(raw);
        channelListCache = parsed;
        return channelListCache;
      } catch (_) {
        // try next candidate file
      }
    }

    channelListCache = [];
    return channelListCache;
  }

  function buildChannelUrl(currentUrl, channelName) {
    const channel = String(channelName || '').trim();
    if (!channel) return String(currentUrl || '').trim();

    const rawCurrent = String(currentUrl || '').trim();
    if (!rawCurrent) return `https://www.twitch.tv/${encodeURIComponent(channel)}`;

    try {
      const parsed = new URL(rawCurrent);
      const host = parsed.hostname.toLowerCase();
      if (host.includes('twitch.tv')) {
        parsed.searchParams.set('channel', channel);
        const currentPath = String(parsed.pathname || '').trim();
        if (!currentPath || currentPath === '/') {
          parsed.pathname = '/';
        }
        return parsed.toString();
      }
    } catch (_) {
      // fallback below
    }

    return `https://www.twitch.tv/${encodeURIComponent(channel)}`;
  }

  async function setStreamChannel(sourceName, channelName) {
    const source = String(sourceName || '').trim();
    const channel = String(channelName || '').trim();
    if (!source) throw new Error('Missing source name');
    if (!channel) throw new Error('Missing channel name');

    const current = await window.PluginUtils.getSourceURL(source);
    const currentUrl = typeof current === 'string' ? current : String(current?.inputSettings?.url || '');
    const nextUrl = buildChannelUrl(currentUrl, channel);
    await window.PluginUtils.setSourceURL(source, nextUrl);
  }

  function createLiveStreamPopupHtml() {
    if (!window.PluginUtils?.createPopupHtml) return '';
    return window.PluginUtils.createPopupHtml(PLUGIN_NAME, {
      bodyHtml: '<div id="lsmPopupRoot" style="height: 100%; width: 100%;"></div>',
      script: `
        const root = document.getElementById('lsmPopupRoot');
        if (!root) return;

        const getInitialChannel = (url) => {
          const raw = String(url || '').trim();
          if (!raw) return '';
          try {
            const parsed = new URL(raw);
            const host = parsed.hostname.toLowerCase();
            if (host.includes('twitch.tv')) {
              const fromQuery = String(parsed.searchParams.get('channel') || '').trim();
              if (fromQuery) return fromQuery;
            }
            return String(parsed.pathname || '').replace(/^\\/+/,'').split('/')[0] || '';
          } catch (_) {
            return '';
          }
        };

        const style = document.createElement('style');
        style.textContent = [
          ':root { --lsm-border: rgba(150,198,255,0.75); }',
          'html, body { height: 100%; margin: 0; }',
          '#lsmPopupRoot { position: relative; height: 100%; width: 100%; background: #0b0f16; overflow: hidden; }',
          '.lsm-pop-stage { position: absolute; inset: 0; background: linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(180deg, rgba(10,22,43,0.85), rgba(5,12,24,0.92)); background-size: 32px 32px, 32px 32px, auto; }',
          '.lsm-pop-toolbar { position: absolute; top: 10px; right: 10px; z-index: 10; }',
          '.lsm-pop-node { position: absolute; display: grid; place-items: center; border-radius: 10px; border: 1px solid var(--lsm-border); background: linear-gradient(180deg, rgba(52,126,255,0.78), rgba(33,95,207,0.82)); color: #eef5ff; padding: 8px; box-sizing: border-box; cursor: grab; user-select: none; }',
          '.lsm-pop-node span { font-weight: 700; text-shadow: 0 1px 2px rgba(0,0,0,0.35); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
          '.lsm-pop-label-wrap { position: relative; display: inline-flex; flex-direction: column; align-items: center; max-width: 100%; }',
          '.lsm-pop-link-btn { border: 1px solid rgba(224,238,255,0.88); background: rgba(7,19,40,0.42); border-radius: 8px; color: inherit; font: inherit; font-weight: 700; text-shadow: 0 1px 2px rgba(0,0,0,0.35); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; padding: 4px 10px; line-height: 1.15; }',
          '.lsm-pop-picker { position: absolute; left: 50%; transform: translateX(-50%); top: calc(100% + 6px); z-index: 30; width: 260px; max-width: min(320px, calc(100vw - 24px)); border: 1px solid rgba(124,162,224,0.75); border-radius: 8px; background: #0b1321; box-shadow: 0 12px 28px rgba(0,0,0,0.45); padding: 8px; display: none; }',
          '.lsm-pop-picker.is-open { display: block; }',
          '.lsm-pop-search { width: 100%; box-sizing: border-box; border: 1px solid rgba(120,144,182,0.8); border-radius: 6px; background: #08101d; color: #eef5ff; padding: 6px 8px; margin-bottom: 6px; }',
          '.lsm-pop-options { max-height: 180px; overflow: auto; display: grid; gap: 4px; }',
          '.lsm-pop-option { border: 1px solid rgba(120,144,182,0.45); border-radius: 6px; background: rgba(27,44,78,0.65); color: #dfeeff; text-align: left; padding: 6px 8px; cursor: pointer; }',
          '.lsm-pop-option:hover { background: rgba(44,78,140,0.82); }',
          '.lsm-pop-picker-empty { color: #9bb2d3; font-size: 12px; }',
          '.lsm-pop-node.is-drop-target { outline: 2px solid #fff; outline-offset: 2px; }',
          '.lsm-pop-node.is-dragging { opacity: 0.55; cursor: grabbing; }',
          '.lsm-pop-empty { color: #9b9ba3; padding: 14px; white-space: pre-wrap; }'
        ].join('');
        document.head.appendChild(style);

        root.innerHTML = '<div class="lsm-pop-toolbar"><button id="lsmPopReload">Reload</button></div><div id="lsmPopStage" class="lsm-pop-stage"></div>';
        const stage = document.getElementById('lsmPopStage');
        const reloadBtn = document.getElementById('lsmPopReload');
        let openPicker = null;

        const closePicker = () => {
          if (!openPicker) return;
          openPicker.classList.remove('is-open');
          openPicker = null;
        };

        document.addEventListener('click', (event) => {
          if (!openPicker) return;
          if (openPicker.contains(event.target)) return;
          closePicker();
        });

        const createChannelPicker = (node, stream, channels, onUpdated) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'lsm-pop-link-btn';
          btn.draggable = false;
          btn.textContent = String(stream.label || stream.sourceName);
          btn.title = String(stream.label || stream.sourceName) + ' (click to select channel)';

          const picker = document.createElement('div');
          picker.className = 'lsm-pop-picker';
          picker.addEventListener('click', (e) => e.stopPropagation());

          const search = document.createElement('input');
          search.type = 'search';
          search.className = 'lsm-pop-search';
          search.placeholder = 'Search channel...';

          const optionsWrap = document.createElement('div');
          optionsWrap.className = 'lsm-pop-options';

          const currentChannel = String(getInitialChannel(stream.url) || '').toLowerCase();

          const renderOptions = () => {
            const query = String(search.value || '').trim().toLowerCase();
            const filtered = (Array.isArray(channels) ? channels : []).filter((name) => String(name || '').toLowerCase().includes(query));
            optionsWrap.innerHTML = '';

            if (!filtered.length) {
              const empty = document.createElement('div');
              empty.className = 'lsm-pop-picker-empty';
              empty.textContent = Array.isArray(channels) && channels.length
                ? 'No channels match your search.'
                : 'No channel list found. Add channels.txt in plugins folder.';
              optionsWrap.appendChild(empty);
              return;
            }

            filtered.forEach((channelName) => {
              const option = document.createElement('button');
              option.type = 'button';
              option.className = 'lsm-pop-option';
              option.textContent = channelName;
              option.title = channelName;
              if (String(channelName).toLowerCase() === currentChannel) {
                option.style.borderColor = '#77a9ff';
              }
              option.addEventListener('click', async () => {
                await window.pluginPopupHost.call('setStreamChannel', stream.sourceName, channelName);
                closePicker();
                await onUpdated();
              });
              optionsWrap.appendChild(option);
            });
          };

          search.addEventListener('input', renderOptions);
          search.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              closePicker();
            }
          });

          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const willOpen = !picker.classList.contains('is-open');
            closePicker();
            if (!willOpen) return;
            picker.classList.add('is-open');
            openPicker = picker;
            search.value = '';
            renderOptions();
            search.focus();
          });

          btn.addEventListener('mousedown', (e) => e.stopPropagation());

          const wrap = document.createElement('div');
          wrap.className = 'lsm-pop-label-wrap';
          picker.appendChild(search);
          picker.appendChild(optionsWrap);
          wrap.appendChild(btn);
          wrap.appendChild(picker);
          node.appendChild(wrap);
        };

        const getRect = (stream) => {
          const tf = stream?.transform || {};
          const sourceWidth = Number(tf.sourceWidth || tf.boundsWidth || 320);
          const sourceHeight = Number(tf.sourceHeight || tf.boundsHeight || 180);
          const scaleX = Math.abs(Number(tf.scaleX ?? 1)) || 1;
          const scaleY = Math.abs(Number(tf.scaleY ?? 1)) || 1;
          const width = Number(tf.width) > 0 ? Number(tf.width) : sourceWidth * scaleX;
          const height = Number(tf.height) > 0 ? Number(tf.height) : sourceHeight * scaleY;
          return { x: Number(tf.positionX || 0), y: Number(tf.positionY || 0), width: Math.max(40, width), height: Math.max(30, height) };
        };

        const buildViewport = (streams) => {
          const rects = streams.map((s) => ({ sourceName: s.sourceName, ...getRect(s) }));
          const minX = Math.min(...rects.map((r) => r.x));
          const minY = Math.min(...rects.map((r) => r.y));
          const maxX = Math.max(...rects.map((r) => r.x + r.width));
          const maxY = Math.max(...rects.map((r) => r.y + r.height));
          const sceneWidth = Math.max(1, maxX - minX);
          const sceneHeight = Math.max(1, maxY - minY);
          const map = {};
          rects.forEach((r) => { map[r.sourceName] = r; });
          return { minX, minY, sceneWidth, sceneHeight, map };
        };

        const render = async () => {
          const payload = await window.pluginPopupHost.call('getStreamState');
          const streams = Array.isArray(payload?.streams) ? payload.streams : [];
          const sceneName = String(payload?.sceneName || '');
          const allNames = Array.isArray(payload?.allNames) ? payload.allNames : [];
          const channels = Array.isArray(payload?.channels) ? payload.channels : [];
          stage.innerHTML = '';
          closePicker();

          if (!sceneName) {
            stage.innerHTML = '<div class="lsm-pop-empty">Select a scene in the main window first.</div>';
            return;
          }

          if (!streams.length) {
            stage.innerHTML = '<div class="lsm-pop-empty">No sources found matching _*streamN in scene "' + sceneName + '".\\nFound sources: ' + (allNames.join(', ') || '(none)') + '</div>';
            return;
          }

          const viewport = buildViewport(streams);
          streams.forEach((stream) => {
            const rect = viewport.map[stream.sourceName];
            const node = document.createElement('div');
            node.className = 'lsm-pop-node';
            node.draggable = true;
            node.style.left = (((rect.x - viewport.minX) / viewport.sceneWidth) * 100) + '%';
            node.style.top = (((rect.y - viewport.minY) / viewport.sceneHeight) * 100) + '%';
            node.style.width = ((rect.width / viewport.sceneWidth) * 100) + '%';
            node.style.height = ((rect.height / viewport.sceneHeight) * 100) + '%';
            createChannelPicker(node, stream, channels, render);

            node.addEventListener('dragstart', (e) => {
              node.classList.add('is-dragging');
              e.dataTransfer.setData('text/plain', stream.sourceName);
              e.dataTransfer.effectAllowed = 'move';
            });
            node.addEventListener('dragend', () => node.classList.remove('is-dragging'));
            node.addEventListener('dragover', (e) => { e.preventDefault(); node.classList.add('is-drop-target'); });
            node.addEventListener('dragleave', () => node.classList.remove('is-drop-target'));
            node.addEventListener('drop', async (e) => {
              e.preventDefault();
              node.classList.remove('is-drop-target');
              const fromSource = e.dataTransfer.getData('text/plain');
              const toSource = stream.sourceName;
              if (!fromSource || fromSource === toSource) return;
              await window.pluginPopupHost.call('swapSourceAssignments', fromSource, toSource, sceneName);
              await render();
            });

            stage.appendChild(node);
          });
        };

        reloadBtn.addEventListener('click', async () => {
          await window.pluginPopupHost.call('reloadChannels');
          await render();
        });
        render();
      `
    });
  }

  function getStreamRect(stream) {
    const tf = stream?.transform || {};
    const sourceWidth = Number(tf.sourceWidth || tf.boundsWidth || 320);
    const sourceHeight = Number(tf.sourceHeight || tf.boundsHeight || 180);
    const scaleX = Math.abs(Number(tf.scaleX ?? 1)) || 1;
    const scaleY = Math.abs(Number(tf.scaleY ?? 1)) || 1;
    const width = Number(tf.width) > 0 ? Number(tf.width) : sourceWidth * scaleX;
    const height = Number(tf.height) > 0 ? Number(tf.height) : sourceHeight * scaleY;
    return {
      x: Number(tf.positionX || 0),
      y: Number(tf.positionY || 0),
      width: Math.max(40, width),
      height: Math.max(30, height)
    };
  }

  function buildViewport(streams) {
    const rects = streams.map((stream) => ({ sourceName: stream.sourceName, ...getStreamRect(stream) }));
    const minX = Math.min(...rects.map((r) => r.x));
    const minY = Math.min(...rects.map((r) => r.y));
    const maxX = Math.max(...rects.map((r) => r.x + r.width));
    const maxY = Math.max(...rects.map((r) => r.y + r.height));
    const sceneWidth = Math.max(1, maxX - minX);
    const sceneHeight = Math.max(1, maxY - minY);

    const map = {};
    rects.forEach((r) => {
      map[r.sourceName] = r;
    });

    return { minX, minY, sceneWidth, sceneHeight, rectMap: map };
  }

  function renderStreamNode(stream, viewport, onSwap, options = {}) {
    const node = document.createElement('div');
    node.className = 'lsm-node';
    node.draggable = true;
    node.dataset.source = stream.sourceName;

    const rect = viewport.rectMap[stream.sourceName];
    const leftPct = ((rect.x - viewport.minX) / viewport.sceneWidth) * 100;
    const topPct = ((rect.y - viewport.minY) / viewport.sceneHeight) * 100;
    const widthPct = (rect.width / viewport.sceneWidth) * 100;
    const heightPct = (rect.height / viewport.sceneHeight) * 100;

    node.style.left = `${leftPct}%`;
    node.style.top = `${topPct}%`;
    node.style.width = `${widthPct}%`;
    node.style.height = `${heightPct}%`;

    const channelLabel = getChannelLabel(stream.url, stream.sourceName);

    const linkBtn = document.createElement('button');
    linkBtn.type = 'button';
    linkBtn.className = 'lsm-link-btn';
    linkBtn.draggable = false;
    linkBtn.title = `${channelLabel} (click to select channel)`;
    linkBtn.innerHTML = `<span class="lsm-link">${escapeHtml(channelLabel)}</span>`;

    const picker = document.createElement('div');
    picker.className = 'lsm-channel-picker';

    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.className = 'lsm-channel-search';
    searchInput.placeholder = 'Search channel...';

    const optionsWrap = document.createElement('div');
    optionsWrap.className = 'lsm-channel-options';

    const channels = Array.isArray(options.channels) ? options.channels : [];
    const getInitialChannel = typeof options.getInitialChannel === 'function' ? options.getInitialChannel : (() => '');
    const currentChannel = String(getInitialChannel(stream.url) || '').toLowerCase();

    const renderPickerOptions = () => {
      const query = String(searchInput.value || '').trim().toLowerCase();
      const filtered = channels.filter((name) => String(name || '').toLowerCase().includes(query));
      optionsWrap.innerHTML = '';

      if (!filtered.length) {
        const empty = document.createElement('div');
        empty.className = 'lsm-channel-empty';
        empty.textContent = channels.length
          ? 'No channels match your search.'
          : 'No channel list found. Add channels.txt in plugins folder.';
        optionsWrap.appendChild(empty);
        return;
      }

      filtered.forEach((channelName) => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'lsm-channel-option';
        option.textContent = channelName;
        option.title = channelName;
        if (String(channelName).toLowerCase() === currentChannel) {
          option.style.borderColor = '#77a9ff';
        }
        option.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          picker.classList.remove('is-open');
          await options.onSelectChannel?.(stream.sourceName, channelName);
        });
        optionsWrap.appendChild(option);
      });
    };

    linkBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const willOpen = !picker.classList.contains('is-open');
      document.querySelectorAll('.lsm-channel-picker.is-open').forEach((el) => el.classList.remove('is-open'));
      if (!willOpen) return;
      picker.classList.add('is-open');
      searchInput.value = '';
      renderPickerOptions();
      searchInput.focus();
    });

    linkBtn.addEventListener('mousedown', (e) => e.stopPropagation());
    picker.addEventListener('click', (e) => e.stopPropagation());
    searchInput.addEventListener('input', renderPickerOptions);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        picker.classList.remove('is-open');
      }
    });

    const labelWrap = document.createElement('div');
    labelWrap.className = 'lsm-label-wrap';

    picker.appendChild(searchInput);
    picker.appendChild(optionsWrap);
    labelWrap.appendChild(linkBtn);
    labelWrap.appendChild(picker);
    node.appendChild(labelWrap);

    node.addEventListener('dragstart', (e) => {
      node.classList.add('is-dragging');
      e.dataTransfer.setData('text/plain', stream.sourceName);
      e.dataTransfer.effectAllowed = 'move';
    });
    node.addEventListener('dragend', () => node.classList.remove('is-dragging'));
    node.addEventListener('dragover', (e) => {
      e.preventDefault();
      node.classList.add('is-drop-target');
    });
    node.addEventListener('dragleave', () => node.classList.remove('is-drop-target'));
    node.addEventListener('drop', async (e) => {
      e.preventDefault();
      node.classList.remove('is-drop-target');
      const fromSource = e.dataTransfer.getData('text/plain');
      const toSource = stream.sourceName;
      if (!fromSource || fromSource === toSource) return;
      await onSwap(fromSource, toSource);
    });

    return node;
  }

  function ensureStyles(mount) {
    if (mount.querySelector('#lsm-styles')) return;
    const style = document.createElement('style');
    style.id = 'lsm-styles';
    style.textContent = `
      .lsm-shell {
        position: relative;
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        min-height: 0;
        padding: 0;
        border: none;
        border-radius: 0;
        overflow: hidden;
      }
      .lsm-toolbar {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 8;
        margin: 0;
        padding: 0;
        border: none;
        background: transparent;
      }
      .lsm-stage-wrap {
        position: relative;
        flex: 1;
        min-height: 120px;
        border-radius: 0;
        overflow: hidden;
        background: #0b0f16;
      }
      .lsm-stage {
        position: relative;
        width: 100%;
        height: 100%;
        background:
          linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px),
          linear-gradient(180deg, rgba(10,22,43,0.85), rgba(5,12,24,0.92));
        background-size: 32px 32px, 32px 32px, auto;
      }
      .lsm-node {
        position: absolute;
        display: grid;
        place-items: center;
        box-sizing: border-box;
        border-radius: 10px;
        border: 1px solid rgba(150, 198, 255, 0.75);
        background: linear-gradient(180deg, rgba(52, 126, 255, 0.78), rgba(33, 95, 207, 0.82));
        color: #eef5ff;
        text-align: center;
        padding: 8px;
        user-select: none;
        cursor: grab;
      }
      .lsm-node .lsm-link {
        font-weight: 700;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
        line-height: 1.2;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .lsm-link-btn {
        border: 1px solid rgba(224, 238, 255, 0.88);
        background: rgba(7, 19, 40, 0.42);
        border-radius: 8px;
        color: inherit;
        cursor: pointer;
        font: inherit;
        padding: 4px 10px;
        line-height: 1.15;
        max-width: 100%;
      }
      .lsm-label-wrap {
        position: relative;
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        max-width: 100%;
      }
      .lsm-channel-picker {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        top: calc(100% + 6px);
        z-index: 30;
        width: 260px;
        max-width: min(320px, calc(100vw - 24px));
        border: 1px solid rgba(124, 162, 224, 0.75);
        border-radius: 8px;
        background: #0b1321;
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
        padding: 8px;
        display: none;
      }
      .lsm-channel-picker.is-open {
        display: block;
      }
      .lsm-channel-search {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid rgba(120, 144, 182, 0.8);
        border-radius: 6px;
        background: #08101d;
        color: #eef5ff;
        padding: 6px 8px;
        margin-bottom: 6px;
      }
      .lsm-channel-options {
        max-height: 180px;
        overflow: auto;
        display: grid;
        gap: 4px;
      }
      .lsm-channel-option {
        border: 1px solid rgba(120, 144, 182, 0.45);
        border-radius: 6px;
        background: rgba(27, 44, 78, 0.65);
        color: #dfeeff;
        text-align: left;
        padding: 6px 8px;
        cursor: pointer;
      }
      .lsm-channel-option:hover {
        background: rgba(44, 78, 140, 0.82);
      }
      .lsm-channel-empty {
        color: #9bb2d3;
        font-size: 12px;
      }
      .lsm-node.is-dragging { opacity: 0.55; cursor: grabbing; }
      .lsm-node.is-drop-target { outline: 2px solid #fff; outline-offset: 2px; }
      .lsm-empty {
        color: var(--plugin-muted);
        padding: 14px;
        font-size: 13px;
        white-space: pre-wrap;
      }
    `;
    mount.appendChild(style);
  }

  function registerWorkspaceButton() {
    if (!window.PluginUtils?.registerModalSidebarButton) {
      window.uiHelpers?.logWarn('registerModalSidebarButton not available', 'plugin');
      return;
    }

    window.PluginUtils.registerPopupRpcHandlers?.(PLUGIN_NAME, {
      getStreamState: async () => {
        return await getStreamStatePayload();
      },
      swapSourceAssignments: async (sourceA, sourceB) => {
        await window.PluginUtils.swapSourceTransforms(sourceA, sourceB);
        return { ok: true };
      },
      setStreamChannel: async (sourceName, channelName) => {
        await setStreamChannel(sourceName, channelName);
        return { ok: true };
      },
      reloadChannels: async () => {
        await loadChannelList(true);
        return { ok: true };
      }
    });

    window.PluginUtils.registerModalSidebarButton(
      PLUGIN_NAME,
      'LiveStreamManager_open',
      'Open Stream Manager',
      async ({ mount }) => {
        if (typeof activeWorkspaceCleanup === 'function') {
          activeWorkspaceCleanup();
          activeWorkspaceCleanup = null;
        }

        mount.style.padding = '0';
        mount.style.overflow = 'hidden';
        mount.style.display = 'flex';
        mount.style.height = '100%';
        mount.style.minHeight = '0';

        const modalBody = document.querySelector('.plugin-modal-body');
        let resizeObserver = null;
        if (modalBody && typeof ResizeObserver !== 'undefined') {
          const syncMountHeight = () => {
            const h = Math.max(160, modalBody.clientHeight || 0);
            mount.style.height = `${h}px`;
          };
          syncMountHeight();
          resizeObserver = new ResizeObserver(syncMountHeight);
          resizeObserver.observe(modalBody);
        }

        const sceneName = document.getElementById('sceneSelect')?.value;
        if (!sceneName) {
          mount.innerHTML = '<div class="plugin-shell"><p>Select a scene first.</p></div>';
          activeWorkspaceCleanup = () => {
            if (resizeObserver) resizeObserver.disconnect();
          };
          return;
        }

        const shell = document.createElement('section');
        shell.className = 'plugin-shell lsm-shell';
        shell.innerHTML = `
          <header class="lsm-toolbar">
            <button id="lsm-refresh" class="btn-plugin" type="button">Reload</button>
          </header>
          <div class="lsm-stage-wrap">
            <div id="lsm-stage" class="lsm-stage"></div>
          </div>
        `;
        mount.appendChild(shell);
        ensureStyles(mount);

        const stage = shell.querySelector('#lsm-stage');
        const refreshBtn = shell.querySelector('#lsm-refresh');
        const closeChannelPickers = () => {
          stage.querySelectorAll('.lsm-channel-picker.is-open').forEach((el) => el.classList.remove('is-open'));
        };
        const handleDocumentClick = (event) => {
          if (shell.contains(event.target)) return;
          closeChannelPickers();
        };
        const ownerDoc = mount?.ownerDocument;
        if (ownerDoc && typeof ownerDoc.addEventListener === 'function') {
          ownerDoc.addEventListener('click', handleDocumentClick);
        }

        const renderAll = async () => {
          try {
            const { data: streams, allNames } = await loadStreamState(sceneName);
            const channels = await loadChannelList();
            stage.innerHTML = '';

            if (!streams.length) {
              const shown = allNames.length ? allNames.join(', ') : '(none)';
              stage.innerHTML = `<div class="lsm-empty">No sources found matching _*streamN in scene "${escapeHtml(sceneName)}".\nFound sources: ${escapeHtml(shown)}</div>`;
              return;
            }

            const viewport = buildViewport(streams);

            const onSwap = async (fromSource, toSource) => {
              try {
                await window.PluginUtils.swapSourceTransforms(fromSource, toSource);
                window.uiHelpers?.logSuccess(`Swapped stream transforms: ${fromSource} ↔ ${toSource}`, 'plugin');
                await renderAll();
              } catch (err) {
                window.uiHelpers?.logError(`Swap failed: ${err?.message || err}`, 'plugin');
              }
            };

            const onSelectChannel = async (sourceName, channelName) => {
              try {
                await setStreamChannel(sourceName, channelName);
                window.uiHelpers?.logSuccess(`Channel updated: ${sourceName} → ${channelName}`, 'plugin');
                await renderAll();
              } catch (err) {
                window.uiHelpers?.logError(`Channel update failed: ${err?.message || err}`, 'plugin');
              }
            };

            streams.forEach((stream) => {
              const node = renderStreamNode(stream, viewport, onSwap, {
                channels,
                getInitialChannel: getChannelFromUrl,
                onSelectChannel
              });
              stage.appendChild(node);
            });
          } catch (err) {
            stage.innerHTML = `<div class="lsm-empty">Failed to load streams: ${escapeHtml(err?.message || String(err))}</div>`;
            window.uiHelpers?.logError(`LiveStreamManager render failed: ${err?.message || err}`, 'plugin');
          }
        };

        refreshBtn.addEventListener('click', async () => {
          await loadChannelList(true);
          await renderAll();
        });
        await renderAll();

        activeWorkspaceCleanup = () => {
          if (resizeObserver) resizeObserver.disconnect();
          if (ownerDoc && typeof ownerDoc.removeEventListener === 'function') {
            ownerDoc.removeEventListener('click', handleDocumentClick);
          }
        };

        return;
      },
      {
        title: 'Live Stream Manager',
        popupWidth: 1100,
        popupHeight: 720,
        popupHtml: createLiveStreamPopupHtml(),
        onClose: () => {
          if (typeof activeWorkspaceCleanup === 'function') {
            activeWorkspaceCleanup();
            activeWorkspaceCleanup = null;
          }
          const mount = document.getElementById('pluginModalMount');
          if (mount) {
            mount.style.padding = '';
            mount.style.overflow = '';
            mount.style.display = '';
            mount.style.height = '';
            mount.style.minHeight = '';
          }
        }
      }
    );
  }

  const Plugin = {
    name: PLUGIN_NAME,
    version: '1.0.0',
    canHandle() {
      return false;
    },
    async execute() {},
    cleanup() {
      window.PluginUtils?.unregisterPopupRpcHandlers?.(PLUGIN_NAME);
      window.PluginUtils?.unregisterSidebarButtons?.(PLUGIN_NAME);
      window.PluginUtils?.closePluginModal?.();
    }
  };

  if (window.CustomHandlerPlugins) {
    window.CustomHandlerPlugins.register(Plugin);
    registerWorkspaceButton();
  } else {
    window.addEventListener('customHandlerReady', () => {
      window.CustomHandlerPlugins.register(Plugin);
      registerWorkspaceButton();
    });
  }
})();
