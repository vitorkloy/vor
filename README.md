# VOR

VOR é o Visual Operations Router. Roda sob o cursor. Botão do meio lança. Arraste + Shift/Ctrl/Alt age no arquivo. Visual herdado do Rovyl. Núcleo Tauri. Marco 1 só tem a roda de lançar.

A linguagem visual (layout, tipo, cor, movimento, setores) vem do Rovyl. A base é Tauri v2, a mesma família do ShiftDrop. A Microsoft Store do Rovyl original não entra neste binário. O identificador é `com.vitorkloy.vor`.

Licença deste código: GPL-3.0-or-later.

## Como correr no Windows

Precisa de Windows 10 ou 11, [Node 20+](https://nodejs.org/) e [Rust](https://www.rust-lang.org/) com o alvo MSVC. O WebView2 já vem no Windows 11.

```bash
git clone https://github.com/vitorkloy/vor
cd vor
npm install
npm run dev
```

A app fica na bandeja. **Abrir roda** mostra o menu no cursor. O botão do meio do rato faz o mesmo em qualquer janela: segura, aponta, solta. `Escape` ou o centro fecham sem lançar.

`npm run build` gera o instalador em `src-tauri/target/release/bundle/`.

## O que este marco inclui

1. Tauri v2, ícone de bandeja (abrir / sair) e janela transparente, sem moldura, sempre por cima, fora da barra de tarefas, posicionada no cursor.
2. Uma roda de lançamento e um workspace (`Principal`). No Windows a lista vem dos atalhos `.lnk` do Menu Iniciar (no máximo oito, sem desinstaladores). Se essa pasta não render nada, entram seis programas de exemplo — há um `TODO` em `src-tauri/src/launch.rs`.
3. Gancho global `WH_MOUSE_LL` no botão do meio e `GetCursorPos` para centrar a janela e apontar o setor. Código em `src-tauri/src/trigger.rs`, compilado só com `cfg(windows)`.

Ainda não devolvemos um clique curto do meio à janela que estava por baixo. Enquanto o gancho engole o botão, o clique do meio deixa de fechar separadores ou fazer autoscroll.

## Próximas rodas

`src-tauri/src/wheels.rs` reserva os nomes `convert`, `tools` e `actions`. O arraste com Shift, Ctrl ou Alt, e essas rodas, vêm do ShiftDrop no marco seguinte. Este marco não as porta.

## O que não corre nesta máquina de desenvolvimento Linux

`npm install` e `cargo check` no alvo Linux passam (Rust 1.90, ver `rust-toolchain.toml`; no Linux o Tauri também precisa de GTK 3 e WebKit2GTK 4.1). O gancho do rato, `GetCursorPos`, a leitura do Menu Iniciar e `cmd /C start` estão em `cfg(windows)` e não entram nesse binário.

Nesta VM, `cargo check --target x86_64-pc-windows-msvc` para no `tauri-winres`: falta o `llvm-rc`. O código Win32 fica por compilar num Windows com o alvo MSVC. `npm run dev` abre a janela e também fica para esse PC.
