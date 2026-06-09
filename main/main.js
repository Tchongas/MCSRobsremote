const { app, BrowserWindow, ipcMain, shell, webContents } = require('electron');
const path = require('path');
const fsSync = require('fs');
const fs = require('fs').promises;
const chokidar = require('chokidar');
const { obs, connect, disconnect, onEvent, offEvent } = require('../obs/client');
const scenes = require('../actions/scenes');
const sources = require('../actions/sources');
const browserActions = require('../actions/browser');
const streaming = require('../actions/streaming');
const sceneItems = require('../actions/sceneItems');
const media = require('../actions/media');
const sceneCreate = require('../actions/sceneCreate');

// Stub for plugin-system debug logging. Enable body to write to disk.
function pluginLogLine(message) {}

function createWindow() {
  const win = new BrowserWindow({
    fullscreen: false,
    width: 1280,
    height: 720,
    frame: false, // This removes the default title bar
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    backgroundColor: '#0f1221',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: true
    }
  });

  win.loadFile(path.join(__dirname, '../index.html'));

  // Set up real-time event forwarding to renderer
  setupEventForwarding(win);
  
  return win;
}

app.whenReady().then(() => {
  const win = createWindow();
  setupIpcHandlers();

  pluginLogLine(`App ready. isPackaged=${app.isPackaged} execPath=${process.execPath} cwd=${process.cwd()} appPath=${app.getAppPath()} userData=${app.getPath('userData')}`);
  
  // Window control handlers
  ipcMain.on('window-minimize', () => {
    win.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    win.close();
  });
});

function setupIpcHandlers() {
  // OBS Connection
  ipcMain.handle('obs-connect', async (event, url, password) => {
    return await connect(url, password);
  });
  ipcMain.handle('obs-disconnect', async () => {
    return await disconnect();
  });

  // Scenes
  ipcMain.handle('scenes-get', async () => {
    return await scenes.get();
  });

  ipcMain.handle('scenes-change', async (event, sceneName) => {
    return await scenes.change(sceneName);
  });
  ipcMain.handle('scenes-setPreviewScene', async (event, sceneName) => {
    return await scenes.setPreviewScene(sceneName);
  });
  ipcMain.handle('scenes-triggerStudioModeTransition', async () => {
    return await scenes.triggerStudioModeTransition();
  });

  // Sources
  ipcMain.handle('sources-get', async () => {
    return await sources.get();
  });

  ipcMain.handle('sources-toggle', async (event, sourceName) => {
    return await sources.toggle(sourceName);
  });

  ipcMain.handle('sources-getMute', async (event, sourceName) => {
    return await sources.getMute(sourceName);
  });

  ipcMain.handle('sources-setMute', async (event, sourceName, inputMuted) => {
    return await sources.setMute(sourceName, inputMuted);
  });

  ipcMain.handle('sources-getVolume', async (event, sourceName) => {
    return await sources.getVolume(sourceName);
  });

  ipcMain.handle('sources-setVolume', async (event, sourceName, inputVolumeMul) => {
    return await sources.setVolume(sourceName, inputVolumeMul);
  });

  ipcMain.handle('sources-getSettings', async (event, sourceName) => {
    return await sources.getSettings(sourceName);
  });

  ipcMain.handle('sources-setSettings', async (event, sourceName, inputSettings) => {
    return await sources.setSettings(sourceName, inputSettings);
  });

  // Browser sources
  ipcMain.handle('browser-getUrl', async (event, inputName) => {
    return await browserActions.getUrl(inputName);
  });
  ipcMain.handle('browser-setUrl', async (event, inputName, url) => {
    return await browserActions.setUrl(inputName, url);
  });
  ipcMain.handle('browser-refreshNoCache', async (event, inputName) => {
    return await browserActions.refreshNoCache(inputName);
  });

  // Scene Items (dashboard)
  ipcMain.handle('sceneItems-list', async (event, sceneName) => {
    return await sceneItems.list(sceneName);
  });

  ipcMain.handle('sceneItems-listGroup', async (event, groupName) => {
    return await sceneItems.listGroup(groupName);
  });

  ipcMain.handle('sceneItems-setEnabled', async (event, sceneName, sceneItemId, sceneItemEnabled) => {
    return await sceneItems.setEnabled(sceneName, sceneItemId, sceneItemEnabled);
  });

  ipcMain.handle('sceneItems-setGroupEnabled', async (event, groupName, sceneItemId, sceneItemEnabled) => {
    return await sceneItems.setGroupEnabled(groupName, sceneItemId, sceneItemEnabled);
  });

  ipcMain.handle('sceneItems-getTransform', async (event, sceneName, sceneItemId) => {
    return await sceneItems.getTransform(sceneName, sceneItemId);
  });

  ipcMain.handle('sceneItems-setTransform', async (event, sceneName, sceneItemId, sceneItemTransform) => {
    return await sceneItems.setTransform(sceneName, sceneItemId, sceneItemTransform);
  });

  // Streaming
  ipcMain.handle('streaming-start', async () => {
    return await streaming.start();
  });

  ipcMain.handle('streaming-stop', async () => {
    return await streaming.stop();
  });

  ipcMain.handle('streaming-status', async () => {
    return await streaming.status();
  });

  // Media
  ipcMain.handle('media-play', async (event, inputName) => {
    return await media.playMedia(inputName);
  });
  ipcMain.handle('media-stop', async (event, inputName) => {
    return await media.stopMedia(inputName);
  });
  ipcMain.handle('media-toggle', async (event, inputName) => {
    return await media.toggleMedia(inputName);
  });
  ipcMain.handle('media-restart', async (event, inputName) => {
    return await media.restartMedia(inputName);
  });

  // Scene Creation
  ipcMain.handle('scenecreate-createScene', async (event, sceneName) => {
    return await sceneCreate.createScene(sceneName);
  });
  ipcMain.handle('scenecreate-createInput', async (event, sceneName, inputName, inputKind, inputSettings, sceneItemEnabled) => {
    return await sceneCreate.createInput(sceneName, inputName, inputKind, inputSettings, sceneItemEnabled);
  });
  ipcMain.handle('scenecreate-createSceneItem', async (event, sceneName, sourceName, sceneItemEnabled) => {
    return await sceneCreate.createSceneItem(sceneName, sourceName, sceneItemEnabled);
  });
  ipcMain.handle('scenecreate-removeScene', async (event, sceneName) => {
    return await sceneCreate.removeScene(sceneName);
  });
  ipcMain.handle('scenecreate-sceneExists', async (event, sceneName) => {
    return await sceneCreate.sceneExists(sceneName);
  });
  ipcMain.handle('scenecreate-getInputKindList', async () => {
    return await sceneCreate.getInputKindList();
  });
  ipcMain.handle('scenecreate-getDefaultInputSettings', async (event, inputKind) => {
    return await sceneCreate.getDefaultInputSettings(inputKind);
  });

  // Hotkeys
  ipcMain.handle('hotkey-list', async () => {
    return obs.call('GetHotkeyList');
  });
  ipcMain.handle('hotkey-trigger-by-name', async (event, hotkeyName, contextName) => {
    const params = { hotkeyName: String(hotkeyName || '') };
    if (contextName) params.contextName = String(contextName);
    return obs.call('TriggerHotkeyByName', params);
  });
  ipcMain.handle('hotkey-trigger-by-sequence', async (event, keyId, keyModifiers) => {
    const params = {};
    if (keyId) params.keyId = String(keyId);
    if (keyModifiers && typeof keyModifiers === 'object') params.keyModifiers = keyModifiers;
    return obs.call('TriggerHotkeyByKeySequence', params);
  });

  // Vendor request
  ipcMain.handle('obs-vendor-request', async (event, vendorName, requestType, requestData) => {
    return obs.call('CallVendorRequest', {
      vendorName: String(vendorName || ''),
      requestType: String(requestType || ''),
      requestData: (requestData && typeof requestData === 'object') ? requestData : {}
    });
  });

  // Debug raw request handler
  ipcMain.handle('debug-raw-request', async (event, requestName, params) => {
    await connect();
    return obs.call(requestName, params);
  });

  // Plugin System handlers
  setupPluginHandlers();
}

// Plugin System Implementation
let pluginWatcher = null;
let pluginPopupTemplateCache = null;
const pluginPopupSessions = new Map(); // key: popup webContents.id
const pluginPopupRpcPending = new Map(); // key: requestId

function sanitizePluginId(value) {
  return String(value || '').trim().replace(/[^a-zA-Z0-9._-]/g, '');
}

function isValidPluginChildPath(relativePath) {
  const normalized = path.normalize(String(relativePath || '')).replace(/^([/\\])+/, '');
  return !!normalized && !normalized.includes('..');
}

function resolvePathInside(baseDir, relativePath) {
  const normalized = path.normalize(String(relativePath || '')).replace(/^([/\\])+/, '');
  if (!normalized || normalized.includes('..')) {
    throw new Error('Invalid plugin file path');
  }

  const fullPath = path.join(baseDir, normalized);
  const resolvedDir = path.resolve(baseDir) + path.sep;
  const resolvedFile = path.resolve(fullPath);
  if (!resolvedFile.startsWith(resolvedDir)) {
    throw new Error('Invalid plugin file path');
  }

  return { normalized, resolvedFile };
}

async function fileExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch (_) {
    return false;
  }
}

async function readPluginTextIfExists(targetPath) {
  try {
    return await fs.readFile(targetPath, 'utf8');
  } catch (_) {
    return '';
  }
}

async function readPluginIconDataUrl(targetPath) {
  try {
    const ext = path.extname(targetPath).toLowerCase();
    const mime = ext === '.jpg' || ext === '.jpeg'
      ? 'image/jpeg'
      : ext === '.svg'
        ? 'image/svg+xml'
        : ext === '.gif'
          ? 'image/gif'
          : ext === '.webp'
            ? 'image/webp'
            : 'image/png';
    const data = await fs.readFile(targetPath);
    return `data:${mime};base64,${data.toString('base64')}`;
  } catch (_) {
    return '';
  }
}

async function openWithNotepadOrDefault(filePath) {
  const { exec } = require('child_process');
  await new Promise((resolve) => {
    exec(`notepad.exe "${filePath}"`, (err) => {
      if (err) {
        pluginLogLine(`Notepad failed for ${filePath}, falling back to shell.openPath: ${err.message}`);
        shell.openPath(filePath);
      }
      resolve();
    });
  });
}

function extractPluginMeta(content) {
  const versionMatch = String(content || '').match(/version\s*:\s*['"]([^'"]+)['"]/);
  const descriptionMatch = String(content || '').match(/description\s*:\s*['"]([^'"]+)['"]/);
  return {
    version: versionMatch ? versionMatch[1].trim() : '',
    description: descriptionMatch ? descriptionMatch[1].trim() : ''
  };
}

function extractReadmeSummary(readme) {
  const text = String(readme || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#+\s+/gm, '')
    .replace(/[*_`>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  return text.slice(0, 220).trim();
}

async function discoverExternalPluginPackages(pluginDir) {
  await fs.mkdir(pluginDir, { recursive: true });
  const dirEntries = await fs.readdir(pluginDir, { withFileTypes: true });
  const packages = [];

  for (const entry of dirEntries) {
    if (!entry.isDirectory()) continue;
    const packageId = sanitizePluginId(entry.name);
    if (!packageId) continue;

    const packageDir = path.join(pluginDir, entry.name);
    const entryFile = path.join(packageDir, 'plugin.js');
    if (!(await fileExists(entryFile))) continue;

    const childEntries = await fs.readdir(packageDir, { withFileTypes: true });
    const files = childEntries
      .filter((child) => child.isFile())
      .map((child) => child.name)
      .sort((a, b) => a.localeCompare(b));

    const iconFile = files.find((file) => /^icon\.(png|jpe?g|gif|webp|svg)$/i.test(file)) || '';
    const readmeFile = files.find((file) => /^readme\.(md|txt)$/i.test(file)) || '';
    const configFile = files.find((file) => /^config\.ya?ml$/i.test(file)) || '';
    const content = await fs.readFile(entryFile, 'utf8');
    const stats = await fs.stat(entryFile);
    const readme = readmeFile ? await readPluginTextIfExists(path.join(packageDir, readmeFile)) : '';
    const jsMeta = extractPluginMeta(content);

    packages.push({
      id: packageId,
      folderName: entry.name,
      packageDir,
      entryFile,
      entryRelativePath: path.join(entry.name, 'plugin.js'),
      content,
      size: stats.size,
      lastModified: stats.mtime.toISOString(),
      files,
      iconFile,
      iconDataUrl: iconFile ? await readPluginIconDataUrl(path.join(packageDir, iconFile)) : '',
      readmeFile,
      readme,
      configFile,
      displayName: String(entry.name || packageId).trim() || packageId,
      version: jsMeta.version || '1.0.0',
      description: jsMeta.description
    });
  }

  return packages.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function getPluginDirectory() {
  if (app.isPackaged) {
    const primary = path.join(path.dirname(process.execPath), 'plugins');
    const fallback = path.join(app.getPath('userData'), 'plugins');
    const compat = path.join(app.getPath('appData'), 'robsremote', 'plugins');

    try {
      if (fsSync.existsSync(primary)) {
        fsSync.accessSync(primary, fsSync.constants.R_OK);
        pluginLogLine(`Plugin directory (packaged): using exe-adjacent ${primary}`);
        return primary;
      }
    } catch (err) {
      console.warn(`Plugins dir not accessible at ${primary}. Falling back to ${fallback}.`, err);
      pluginLogLine(`Plugin directory (packaged): exe-adjacent not accessible ${primary} err=${err?.message || err}`);
    }

    try {
      if (fsSync.existsSync(compat)) {
        fsSync.accessSync(compat, fsSync.constants.R_OK);
        pluginLogLine(`Plugin directory (packaged): using compat roaming dir ${compat}`);
        return compat;
      }
    } catch (err) {
      pluginLogLine(`Plugin directory (packaged): compat roaming dir not accessible ${compat} err=${err?.message || err}`);
    }

    try {
      fsSync.mkdirSync(fallback, { recursive: true });
      pluginLogLine(`Plugin directory (packaged): using userData ${fallback}`);
    } catch (e) {
      console.error(`Failed to create fallback plugins dir at ${fallback}:`, e);
      pluginLogLine(`Plugin directory (packaged): failed to create userData ${fallback} err=${e?.message || e}`);
    }
    return fallback;
  }
  const devDir = path.join(process.cwd(), 'plugins');
  pluginLogLine(`Plugin directory (dev): ${devDir}`);
  return devDir;
}

function setupPluginHandlers() {
  ipcMain.handle('plugins-get-directory', async () => {
    const dir = getPluginDirectory();
    pluginLogLine(`IPC plugins-get-directory -> ${dir}`);
    return dir;
  });

  ipcMain.handle('plugins-open-readme', async (event, pluginId) => {
    const pluginDir = getPluginDirectory();
    const safePluginId = sanitizePluginId(pluginId);
    if (!safePluginId) throw new Error('Invalid plugin id');
    const packages = await discoverExternalPluginPackages(pluginDir);
    const pkg = packages.find((item) => item.id === safePluginId);
    if (!pkg?.packageDir) throw new Error(`Plugin package not found: ${safePluginId}`);
    if (!pkg.readmeFile) throw new Error('No README file in this plugin package');
    const readmePath = path.join(pkg.packageDir, pkg.readmeFile);
    pluginLogLine(`IPC plugins-open-readme -> ${readmePath}`);
    await openWithNotepadOrDefault(readmePath);
    return readmePath;
  });

  ipcMain.handle('plugins-open-config', async (event, pluginId) => {
    const pluginDir = getPluginDirectory();
    const safePluginId = sanitizePluginId(pluginId);
    if (!safePluginId) throw new Error('Invalid plugin id');
    const packages = await discoverExternalPluginPackages(pluginDir);
    const pkg = packages.find((item) => item.id === safePluginId);
    if (!pkg?.packageDir) throw new Error(`Plugin package not found: ${safePluginId}`);
    if (!pkg.configFile) throw new Error('No config.yaml file in this plugin package');
    const configPath = path.join(pkg.packageDir, pkg.configFile);
    pluginLogLine(`IPC plugins-open-config -> ${configPath}`);
    await openWithNotepadOrDefault(configPath);
    return configPath;
  });

  ipcMain.handle('plugins-open-folder', async () => {
    const dir = getPluginDirectory();
    pluginLogLine(`IPC plugins-open-folder -> ${dir}`);
    await fs.mkdir(dir, { recursive: true });
    shell.openPath(dir);
    return dir;
  });

  ipcMain.handle('plugins-open-popup', async (event, payload) => {
    const cfg = payload || {};
    const popupId = `popup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const openerId = event.sender.id;
    const pluginName = String(cfg.pluginName || 'unknown').trim() || 'unknown';
    const title = String(cfg.title || cfg.pluginName || 'Plugin Workspace').trim() || 'Plugin Workspace';
    const width = clampPopupSize(cfg.width, 640, 1600, 980);
    const height = clampPopupSize(cfg.height, 420, 1200, 700);
    const html = typeof cfg.html === 'string' ? cfg.html : '';

    let parentWin;
    try {
      parentWin = BrowserWindow.fromWebContents(event.sender) || undefined;
    } catch (_) {
      parentWin = undefined;
    }

    const popup = new BrowserWindow({
      width,
      height,
      minWidth: 520,
      minHeight: 360,
      show: false,
      autoHideMenuBar: true,
      backgroundColor: '#0f1013',
      parent: parentWin,
      title,
      webPreferences: {
        preload: path.join(__dirname, 'preload-popup.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    });

    const popupContentsId = popup.webContents.id;

    pluginPopupSessions.set(popupContentsId, {
      popupId,
      pluginName,
      openerId,
      title,
      createdAt: Date.now()
    });

    const wrappedHtml = await buildPluginPopupHtml({ title, html });
    await popup.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(wrappedHtml)}`);

    popup.once('ready-to-show', () => {
      if (!popup.isDestroyed()) {
        popup.show();
      }
    });

    popup.on('closed', () => {
      pluginPopupSessions.delete(popupContentsId);
    });

    pluginLogLine(`Opened plugin popup: popupId=${popupId} plugin=${pluginName} title=${title} width=${width} height=${height}`);
    return { ok: true, popupId, title, width, height };
  });

  ipcMain.handle('plugins-popup-get-context', async (event) => {
    const session = pluginPopupSessions.get(event.sender.id);
    if (!session) {
      throw new Error('Popup session not found');
    }
    return {
      popupId: session.popupId,
      pluginName: session.pluginName,
      title: session.title
    };
  });

  ipcMain.handle('plugins-popup-rpc-request', async (event, request) => {
    const session = pluginPopupSessions.get(event.sender.id);
    if (!session) throw new Error('Popup session not found');

    const openerContents = webContents.fromId(session.openerId);
    if (!openerContents || openerContents.isDestroyed()) {
      throw new Error('Popup opener is not available');
    }

    const method = String(request?.method || '').trim();
    if (!method) throw new Error('Missing popup RPC method');
    const args = Array.isArray(request?.args) ? request.args : [];
    const requestId = `${session.popupId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pluginPopupRpcPending.delete(requestId);
        reject(new Error(`Popup RPC timeout for method: ${method}`));
      }, 12000);

      pluginPopupRpcPending.set(requestId, {
        resolve,
        reject,
        timeout
      });

      openerContents.send('plugins-popup-rpc-request', {
        requestId,
        popupId: session.popupId,
        pluginName: session.pluginName,
        method,
        args
      });
    });
  });

  ipcMain.on('plugins-popup-rpc-response', (event, payload) => {
    const requestId = String(payload?.requestId || '').trim();
    if (!requestId) return;
    const pending = pluginPopupRpcPending.get(requestId);
    if (!pending) return;

    pluginPopupRpcPending.delete(requestId);
    clearTimeout(pending.timeout);

    if (payload?.ok === false) {
      pending.reject(new Error(String(payload?.error || 'Popup RPC failed')));
      return;
    }

    pending.resolve(payload?.result);
  });

  ipcMain.handle('plugins-read-file', async (event, relativeFile) => {
    const pluginDir = getPluginDirectory();
    const file = String(relativeFile || '');
    const { normalized, resolvedFile } = resolvePathInside(pluginDir, file);

    pluginLogLine(`IPC plugins-read-file requested: ${file} (normalized=${normalized})`);

    pluginLogLine(`IPC plugins-read-file reading: ${resolvedFile}`);
    return await fs.readFile(resolvedFile, 'utf8');
  });

  ipcMain.handle('plugins-read-package-file', async (event, pluginId, relativeFile) => {
    const pluginDir = getPluginDirectory();
    const safePluginId = sanitizePluginId(pluginId);
    if (!safePluginId) {
      throw new Error('Invalid plugin id');
    }

    const packages = await discoverExternalPluginPackages(pluginDir);
    const pkg = packages.find((item) => item.id === safePluginId);
    if (!pkg?.packageDir) {
      throw new Error(`Plugin package not found: ${safePluginId}`);
    }

    const file = String(relativeFile || '');
    const { normalized, resolvedFile } = resolvePathInside(pkg.packageDir, file);
    pluginLogLine(`IPC plugins-read-package-file requested: plugin=${safePluginId} file=${normalized}`);
    return await fs.readFile(resolvedFile, 'utf8');
  });

  ipcMain.handle('plugins-list-external', async () => {
    const pluginDir = getPluginDirectory();
    const packages = await discoverExternalPluginPackages(pluginDir);
    return packages.map((pkg) => ({
      id: pkg.id,
      folderName: pkg.folderName,
      displayName: pkg.displayName,
      version: pkg.version,
      description: pkg.description,
      entryRelativePath: pkg.entryRelativePath,
      files: pkg.files,
      iconFile: pkg.iconFile,
      iconDataUrl: pkg.iconDataUrl,
      readmeFile: pkg.readmeFile,
      readme: pkg.readme,
      configFile: pkg.configFile,
      size: pkg.size,
      lastModified: pkg.lastModified
    }));
  });

  ipcMain.handle('plugins-load-external', async () => {
    const pluginDir = getPluginDirectory();
    console.log(`Loading external plugins from: ${pluginDir}`);
    pluginLogLine(`IPC plugins-load-external from: ${pluginDir}`);
    
    try {
      const packages = await discoverExternalPluginPackages(pluginDir);
      const found = packages.map((pkg) => pkg.folderName);
      console.log(`External plugin packages found: ${found.length ? found.join(', ') : '(none)'}`);
      pluginLogLine(`External plugin packages found: ${found.length ? found.join(', ') : '(none)'}`);
      
      const plugins = [];
      
      for (const pkg of packages) {
        try {
          const plugin = await validateAndLoadPlugin(pkg);
          if (plugin) {
            plugins.push(plugin);
            pluginLogLine(`External plugin accepted: ${pkg.folderName}`);
          } else {
            pluginLogLine(`External plugin skipped by validation: ${pkg.folderName}`);
          }
        } catch (err) {
          console.error(`Failed to load plugin ${pkg.folderName}:`, err);
          pluginLogLine(`Failed to load plugin ${pkg.folderName}: ${err?.message || err}`);
        }
      }
      
      // Set up file watcher if not already watching
      if (!pluginWatcher) {
        setupPluginWatcher();
      }
      
      return plugins;
    } catch (err) {
      console.error('Failed to load external plugins:', err);
      pluginLogLine(`Failed to load external plugins: ${err?.message || err}`);
      return [];
    }
  });
}

function clampPopupSize(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

async function buildPluginPopupHtml({ title, html }) {
  const escapedTitle = String(title)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const content = String(html || '').trim() || `
    <section class="plugin-window-shell">
      <h1>${escapedTitle}</h1>
      <p>This popup is ready. Pass <code>popupHtml</code> from your plugin to render custom content here.</p>
    </section>
  `;

  if (!pluginPopupTemplateCache) {
    try {
      const templatePath = path.join(__dirname, 'templates', 'plugin-popup.html');
      pluginPopupTemplateCache = await fs.readFile(templatePath, 'utf8');
    } catch (err) {
      console.warn('Failed to load plugin popup template. Using fallback inline template.', err);
      pluginPopupTemplateCache = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>{{TITLE}}</title></head><body>{{CONTENT}}</body></html>';
    }
  }

  return pluginPopupTemplateCache
    .replaceAll('{{TITLE}}', escapedTitle)
    .replaceAll('{{CONTENT}}', content);
}

function setupPluginWatcher() {
  const pluginDir = getPluginDirectory();

  pluginLogLine(`Setting up plugin watcher on: ${pluginDir}`);
  
  pluginWatcher = chokidar.watch(pluginDir, {
    ignored: /^\./, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
    depth: 3
  });

  pluginWatcher
    .on('add', (filePath) => {
      console.log(`Plugin added: ${path.basename(filePath)}`);
      pluginLogLine(`Watcher add: ${filePath}`);
      notifyPluginChange('added', filePath);
    })
    .on('change', (filePath) => {
      console.log(`Plugin changed: ${path.basename(filePath)}`);
      pluginLogLine(`Watcher change: ${filePath}`);
      notifyPluginChange('changed', filePath);
    })
    .on('unlink', (filePath) => {
      console.log(`Plugin removed: ${path.basename(filePath)}`);
      pluginLogLine(`Watcher unlink: ${filePath}`);
      notifyPluginChange('removed', filePath);
    })
    .on('error', (err) => {
      console.error('Plugin watcher error:', err);
      pluginLogLine(`Watcher error: ${err?.message || err}`);
    });
}

function notifyPluginChange(action, filePath) {
  pluginLogLine(`notifyPluginChange: action=${action} file=${filePath}`);
  // Notify all renderer processes about plugin changes
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('plugins-directory-changed', {
      action,
      file: path.basename(filePath),
      path: filePath
    });
  });
}

async function validateAndLoadPlugin(contentOrPackage) {
  try {
    const content = String(contentOrPackage?.content || '');
    const filename = String(contentOrPackage?.entryRelativePath || contentOrPackage?.folderName || 'plugin.js');
    // Basic validation - keep this light since external plugins are executed in a sandbox.
    // We mainly want to avoid loading clearly unrelated files.
    const hasCanHandle = content.includes('canHandle');
    const hasExecute = content.includes('execute') || content.includes('enhance');
    if (!hasCanHandle || !hasExecute) {
      console.warn(`Plugin ${filename} missing required methods (canHandle/execute)`);
      return null;
    }
    
    // Create a safe plugin object
    const plugin = {
      id: contentOrPackage.id,
      folderName: contentOrPackage.folderName,
      displayName: contentOrPackage.displayName,
      version: contentOrPackage.version,
      description: contentOrPackage.description,
      filename,
      content,
      size: contentOrPackage.size || content.length,
      lastModified: contentOrPackage.lastModified || new Date().toISOString(),
      entryRelativePath: contentOrPackage.entryRelativePath,
      files: Array.isArray(contentOrPackage.files) ? contentOrPackage.files : [],
      iconFile: contentOrPackage.iconFile || '',
      iconDataUrl: contentOrPackage.iconDataUrl || '',
      readmeFile: contentOrPackage.readmeFile || '',
      readme: contentOrPackage.readme || '',
      configFile: contentOrPackage.configFile || ''
    };
    
    return plugin;
  } catch (err) {
    console.error(`Plugin validation failed for ${filename}:`, err);
    return null;
  }
}

function setupEventForwarding(win) {
  // Forward OBS events to renderer process for real-time updates
  onEvent('scene-changed', (data) => {
    win.webContents.send('obs-event', { type: 'scene-changed', data });
  });

  onEvent('scene-item-changed', (data) => {
    win.webContents.send('obs-event', { type: 'scene-item-changed', data });
  });

  onEvent('scene-list-changed', (data) => {
    win.webContents.send('obs-event', { type: 'scene-list-changed', data });
  });

  onEvent('scene-items-reordered', (data) => {
    win.webContents.send('obs-event', { type: 'scene-items-reordered', data });
  });

  onEvent('scene-item-created', (data) => {
    win.webContents.send('obs-event', { type: 'scene-item-created', data });
  });

  onEvent('scene-item-removed', (data) => {
    win.webContents.send('obs-event', { type: 'scene-item-removed', data });
  });

  onEvent('input-mute-changed', (data) => {
    win.webContents.send('obs-event', { type: 'input-mute-changed', data });
  });
  
  onEvent('input-volume-changed', (data) => {
    win.webContents.send('obs-event', { type: 'input-volume-changed', data });
  });

  onEvent('vendor-event', (data) => {
    win.webContents.send('obs-event', { type: 'vendor-event', data });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
