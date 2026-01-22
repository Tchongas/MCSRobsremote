(function() {
  const PLUGIN_NAME = 'PlayerSyncPlugin';

  const SOURCES = {
    ign1: '_IGN1',
    ign2: '_IGN2',
    elo1: '_Elo1',
    elo2: '_Elo2',
    pb1: '_PBranked1',
    pb2: '_PBranked2',
    head1: '_Head1',
    head2: '_Head2',
    head1Bottom: '_Head1Bottom',
    head2Bottom: '_Head2Bottom'
  };

  const readConfig = async () => {
    // Optional config: only used for apiBase override.
    try {
      if (!window.pluginAPI?.readFile) return {};
      const raw = await window.pluginAPI.readFile('PlayerSyncPlugin.json');
      const cfg = JSON.parse(raw);
      return cfg || {};
    } catch (_) {
      return {};
    }
  };

  const formatBestTime = (ms) => {
    const n = Number(ms);
    if (!Number.isFinite(n) || n <= 0) return '-';
    const totalMs = Math.floor(n);
    const totalSeconds = Math.floor(totalMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const fetchPlayer = async (apiBase, identifier) => {
    const id = encodeURIComponent(String(identifier || '').trim());
    const base = String(apiBase || 'https://api.mcsrranked.com/users/');
    const url = base.endsWith('/') ? `${base}${id}` : `${base}/${id}`;
    const json = await window.PluginUtils.fetchJson(url);
    if (!json || json.status !== 'success' || !json.data) {
      throw new Error('Unexpected response');
    }
    const elo = json.data.eloRate;
    const best = json.data?.statistics?.total?.bestTime?.ranked;
    return {
      nickname: json.data.nickname,
      elo,
      bestTimeFormatted: formatBestTime(best)
    };
  };

  const _getIdentifierFromTextSource = async (sourceName) => {
    if (!window.PluginUtils?.getSourceText) {
      throw new Error('PluginUtils.getSourceText not available');
    }
    const raw = await window.PluginUtils.getSourceText(sourceName);
    return String(raw || '').trim();
  };

  const _setHeads = async (identifier, sources) => {
    if (!window.PluginUtils?.setSourceURL) {
      throw new Error('PluginUtils.setSourceURL not available');
    }
    const id = encodeURIComponent(String(identifier || '').trim());
    const url = `https://nmsr.nickac.dev/face/${id}`;
    await Promise.all(sources.map((s) => window.PluginUtils.setSourceURL(s, url)));
  };

  const syncBoth = async () => {
    const cfg = await readConfig();
    const apiBase = cfg.apiBase || 'https://api.mcsrranked.com/users/';

    if (!window.PluginUtils?.setTextSource) {
      throw new Error('PluginUtils.setTextSource not available');
    }

    const [id1, id2] = await Promise.all([
      _getIdentifierFromTextSource(SOURCES.ign1),
      _getIdentifierFromTextSource(SOURCES.ign2)
    ]);

    if (!id1) throw new Error(`Identifier empty in text source ${SOURCES.ign1}`);
    if (!id2) throw new Error(`Identifier empty in text source ${SOURCES.ign2}`);

    window.uiHelpers?.logInfo(`Player Sync: fetching ${id1} + ${id2}…`, 'playersync');

    const [p1, p2] = await Promise.all([
      fetchPlayer(apiBase, id1),
      fetchPlayer(apiBase, id2)
    ]);

    await Promise.all([
      window.PluginUtils.setTextSource(SOURCES.elo1, p1.elo ?? '-'),
      window.PluginUtils.setTextSource(SOURCES.pb1, p1.bestTimeFormatted),
      _setHeads(id1, [SOURCES.head1, SOURCES.head1Bottom]),

      window.PluginUtils.setTextSource(SOURCES.elo2, p2.elo ?? '-'),
      window.PluginUtils.setTextSource(SOURCES.pb2, p2.bestTimeFormatted),
      _setHeads(id2, [SOURCES.head2, SOURCES.head2Bottom])
    ]);

    window.uiHelpers?.logSuccess(
      `Player Sync: updated P1 (${p1.nickname || id1}) + P2 (${p2.nickname || id2})`,
      'playersync'
    );
  };

  const registerSidebarButtons = () => {
    if (!window.PluginUtils?.registerSidebarButton) {
      window.uiHelpers?.logWarn('PluginUtils.registerSidebarButton not available', 'plugin');
      return;
    }

    window.PluginUtils.registerSidebarButton(
      PLUGIN_NAME,
      'playersync_sync',
      'Sync Players',
      async () => {
        try {
          await syncBoth();
        } catch (e) {
          window.uiHelpers?.logError(`Player Sync failed: ${e?.message || e}`, 'playersync');
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
  } else {
    window.addEventListener('customHandlerReady', () => {
      window.CustomHandlerPlugins.register(Plugin);
      registerSidebarButtons();
    });
  }
})();
