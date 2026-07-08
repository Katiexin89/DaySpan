const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("daySpanWindow", {
  getPreferences: () => ipcRenderer.invoke("dayspan:get-preferences"),
  updatePreferences: (patch) => ipcRenderer.invoke("dayspan:update-preferences", patch),
  setMode: (mode) => ipcRenderer.invoke("dayspan:set-mode", mode),
  setOpacity: (opacity) => ipcRenderer.invoke("dayspan:set-opacity", opacity),
  minimize: () => ipcRenderer.invoke("dayspan:minimize"),
  close: () => ipcRenderer.invoke("dayspan:close"),
  onPreferencesChanged: (callback) => {
    ipcRenderer.on("dayspan:preferences-changed", (_event, preferences) => callback(preferences));
  }
});
