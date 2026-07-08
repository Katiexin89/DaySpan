const { app, BrowserWindow } = require("electron");
const path = require("path");

app.setName("DaySpan");
app.setAppUserModelId("com.local.dayspan");
const portableRoot = app.isPackaged ? path.dirname(process.execPath) : __dirname;
app.setPath("userData", path.join(portableRoot, ".dayspan-user-data"));
app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 420,
    height: 860,
    minWidth: 360,
    minHeight: 620,
    title: "DaySpan",
    show: true,
    backgroundColor: "#f7f3ea",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const bringToFront = () => {
    mainWindow.show();
    mainWindow.focus();
  };

  mainWindow.webContents.once("did-finish-load", bringToFront);
  mainWindow.loadFile(path.join(__dirname, "index.html")).then(bringToFront);
}

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
