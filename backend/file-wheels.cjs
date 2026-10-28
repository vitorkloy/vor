const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { BrowserWindow, ipcMain, clipboard } = require("electron");

const MODES = { convert: "Shift", tools: "Ctrl", actions: "Alt" };

function uniqueDest(dir, filename) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  let n = 0;
  let candidate = path.join(dir, filename);
  while (fs.existsSync(candidate)) {
    n += 1;
    candidate = path.join(dir, `${base} (${n})${ext}`);
  }
  return candidate;
}

function itemsFor(mode, filePath) {
  const ext = path.extname(filePath).replace(".", "").toLowerCase();
  if (mode === "convert") {
    const targets = ["png", "jpg", "webp", "pdf", "txt", "zip"].filter((t) => t !== ext);
    return targets.map((t) => ({ id: `conv:${t}`, title: t.toUpperCase() }));
  }
  if (mode === "tools") {
    return ["COPY", "COMPRESS"].map((title) => ({ id: `tool:${title.toLowerCase()}`, title }));
  }
  return ["COPY", "MOVE", "COPY PATH", "TERMINAL"].map((title) => ({
    id: `act:${title.toLowerCase().replace(" ", "")}`,
    title,
  }));
}

function runItem(id, filePath) {
  const dir = path.dirname(filePath);
  const name = path.basename(filePath);
  if (id.startsWith("conv:")) {
    const to = id.slice(5);
    const dest = uniqueDest(dir, `${path.parse(name).name}.${to}`);
    if (["png", "jpg", "bmp"].includes(to) && ["png", "jpg", "jpeg", "bmp"].includes(path.extname(name).slice(1).toLowerCase())) {
      const ps = `
        Add-Type -AssemblyName System.Drawing
        $img = [System.Drawing.Image]::FromFile(${JSON.stringify(filePath)})
        $fmt = [System.Drawing.Imaging.ImageFormat]::${to === "jpg" ? "Jpeg" : to === "bmp" ? "Bmp" : "Png"}
        $img.Save(${JSON.stringify(dest)}, $fmt)
        $img.Dispose()
      `;
      require("child_process").execFileSync("powershell", ["-NoProfile", "-Command", ps], { stdio: "ignore" });
      return dest;
    }
    throw new Error("Conversão indisponível neste formato sem ferramenta externa");
  }
  if (id === "tool:copy" || id === "act:copy") {
    const dest = uniqueDest(dir, name);
    fs.copyFileSync(filePath, dest);
    return dest;
  }
  if (id === "act:move") {
    const dest = uniqueDest(dir, name);
    fs.renameSync(filePath, dest);
    return dest;
  }
  if (id === "act:copypath") {
    clipboard.writeText(filePath);
    return filePath;
  }
  if (id === "act:terminal") {
    spawn("cmd", ["/C", "start", "wt", "-d", dir], { detached: true, stdio: "ignore" }).unref();
    return dir;
  }
  if (id === "tool:compress") {
    const dest = uniqueDest(dir, `${path.parse(name).name}.zip`);
    require("child_process").execFileSync(
      "powershell",
      ["-NoProfile", "-Command", `Compress-Archive -LiteralPath ${JSON.stringify(filePath)} -DestinationPath ${JSON.stringify(dest)}`],
      { stdio: "ignore" },
    );
    return dest;
  }
  throw new Error("Ação indisponível");
}

let win = null;

function show(payload) {
  const query = encodeURIComponent(JSON.stringify(payload));
  if (win && !win.isDestroyed()) win.close();
  win = new BrowserWindow({
    width: 440,
    height: 440,
    x: Math.round(payload.x - 220),
    y: Math.round(payload.y - 220),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "file-wheel-preload.cjs"),
      contextIsolation: true,
    },
  });
  win.loadFile(path.join(__dirname, "file-wheel.html"), { query: { payload: query } });
}

function start() {
  if (process.platform !== "win32") return;
  ipcMain.handle("file-wheel-run", (_e, id, filePath) => {
    const out = runItem(id, filePath);
    if (win && !win.isDestroyed()) win.close();
    return out;
  });
  const ps = spawn("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(__dirname, "file-drag.ps1")], {
    stdio: ["ignore", "pipe", "ignore"],
  });
  let buf = "";
  ps.stdout.on("data", (chunk) => {
    buf += chunk.toString();
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      try {
        const ev = JSON.parse(line);
        if (ev.type === "down") show({ ...ev, items: itemsFor(ev.mode, ev.path), key: MODES[ev.mode] });
        if (ev.type === "up" && win && !win.isDestroyed()) win.close();
      } catch { /* ignore */ }
    }
  });
}

module.exports = { start };
