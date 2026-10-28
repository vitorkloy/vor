/**
 * Equivalentes de macOS e Linux para o que no Windows é feito por PowerShell/Win32:
 * gatilho global do rato, lista de apps instaladas, ícones e lançamento.
 * Sem dependências para o utilizador: só APIs do Electron/Node e o `uiohook-napi` (pré-compilado).
 */
const { app, shell, systemPreferences } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const isMac = process.platform === "darwin";
const isLinux = process.platform === "linux";

// ---------------------------------------------------------------- gatilho do rato
/** uiohook: 1 esq, 2 dir, 3 meio, 4 X1, 5 X2. */
const UIOHOOK_BUTTON = { middle: 3, x1: 4, x2: 5 };
let hook = null;
let hookStarted = false;
let armed = null; // { button, onLine }

function loadHook() {
  if (hook !== null) return hook;
  try {
    hook = require("uiohook-napi").uIOhook;
  } catch (e) {
    hook = false;
    console.warn(`[UnixTrigger] uiohook-napi indisponível: ${e.message}`);
  }
  return hook;
}

/** macOS exige Acessibilidade para hooks globais. `prompt` abre o pedido do sistema. */
function hasInputPermission(prompt = false) {
  if (!isMac) return true;
  try {
    return systemPreferences.isTrustedAccessibilityClient(prompt);
  } catch {
    return false;
  }
}

/** Wayland não deixa um cliente ver o rato global; uiohook só funciona em X11/XWayland. */
function isWaylandOnly() {
  return isLinux && process.env.XDG_SESSION_TYPE === "wayland" && !process.env.DISPLAY;
}

/**
 * Emite as mesmas linhas que o `mouse-blocker.ps1` (TRIGGER_DOWN / TRIGGER_UP), para o resto do
 * main tratar o gesto igual nos três SOs. Diferença: aqui o clique NÃO é engolido.
 */
function armTrigger(buttonName, onLine, log = () => {}) {
  const h = loadHook();
  if (!h) return false;
  if (isMac && !hasInputPermission(true)) {
    log("[UnixTrigger] Sem permissão de Acessibilidade — pedido mostrado ao utilizador.");
    return false;
  }
  if (isWaylandOnly()) {
    log("[UnixTrigger] Sessão Wayland sem XWayland: gatilho do rato indisponível, use o atalho.");
    return false;
  }
  armed = { button: UIOHOOK_BUTTON[buttonName] ?? UIOHOOK_BUTTON.middle, onLine };
  if (!hookStarted) {
    h.on("mousedown", (e) => {
      if (armed && e.button === armed.button) armed.onLine("TRIGGER_DOWN\n");
    });
    h.on("mouseup", (e) => {
      if (armed && e.button === armed.button) armed.onLine("TRIGGER_UP\n");
    });
    try {
      h.start();
      hookStarted = true;
    } catch (e) {
      log(`[UnixTrigger] start falhou: ${e.message}`);
      return false;
    }
  }
  log(`[UnixTrigger] Armado (botão ${armed.button})`);
  return true;
}

function disarmTrigger() {
  armed = null;
}

function stopHook() {
  armed = null;
  if (hook && hookStarted) {
    try {
      hook.stop();
    } catch {}
    hookStarted = false;
  }
}

// ---------------------------------------------------------------- lista de apps
function listMacApps() {
  const roots = ["/Applications", "/System/Applications", "/System/Applications/Utilities", path.join(os.homedir(), "Applications")];
  const out = new Map();
  for (const root of roots) {
    let entries = [];
    try {
      entries = fs.readdirSync(root, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const full = path.join(root, ent.name);
      if (ent.name.endsWith(".app")) {
        const name = ent.name.slice(0, -4);
        if (!out.has(name)) out.set(name, { Name: name, DisplayName: name, Path: full, IconPath: full });
      } else if (ent.isDirectory() && root === "/Applications") {
        // Pastas como /Applications/Utilities ou de fornecedores (um nível).
        try {
          for (const sub of fs.readdirSync(full)) {
            if (!sub.endsWith(".app")) continue;
            const name = sub.slice(0, -4);
            const p = path.join(full, sub);
            if (!out.has(name)) out.set(name, { Name: name, DisplayName: name, Path: p, IconPath: p });
          }
        } catch {}
      }
    }
  }
  return [...out.values()].sort((a, b) => a.Name.localeCompare(b.Name));
}

function linuxAppDirs() {
  const dataHome = process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local/share");
  const dataDirs = (process.env.XDG_DATA_DIRS || "/usr/local/share:/usr/share").split(":");
  return [
    path.join(dataHome, "applications"),
    ...dataDirs.map((d) => path.join(d, "applications")),
    "/var/lib/flatpak/exports/share/applications",
    path.join(os.homedir(), ".local/share/flatpak/exports/share/applications"),
    "/var/lib/snapd/desktop/applications",
  ];
}

/** Lê o grupo [Desktop Entry] de um .desktop. */
function parseDesktopFile(file) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
  const entry = {};
  let inMain = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("[")) {
      inMain = line === "[Desktop Entry]";
      continue;
    }
    if (!inMain || !line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    if (!(key in entry)) entry[key] = line.slice(eq + 1).trim();
  }
  return entry;
}

function listLinuxApps() {
  const lang = (process.env.LANG || "").split(".")[0];
  const seen = new Set();
  const out = [];
  for (const dir of linuxAppDirs()) {
    let files = [];
    try {
      files = fs.readdirSync(dir).filter((f) => f.endsWith(".desktop"));
    } catch {
      continue;
    }
    for (const f of files) {
      if (seen.has(f)) continue; // o primeiro diretório (do utilizador) tem prioridade
      seen.add(f);
      const e = parseDesktopFile(path.join(dir, f));
      if (!e || e.Type !== "Application" || e.NoDisplay === "true" || e.Hidden === "true" || !e.Exec) continue;
      const name = e[`Name[${lang}]`] || e[`Name[${lang.split("_")[0]}]`] || e.Name;
      if (!name) continue;
      const file = path.join(dir, f);
      out.push({ Name: name, DisplayName: name, Path: file, IconPath: e.Icon || "" });
    }
  }
  return out.sort((a, b) => a.Name.localeCompare(b.Name));
}

function listInstalledApps() {
  if (isMac) return listMacApps();
  if (isLinux) return listLinuxApps();
  return [];
}

// ---------------------------------------------------------------- ícones
const ICON_SIZES = ["512x512", "256x256", "scalable", "128x128", "96x96", "64x64", "48x48"];

/** Resolve o nome `Icon=` de um .desktop num ficheiro PNG/SVG do tema hicolor ou pixmaps. */
function resolveLinuxIcon(iconName) {
  if (!iconName) return null;
  if (path.isAbsolute(iconName)) return fs.existsSync(iconName) ? iconName : null;
  const bases = [
    path.join(os.homedir(), ".local/share/icons"),
    ...(process.env.XDG_DATA_DIRS || "/usr/local/share:/usr/share").split(":").map((d) => path.join(d, "icons")),
    "/var/lib/flatpak/exports/share/icons",
    "/var/lib/snapd/desktop/icons",
  ];
  for (const base of bases) {
    for (const size of ICON_SIZES) {
      for (const ext of [".png", ".svg"]) {
        const p = path.join(base, "hicolor", size, "apps", iconName + ext);
        if (fs.existsSync(p)) return p;
      }
    }
  }
  for (const ext of [".png", ".svg", ".xpm"]) {
    const p = path.join("/usr/share/pixmaps", iconName + ext);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** Devolve data URL ou null. */
async function getIconDataUrl(target) {
  try {
    if (isLinux && target.endsWith(".desktop")) {
      const e = parseDesktopFile(target);
      target = resolveLinuxIcon(e?.Icon) || target;
    } else if (isLinux && !target.includes("/")) {
      target = resolveLinuxIcon(target) || target;
    }
    if (isLinux && /\.(png|svg)$/i.test(target) && fs.existsSync(target)) {
      const mime = target.endsWith(".svg") ? "image/svg+xml" : "image/png";
      return `data:${mime};base64,${fs.readFileSync(target).toString("base64")}`;
    }
    if (!fs.existsSync(target)) return null;
    const img = await app.getFileIcon(target, { size: "large" });
    return img.isEmpty() ? null : img.toDataURL();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- lançamento
function spawnDetached(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { detached: true, stdio: "ignore" });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve(true);
    });
  });
}

/** Expande o Exec de um .desktop (remove %f %u etc.) em argv. */
function desktopExecArgv(exec) {
  const argv = [];
  const re = /"((?:\\.|[^"])*)"|(\S+)/g;
  let m;
  while ((m = re.exec(exec))) {
    const tok = m[1] !== undefined ? m[1].replace(/\\(.)/g, "$1") : m[2];
    if (/^%[fFuUdDnNickvm]$/.test(tok)) continue;
    argv.push(tok.replace(/%%/g, "%"));
  }
  return argv;
}

/** Abre um app/ficheiro/URL/comando no macOS ou Linux. */
async function launch(command) {
  const cmd = String(command || "").trim();
  if (!cmd) throw new Error("comando vazio");
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(cmd) || /^(mailto|steam|discord|spotify):/i.test(cmd)) {
    await shell.openExternal(cmd);
    return true;
  }
  if (isMac) {
    if (cmd.endsWith(".app") || fs.existsSync(cmd)) return spawnDetached("open", [cmd]);
    // Nome de app ("Safari") ou bundle id ("com.apple.Safari").
    if (/^[\w-]+(\.[\w-]+){2,}$/.test(cmd)) return spawnDetached("open", ["-b", cmd]);
    if (!cmd.includes(" ")) {
      try {
        return await spawnDetached("open", ["-a", cmd]);
      } catch {}
    }
    return spawnDetached("/bin/sh", ["-c", cmd]);
  }
  if (cmd.endsWith(".desktop")) {
    const e = parseDesktopFile(cmd);
    if (e?.Exec) {
      const argv = desktopExecArgv(e.Exec);
      if (argv.length) return spawnDetached(argv[0], argv.slice(1));
    }
    return spawnDetached("gio", ["launch", cmd]).catch(() => spawnDetached("xdg-open", [cmd]));
  }
  if (fs.existsSync(cmd)) {
    try {
      fs.accessSync(cmd, fs.constants.X_OK);
      if (fs.statSync(cmd).isFile()) return spawnDetached(cmd, []);
    } catch {}
    const err = await shell.openPath(cmd);
    if (err) throw new Error(err);
    return true;
  }
  return spawnDetached("/bin/sh", ["-c", cmd]);
}

module.exports = {
  isMac,
  isLinux,
  armTrigger,
  disarmTrigger,
  stopHook,
  hasInputPermission,
  listInstalledApps,
  getIconDataUrl,
  launch,
  // exportados para testes
  _parseDesktopFile: parseDesktopFile,
  _desktopExecArgv: desktopExecArgv,
};
