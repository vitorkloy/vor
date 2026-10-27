mod launch;
mod tray;
mod trigger;
mod wheels;

use tauri::Manager;

#[tauri::command]
fn launch_items() -> serde_json::Value {
    serde_json::json!({
        "workspace": launch::workspace_name(),
        "wheel": "launch",
        "items": launch::items(),
    })
}

#[tauri::command]
fn launch_item(id: String) -> Result<String, String> {
    launch::open(&id)
}

#[tauri::command]
fn hide_wheel(app: tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("radial") {
        trigger::hide(&win);
    }
}

#[tauri::command]
fn show_wheel(app: tauri::AppHandle) {
    trigger::show_at_cursor(&app);
}

pub fn run() {
    let _ = wheels::active();
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            launch_items,
            launch_item,
            hide_wheel,
            show_wheel
        ])
        .setup(|app| {
            tray::build(app)?;
            trigger::spawn(app.handle().clone());
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("erro ao iniciar o VOR")
        .run(|_app, event| {
            if let tauri::RunEvent::ExitRequested { api, code, .. } = event {
                if code.is_none() {
                    api.prevent_exit();
                }
            }
        });
}
