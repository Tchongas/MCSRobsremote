
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
    getMute: (sourceName) => ipcRenderer.invoke('sources-getMute', sourceName)
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
  }
});
