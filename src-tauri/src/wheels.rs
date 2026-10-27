//! Fronteira das rodas que ainda não entram neste binário.
//!
//! O marco 1 só desenha a roda de lançamento (`Launch`). As rodas
//! `convert`, `tools` e `actions` continuam no ShiftDrop e serão
//! trazidas num marco seguinte, atrás deste módulo — sem misturar
//! a descoberta do Menu Iniciar com conversão de arquivos.

/// Roda que este processo sabe mostrar hoje.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ActiveWheel {
    Launch,
}

/// Nomes reservados. Não há implementação aqui de propósito.
#[allow(dead_code)]
pub mod reserved {
    pub const CONVERT: &str = "convert";
    pub const TOOLS: &str = "tools";
    pub const ACTIONS: &str = "actions";
}

pub fn active() -> ActiveWheel {
    ActiveWheel::Launch
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn marco_um_so_tem_lancamento() {
        assert_eq!(active(), ActiveWheel::Launch);
        assert_eq!(
            [reserved::CONVERT, reserved::TOOLS, reserved::ACTIONS],
            ["convert", "tools", "actions"]
        );
    }
}
