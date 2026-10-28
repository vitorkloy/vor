const KEY = "vor-ui";
const DEFAULTS = {
  menuRadius: 150,
  iconSize: 64,
  appSpacing: 14,
  backdropOpacity: 0.45,
  showLabels: true,
  performanceMode: false,
  showClock: true,
  theme: "black",
};

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

let state = load();

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
  document.querySelector(".zs-shell").dataset.znTheme = state.theme;
}

const page = document.getElementById("page");
const nav = document.getElementById("nav");

function slider(label, key, min, max, step, suffix) {
  const row = document.createElement("div");
  row.className = "zs-row";
  const copy = document.createElement("div");
  const b = document.createElement("b");
  const small = document.createElement("small");
  b.textContent = label;
  small.textContent = `${state[key]}${suffix}`;
  copy.append(b, small);
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(state[key]);
  input.addEventListener("input", () => {
    state[key] = Number(input.value);
    small.textContent = `${state[key]}${suffix}`;
    save();
  });
  row.append(copy, input);
  return row;
}

function toggle(label, hint, key) {
  const row = document.createElement("div");
  row.className = "zs-row";
  const copy = document.createElement("div");
  const b = document.createElement("b");
  const small = document.createElement("small");
  b.textContent = label;
  small.textContent = hint;
  copy.append(b, small);
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = Boolean(state[key]);
  input.addEventListener("change", () => {
    state[key] = input.checked;
    save();
  });
  row.append(copy, input);
  return row;
}

function show(tab) {
  nav.querySelectorAll("button").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.tab === tab);
  });
  page.replaceChildren();
  const head = document.createElement("div");
  head.className = "zs-page-head";
  const h1 = document.createElement("h1");
  const p = document.createElement("p");
  const rows = document.createElement("div");
  rows.className = "zs-rows";
  if (tab === "workspaces") {
    h1.textContent = "Atalhos e Espaços";
    p.textContent = "O espaço Principal alimenta a roda. Os atalhos continuam a vir do Menu Iniciar.";
    ["Principal", "Menu Iniciar"].forEach((name) => {
      const row = document.createElement("div");
      row.className = "zs-ws";
      const mark = document.createElement("i");
      const text = document.createElement("b");
      text.textContent = name;
      row.append(mark, text);
      rows.append(row);
    });
  } else if (tab === "interface") {
    h1.textContent = "Interface";
    p.textContent = "O botão do meio abre a roda. O centro e Escape fecham sem lançar.";
    rows.append(
      toggle("Rótulos nos setores", "Mostra o nome ao lado de cada tile, como no Rovyl.", "showLabels"),
      toggle("Modo rápido", "Encurta a abertura da roda de 220 ms para 110 ms.", "performanceMode"),
    );
  } else if (tab === "visuals") {
    h1.textContent = "Visual";
    p.textContent = "Raio, tamanho do tile e escurecimento mudam a roda na próxima abertura.";
    rows.append(
      slider("Tamanho do menu", "menuRadius", 150, 600, 10, "px"),
      slider("Densidade dos ícones", "iconSize", 30, 100, 2, "px"),
      slider("Espaçamento", "appSpacing", 0, 40, 2, "px"),
      slider("Escurecimento", "backdropOpacity", 0, 1, 0.05, ""),
    );
  } else if (tab === "hud") {
    h1.textContent = "Elementos HUD";
    p.textContent = "Relógio no topo da roda, no mesmo lugar do Rovyl.";
    rows.append(toggle("Relógio", "Pill no topo ao centro enquanto a roda está aberta.", "showClock"));
  } else {
    h1.textContent = "Perfil";
    p.textContent = "VOR 0.1.1 — com.vitorkloy.vor";
    const theme = document.createElement("div");
    theme.className = "zs-row";
    const copy = document.createElement("div");
    copy.innerHTML = "<b>Tema</b><small>Preto ou branco, os mesmos tokens do Rovyl.</small>";
    const select = document.createElement("select");
    ["black", "white"].forEach((value) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = value === "black" ? "Preto" : "Branco";
      select.append(opt);
    });
    select.value = state.theme;
    select.addEventListener("change", () => {
      state.theme = select.value;
      save();
    });
    theme.append(copy, select);
    rows.append(theme);
  }
  head.append(h1, p);
  page.append(head, rows);
}

nav.addEventListener("click", (ev) => {
  const btn = ev.target.closest("button");
  if (btn) show(btn.dataset.tab);
});

save();
show("workspaces");
