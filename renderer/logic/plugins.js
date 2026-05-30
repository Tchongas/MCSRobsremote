(function() {
  let pluginPackages = [];
  let pluginRefreshPromise = null;

  function normalizePluginRecord(item) {
    const runtimeList = window.CustomHandlerPlugins?.listExternalRuntime?.() || [];
    const runtime = runtimeList.find((entry) => entry.id === item.id || entry.folderName === item.folderName) || null;
    return {
      id: String(item?.id || runtime?.id || '').trim(),
      folderName: String(item?.folderName || runtime?.folderName || '').trim(),
      displayName: String(item?.displayName || runtime?.displayName || item?.folderName || 'Plugin').trim(),
      version: String(runtime?.version || item?.version || '1.0.0').trim() || '1.0.0',
      description: String(runtime?.description || item?.description || '').trim(),
      iconDataUrl: String(runtime?.iconDataUrl || item?.iconDataUrl || '').trim(),
      iconFile: String(runtime?.iconFile || item?.iconFile || '').trim(),
      readmeFile: String(runtime?.readmeFile || item?.readmeFile || '').trim(),
      configFile: String(runtime?.configFile || item?.configFile || '').trim(),
      files: Array.isArray(runtime?.files) ? [...runtime.files] : Array.isArray(item?.files) ? [...item.files] : [],
      entryRelativePath: String(runtime?.entryRelativePath || item?.entryRelativePath || '').trim(),
      status: String(runtime?.status || 'discovered').trim() || 'discovered',
      registeredName: String(runtime?.registeredName || '').trim(),
      error: String(runtime?.error || '').trim(),
    };
  }

  async function listPluginPackages() {
    if (!window.pluginAPI?.listExternalPlugins) {
      return [];
    }
    const list = await window.pluginAPI.listExternalPlugins();
    return Array.isArray(list) ? list.map(normalizePluginRecord) : [];
  }

  async function refreshPluginPackages() {
    if (pluginRefreshPromise) {
      return pluginRefreshPromise;
    }

    pluginRefreshPromise = (async () => {
      const next = await listPluginPackages();
      pluginPackages = next;
      renderPluginSettings(next);
      return next;
    })();

    try {
      return await pluginRefreshPromise;
    } finally {
      pluginRefreshPromise = null;
    }
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function buildStatusMarkup(plugin) {
    const status = plugin.status === 'loaded'
      ? 'Loaded'
      : plugin.status === 'error'
        ? 'Error'
        : plugin.status === 'loading'
          ? 'Loading'
          : 'Discovered';
    const cls = plugin.status === 'loaded'
      ? 'is-loaded'
      : plugin.status === 'error'
        ? 'is-error'
        : plugin.status === 'loading'
          ? 'is-loading'
          : 'is-discovered';
    return `<span class="plugin-status-badge ${cls}">${escapeHtml(status)}</span>`;
  }

  function renderPluginSettings(list = pluginPackages) {
    const host = document.getElementById('pluginsSettingsList');
    const countEl = document.getElementById('pluginsSettingsCount');
    const emptyEl = document.getElementById('pluginsSettingsEmpty');
    if (!host) return;

    const items = Array.isArray(list) ? list : [];
    if (countEl) {
      countEl.textContent = items.length === 1 ? '1 plugin package' : `${items.length} plugin packages`;
    }

    if (!items.length) {
      host.innerHTML = '';
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }

    if (emptyEl) emptyEl.classList.add('hidden');

    host.innerHTML = items.map((plugin) => {
      const filesMarkup = plugin.files.length
        ? plugin.files.map((file) => `<span class="plugin-file-chip">${escapeHtml(file)}</span>`).join('')
        : '<span class="plugin-file-chip">plugin.js</span>';
      const iconMarkup = plugin.iconDataUrl
        ? `<img class="plugin-card-icon" src="${plugin.iconDataUrl}" alt="">`
        : `<div class="plugin-card-icon plugin-card-icon-fallback">${escapeHtml((plugin.displayName || '?').slice(0, 1).toUpperCase())}</div>`;
      const descLine = plugin.description
        ? `<p class="plugin-settings-card-desc">${escapeHtml(plugin.description)}</p>`
        : '';
      const errorLine = plugin.error
        ? `<div class="plugin-error-box">${escapeHtml(plugin.error)}</div>`
        : '';
      const readmeBtn = plugin.readmeFile
        ? `<button class="btn-ghost btn-sm plugin-open-readme-btn" data-plugin-id="${escapeHtml(plugin.id || plugin.folderName)}">Open README</button>`
        : '';
      const configBtn = plugin.configFile
        ? `<button class="btn-ghost btn-sm plugin-open-config-btn" data-plugin-id="${escapeHtml(plugin.id || plugin.folderName)}">Open Config</button>`
        : '';
      return `
        <article class="plugin-settings-card" data-plugin-id="${escapeHtml(plugin.id || plugin.folderName)}">
          <div class="plugin-settings-card-header">
            ${iconMarkup}
            <div class="plugin-settings-card-titlewrap">
              <div class="plugin-settings-card-titleline">
                <h4 class="plugin-settings-card-title">${escapeHtml(plugin.displayName)}</h4>
                ${buildStatusMarkup(plugin)}
              </div>
              <div class="plugin-settings-card-meta">
                <span class="plugin-settings-card-version">v${escapeHtml(plugin.version)}</span>
                <span class="plugin-settings-card-folder">${escapeHtml(plugin.folderName || plugin.id || '')}</span>
              </div>
            </div>
          </div>
          ${descLine}
          <div class="plugin-settings-card-footer">
            ${readmeBtn}${configBtn}
          </div>
          ${errorLine}
        </article>
      `;
    }).join('');

    host.querySelectorAll('.plugin-open-readme-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const pluginId = btn.dataset.pluginId;
        try {
          await window.pluginAPI.openReadme(pluginId);
        } catch (err) {
          window.uiHelpers?.logError('Could not open README: ' + (err?.message || err), 'plugin');
        }
      });
    });

    host.querySelectorAll('.plugin-open-config-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const pluginId = btn.dataset.pluginId;
        try {
          await window.pluginAPI.openConfig(pluginId);
        } catch (err) {
          window.uiHelpers?.logError('Could not open config: ' + (err?.message || err), 'plugin');
        }
      });
    });
  }

  function getPluginPackages() {
    return [...pluginPackages];
  }

  function bindPluginSettingsActions() {
    const refreshBtn = document.getElementById('refreshPluginsSettings');
    if (refreshBtn && !refreshBtn.dataset.bound) {
      refreshBtn.dataset.bound = 'true';
      refreshBtn.addEventListener('click', async () => {
        try {
          await refreshPluginPackages();
          window.uiHelpers?.logSuccess('Plugins list refreshed', 'plugin');
        } catch (err) {
          window.uiHelpers?.logError('Failed to refresh plugins list: ' + (err?.message || err), 'plugin');
        }
      });
    }

    const openBtn = document.getElementById('openPluginFolderSettings');
    if (openBtn && !openBtn.dataset.bound) {
      openBtn.dataset.bound = 'true';
      openBtn.addEventListener('click', async () => {
        try {
          const dir = await window.pluginAPI?.openPluginFolder?.();
          if (dir) {
            window.uiHelpers?.logInfo('Opened plugins folder: ' + dir, 'plugin');
          }
        } catch (err) {
          window.uiHelpers?.logError('Failed to open plugins folder: ' + (err?.message || err), 'plugin');
        }
      });
    }
  }

  function initPluginSettings() {
    bindPluginSettingsActions();
    refreshPluginPackages().catch((err) => {
      window.uiHelpers?.logError('Failed to load plugins list: ' + (err?.message || err), 'plugin');
    });

    if (window.pluginAPI?.watchPluginDirectory) {
      window.pluginAPI.watchPluginDirectory(() => {
        refreshPluginPackages().catch(() => {});
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPluginSettings);
  } else {
    initPluginSettings();
  }

  window.pluginsLogic = {
    initPluginSettings,
    refreshPluginPackages,
    renderPluginSettings,
    getPluginPackages
  };
})();
