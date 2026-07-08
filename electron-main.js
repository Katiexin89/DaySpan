const { app, BrowserWindow, ipcMain, screen } = require("electron");
const fs = require("fs");
const path = require("path");

app.setName("DaySpan");
app.setAppUserModelId("com.local.dayspan");

const portableRoot = app.isPackaged ? path.dirname(process.execPath) : __dirname;
app.setPath("userData", path.join(portableRoot, ".dayspan-user-data"));
app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");

const FLOATING_SIZE = { width: 390, height: 230 };
const FULL_SIZE = { width: 420, height: 860 };
const preferencesPath = path.join(app.getPath("userData"), "window-preferences.json");

const defaultPreferences = {
  mode: "compact",
  alwaysOnTop: true,
  opacity: 0.9,
  lockPosition: false,
  hoverOpaque: true,
  bounds: {
    compact: null,
    full: null
  }
};

let mainWindow;
let preferences = loadPreferences();

function loadPreferences() {
  try {
    const saved = JSON.parse(fs.readFileSync(preferencesPath, "utf8"));
    return {
      ...defaultPreferences,
      ...saved,
      bounds: {
        ...defaultPreferences.bounds,
        ...(saved.bounds || {})
      }
    };
  } catch {
    return { ...defaultPreferences, bounds: { ...defaultPreferences.bounds } };
  }
}

function savePreferences() {
  fs.mkdirSync(path.dirname(preferencesPath), { recursive: true });
  fs.writeFileSync(preferencesPath, JSON.stringify(preferences, null, 2), "utf8");
}

function clampOpacity(value) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return defaultPreferences.opacity;
  return Math.min(1, Math.max(0.55, parsed));
}

function getDefaultBounds(mode) {
  const size = mode === "full" ? FULL_SIZE : FLOATING_SIZE;
  const { workArea } = screen.getPrimaryDisplay();
  if (mode === "compact") {
    return {
      x: workArea.x + workArea.width - size.width - 28,
      y: workArea.y + 32,
      width: size.width,
      height: size.height
    };
  }

  return {
    x: Math.round(workArea.x + (workArea.width - size.width) / 2),
    y: Math.round(workArea.y + (workArea.height - size.height) / 2),
    width: size.width,
    height: Math.min(size.height, workArea.height - 40)
  };
}

function normalizeBounds(bounds, mode) {
  const fallback = getDefaultBounds(mode);
  if (!bounds || typeof bounds !== "object") return fallback;

  return {
    x: Number.isFinite(bounds.x) ? bounds.x : fallback.x,
    y: Number.isFinite(bounds.y) ? bounds.y : fallback.y,
    width: Number.isFinite(bounds.width) ? bounds.width : fallback.width,
    height: Number.isFinite(bounds.height) ? bounds.height : fallback.height
  };
}

function rememberBounds() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const mode = preferences.mode === "full" ? "full" : "compact";
  preferences.bounds[mode] = mainWindow.getBounds();
  savePreferences();
}

function applyWindowPreferences() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.setAlwaysOnTop(Boolean(preferences.alwaysOnTop), "floating");
  mainWindow.setOpacity(clampOpacity(preferences.opacity));
}

function applyWindowMode(mode) {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const nextMode = mode === "full" ? "full" : "compact";
  preferences.mode = nextMode;

  if (nextMode === "compact") {
    mainWindow.setResizable(false);
    mainWindow.setMinimumSize(320, 180);
    mainWindow.setMaximumSize(FLOATING_SIZE.width, FLOATING_SIZE.height);
  } else {
    mainWindow.setMaximumSize(10000, 10000);
    mainWindow.setResizable(true);
    mainWindow.setMinimumSize(360, 620);
  }

  mainWindow.setBounds(normalizeBounds(preferences.bounds[nextMode], nextMode), true);
  applyWindowPreferences();
  savePreferences();
  mainWindow.show();
  mainWindow.focus();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    ...normalizeBounds(preferences.bounds.compact, "compact"),
    title: "DaySpan",
    frame: false,
    show: true,
    resizable: false,
    backgroundColor: "#f7f3ea",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.on("move", rememberBounds);
  mainWindow.on("resize", rememberBounds);
  mainWindow.webContents.once("did-finish-load", () => {
    applyWindowMode(preferences.mode);
    mainWindow.webContents.send("dayspan:preferences-changed", preferences);
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
}

ipcMain.handle("dayspan:get-preferences", () => preferences);

ipcMain.handle("dayspan:update-preferences", (_event, patch = {}) => {
  preferences = {
    ...preferences,
    ...patch,
    mode: patch.mode === "full" || patch.mode === "compact" ? patch.mode : preferences.mode,
    opacity: patch.opacity === undefined ? preferences.opacity : clampOpacity(patch.opacity),
    bounds: {
      ...preferences.bounds,
      ...(patch.bounds || {})
    }
  };

  applyWindowPreferences();
  savePreferences();
  return preferences;
});

ipcMain.handle("dayspan:set-mode", (_event, mode) => {
  rememberBounds();
  applyWindowMode(mode);
  return preferences;
});

ipcMain.handle("dayspan:set-opacity", (_event, opacity) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setOpacity(clampOpacity(opacity));
  }
  return clampOpacity(opacity);
});

ipcMain.handle("dayspan:minimize", () => {
  mainWindow?.minimize();
});

ipcMain.handle("dayspan:close", () => {
  mainWindow?.close();
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
