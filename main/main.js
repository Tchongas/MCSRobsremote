const { app, BrowserWindow, ipcMain, shell } = require('electron');
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

  ipcMain.handle('sceneItems-setEnabled', async (event, sceneName, sceneItemId, sceneItemEnabled) => {
    return await sceneItems.setEnabled(sceneName, sceneItemId, sceneItemEnabled);
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

  ipcMain.handle('plugins-open-folder', async () => {
    const dir = getPluginDirectory();
    pluginLogLine(`IPC plugins-open-folder -> ${dir}`);
    await fs.mkdir(dir, { recursive: true });
    shell.openPath(dir);
    return dir;
  });

  ipcMain.handle('plugins-read-file', async (event, relativeFile) => {
    const pluginDir = getPluginDirectory();
    const file = String(relativeFile || '');
    const normalized = path.normalize(file).replace(/^([/\\])+/, '');

    pluginLogLine(`IPC plugins-read-file requested: ${file} (normalized=${normalized})`);

    if (normalized.includes('..')) {
      throw new Error('Invalid plugin file path');
    }

    const fullPath = path.join(pluginDir, normalized);
    const resolvedDir = path.resolve(pluginDir) + path.sep;
    const resolvedFile = path.resolve(fullPath);

    if (!resolvedFile.startsWith(resolvedDir)) {
      throw new Error('Invalid plugin file path');
    }

    pluginLogLine(`IPC plugins-read-file reading: ${resolvedFile}`);
    return await fs.readFile(resolvedFile, 'utf8');
  });

  ipcMain.handle('plugins-load-external', async () => {
    const pluginDir = getPluginDirectory();
    console.log(`Loading external plugins from: ${pluginDir}`);
    pluginLogLine(`IPC plugins-load-external from: ${pluginDir}`);
    
    try {
      // Ensure plugins directory exists
      await fs.mkdir(pluginDir, { recursive: true });
      
      // Read all JS files in plugins directory
      const files = await fs.readdir(pluginDir);
      const jsFiles = files.filter(file => file.endsWith('.js'));
      console.log(`External plugin files found: ${jsFiles.length ? jsFiles.join(', ') : '(none)'}`);
      pluginLogLine(`External plugin files found: ${jsFiles.length ? jsFiles.join(', ') : '(none)'}`);
      
      const plugins = [];
      
      for (const file of jsFiles) {
        try {
          const filePath = path.join(pluginDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          
          // Validate plugin structure
          const plugin = await validateAndLoadPlugin(content, file);
          if (plugin) {
            plugins.push(plugin);
            pluginLogLine(`External plugin accepted: ${file}`);
          } else {
            pluginLogLine(`External plugin skipped by validation: ${file}`);
          }
        } catch (err) {
          console.error(`Failed to load plugin ${file}:`, err);
          pluginLogLine(`Failed to load plugin ${file}: ${err?.message || err}`);
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

function setupPluginWatcher() {
  const pluginDir = getPluginDirectory();

  pluginLogLine(`Setting up plugin watcher on: ${pluginDir}`);
  
  pluginWatcher = chokidar.watch([
    path.join(pluginDir, '*.js'),
    path.join(pluginDir, '*.json')
  ], {
    ignored: /^\./, // ignore dotfiles
    persistent: true,
    ignoreInitial: true
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

async function validateAndLoadPlugin(content, filename) {
  try {
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
      filename,
      content,
      size: content.length,
      lastModified: new Date().toISOString()
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
  
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
