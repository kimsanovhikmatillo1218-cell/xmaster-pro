const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  platform:      process.platform,
  isElectron:    true,
  getVersion:    () => ipcRenderer.invoke("app-version"),
  checkUpdate:   () => ipcRenderer.invoke("check-update"),
  openExternal:  (url) => ipcRenderer.invoke("open-external", url),
  onUpdateAvailable: (cb) => ipcRenderer.on("update-available", (_, info) => cb(info)),
  onUpdateDownloaded:(cb) => ipcRenderer.on("update-downloaded", (_, info) => cb(info)),
});
