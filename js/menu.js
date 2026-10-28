
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const botaoMenu = document.getElementById("alternar-menu");

    if (!botaoMenu) {
        return;
    }

    const iconeMenu = botaoMenu.querySelector("i");

    function atualizarMenu(recolhido) {
        document.body.classList.toggle("menu-recolhido", recolhido);

        botaoMenu.setAttribute("aria-expanded", String(!recolhido));
        botaoMenu.setAttribute(
            "aria-label",
            recolhido ? "Expandir menu" : "Recolher menu"
        );
        botaoMenu.setAttribute(
            "title",
            recolhido ? "Expandir menu" : "Recolher menu"
        );

        if (iconeMenu) {
            iconeMenu.setAttribute(
                "data-lucide",
                recolhido ? "panel-left-open" : "panel-left-close"
            );
        }

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    botaoMenu.addEventListener("click", () => {
        const recolhido = !document.body.classList.contains("menu-recolhido");
        atualizarMenu(recolhido);
    });

    atualizarMenu(false);
});
