/**
 * MAPA DE FÓRMULAS: ./FORMULAS.md
 * Tema visual, sem fórmulas de indicadores.
 */
(() => {
    const STORAGE_KEY = "bi-zootecnico-theme";

    // O painel utiliza somente o tema claro, independentemente do navegador.
    function temaInicial() { return "light"; }

    function aplicarTema(tema) {
        tema = "light";
        document.documentElement.dataset.theme = tema;

        document
            .querySelectorAll("[data-theme-icon]")
            .forEach(el => {
                el.textContent =
                    tema === "dark"
                        ? "☀"
                        : "☾";
            });

        document.dispatchEvent(
            new CustomEvent(
                "dashboard:theme-changed",
                { detail: { theme: tema } }
            )
        );
    }

    window.ThemeManager = {
        get() {
            return document.documentElement.dataset.theme || temaInicial();
        },

        toggle() { aplicarTema("light"); },

        init() {
            aplicarTema(temaInicial());

            document.addEventListener(
                "click",
                event => {
                    const button =
                        event.target.closest(
                            "[data-theme-toggle]"
                        );

                    if (button) {
                        this.toggle();
                    }
                }
            );
        }
    };

    ThemeManager.init();
})();
