const { spawn } = require("child_process");
const path = require("path");

function start(hooks) {
  const script = path.join(__dirname, "file-drag.ps1");
  const child = spawn(
    "powershell",
    ["-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-File", script],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let buf = "";
  child.stdout.on("data", (chunk) => {
    buf += chunk.toString("utf8");
    const lines = buf.split(/\r?\n/);
    buf = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim().startsWith("{")) continue;
      try {
        hooks.onEvent(JSON.parse(line));
      } catch {
        /* ignore */
      }
    }
  });
  return child;
}

module.exports = { start };
