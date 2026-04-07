(function() {
  const PLUGIN_NAME = 'RunnerSyncPlugin';

  const SOURCES = {
    ign1: '_IGN1',
    ign2: '_IGN2',
    name1: '_nameLeft',
    name2: '_nameRight',
    namewinner1: '_PlayerLeft',
    namewinner2: '_PlayerRight',
    elo1: '_eloLeft',
    elo2: '_eloRight',
    seed1: '_seedLeft',
    seed2: '_seedRight',
    pronouns1: '_pronounsLeft',
    pronouns2: '_pronounsRight',
    head1: '_headLeft',
    head2: '_headRight',
    twitch1: '_streamLeft',
    twitch2: '_streamRight'
  };

  const readConfig = async () => {
    try {
      if (!window.pluginAPI?.readFile) return {};
      const raw = await window.pluginAPI.readFile('RunnerSyncPlugin.json');
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

  const parseCsvLine = (line) => {
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
  };

  const normalizeHeader = (header) => {
    return String(header || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
  };

  const loadRunnerCsvMap = async (csvFileName) => {
    if (!window.pluginAPI?.readFile) {
      throw new Error('pluginAPI.readFile not available');
    }

    const csvRaw = await window.pluginAPI.readFile(csvFileName || 'RunnerSync.csv');
    const lines = String(csvRaw || '')
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));

    if (!lines.length) {
      throw new Error('CSV is empty');
    }

    const headers = parseCsvLine(lines[0]).map(normalizeHeader);
    const required = ['ign', 'twitchname', 'seed', 'pronouns', 'chosen_name'];
    const missing = required.filter((k) => !headers.includes(k));
    if (missing.length) {
      throw new Error(`CSV missing columns: ${missing.join(', ')}`);
    }

    const byIgn = new Map();

    for (let i = 1; i < lines.length; i += 1) {
      const rowValues = parseCsvLine(lines[i]);
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = String(rowValues[idx] || '').trim();
      });

      const ign = String(row.ign || '').trim();
      if (!ign) continue;
      byIgn.set(ign.toLowerCase(), {
        ign,
        twitchname: String(row.twitchname || '').trim(),
        seed: String(row.seed || '').trim(),
        pronouns: String(row.pronouns || '').trim(),
        chosen_name: String(row.chosen_name || '').trim()
      });
    }

    return byIgn;
  };

  const resolveRunnerFromInput = (runnerByIgn, inputValue) => {
    const raw = String(inputValue || '').trim();
    if (!raw) {
      throw new Error('Runner identifier is empty');
    }

    const key = raw.toLowerCase();

    const byIgn = runnerByIgn.get(key);
    if (byIgn) {
      return byIgn;
    }

    for (const row of runnerByIgn.values()) {
      const chosen = String(row?.chosen_name || '').trim().toLowerCase();
      if (chosen && chosen === key) {
        return row;
      }

      const twitch = String(row?.twitchname || '').trim().toLowerCase();
      if (twitch && twitch === key) {
        return row;
      }
    }

    throw new Error(`Runner "${raw}" not found in CSV (IGN, chosen_name, or twitchname)`);
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

  const getIdentifierFromTextSource = async (sourceName) => {
    if (!window.PluginUtils?.getSourceText) {
      throw new Error('PluginUtils.getSourceText not available');
    }
    const raw = await window.PluginUtils.getSourceText(sourceName);
    return String(raw || '').trim();
  };

  const setHeads = async (identifier, sources) => {
    if (!window.PluginUtils?.setSourceURL) {
      throw new Error('PluginUtils.setSourceURL not available');
    }
    const id = encodeURIComponent(String(identifier || '').trim());
    const url = `https://mc-heads.net/avatar/${id}`;
    await Promise.all(sources.filter(Boolean).map((s) => window.PluginUtils.setSourceURL(s, url)));
  };

  const buildTwitchUrl = (currentUrl, twitchName, cfg) => {
    const name = String(twitchName || '').trim();
    if (!name) return String(currentUrl || '').trim();

    const template = String(
      cfg?.twitchPlayerTemplate
      || 'https://player.twitch.tv/?channel={channel}&enableExtensions=true&muted=false&parent=twitch.tv&player=popout&quality=chunked&volume=100'
    );

    if (template.includes('{channel}')) {
      return template.replace('{channel}', encodeURIComponent(name));
    }

    const rawCurrent = String(currentUrl || '').trim();
    if (!rawCurrent) {
      return `https://player.twitch.tv/?channel=${encodeURIComponent(name)}&enableExtensions=true&muted=false&parent=twitch.tv&player=popout&quality=chunked&volume=100`;
    }

    try {
      const parsed = new URL(rawCurrent);
      parsed.searchParams.set('channel', name);
      return parsed.toString();
    } catch (_) {
      return `https://player.twitch.tv/?channel=${encodeURIComponent(name)}&enableExtensions=true&muted=false&parent=twitch.tv&player=popout&quality=chunked&volume=100`;
    }
  };

  const setTwitchPlayerSource = async (sourceName, twitchName, cfg) => {
    const src = String(sourceName || '').trim();
    const tw = String(twitchName || '').trim();
    if (!src || !tw) return;

    let currentUrl = '';
    try {
      const cur = await window.PluginUtils.getSourceURL(src);
      currentUrl = typeof cur === 'string' ? cur : String(cur?.inputSettings?.url || '');
    } catch (_) {
      currentUrl = '';
    }

    const nextUrl = buildTwitchUrl(currentUrl, tw, cfg);
    await window.PluginUtils.setSourceURL(src, nextUrl);
  };

  const slotSources = (slot) => {
    const suffix = slot === 2 ? '2' : '1';
    return {
      ign: SOURCES[`ign${suffix}`],
      name: SOURCES[`name${suffix}`],
      namewinner: SOURCES[`namewinner${suffix}`],
      elo: SOURCES[`elo${suffix}`],
      seed: SOURCES[`seed${suffix}`],
      pronouns: SOURCES[`pronouns${suffix}`],
      headMain: SOURCES[`head${suffix}`],
      twitch: SOURCES[`twitch${suffix}`]
    };
  };

  const applySourceOverrides = (cfg, slot, sourceBundle) => {
    const key = slot === 2 ? 'player2' : 'player1';
    const override = cfg?.sources?.[key] || {};
    return {
      ign: override.ign || sourceBundle.ign,
      name: override.name || sourceBundle.name,
      namewinner: override.namewinner || sourceBundle.namewinner,
      elo: override.elo || sourceBundle.elo,
      seed: override.seed || sourceBundle.seed,
      pronouns: override.pronouns || sourceBundle.pronouns,
      headMain: override.headMain || sourceBundle.headMain,
      twitch: override.twitch || sourceBundle.twitch
    };
  };

  const syncSlot = async (slot, runnerByIgn, cfg) => {
    const baseSources = slotSources(slot);
    const sources = applySourceOverrides(cfg, slot, baseSources);

    const sourceValue = await getIdentifierFromTextSource(sources.ign);
    if (!sourceValue) {
      throw new Error(`Identifier empty in text source ${sources.ign}`);
    }

    const csvRow = resolveRunnerFromInput(runnerByIgn, sourceValue);
    const ign = String(csvRow.ign || '').trim();
    if (!ign) throw new Error(`CSV row has invalid IGN for input "${sourceValue}"`);

    const player = await fetchPlayer(cfg.apiBase, ign);

    const chosenName = csvRow.chosen_name || player.nickname || ign;
    const eloValue = String(player.elo ?? '-');
    const seedValue = csvRow.seed || '-';
    const pronounsValue = csvRow.pronouns || '-';

    if (!window.PluginUtils?.setTextSource) {
      throw new Error('PluginUtils.setTextSource not available');
    }

    await Promise.all([
      sources.name ? window.PluginUtils.setTextSource(sources.name, chosenName) : Promise.resolve(),
      sources.namewinner ? window.PluginUtils.setTextSource(sources.namewinner, chosenName) : Promise.resolve(),
      sources.elo ? window.PluginUtils.setTextSource(sources.elo, eloValue) : Promise.resolve(),
      sources.seed ? window.PluginUtils.setTextSource(sources.seed, seedValue) : Promise.resolve(),
      sources.pronouns ? window.PluginUtils.setTextSource(sources.pronouns, pronounsValue) : Promise.resolve(),
      setHeads(ign, [sources.headMain]),
      setTwitchPlayerSource(sources.twitch, csvRow.twitchname || ign, cfg)
    ]);

    return {
      slot,
      ign,
      displayName: chosenName,
      elo: eloValue,
      seed: seedValue,
      pronouns: pronounsValue,
      nameWinner: chosenName,
      twitch: csvRow.twitchname || ign
    };
  };

  const syncRunners = async () => {
    const cfg = await readConfig();
    const csvFile = cfg.csvFile || 'RunnerSync.csv';
    const runnerByIgn = await loadRunnerCsvMap(csvFile);

    window.uiHelpers?.logInfo(`Runner Sync: syncing from ${csvFile}...`, 'runnersync');

    const [r1, r2] = await Promise.all([
      syncSlot(1, runnerByIgn, cfg),
      syncSlot(2, runnerByIgn, cfg)
    ]);

    window.uiHelpers?.logSuccess(
      `Runner Sync: updated ${r1.displayName} vs ${r2.displayName}`,
      'runnersync'
    );
  };

  const registerSidebarButtons = () => {
    if (!window.PluginUtils?.registerSidebarButton) {
      window.uiHelpers?.logWarn('PluginUtils.registerSidebarButton not available', 'plugin');
      return;
    }

    window.PluginUtils.registerSidebarButton(
      PLUGIN_NAME,
      'runnersync_sync',
      'Sync Runners',
      async () => {
        try {
          await syncRunners();
        } catch (e) {
          window.uiHelpers?.logError(`Runner Sync failed: ${e?.message || e}`, 'runnersync');
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
