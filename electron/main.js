const { app, BrowserWindow, Menu, shell, ipcMain, dialog, Notification } = require("electron");
const path = require("path");
const isDev = process.env.NODE_ENV === "development";

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: "X-MASTER Pro",
    icon: path.join(__dirname, "icon.png"),
    backgroundColor: "#f3f1f9",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: false,
    },
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5174");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist-electron/index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => { mainWindow = null; });
}

// ── Auto updater ──────────────────────────────────────────────────
function setupAutoUpdater() {
  try {
    const { autoUpdater } = require("electron-updater");
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on("update-available", (info) => {
      mainWindow?.webContents.send("update-available", info);
      // Windows notification
      if (Notification.isSupported()) {
        new Notification({
          title: "X-MASTER Pro — Yangi versiya",
          body: `v${info.version} yuklanmoqda...`,
          icon: path.join(__dirname, "icon.png"),
        }).show();
      }
    });

    autoUpdater.on("update-downloaded", (info) => {
      mainWindow?.webContents.send("update-downloaded", info);
      dialog.showMessageBox(mainWindow, {
        type: "info",
        title: "Yangilanish tayyor",
        message: `X-MASTER Pro v${info.version} yuklab olindi.`,
        detail: "Dastur qayta ishga tushiriladi va yangilanadi.",
        buttons: ["Hozir yangilansin", "Keyinroq"],
        defaultId: 0,
      }).then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall();
      });
    });

    autoUpdater.on("error", (err) => {
      console.error("AutoUpdater error:", err.message);
    });

    // Har 4 soatda tekshir
    setTimeout(() => autoUpdater.checkForUpdates(), 3000);
    setInterval(() => autoUpdater.checkForUpdates(), 4 * 60 * 60 * 1000);
  } catch (e) {
    console.log("AutoUpdater not available in dev mode");
  }
}

// ── IPC handlers ──────────────────────────────────────────────────
ipcMain.handle("app-version",  () => app.getVersion());
ipcMain.handle("check-update", () => {
  try {
    const { autoUpdater } = require("electron-updater");
    return autoUpdater.checkForUpdates();
  } catch { return null; }
});
ipcMain.handle("open-external", (_, url) => shell.openExternal(url));

// ── Menu ──────────────────────────────────────────────────────────
const menuTemplate = [
  {
    label: "X-MASTER Pro",
    submenu: [
      { label: `Versiya: v${app.getVersion()}`, enabled: false },
      { type: "separator" },
      { label: "Yangilanishni tekshirish", click: () => {
        try { require("electron-updater").autoUpdater.checkForUpdates(); } catch {}
      }},
      { type: "separator" },
      { label: "Chiqish", role: "quit", accelerator: "CmdOrCtrl+Q" },
    ],
  },
  {
    label: "Ko'rinish",
    submenu: [
      { label: "Yangilash", accelerator: "F5", click: () => mainWindow?.webContents.reload() },
      { label: "To'liq ekran", role: "togglefullscreen", accelerator: "F11" },
      { type: "separator" },
      { label: "Zoom kirish",  role: "zoomIn",    accelerator: "CmdOrCtrl+=" },
      { label: "Zoom chiqish", role: "zoomOut",   accelerator: "CmdOrCtrl+-" },
      { label: "Odatiy zoom",  role: "resetZoom", accelerator: "CmdOrCtrl+0" },
    ],
  },
  {
    label: "Tahrirlash",
    submenu: [
      { role: "undo",      label: "Bekor qilish" },
      { role: "redo",      label: "Qayta bajarish" },
      { type: "separator" },
      { role: "cut",       label: "Kesish" },
      { role: "copy",      label: "Nusxalash" },
      { role: "paste",     label: "Joylashtirish" },
      { role: "selectAll", label: "Hammasini tanlash" },
    ],
  },
];

app.whenReady().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
  createWindow();
  if (!isDev) setupAutoUpdater();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
