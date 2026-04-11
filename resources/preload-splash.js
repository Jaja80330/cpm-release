// Preload minimal pour la fenêtre splash — CommonJS natif (pas de transpilation)
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('splashAPI', {
  onStatus: (callback) => {
    ipcRenderer.on('splash:status', (_, payload) => callback(payload))
  }
})
