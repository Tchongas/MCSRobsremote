
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('obsAPI', {
  connect: (url, password) => ipcRenderer.invoke('obs-connect', url, password),
  disconnect: () => ipcRenderer.invoke('obs-disconnect'),
  scenes: {
    get: () => ipcRenderer.invoke('scenes-get'),
    change: (sceneName) => ipcRenderer.invoke('scenes-change', sceneName),
    setPreviewScene: (sceneName) => ipcRenderer.invoke('scenes-setPreviewScene', sceneName),
    triggerStudioModeTransition: () => ipcRenderer.invoke('scenes-triggerStudioModeTransition')
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
    listGroup: (groupName) => ipcRenderer.invoke('sceneItems-listGroup', groupName),
    setEnabled: (sceneName, sceneItemId, sceneItemEnabled) => ipcRenderer.invoke('sceneItems-setEnabled', sceneName, sceneItemId, sceneItemEnabled),
    setGroupEnabled: (groupName, sceneItemId, sceneItemEnabled) => ipcRenderer.invoke('sceneItems-setGroupEnabled', groupName, sceneItemId, sceneItemEnabled),
    getTransform: (sceneName, sceneItemId) => ipcRenderer.invoke('sceneItems-getTransform', sceneName, sceneItemId),
    setTransform: (sceneName, sceneItemId, sceneItemTransform) => ipcRenderer.invoke('sceneItems-setTransform', sceneName, sceneItemId, sceneItemTransform)
  },
  browser: {
    getUrl: (inputName) => ipcRenderer.invoke('browser-getUrl', inputName),
    setUrl: (inputName, url) => ipcRenderer.invoke('browser-setUrl', inputName, url),
    refreshNoCache: (inputName) => ipcRenderer.invoke('browser-refreshNoCache', inputName),
  },
  sceneCreate: {
    createScene: (sceneName) => ipcRenderer.invoke('scenecreate-createScene', sceneName),
    createInput: (sceneName, inputName, inputKind, inputSettings, sceneItemEnabled) =>
      ipcRenderer.invoke('scenecreate-createInput', sceneName, inputName, inputKind, inputSettings, sceneItemEnabled),
    createSceneItem: (sceneName, sourceName, sceneItemEnabled) =>
      ipcRenderer.invoke('scenecreate-createSceneItem', sceneName, sourceName, sceneItemEnabled),
    removeScene: (sceneName) => ipcRenderer.invoke('scenecreate-removeScene', sceneName),
    sceneExists: (sceneName) => ipcRenderer.invoke('scenecreate-sceneExists', sceneName),
    getInputKindList: () => ipcRenderer.invoke('scenecreate-getInputKindList'),
    getDefaultInputSettings: (inputKind) => ipcRenderer.invoke('scenecreate-getDefaultInputSettings', inputKind)
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

// Window controls
contextBridge.exposeInMainWorld('windowControls', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close')
});

// Plugin API
contextBridge.exposeInMainWorld('pluginAPI', {
  loadExternalPlugins: () => ipcRenderer.invoke('plugins-load-external'),
  listExternalPlugins: () => ipcRenderer.invoke('plugins-list-external'),
  getPluginDirectory: () => ipcRenderer.invoke('plugins-get-directory'),
  openPluginFolder: () => ipcRenderer.invoke('plugins-open-folder'),
  openReadme: (pluginId) => ipcRenderer.invoke('plugins-open-readme', pluginId),
  openConfig: (pluginId) => ipcRenderer.invoke('plugins-open-config', pluginId),
  readFile: (relativeFile) => ipcRenderer.invoke('plugins-read-file', relativeFile),
  readPackageFile: (pluginId, relativeFile) => ipcRenderer.invoke('plugins-read-package-file', pluginId, relativeFile),
  openPopup: (payload) => ipcRenderer.invoke('plugins-open-popup', payload),
  onPopupRpcRequest: (callback) => {
    ipcRenderer.on('plugins-popup-rpc-request', (event, data) => callback(data));
  },
  respondPopupRpc: (requestId, response) => {
    ipcRenderer.send('plugins-popup-rpc-response', { requestId, ...(response || {}) });
  },
  removePopupRpcListeners: () => {
    ipcRenderer.removeAllListeners('plugins-popup-rpc-request');
  },
  watchPluginDirectory: (callback) => {
    ipcRenderer.on('plugins-directory-changed', (event, data) => callback(data));
  },
  removePluginWatchers: () => {
    ipcRenderer.removeAllListeners('plugins-directory-changed');
  }
});

// Popup RPC bridge (compatibility: available in both main and popup preloads)
contextBridge.exposeInMainWorld('pluginPopupAPI', {
  getContext: () => ipcRenderer.invoke('plugins-popup-get-context'),
  callHost: (method, ...args) => ipcRenderer.invoke('plugins-popup-rpc-request', { method, args })
});
