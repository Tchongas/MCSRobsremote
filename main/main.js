const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { obs, connect, disconnect } = require('../obs/client');
const scenes = require('../actions/scenes');
const sources = require('../actions/sources');
const browserActions = require('../actions/browser');
const streaming = require('../actions/streaming');
const sceneItems = require('../actions/sceneItems');

function createWindow() {
  const win = new BrowserWindow({
    fullscreen: true,
    autoHideMenuBar: true,
    backgroundColor: '#0f1221',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false, // stay safe
    }
  });

  win.loadFile(path.join(__dirname, '../index.html'));
  win.webContents.openDevTools(); // Open DevTools for debugging
}

app.whenReady().then(() => {
  createWindow();
  setupIpcHandlers();
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
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
