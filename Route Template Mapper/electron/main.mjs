import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
const isDev = !app.isPackaged && process.env.NODE_ENV === 'development';
let mainWindow;

const createWindow = () => {
  const iconPath = path.join(__dirname, '../build/icon.png');

  mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 960,
    minHeight: 620,
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    title: 'Route Template Mapper',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: iconPath
  });

  const menu = Menu.buildFromTemplate([
    { label: 'File', submenu: [{ role: 'quit' }] },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ]);
  Menu.setApplicationMenu(menu);

  if (isDev) {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
};

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- Open a MAP JSON file and return its parsed contents. ---
ipcMain.handle('open-map-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select a map JSON file',
    properties: ['openFile'],
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) return { success: false, canceled: true };
  const filePath = result.filePaths[0];
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return { success: true, map: JSON.parse(content), filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// --- Open a route-template bundle JSON file. ---
ipcMain.handle('open-bundle-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open a route-template bundle',
    properties: ['openFile'],
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) return { success: false, canceled: true };
  const filePath = result.filePaths[0];
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return { success: true, bundle: JSON.parse(content), filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// --- Save a single bundle JSON to a user-chosen location. ---
ipcMain.handle('save-bundle-dialog', async (_event, payload) => {
  const bundleData = payload && payload.bundle !== undefined ? payload.bundle : payload;
  const suggestedName =
    (payload && payload.defaultFileName) ||
    `route-templates-${new Date().toISOString().slice(0, 10)}.json`;

  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    defaultPath: suggestedName
  });
  if (result.canceled || !result.filePath) return { success: false, canceled: true };
  try {
    await fs.writeFile(result.filePath, JSON.stringify(bundleData, null, 2), 'utf-8');
    return { success: true, filePath: result.filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// --- Export MANY per-graph bundles: pick a folder, write each file into it. ---
// payload.files = [{ fileName, bundle }]
ipcMain.handle('export-graphs-dialog', async (_event, payload) => {
  const files = (payload && Array.isArray(payload.files)) ? payload.files : [];
  if (!files.length) return { success: false, error: 'Nothing to export.' };

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose a folder to save the route-template files',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Export here'
  });
  if (result.canceled || result.filePaths.length === 0) return { success: false, canceled: true };

  const dir = result.filePaths[0];
  const written = [];
  try {
    for (const f of files) {
      const safe = String(f.fileName || 'route-templates.json').replace(/[\\/:*?"<>|]+/g, '_');
      const full = path.join(dir, safe);
      await fs.writeFile(full, JSON.stringify(f.bundle, null, 2), 'utf-8');
      written.push(full);
    }
    return { success: true, dir, written };
  } catch (error) {
    return { success: false, error: error.message, written };
  }
});

// --- Pick a background PNG: return its path + a data URL to display. ---
ipcMain.handle('open-image-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select a background PNG',
    properties: ['openFile'],
    filters: [{ name: 'PNG image', extensions: ['png'] }, { name: 'All Files', extensions: ['*'] }]
  });
  if (result.canceled || result.filePaths.length === 0) return { success: false, canceled: true };
  const filePath = result.filePaths[0];
  try {
    const buf = await fs.readFile(filePath);
    return { success: true, path: filePath, name: path.basename(filePath), dataUrl: 'data:image/png;base64,' + buf.toString('base64') };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// --- Re-read a background image by its stored path (path-referenced backgrounds). ---
ipcMain.handle('read-image', async (_event, filePath) => {
  try {
    const buf = await fs.readFile(filePath);
    return { success: true, path: filePath, dataUrl: 'data:image/png;base64,' + buf.toString('base64') };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
