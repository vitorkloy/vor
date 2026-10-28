const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("fileWheel", {
  run: (id, filePath) => ipcRenderer.invoke("file-wheel-run", id, filePath),
});
