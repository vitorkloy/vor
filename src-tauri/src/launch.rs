//! Itens da única roda de lançamento e do único workspace ("Principal").
//!
//! No Windows, preferimos atalhos `.lnk` do Menu Iniciar (poucos, sem
//! resolver o alvo do atalho). Se a pasta não existir ou vier vazia,
//! caímos em amostras fixas — ver `TODO` em `samples`.

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct LaunchItem {
    pub id: String,
    pub label: String,
    pub command: String,
    /// `start-menu` ou `sample`.
    pub source: String,
}

const WORKSPACE: &str = "Principal";

pub fn workspace_name() -> &'static str {
    WORKSPACE
}

pub fn items() -> Vec<LaunchItem> {
    #[cfg(windows)]
    {
        let found = start_menu_shortcuts(8);
        if !found.is_empty() {
            return found;
        }
    }
    samples()
}

/// TODO: quando a descoberta do Menu Iniciar falhar, trocar estas
/// amostras por uma lista configurável. Não são a roda definitiva.
fn samples() -> Vec<LaunchItem> {
    const ROWS: &[(&str, &str, &str)] = &[
        ("notepad", "Bloco de notas", "notepad.exe"),
        ("explorer", "Arquivos", "explorer.exe"),
        ("calc", "Calculadora", "calc.exe"),
        ("paint", "Paint", "mspaint.exe"),
        ("cmd", "Prompt", "cmd.exe"),
        ("settings", "Configurações", "ms-settings:"),
    ];
    ROWS.iter()
        .map(|(id, label, command)| LaunchItem {
            id: (*id).to_string(),
            label: (*label).to_string(),
            command: (*command).to_string(),
            source: "sample".into(),
        })
        .collect()
}

#[cfg(windows)]
fn start_menu_shortcuts(limit: usize) -> Vec<LaunchItem> {
    let mut roots = Vec::new();
    if let Some(dir) = std::env::var_os("ProgramData") {
        roots.push(std::path::PathBuf::from(dir).join(r"Microsoft\Windows\Start Menu\Programs"));
    }
    if let Some(dir) = std::env::var_os("APPDATA") {
        roots.push(std::path::PathBuf::from(dir).join(r"Microsoft\Windows\Start Menu\Programs"));
    }
    let mut out = Vec::new();
    for root in roots {
        walk_lnk(&root, limit, &mut out);
        if out.len() >= limit {
            break;
        }
    }
    out.truncate(limit);
    out
}

#[cfg(windows)]
fn walk_lnk(dir: &std::path::Path, limit: usize, out: &mut Vec<LaunchItem>) {
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    let mut dirs = Vec::new();
    for entry in entries.flatten() {
        if out.len() >= limit {
            return;
        }
        let path = entry.path();
        if path.is_dir() {
            dirs.push(path);
            continue;
        }
        let name = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
        if !name.to_ascii_lowercase().ends_with(".lnk") {
            continue;
        }
        let lower = name.to_ascii_lowercase();
        if lower.contains("uninstall") || lower.contains("desinstalar") {
            continue;
        }
        let label = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("App")
            .to_string();
        let command = path.display().to_string();
        let id = format!("lnk-{}", out.len());
        out.push(LaunchItem {
            id,
            label,
            command,
            source: "start-menu".into(),
        });
    }
    for dir in dirs {
        if out.len() >= limit {
            return;
        }
        walk_lnk(&dir, limit, out);
    }
}

pub fn open(id: &str) -> Result<String, String> {
    let item = items()
        .into_iter()
        .find(|i| i.id == id)
        .ok_or_else(|| format!("item desconhecido: {id}"))?;
    #[cfg(windows)]
    {
        // `start` abre .lnk, executáveis e URIs (ms-settings:) sem resolver o atalho.
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &item.command])
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(item.label)
    }
    #[cfg(not(windows))]
    {
        let _ = item;
        Err("abrir um item exige Windows (Shell via cmd /C start)".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn amostras_tem_um_workspace_e_varios_setores() {
        assert_eq!(workspace_name(), "Principal");
        let items = samples();
        assert!(items.len() >= 4);
        assert!(items.iter().all(|i| i.source == "sample"));
    }
}
