//! Bandeja mínima: abrir a roda e sair. Sem conversão, sem atualizador.
use crate::trigger;
use tauri::menu::{Menu, MenuItem};
use tauri::Manager;
use tauri::tray::TrayIconBuilder;

pub fn build(app: &tauri::App) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Abrir roda", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "Configuração", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Sair", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &settings, &quit])?;

    let mut builder = TrayIconBuilder::with_id("main")
        .tooltip("VOR")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => app.exit(0),
            "show" => trigger::show_at_cursor(app),
            "settings" => {
                if let Some(win) = app.get_webview_window("settings") {
                    let _ = win.show();
                    let _ = win.unminimize();
                    let _ = win.set_focus();
                }
            }
            _ => {}
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;
    Ok(())
}
