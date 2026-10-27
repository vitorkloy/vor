const pages = {
  workspaces: {
    title: "Atalhos e Espaços",
    lead: "O espaço Principal é a roda de lançamento. Os atalhos vêm do Menu Iniciar, como no Rovyl.",
    rows: [
      ["Principal", "Espaço mostrado no centro da roda."],
      ["Atalhos", "Até oito atalhos do Menu Iniciar, sem desinstaladores."],
    ],
  },
  interface: {
    title: "Interface",
    lead: "O botão do meio abre a roda sob o cursor. Escape ou o centro fecham sem lançar.",
    rows: [
      ["Gesto", "Segurar o botão do meio, apontar o setor e soltar."],
      ["Centro", "Clique no hub fecha a roda."],
    ],
  },
  visuals: {
    title: "Visual",
    lead: "Mesma linguagem do Rovyl: tile opaco de 18px, hub circular e pill de contexto.",
    rows: [
      ["Tile", "Fundo rgb(12, 12, 12). O setor apontado fica branco."],
      ["Hub", "Disco escuro com o anel em SVG e a marca no centro."],
    ],
  },
  hud: {
    title: "Elementos HUD",
    lead: "A pill debaixo da roda identifica o VOR e o espaço atual.",
    rows: [
      ["Pill", "VOR / Principal, fundo rgba(4, 5, 7, 0.92)."],
      ["Rótulo", "Nome do setor apontado, por baixo do hub."],
    ],
  },
  profile: {
    title: "Perfil",
    lead: "Identidade do produto nesta máquina.",
    rows: [
      ["Produto", "VOR 0.1.1 — Visual Operations Router."],
      ["Identificador", "com.vitorkloy.vor"],
    ],
  },
};

const page = document.getElementById("page");
const nav = document.getElementById("nav");

function show(tab) {
  const data = pages[tab];
  nav.querySelectorAll("button").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.tab === tab);
  });
  page.replaceChildren();
  const head = document.createElement("div");
  head.className = "zs-page-head";
  head.innerHTML = `<h1></h1><p></p>`;
  head.querySelector("h1").textContent = data.title;
  head.querySelector("p").textContent = data.lead;
  const rows = document.createElement("div");
  rows.className = "zs-rows";
  data.rows.forEach(([title, copy]) => {
    const row = document.createElement("div");
    row.className = "zs-row";
    const text = document.createElement("div");
    const b = document.createElement("b");
    const small = document.createElement("small");
    b.textContent = title;
    small.textContent = copy;
    text.append(b, small);
    row.append(text);
    rows.append(row);
  });
  page.append(head, rows);
}

nav.addEventListener("click", (ev) => {
  const btn = ev.target.closest("button");
  if (btn) show(btn.dataset.tab);
});

show("workspaces");
