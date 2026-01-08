(function() {
  const STORAGE_KEY = 'playerSyncConfig';

  function _defaultConfig() {
    return {
      player1: {
        identifier: '',
        sources: { elo: '_elo1', bestTime: '_besttime1' }
      },
      player2: {
        identifier: '',
        sources: { elo: '_elo2', bestTime: '_besttime2' }
      }
    };
  }

  function getConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return _defaultConfig();
      const parsed = JSON.parse(raw);
      return {
        ..._defaultConfig(),
        ...parsed,
        player1: { ..._defaultConfig().player1, ...(parsed.player1 || {}) },
        player2: { ..._defaultConfig().player2, ...(parsed.player2 || {}) }
      };
    } catch (_) {
      return _defaultConfig();
    }
  }

  function saveConfig(cfg) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  }

  function setIdentifier(playerIndex, identifier) {
    const cfg = getConfig();
    const key = playerIndex === 2 ? 'player2' : 'player1';
    cfg[key].identifier = String(identifier || '').trim();
    saveConfig(cfg);
  }

  function getIdentifier(playerIndex) {
    const cfg = getConfig();
    const key = playerIndex === 2 ? 'player2' : 'player1';
    return String(cfg[key].identifier || '').trim();
  }

  function _formatBestTime(ms) {
    const n = Number(ms);
    if (!Number.isFinite(n) || n <= 0) return '-';

    const totalMs = Math.floor(n);
    const totalSeconds = Math.floor(totalMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const millis = totalMs % 1000;

    return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  }

  async function _fetchPlayer(identifier) {
    const id = encodeURIComponent(String(identifier || '').trim());
    const url = `https://mcsrranked.com/api/users/${id}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();
    if (!json || json.status !== 'success' || !json.data) {
      throw new Error('Unexpected response');
    }

    const elo = json.data.eloRate;
    const best = json.data?.statistics?.total?.bestTime?.ranked;

    return {
      nickname: json.data.nickname,
      uuid: json.data.uuid,
      elo,
      bestTimeRanked: best,
      bestTimeFormatted: _formatBestTime(best)
    };
  }

  async function _setTextSource(sourceName, value) {
    const name = String(sourceName || '').trim();
    if (!name) throw new Error('Missing source name');
    await window.obsAPI.sources.setSettings(name, { text: String(value ?? '') });
  }

  async function syncPlayer(playerIndex) {
    const cfg = getConfig();
    const key = playerIndex === 2 ? 'player2' : 'player1';
    const identifier = String(cfg[key].identifier || '').trim();

    if (!identifier) {
      throw new Error(`Player ${playerIndex} identifier not set`);
    }

    window.uiHelpers?.logInfo(`Fetching ${identifier}…`, 'playersync');
    const data = await _fetchPlayer(identifier);

    const eloSource = cfg[key]?.sources?.elo;
    const bestSource = cfg[key]?.sources?.bestTime;

    await Promise.all([
      _setTextSource(eloSource, data.elo ?? '-'),
      _setTextSource(bestSource, data.bestTimeFormatted)
    ]);

    window.uiHelpers?.logSuccess(
      `Player ${playerIndex} updated (${data.nickname || identifier}) | ELO ${data.elo ?? '-'} | Best ${data.bestTimeFormatted}`,
      'playersync'
    );

    return data;
  }

  window.playerSyncLogic = {
    getConfig,
    saveConfig,
    setIdentifier,
    getIdentifier,
    syncPlayer
  };
})();
