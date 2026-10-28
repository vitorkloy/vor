const sectorsEl = document.getElementById("sectors");
const workspaceEl = document.getElementById("workspace");
const labelEl = document.getElementById("label");
const wheelEl = document.getElementById("wheel");
const hubEl = document.getElementById("hub");

const KEY = "vor-ui";
const DEFAULTS = {
  menuRadius: 150,
  iconSize: 64,
  appSpacing: 14,
  backdropOpacity: 0.45,
  showLabels: true,
  performanceMode: false,
  showClock: true,
};

function config() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

function scrim(opacity) {
  const peak = 0.22 + opacity * 0.3;
  const radius = 280;
  const stops = [0, 0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88, 1]
    .map((t) => {
      const falloff = 1 - (3 * t * t - 2 * t * t * t);
      return `rgba(4,5,7,${(peak * falloff).toFixed(3)}) ${Math.round(t * radius)}px`;
    })
    .join(", ");
  return `radial-gradient(circle at 50% 50%, ${stops})`;
}

let items = [];
let aimed = -1;
let anchor = null;

function core() {
  return window.__TAURI__ && window.__TAURI__.core;
}
function eventApi() {
  return window.__TAURI__ && window.__TAURI__.event;
}

function layout(list) {
  const cfg = config();
  const scrimEl = wheelEl.querySelector(".zn-radial-scrim");
  scrimEl.style.setProperty("--zn-scrim", scrim(cfg.backdropOpacity));
  wheelEl.classList.toggle("is-fast", cfg.performanceMode);
  const hud = document.getElementById("hud");
  hud.hidden = !cfg.showClock;
  sectorsEl.replaceChildren();
  const n = list.length;
  const tile = cfg.iconSize;
  const radius = Math.max(92, cfg.menuRadius * 0.72);
  const shade = 12 + Math.round(cfg.backdropOpacity * 10);
  list.forEach((item, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    const dx = Math.cos(angle) * radius;
    const dy = Math.sin(angle) * radius;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "zn-slice";
    btn.textContent = short(item.label);
    btn.title = item.label;
    btn.style.setProperty("--tile", `${tile}px`);
    btn.style.setProperty("--tile-bg", `rgb(${shade},${shade},${shade})`);
    btn.style.setProperty("--dx", `${dx}px`);
    btn.style.setProperty("--dy", `${dy}px`);
    btn.addEventListener("pointerenter", () => setAimed(i));
    btn.addEventListener("click", () => confirm(i));
    const label = document.createElement("div");
    label.className = "slice-label";
    label.style.setProperty("--lx", `${dx}px`);
    label.style.setProperty("--ly", `${dy + tile / 2}px`);
    const text = document.createElement("span");
    text.textContent = item.label;
    label.append(text);
    label.hidden = !cfg.showLabels;
    sectorsEl.append(btn, label);
    requestAnimationFrame(() => btn.classList.add("is-in"));
  });
}

function short(label) {
  return label.length > 12 ? `${label.slice(0, 11)}…` : label;
}

function setAimed(index) {
  aimed = index;
  const slices = [...sectorsEl.querySelectorAll(".zn-slice")];
  const labels = [...sectorsEl.querySelectorAll(".slice-label")];
  slices.forEach((el, i) => el.classList.toggle("is-aimed", i === index));
  labels.forEach((el, i) => {
    el.classList.toggle("is-on", config().showLabels);
    el.classList.toggle("is-aimed", i === index);
  });
  labelEl.textContent = "";
}

function tickClock() {
  const el = document.getElementById("clock");
  if (!el || !config().showClock) return;
  el.textContent = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
setInterval(tickClock, 1000);
tickClock();

function aimFromScreen(x, y) {
  if (!anchor) return;
  const cx = anchor.originX + anchor.width / 2;
  const cy = anchor.originY + anchor.height / 2;
  const dx = x - cx;
  const dy = y - cy;
  if (Math.hypot(dx, dy) < Math.max(58, config().iconSize * 0.9) || items.length === 0) {
    setAimed(-1);
    return;
  }
  const n = items.length;
  const step = (2 * Math.PI) / n;
  let rel = Math.atan2(dy, dx) + Math.PI / 2;
  if (rel < 0) rel += Math.PI * 2;
  setAimed(Math.round(rel / step) % n);
}

async function confirm(index) {
  if (index < 0 || !items[index]) {
    hide();
    return;
  }
  const api = core();
  if (!api) return;
  try {
    await api.invoke("launch_item", { id: items[index].id });
  } catch (err) {
    labelEl.textContent = String(err);
    return;
  }
  hide();
}

function hide() {
  wheelEl.hidden = true;
  setAimed(-1);
  const api = core();
  if (api) api.invoke("hide_wheel");
}

async function load() {
  const api = core();
  if (!api) {
    items = [
      { id: "a", label: "Notas" },
      { id: "b", label: "Arquivos" },
      { id: "c", label: "Terminal" },
      { id: "d", label: "Calculadora" },
    ];
    workspaceEl.textContent = "Principal";
    layout(items);
    wheelEl.hidden = false;
    return;
  }
  const data = await api.invoke("launch_items");
  items = data.items;
  workspaceEl.textContent = data.workspace;
  layout(items);
}

hubEl.addEventListener("click", hide);
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") hide();
});

load();

const ev = eventApi();
if (ev) {
  ev.listen("wheel-anchor", (e) => {
    anchor = e.payload;
    wheelEl.hidden = false;
    setAimed(-1);
  });
  ev.listen("cursor-move", (e) => {
    wheelEl.hidden = false;
    aimFromScreen(e.payload.x, e.payload.y);
  });
  ev.listen("trigger-up", () => {
    if (aimed >= 0) confirm(aimed);
    else hide();
  });
  ev.listen("trigger-down", () => {
    wheelEl.hidden = false;
  });
}
