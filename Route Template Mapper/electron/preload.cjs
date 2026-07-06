const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Open a map JSON file and return its parsed contents.
  openMapDialog: () => ipcRenderer.invoke('open-map-dialog'),
  // Open an existing route-template bundle JSON.
  openBundleDialog: () => ipcRenderer.invoke('open-bundle-dialog'),
  // Save a single bundle to a user-chosen file.
  saveBundleDialog: (payload) => ipcRenderer.invoke('save-bundle-dialog', payload),
  // Export many per-graph bundles: pick one folder, write N files into it.
  exportGraphsDialog: (payload) => ipcRenderer.invoke('export-graphs-dialog', payload),
  // Background image for the map editor.
  openImageDialog: () => ipcRenderer.invoke('open-image-dialog'),
  readImage: (filePath) => ipcRenderer.invoke('read-image', filePath),
  platform: process.platform,
  versions: process.versions
});
