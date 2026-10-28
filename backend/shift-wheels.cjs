const { execFileSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const IMAGE = ["jpg", "png", "webp", "heic", "tiff", "svg", "avif", "bmp", "ico", "psd", "tga", "jxl"];
const AUDIO = ["mp3", "m4a", "wav", "flac", "ogg", "opus", "aiff", "wma", "aac"];
const VIDEO = ["mp4", "mov", "mkv", "webm", "avi", "wmv", "m4v", "flv", "mpg", "3gp", "ts"];
const DOCS = ["docx", "doc", "odt", "pages", "md", "rtf", "html"];
const SLIDES = ["ppt", "pptx", "odp", "key"];
const SHEETS = ["xlsx", "xls", "ods", "csv", "tsv"];
const SUBS = ["srt", "vtt"];
const ARCHIVES = ["zip", "tar", "gz", "rar", "7z"];
const SOON = "soon";
const NATIVE = ["png", "jpg", "jpeg", "bmp", "gif", "tif", "tiff"];

function which(cmd) {
  try {
    const out = execFileSync("where.exe", [cmd], { encoding: "utf8" }).split(/\r?\n/).find(Boolean);
    return out || null;
  } catch {
    return null;
  }
}

function tools() {
  return {
    magick: which("magick"),
    ffmpeg: which("ffmpeg"),
    soffice: which("soffice"),
    pandoc: which("pandoc"),
    tar: which("tar"),
    gs: which("gswin64c") || which("gswin32c"),
  };
}

function fmtOf(file) {
  let e = path.extname(file).slice(1).toLowerCase();
  if (e === "jpeg" || e === "jfif") e = "jpg";
  if (e === "tif") e = "tiff";
  if (e === "htm") e = "html";
  if (e === "markdown") e = "md";
  return e;
}

function kindOf(fmt) {
  if (fmt === "gif") return "gif";
  if (IMAGE.includes(fmt)) return "image";
  if (AUDIO.includes(fmt)) return "audio";
  if (VIDEO.includes(fmt)) return "video";
  if (fmt === "pdf") return "pdf";
  if (fmt === "txt") return "txt";
  if (fmt === "epub") return "epub";
  if (DOCS.includes(fmt)) return "doc";
  if (SLIDES.includes(fmt)) return "slides";
  if (SHEETS.includes(fmt)) return "sheet";
  if (SUBS.includes(fmt)) return "subtitle";
  if (ARCHIVES.includes(fmt)) return "archive";
  return "other";
}

function targets(kind, fmt) {
  const table = {
    image: ["jpg", "png", "webp", "heic", "tiff", "avif", "bmp", "pdf"],
    audio: ["mp3", "m4a", "wav", "flac", "ogg", "opus", "aiff", "wma"],
    video: ["mp4", "mov", "mkv", "webm", "avi", "wmv", "gif", "mp3"],
    gif: ["mp4", "mov", "mkv", "webm", "avi", "wmv"],
    pdf: ["docx", "pages", "pptx", "xlsx", "jpg", "png", "epub", "txt", "md"],
    slides: ["pdf", "jpg", "png"],
    sheet: ["xlsx", "ods", "csv", "tsv", "pdf"],
    doc: ["docx", "pages", "pdf", "txt", "md", "html", "epub", "png", "jpg"],
    epub: ["pdf", "docx", "pages", "txt", "md", "html"],
    txt: ["docx", "pages", "pdf", "md", "html", "epub", "jpg", "png"],
    subtitle: ["srt", "vtt", "txt"],
    archive: ["zip", "tar", "gz"],
  };
  return (table[kind] || []).filter((x) => x !== fmt);
}

function titleOf(fmt) {
  return fmt === "gz" ? "GZIP" : fmt.toUpperCase();
}

function ok() { return { available: true, reason: null }; }
function no(msg) { return { available: false, reason: msg }; }
function need(tool, msg) { return tool ? ok() : no(msg); }

function convGate(kind, from, to, t) {
  if (to === "pages") return no("pages");
  if (kind === "image") {
    const nativeIn = NATIVE.includes(from);
    const nativeOut = ["png", "jpg", "webp", "tiff", "bmp", "pdf"].includes(to);
    if ((nativeIn || t.magick) && (nativeOut || t.magick) && !(to === "pdf" && !t.magick) && !(["webp", "tiff"].includes(to) && !t.magick && !NATIVE.includes(to))) {
      if (to === "pdf" && !t.magick) return no("imagemagick");
      if (["webp", "heic", "avif"].includes(to) && !t.magick) return no("imagemagick");
      if (["webp", "heic", "avif"].includes(from) && !t.magick) return no("imagemagick");
      return ok();
    }
    return no("imagemagick");
  }
  if (kind === "audio" || kind === "video" || kind === "gif") return need(t.ffmpeg, "ffmpeg");
  if (kind === "pdf") {
    if (to === "jpg" || to === "png") return need(t.gs, "ghostscript");
    if (to === "docx" || to === "txt") return need(t.soffice, "libreoffice");
    return no(SOON);
  }
  if (kind === "doc" || kind === "txt" || kind === "slides" || kind === "sheet") {
    if (to === "md" || from === "md") return need(t.pandoc, "pandoc");
    return need(t.soffice, "libreoffice");
  }
  if (kind === "epub") return to === "pdf" ? no(SOON) : need(t.pandoc, "pandoc");
  if (kind === "subtitle") return ok();
  if (kind === "archive") return need(t.tar, "tar");
  return no("unsupported");
}

function toolTitle(id) {
  const map = {
    compress: "COMPRESS", removeMetadata: "METADATA", editImage: "EDIT", annotateImage: "ANNOTATE",
    frameImage: "ADD BG", cropImage: "CROP", cropVideo: "CROP", redactImage: "REDACT", redactVideo: "REDACT",
    normalizeAudio: "NORMALIZE", muteVideo: "MUTE", trimVideo: "TRIM", trimAudio: "TRIM",
    splitPDF: "SPLIT", splitVideo: "SPLIT", organizePDF: "ORGANIZE", extractArchive: "EXTRACT",
    createPDF: "CREATE PDF", mergePDF: "MERGE PDF", changeVideoSpeed: "SPEED", joinVideos: "JOIN",
    videoSnapshots: "SNAPSHOT", audioToVideo: "VISUALIZE", audioChannels: "CHANNELS", createCollage: "COLLAGE",
    redactAudio: "BLEEP", airDrop: "SHARE", float: "FLOAT", copy: "COPY", move: "MOVE",
    copyPath: "COPY PATH", openTerminal: "TERMINAL",
  };
  return map[id] || "?";
}

function toolIds(kind, fmt) {
  if (kind === "image" && fmt === "svg") return [];
  if (kind === "image") return ["compress", "removeMetadata", "editImage", "annotateImage", "frameImage", "cropImage", "redactImage"];
  if (kind === "audio") return ["compress", "removeMetadata", "normalizeAudio", "audioToVideo", "trimAudio", "audioChannels", "redactAudio"];
  if (kind === "video") return ["compress", "removeMetadata", "muteVideo", "trimVideo", "cropVideo", "changeVideoSpeed", "videoSnapshots", "splitVideo", "redactVideo"];
  if (kind === "gif") return ["removeMetadata"];
  if (kind === "pdf") return ["compress", "removeMetadata", "splitPDF", "organizePDF"];
  if (kind === "archive") return ["extractArchive"];
  return [];
}

function toolGate(id, kind, t) {
  if (id === "compress") {
    if (kind === "image") return ok();
    if (kind === "pdf") return need(t.gs, "ghostscript");
    return need(t.ffmpeg, "ffmpeg");
  }
  if (id === "removeMetadata") {
    if (kind === "image") return ok();
    if (kind === "pdf") return no(SOON);
    return need(t.ffmpeg, "ffmpeg");
  }
  if (["muteVideo", "changeVideoSpeed", "videoSnapshots", "splitVideo", "normalizeAudio", "audioToVideo", "audioChannels", "joinVideos"].includes(id)) {
    return need(t.ffmpeg, "ffmpeg");
  }
  if (id === "createPDF" || ["copy", "move", "copyPath", "openTerminal"].includes(id)) return ok();
  if (id === "extractArchive") return need(t.tar, "tar");
  return no(SOON);
}

function item(id, title, gate) {
  return { id, title, available: gate.available, reason: gate.reason };
}

function pending(mode) {
  return {
    mode,
    format: "…",
    kind: "other",
    path: "",
    items: Array.from({ length: 6 }, (_, i) => ({
      id: `pending:${i}`,
      title: "…",
      available: false,
      reason: null,
    })),
  };
}

function build(filePath, mode) {
  const t = tools();
  const fmt = fmtOf(filePath);
  const kind = kindOf(fmt);
  let items = [];
  if (mode === "convert") {
    items = targets(kind, fmt).map((to) => item(`conv:${to}`, titleOf(to), convGate(kind, fmt, to, t)));
  } else if (mode === "tools") {
    items = toolIds(kind, fmt).map((id) => item(`tool:${id}`, toolTitle(id), toolGate(id, kind, t)));
  } else {
    items = ["airDrop", "float", "copy", "move", "copyPath", "openTerminal"].map((id) =>
      item(`act:${id}`, toolTitle(id), toolGate(id, kind, t)),
    );
  }
  return { mode, format: titleOf(fmt), kind, path: filePath, items };
}

function uniquePath(dir, stem, ext) {
  let candidate = path.join(dir, `${stem}.${ext}`);
  let n = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${stem} (${n}).${ext}`);
    n += 1;
  }
  return candidate;
}

function run(id, filePath) {
  const built = build(filePath, id.startsWith("conv:") ? "convert" : id.startsWith("tool:") ? "tools" : "actions");
  const found = built.items.find((i) => i.id === id);
  if (found && !found.available) throw new Error(found.reason || "Indisponível");
  const dir = path.dirname(filePath);
  const stem = path.parse(filePath).name;
  const t = tools();
  if (id.startsWith("conv:")) {
    const to = id.slice(5);
    const dest = uniquePath(dir, stem, to);
    const from = fmtOf(filePath);
    if (["png", "jpg", "bmp"].includes(to) && NATIVE.includes(from)) {
      const fmt = to === "jpg" ? "Jpeg" : to === "bmp" ? "Bmp" : "Png";
      execFileSync("powershell", ["-NoProfile", "-Command", `
        Add-Type -AssemblyName System.Drawing
        $img = [System.Drawing.Image]::FromFile(${JSON.stringify(filePath)})
        $img.Save(${JSON.stringify(dest)}, [System.Drawing.Imaging.ImageFormat]::${fmt})
        $img.Dispose()
      `], { stdio: "ignore" });
      return dest;
    }
    if (t.magick) {
      execFileSync(t.magick, [filePath, dest], { stdio: "ignore" });
      return dest;
    }
    if (t.ffmpeg && ["mp3", "wav", "mp4", "gif", "webm", "mkv"].includes(to)) {
      execFileSync(t.ffmpeg, ["-y", "-i", filePath, dest], { stdio: "ignore" });
      return dest;
    }
    if (t.soffice) {
      execFileSync(t.soffice, ["--headless", "--convert-to", to, "--outdir", dir, filePath], { stdio: "ignore" });
      return dest;
    }
    if (t.pandoc && ["md", "html", "docx", "txt"].includes(to)) {
      execFileSync(t.pandoc, [filePath, "-o", dest], { stdio: "ignore" });
      return dest;
    }
    throw new Error("soon");
  }
  if (id === "act:copy" || id === "tool:copy") {
    const dest = uniquePath(dir, stem, path.extname(filePath).slice(1) || "bin");
    fs.copyFileSync(filePath, dest);
    return dest;
  }
  if (id === "act:move") {
    const dest = uniquePath(dir, stem, path.extname(filePath).slice(1) || "bin");
    fs.renameSync(filePath, dest);
    return dest;
  }
  if (id === "act:copyPath") {
    return filePath;
  }
  if (id === "act:openTerminal") {
    spawn("cmd", ["/C", "start", "cmd", "/K", `cd /d ${dir}`], { detached: true, stdio: "ignore" }).unref();
    return dir;
  }
  if (id === "tool:compress" && kindOf(fmtOf(filePath)) === "image") {
    const dest = uniquePath(dir, `${stem}-compressed`, "jpg");
    execFileSync("powershell", ["-NoProfile", "-Command", `
      Add-Type -AssemblyName System.Drawing
      $img = [System.Drawing.Image]::FromFile(${JSON.stringify(filePath)})
      $img.Save(${JSON.stringify(dest)}, [System.Drawing.Imaging.ImageFormat]::Jpeg)
      $img.Dispose()
    `], { stdio: "ignore" });
    return dest;
  }
  if (id === "tool:extractArchive" && t.tar) {
    const destDir = uniquePath(dir, `${stem}-extract`, "dir").replace(/\.dir$/, "");
    fs.mkdirSync(destDir, { recursive: true });
    execFileSync(t.tar, ["-xf", filePath, "-C", destDir], { stdio: "ignore" });
    return destDir;
  }
  throw new Error(SOON);
}

module.exports = { build, pending, run, tools };
