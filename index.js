const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,        // ✅ enable Node.js in renderer
      contextIsolation: false       // ✅ allow access to Node from renderer
    }
  });

  win.loadFile('index.html');
  win.webContents.openDevTools();   // Optional: open DevTools
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
