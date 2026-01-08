(function() {
  const playerSyncPlugin = {
    name: 'PlayerSyncPlugin',
    version: '1.0.0',

    canHandle(sourceKind, sourceName, context) {
      if (!sourceName) return false;
      const normalized = String(sourceName);
      if (normalized === '_elo1') return true;
      if (normalized === '_besttime1') return true;
      if (normalized === '_elo2') return true;
      if (normalized === '_besttime2') return true;
      return false;
    },

    async execute(options, sourceName, displayName, context) {
      if (!options) return;

      const section = document.createElement('div');
      section.className = 'dash-option-row';

      const title = document.createElement('div');
      title.className = 'input-label';
      title.textContent = 'Player Sync';
      section.appendChild(title);

      const wrap = document.createElement('div');
      wrap.style.display = 'flex';
      wrap.style.gap = '8px';
      wrap.style.flexWrap = 'wrap';

      const btn1 = document.createElement('button');
      btn1.type = 'button';
      btn1.className = 'btn-ghost';
      btn1.textContent = 'Sync P1';

      const btn2 = document.createElement('button');
      btn2.type = 'button';
      btn2.className = 'btn-ghost';
      btn2.textContent = 'Sync P2';

      wrap.appendChild(btn1);
      wrap.appendChild(btn2);
      section.appendChild(wrap);
      options.appendChild(section);

      const readConfig = async () => {
        if (!window.pluginAPI?.readFile) {
          throw new Error('pluginAPI.readFile not available');
        }
        const raw = await window.pluginAPI.readFile('PlayerSyncPlugin.json');
        const cfg = JSON.parse(raw);
        return cfg || {};
      };

      const formatBestTime = (ms) => {
        const n = Number(ms);
        if (!Number.isFinite(n) || n <= 0) return '-';
        const totalMs = Math.floor(n);
        const totalSeconds = Math.floor(totalMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const millis = totalMs % 1000;
        return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
      };

      const fetchPlayer = async (apiBase, identifier) => {
        const id = encodeURIComponent(String(identifier || '').trim());
        const base = String(apiBase || 'https://mcsrranked.com/api/users/');
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

      const sync = async (playerKey) => {
        const cfg = await readConfig();
        const apiBase = cfg.apiBase || 'https://mcsrranked.com/api/users/';
        const player = cfg[playerKey] || {};
        const identifier = String(player.identifier || '').trim();
        if (!identifier) {
          throw new Error(`${playerKey} identifier is empty in PlayerSyncPlugin.json`);
        }

        window.uiHelpers?.logInfo(`Player Sync: fetching ${identifier}…`, 'playersync');
        const data = await fetchPlayer(apiBase, identifier);

        const targets = player.targets || {};
        await Promise.all([
          window.PluginUtils.setTextSource(targets.elo, data.elo ?? '-'),
          window.PluginUtils.setTextSource(targets.bestTime, data.bestTimeFormatted)
        ]);

        window.uiHelpers?.logSuccess(
          `Player Sync: ${playerKey} updated (${data.nickname || identifier}) | ELO ${data.elo ?? '-'} | Best ${data.bestTimeFormatted}`,
          'playersync'
        );
      };

      btn1.addEventListener('click', async () => {
        try {
          await sync('player1');
        } catch (e) {
          window.uiHelpers?.logError(`Player Sync P1 failed: ${e.message || e}`, 'playersync');
        }
      });

      btn2.addEventListener('click', async () => {
        try {
          await sync('player2');
        } catch (e) {
          window.uiHelpers?.logError(`Player Sync P2 failed: ${e.message || e}`, 'playersync');
        }
      });
    },

    priority() {
      return 50;
    }
  };

  // Autoregister plugin
  window.uiHelpers?.logInfo('MCSRplayersync attempting registration...', 'plugin');
  if (window.CustomHandlerPlugins) {
    window.CustomHandlerPlugins.register(playerSyncPlugin);
    window.uiHelpers?.logSuccess('MCSRplayersync registered', 'plugin');
  } else {
    window.uiHelpers?.logWarn('CustomHandlerPlugins not ready, waiting for event...', 'plugin');
    window.addEventListener('customHandlerReady', () => {
      window.CustomHandlerPlugins.register(playerSyncPlugin);
      window.uiHelpers?.logSuccess('playerSyncPlugin registered (after event)', 'plugin');
    });
  }

  window.uiHelpers?.logInfo('playerSyncPlugin loaded', 'plugin');
})();