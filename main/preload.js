
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('obsAPI', {
  connect: (url, password) => ipcRenderer.invoke('obs-connect', url, password),
  disconnect: () => ipcRenderer.invoke('obs-disconnect'),
  scenes: {
    get: () => ipcRenderer.invoke('scenes-get'),
    change: (sceneName) => ipcRenderer.invoke('scenes-change', sceneName)
  },
  sources: {
    get: () => ipcRenderer.invoke('sources-get'),
    toggle: (sourceName) => ipcRenderer.invoke('sources-toggle', sourceName),
    getMute: (sourceName) => ipcRenderer.invoke('sources-getMute', sourceName),
    setMute: (sourceName, inputMuted) => ipcRenderer.invoke('sources-setMute', sourceName, inputMuted),
    getVolume: (sourceName) => ipcRenderer.invoke('sources-getVolume', sourceName),
    setVolume: (sourceName, inputVolumeMul) => ipcRenderer.invoke('sources-setVolume', sourceName, inputVolumeMul),
    getSettings: (sourceName) => ipcRenderer.invoke('sources-getSettings', sourceName),
    setSettings: (sourceName, inputSettings) => ipcRenderer.invoke('sources-setSettings', sourceName, inputSettings)
  },
  sceneItems: {
    list: (sceneName) => ipcRenderer.invoke('sceneItems-list', sceneName),
    setEnabled: (sceneName, sceneItemId, sceneItemEnabled) => ipcRenderer.invoke('sceneItems-setEnabled', sceneName, sceneItemId, sceneItemEnabled)
  },
  browser: {
    getUrl: (inputName) => ipcRenderer.invoke('browser-getUrl', inputName),
    setUrl: (inputName, url) => ipcRenderer.invoke('browser-setUrl', inputName, url),
    refreshNoCache: (inputName) => ipcRenderer.invoke('browser-refreshNoCache', inputName),
  },
  streaming: {
    start: () => ipcRenderer.invoke('streaming-start'),
    stop: () => ipcRenderer.invoke('streaming-stop'),
    status: () => ipcRenderer.invoke('streaming-status')
  },
  media: {
    // Backward-compatible methods
    playMedia: (inputName) => ipcRenderer.invoke('media-play', inputName),
    stopMedia: (inputName) => ipcRenderer.invoke('media-stop', inputName),
    // Preferred concise aliases used by plugins
    play: (inputName) => ipcRenderer.invoke('media-play', inputName),
    stop: (inputName) => ipcRenderer.invoke('media-stop', inputName),
    restart: (inputName) => ipcRenderer.invoke('media-restart', inputName),
    toggle: (inputName) => ipcRenderer.invoke('media-toggle', inputName)
  },
  // Event system for real-time updates
  onEvent: (callback) => {
    ipcRenderer.on('obs-event', (event, data) => callback(data));
  },
  removeAllEventListeners: () => {
    ipcRenderer.removeAllListeners('obs-event');
  }
});

// Plugin System API
// Window controls
contextBridge.exposeInMainWorld('windowControls', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close')
});

// Plugin API
contextBridge.exposeInMainWorld('pluginAPI', {
  loadExternalPlugins: () => ipcRenderer.invoke('plugins-load-external'),
  getPluginDirectory: () => ipcRenderer.invoke('plugins-get-directory'),
  watchPluginDirectory: (callback) => {
    ipcRenderer.on('plugins-directory-changed', (event, data) => callback(data));
  },
  removePluginWatchers: () => {
    ipcRenderer.removeAllListeners('plugins-directory-changed');
  }
});
