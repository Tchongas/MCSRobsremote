const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pluginPopupAPI', {
  getContext: () => ipcRenderer.invoke('plugins-popup-get-context'),
  callHost: (method, ...args) => ipcRenderer.invoke('plugins-popup-rpc-request', { method, args })
});
