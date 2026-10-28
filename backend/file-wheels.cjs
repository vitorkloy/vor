const { spawn } = require("child_process");
const path = require("path");

function start(hooks) {
  const script = path.join(__dirname, "file-drag.ps1");
  const child = spawn(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script],
    { stdio: ["ignore", "pipe", "ignore"] },
  );
  let buf = "";
  child.stdout.on("data", (chunk) => {
    buf += chunk.toString("utf8");
    const lines = buf.split(/\r?\n/);
    buf = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const ev = JSON.parse(line);
        if (ev.type === "down" && ev.path && hooks.onDrag) hooks.onDrag(ev);
        if (ev.type === "up" && hooks.onUp) hooks.onUp(ev);
      } catch {
        /* ignore */
      }
    }
  });
  return child;
}

module.exports = { start };
