const test = require("node:test");
const assert = require("node:assert");
const Module = require("module");
const fs = require("fs");
const os = require("os");
const path = require("path");

// Stub do electron para correr fora do Electron.
const origLoad = Module._load;
Module._load = function (req, ...rest) {
  if (req === "electron") return { app: {}, shell: {}, systemPreferences: {} };
  return origLoad.call(this, req, ...rest);
};
const u = require("./platform-unix.cjs");

test("desktopExecArgv remove field codes e respeita aspas", () => {
  assert.deepStrictEqual(u._desktopExecArgv('"/opt/My App/app" --new %U'), ["/opt/My App/app", "--new"]);
  assert.deepStrictEqual(u._desktopExecArgv("firefox %u"), ["firefox"]);
});

test("parseDesktopFile lê só [Desktop Entry]", () => {
  const f = path.join(os.tmpdir(), `rovyl-${process.pid}.desktop`);
  fs.writeFileSync(f, "[Desktop Entry]\nType=Application\nName=Foo\nExec=foo %F\nIcon=foo\n[Desktop Action new]\nName=Bar\nExec=bar\n");
  const e = u._parseDesktopFile(f);
  assert.strictEqual(e.Name, "Foo");
  assert.strictEqual(e.Exec, "foo %F");
  fs.unlinkSync(f);
});

test("listInstalledApps devolve o formato do scanner do Windows", { skip: process.platform === "win32" }, () => {
  const apps = u.listInstalledApps();
  assert.ok(Array.isArray(apps));
  for (const a of apps) assert.ok(a.Name && a.Path);
});
