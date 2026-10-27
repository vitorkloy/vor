//! Posição do cursor e gatilho global do botão do meio.
//!
//! A implementação Win32 (`GetCursorPos` + `WH_MOUSE_LL`) só compila
//! em Windows. Neste marco o botão do meio abre a roda sob o cursor e,
//! ao soltar, a interface confirma o setor apontado. Um clique curto
//! ainda não é reinjetado na janela de baixo — o Rovyl original faz
//! isso para não roubar o autoscroll; fica para o marco do gesto completo.

use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, WebviewWindow};

#[derive(Clone, Copy)]
#[cfg_attr(not(windows), allow(dead_code))]
enum Phase {
    Down,
    Up,
}

pub fn show_at_cursor(app: &AppHandle) {
    let (x, y) = cursor_pos();
    place(app, x, y, true);
}

pub fn spawn(app: AppHandle) {
    #[cfg(windows)]
    {
        std::thread::spawn(move || win::run(app));
    }
    #[cfg(not(windows))]
    {
        let _ = app;
    }
}

fn place(app: &AppHandle, x: i32, y: i32, focus: bool) {
    let Some(win) = app.get_webview_window("radial") else {
        return;
    };
    let size = win.outer_size().unwrap_or(tauri::PhysicalSize::new(440, 440));
    let left = x - size.width as i32 / 2;
    let top = y - size.height as i32 / 2;
    let _ = win.set_position(PhysicalPosition::new(left, top));
    let _ = win.show();
    if focus {
        let _ = win.set_focus();
    }
    let _ = win.set_always_on_top(true);
    let _ = app.emit(
        "wheel-anchor",
        serde_json::json!({
            "cursorX": x,
            "cursorY": y,
            "originX": left,
            "originY": top,
            "width": size.width,
            "height": size.height,
        }),
    );
}

#[cfg_attr(not(windows), allow(dead_code))]
fn emit_phase(app: &AppHandle, phase: Phase, x: i32, y: i32) {
    let name = match phase {
        Phase::Down => "trigger-down",
        Phase::Up => "trigger-up",
    };
    let _ = app.emit(name, serde_json::json!({ "x": x, "y": y }));
}

/// Fora do Windows não há `GetCursorPos`. A bandeja ainda abre a janela
/// num ponto fixo para o comando existir.
#[cfg(not(windows))]
fn cursor_pos() -> (i32, i32) {
    (480, 320)
}

#[cfg(windows)]
fn cursor_pos() -> (i32, i32) {
    win::cursor_pos()
}

#[cfg(windows)]
mod win {
    use super::{emit_phase, place, AppHandle, Phase};
    use tauri::Emitter;
    use std::sync::mpsc::{self, Receiver, Sender};
    use std::time::Duration;
    use windows_sys::Win32::Foundation::{LPARAM, LRESULT, POINT, WPARAM};
    use windows_sys::Win32::System::LibraryLoader::GetModuleHandleW;
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        CallNextHookEx, DispatchMessageW, GetCursorPos, GetMessageW, SetWindowsHookExW,
        TranslateMessage, UnhookWindowsHookEx, MSLLHOOKSTRUCT, MSG, WH_MOUSE_LL, WM_MBUTTONDOWN,
        WM_MBUTTONUP,
    };

    enum Msg {
        Down(i32, i32),
        Up(i32, i32),
    }

    static TX: std::sync::OnceLock<Sender<Msg>> = std::sync::OnceLock::new();

    pub fn cursor_pos() -> (i32, i32) {
        let mut p = POINT { x: 0, y: 0 };
        unsafe { GetCursorPos(&mut p) };
        (p.x, p.y)
    }

    pub fn run(app: AppHandle) {
        let (tx, rx) = mpsc::channel::<Msg>();
        let _ = TX.set(tx);
        let app_loop = app.clone();
        std::thread::spawn(move || pump(app_loop, rx));
        unsafe {
            let hook = SetWindowsHookExW(WH_MOUSE_LL, Some(mouse), GetModuleHandleW(std::ptr::null()), 0);
            if hook.is_null() {
                return;
            }
            let mut msg: MSG = std::mem::zeroed();
            while GetMessageW(&mut msg, std::ptr::null_mut(), 0, 0) > 0 {
                TranslateMessage(&msg);
                DispatchMessageW(&msg);
            }
            UnhookWindowsHookEx(hook);
        }
    }

    fn pump(app: AppHandle, rx: Receiver<Msg>) {
        while let Ok(msg) = rx.recv() {
            let Msg::Down(x, y) = msg else { continue };
            place(&app, x, y, false);
            emit_phase(&app, Phase::Down, x, y);
            loop {
                match rx.recv_timeout(Duration::from_millis(16)) {
                    Ok(Msg::Up(ux, uy)) => {
                        emit_phase(&app, Phase::Up, ux, uy);
                        break;
                    }
                    Ok(Msg::Down(nx, ny)) => {
                        place(&app, nx, ny, false);
                        emit_phase(&app, Phase::Down, nx, ny);
                    }
                    Err(mpsc::RecvTimeoutError::Timeout) => {
                        let (cx, cy) = cursor_pos();
                        let _ = app.emit("cursor-move", serde_json::json!({ "x": cx, "y": cy }));
                    }
                    Err(mpsc::RecvTimeoutError::Disconnected) => return,
                }
            }
        }
    }

    unsafe extern "system" fn mouse(code: i32, wp: WPARAM, lp: LPARAM) -> LRESULT {
        if code >= 0 {
            let info = &*(lp as *const MSLLHOOKSTRUCT);
            let tx = TX.get();
            match wp as u32 {
                WM_MBUTTONDOWN => {
                    if let Some(tx) = tx {
                        let _ = tx.send(Msg::Down(info.pt.x, info.pt.y));
                    }
                    return 1;
                }
                WM_MBUTTONUP => {
                    if let Some(tx) = tx {
                        let _ = tx.send(Msg::Up(info.pt.x, info.pt.y));
                    }
                    return 1;
                }
                _ => {}
            }
        }
        CallNextHookEx(std::ptr::null_mut(), code, wp, lp)
    }
}

pub fn hide(win: &WebviewWindow) {
    let _ = win.hide();
}
