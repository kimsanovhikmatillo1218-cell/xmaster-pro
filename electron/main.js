const { app, BrowserWindow, Menu, shell, ipcMain } = require("electron");
const path = require("path");
const isDev = process.env.NODE_ENV === "development";

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "X-MASTER Pro — O'quv Markaz Boshqaruvi",
    icon: path.join(__dirname, "../dist/favicon.svg"),
    backgroundColor: "#f1f5f9",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    show: false,
  });

  // Load app
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => { mainWindow = null; });
}

// App menu
const menuTemplate = [
  {
    label: "X-MASTER Pro",
    submenu: [
      { label: "Haqida", click: () => {} },
      { type: "separator" },
      { label: "Chiqish", role: "quit" },
    ],
  },
  {
    label: "Ko'rinish",
    submenu: [
      { label: "Yangilash", accelerator: "F5", click: () => mainWindow?.webContents.reload() },
      { label: "To'liq ekran", role: "togglefullscreen" },
      { label: "Zoom kirish", role: "zoomIn", accelerator: "CmdOrCtrl+=" },
      { label: "Zoom chiqish", role: "zoomOut" },
      { label: "Odatiy zoom", role: "resetZoom" },
    ],
  },
  {
    label: "Tahrirlash",
    submenu: [
      { role: "undo", label: "Bekor qilish" },
      { role: "redo", label: "Qayta bajarish" },
      { type: "separator" },
      { role: "cut", label: "Kesish" },
      { role: "copy", label: "Nusxalash" },
      { role: "paste", label: "Joylashtirish" },
      { role: "selectAll", label: "Hammasini tanlash" },
    ],
  },
];

app.whenReady().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
