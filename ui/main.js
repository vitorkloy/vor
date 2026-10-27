const sectorsEl = document.getElementById("sectors");
const workspaceEl = document.getElementById("workspace");
const labelEl = document.getElementById("label");
const wheelEl = document.getElementById("wheel");
const hubEl = document.getElementById("hub");

const RADIUS = 132;
const DEAD = 58;

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
  sectorsEl.replaceChildren();
  const n = list.length;
  list.forEach((item, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    const dx = Math.cos(angle) * RADIUS - 36;
    const dy = Math.sin(angle) * RADIUS - 36;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sector";
    btn.textContent = short(item.label);
    btn.title = item.label;
    btn.style.setProperty("--dx", `${dx}px`);
    btn.style.setProperty("--dy", `${dy}px`);
    btn.style.animationDelay = `${i * 18}ms`;
    btn.addEventListener("pointerenter", () => setAimed(i));
    btn.addEventListener("click", () => confirm(i));
    sectorsEl.appendChild(btn);
  });
}

function short(label) {
  return label.length > 14 ? `${label.slice(0, 13)}…` : label;
}

function setAimed(index) {
  aimed = index;
  [...sectorsEl.children].forEach((el, i) => {
    el.classList.toggle("is-aimed", i === index);
  });
  labelEl.textContent = index >= 0 ? items[index].label : "";
}

function aimFromScreen(x, y) {
  if (!anchor) return;
  const cx = anchor.originX + anchor.width / 2;
  const cy = anchor.originY + anchor.height / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.hypot(dx, dy);
  if (dist < DEAD || items.length === 0) {
    setAimed(-1);
    return;
  }
  let angle = Math.atan2(dy, dx);
  const n = items.length;
  const step = (2 * Math.PI) / n;
  let rel = angle + Math.PI / 2;
  if (rel < 0) rel += Math.PI * 2;
  const index = Math.round(rel / step) % n;
  setAimed(index);
}

async function confirm(index) {
  if (index < 0 || !items[index]) {
    hide();
    return;
  }
  const id = items[index].id;
  const api = core();
  if (!api) return;
  try {
    await api.invoke("launch_item", { id });
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
      { id: "a", label: "Notas", source: "sample" },
      { id: "b", label: "Arquivos", source: "sample" },
      { id: "c", label: "Terminal", source: "sample" },
      { id: "d", label: "Calculadora", source: "sample" },
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
