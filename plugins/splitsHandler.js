(function() {
  const PLUGIN_NAME = 'SplitsHandler';
  const STORAGE_KEY = 'splitsHandlerConfig';

  const SPLIT_TYPES = {
    enterNether: 'story.enter_the_nether',
    enterBastion: 'nether.find_bastion',
    enterFortress: 'nether.find_fortress',
    blindTravel: 'projectelo.timeline.blind_travel',
    followEye: 'story.follow_ender_eye',
    enterEnd: 'story.enter_the_end'
  };

  const SPLIT_SOURCES = {
    enterNether: '_EnterNether',
    enterBastion: '_EnterBastion',
    enterFortress: '_EnterFortress',
    blindTravel: '_BlindTravel',
    followEye: '_FollowEye',
    enterEnd: '_EnterEnd',
    finalTime: '_FinalTime'
  };
  const RUNNER_CSV_FILE = 'RunnerSync.csv';

  function _defaultConfig() {
    return {
      player1: { identifier: '' },
      player2: { identifier: '' }
    };
  }

  function getConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return _defaultConfig();
      const parsed = JSON.parse(raw);
      return { ..._defaultConfig(), ...(parsed || {}) };
    } catch (_) {
      return _defaultConfig();
    }
  }

  function saveConfig(cfg) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  }

  function _formatTime(ms) {
    const n = Number(ms);
    if (!Number.isFinite(n) || n <= 0) return '-';

    const totalMs = Math.floor(n);
    const totalSeconds = Math.floor(totalMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  async function _fetchLatestMatchId(identifier) {
    const id = encodeURIComponent(String(identifier || '').trim());
    const url = `https://mcsrranked.com/api/users/${id}/matches`;

    const json = await window.PluginUtils.fetchJson(url);
    if (!json || !Array.isArray(json.data) || json.data.length === 0) {
      throw new Error('No matches found for user');
    }

    return json.data[0].id;
  }

  async function _fetchMatchDetails(matchId) {
    const url = `https://mcsrranked.com/api/matches/${matchId}`;
    const json = await window.PluginUtils.fetchJson(url);

    if (!json || json.status !== 'success' || !json.data) {
      throw new Error('Failed to fetch match details');
    }

    return json.data;
  }

  function _parseCsvLine(line) {
    const out = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (ch === ',' && !inQuotes) {
        out.push(cur.trim());
        cur = '';
        continue;
      }
      cur += ch;
    }

    out.push(cur.trim());
    return out;
  }

  function _normalizeHeader(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
  }

  async function _loadRunnerCsvRows() {
    if (!window.pluginAPI?.readFile) return [];

    const raw = await window.pluginAPI.readFile(RUNNER_CSV_FILE);
    const lines = String(raw || '')
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));

    if (!lines.length) return [];

    const headers = _parseCsvLine(lines[0]).map(_normalizeHeader);
    const rows = [];

    for (let i = 1; i < lines.length; i += 1) {
      const values = _parseCsvLine(lines[i]);
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = String(values[idx] || '').trim();
      });
      if (row.ign) rows.push(row);
    }

    return rows;
  }

  function _resolveIgnFromCsv(rows, input) {
    const raw = String(input || '').trim();
    if (!raw) return '';

    const key = raw.toLowerCase();
    const found = rows.find((row) => {
      const ign = String(row?.ign || '').trim().toLowerCase();
      const chosen = String(row?.chosen_name || '').trim().toLowerCase();
      const twitch = String(row?.twitchname || '').trim().toLowerCase();
      return key === ign || key === chosen || key === twitch;
    });

    return String(found?.ign || raw).trim();
  }

  async function _getPlayerIGNs() {
    const ign1Raw = await window.PluginUtils.getSourceText('_IGN1');
    const ign2Raw = await window.PluginUtils.getSourceText('_IGN2');

    let ign1 = String(ign1Raw || '').trim();
    let ign2 = String(ign2Raw || '').trim();

    try {
      const rows = await _loadRunnerCsvRows();
      if (rows.length) {
        ign1 = _resolveIgnFromCsv(rows, ign1);
        ign2 = _resolveIgnFromCsv(rows, ign2);
      }
    } catch (e) {
      window.uiHelpers?.logWarn(`Splits CSV resolve skipped: ${e?.message || e}`, 'splits');
    }

    return {
      ign1: String(ign1 || '').trim().toLowerCase(),
      ign2: String(ign2 || '').trim().toLowerCase()
    };
  }

  function _resolvePlayerUuidsFromMatch(players, ign1, ign2) {
    const safeIgn1 = String(ign1 || '').trim().toLowerCase();
    const safeIgn2 = String(ign2 || '').trim().toLowerCase();

    const p1 = players.find((p) => String(p?.nickname || '').trim().toLowerCase() === safeIgn1) || null;
    const p2ByIgn2 = safeIgn2
      ? (players.find((p) => String(p?.nickname || '').trim().toLowerCase() === safeIgn2) || null)
      : null;

    // Preferred behavior:
    // - player1 MUST be IGN1 (the runner you're tracking)
    // - player2 is IGN2 if it exists in this match
    // - otherwise, player2 becomes the "other" player in this match
    let p2 = p2ByIgn2;
    if (!p2 && p1) {
      p2 = players.find((p) => String(p?.uuid || '') && String(p?.uuid || '') !== String(p1.uuid || '')) || null;
    }

    return {
      player1: p1,
      player2: p2
    };
  }

  function _extractSplitsForPlayer(timelines, uuid) {
    const splits = {};

    for (const [key, type] of Object.entries(SPLIT_TYPES)) {
      const entry = timelines.find(t => t.uuid === uuid && t.type === type);
      splits[key] = entry ? entry.time : null;
    }

    return splits;
  }

  function _getFinalTimeForPlayer(matchData, uuid) {
    if (matchData.completions && Array.isArray(matchData.completions)) {
      const completion = matchData.completions.find(c => c.uuid === uuid);
      if (completion) return completion.time;
    }

    if (matchData.result && matchData.result.uuid === uuid) {
      return matchData.result.time;
    }

    return null;
  }

  async function _setTextSource(sourceName, value) {
    if (window.PluginUtils?.setTextSource) {
      await window.PluginUtils.setTextSource(sourceName, String(value ?? ''));
      return;
    }
    await window.obsAPI.sources.setSettings(sourceName, { text: String(value ?? '') });
  }

  async function _updatePlayerSplits(playerNum, splits, finalTime) {
    const suffix = playerNum;
    const updates = [];

    for (const [key, sourceSuffix] of Object.entries(SPLIT_SOURCES)) {
      const sourceName = `${sourceSuffix}${suffix}`;
      let value = '-';

      if (key === 'finalTime') {
        value = _formatTime(finalTime);
      } else if (splits[key] !== null && splits[key] !== undefined) {
        value = _formatTime(splits[key]);
      }

      updates.push(_setTextSource(sourceName, value));
    }

    await Promise.all(updates);
  }

  async function syncSplits() {
    window.uiHelpers?.logInfo('Fetching splits...', 'splits');

    try {
      const { ign1, ign2 } = await _getPlayerIGNs();

      if (!ign1) {
        throw new Error('Missing _IGN1 (player 1). This plugin fetches the latest match based on _IGN1.');
      }

      const matchId = await _fetchLatestMatchId(ign1);
      window.uiHelpers?.logInfo(`Latest match ID: ${matchId}`, 'splits');

      const matchData = await _fetchMatchDetails(matchId);
      const players = matchData.players || [];
      const timelines = matchData.timelines || [];

      const resolved = _resolvePlayerUuidsFromMatch(players, ign1, ign2);
      const p1 = resolved.player1;
      const p2 = resolved.player2;

      window.uiHelpers?.logInfo(
        `Match players: ${players.map((p) => String(p?.nickname || '?')).join(', ')}`,
        'splits'
      );

      if (p1?.uuid) {
        window.uiHelpers?.logInfo(
          `Mapped player1 -> ${p1.nickname} (${p1.uuid})`,
          'splits'
        );
        const splits = _extractSplitsForPlayer(timelines, p1.uuid);
        const finalTime = _getFinalTimeForPlayer(matchData, p1.uuid);
        await _updatePlayerSplits(1, splits, finalTime);
        window.uiHelpers?.logSuccess('Player 1 splits updated', 'splits');
      } else {
        window.uiHelpers?.logWarn(`Player 1 (${ign1}) not found in latest match ${matchId}`, 'splits');
      }

      if (p2?.uuid) {
        window.uiHelpers?.logInfo(
          `Mapped player2 -> ${p2.nickname} (${p2.uuid})` + (ign2 ? ` (from _IGN2=${ign2} or opponent fallback)` : ' (opponent fallback)'),
          'splits'
        );
        const splits = _extractSplitsForPlayer(timelines, p2.uuid);
        const finalTime = _getFinalTimeForPlayer(matchData, p2.uuid);
        await _updatePlayerSplits(2, splits, finalTime);
        window.uiHelpers?.logSuccess('Player 2 splits updated', 'splits');
      } else {
        window.uiHelpers?.logWarn(
          ign2
            ? `Player 2 could not be resolved (IGN2=${ign2}). Not updating player 2 sources.`
            : 'Player 2 could not be resolved (_IGN2 empty and no opponent found). Not updating player 2 sources.',
          'splits'
        );
      }

      window.uiHelpers?.logSuccess('Splits sync complete', 'splits');

    } catch (e) {
      window.uiHelpers?.logError(`Splits sync failed: ${e?.message || e}`, 'splits');
      throw e;
    }
  }

  const registerSidebarButtons = () => {
    if (!window.PluginUtils?.registerSidebarButton) {
      window.uiHelpers?.logWarn('PluginUtils.registerSidebarButton not available', 'plugin');
      return;
    }

    window.PluginUtils.registerSidebarButton(
      PLUGIN_NAME,
      'splits_sync',
      'Sync Splits',
      async () => {
        try {
          await syncSplits();
        } catch (e) {
          // Error already logged
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

  window.splitsHandlerLogic = {
    getConfig,
    saveConfig,
    syncSplits
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
