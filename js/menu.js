
"use strict";

/* ==========================================================
   SAFEMARKET — MENU ADMINISTRATIVO CENTRALIZADO

   RESPONSABILIDADES:
   - Padronizar o menu em todas as páginas administrativas.
   - Manter as oito opções na ordem oficial.
   - Evitar diferenças entre os HTMLs.
   - Identificar automaticamente a página ativa.
   - Permitir recolher e expandir o menu.
   - Salvar o estado do menu entre navegações.
   - Garantir o carregamento do CSS da navegação.
========================================================== */

document.addEventListener("DOMContentLoaded", inicializarMenu);

function inicializarMenu() {

    const PAGINAS = [
        {
            arquivo: "dashboard.html",
            nome: "Dashboard",
            icone: "layout-dashboard"
        },
        {
            arquivo: "usuarios.html",
            nome: "Usuários",
            icone: "users"
        },
        {
            arquivo: "anuncios.html",
            nome: "Gerenciamento de anúncios",
            icone: "package"
        },
        {
            arquivo: "auditoria.html",
            nome: "Auditoria e Logs",
            icone: "clipboard-list"
        },
        {
            arquivo: "monitoramento.html",
            nome: "Monitoramento",
            icone: "activity"
        },
        {
            arquivo: "alertas.html",
            nome: "Alertas",
            icone: "shield-alert"
        },
        {
            arquivo: "pericia.html",
            nome: "Perícia Digital",
            icone: "search"
        },
        {
            arquivo: "configuracoes.html",
            nome: "Configurações",
            icone: "settings"
        }
    ];

    const CHAVE_MENU = "safemarket_menu_recolhido";

    /* ======================================================
       1. GARANTIR CARREGAMENTO DO CSS
    ====================================================== */

    function garantirCSS() {

        const cssExistente = Array.from(
            document.querySelectorAll('link[rel="stylesheet"]')
        ).some(link => link.href.includes("/css/menu.css"));

        if (!cssExistente) {

            const link = document.createElement("link");

            link.rel = "stylesheet";
            link.href = "../css/menu.css";

            document.head.appendChild(link);
        }
    }

    garantirCSS();

    /* ======================================================
       2. LOCALIZAR OU CRIAR A SIDEBAR
    ====================================================== */

    let menuLateral = document.querySelector(
        "#menu-lateral, aside.menu-lateral, .menu-lateral"
    );

    if (!menuLateral) {

        menuLateral = document.createElement("aside");

        document.body.prepend(menuLateral);
    }

    menuLateral.id = "menu-lateral";
    menuLateral.className = "menu-lateral";

    /* ======================================================
       3. IDENTIFICAR A PÁGINA ATUAL
    ====================================================== */

    const caminhoAtual = window.location.pathname;

    const paginaAtual = caminhoAtual
        .split("/")
        .pop()
        .toLowerCase();

    /* ======================================================
       4. CONSTRUIR A NAVEGAÇÃO PADRONIZADA
    ====================================================== */

    const links = PAGINAS.map(pagina => {

        const ativa = pagina.arquivo === paginaAtual;

        return `
            <a
                href="${pagina.arquivo}"
                title="${pagina.nome}"
                ${ativa ? 'class="ativo" aria-current="page"' : ""}
            >
                <i
                    data-lucide="${pagina.icone}"
                    aria-hidden="true">
                </i>

                <span>${pagina.nome}</span>
            </a>
        `;

    }).join("");

    /* ======================================================
       5. MONTAR A SIDEBAR
    ====================================================== */

    menuLateral.innerHTML = `

        <div class="menu-topo">

            <h2 class="logo-menu">
                SafeMarket
            </h2>

            <button
                type="button"
                class="botao-menu"
                id="alternar-menu"
                aria-label="Recolher menu"
                aria-expanded="true"
                aria-controls="menu-navegacao"
                title="Recolher menu">

                <i
                    data-lucide="panel-left-close"
                    aria-hidden="true">
                </i>

            </button>

        </div>

        <nav
            id="menu-navegacao"
            aria-label="Menu administrativo">

            ${links}

        </nav>

    `;

    const navegacao = menuLateral.querySelector(
        "#menu-navegacao"
    );

    const botaoMenu = menuLateral.querySelector(
        "#alternar-menu"
    );

    /* ======================================================
       6. ATUALIZAR ÍCONES
    ====================================================== */

    function atualizarIcones() {

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    atualizarIcones();

    /* ======================================================
       7. CONTROLAR RECOLHIMENTO
    ====================================================== */

    function atualizarMenu(recolhido) {

        document.body.classList.toggle(
            "menu-recolhido",
            recolhido
        );

        botaoMenu.setAttribute(
            "aria-expanded",
            String(!recolhido)
        );

        const descricao = recolhido
            ? "Expandir menu"
            : "Recolher menu";

        botaoMenu.setAttribute(
            "aria-label",
            descricao
        );

        botaoMenu.setAttribute(
            "title",
            descricao
        );

        const icone = botaoMenu.querySelector("i");

        if (icone) {

            icone.setAttribute(
                "data-lucide",
                recolhido
                    ? "panel-left-open"
                    : "panel-left-close"
            );

            atualizarIcones();
        }

        try {

            localStorage.setItem(
                CHAVE_MENU,
                String(recolhido)
            );

        } catch (erro) {

            console.warn(
                "SafeMarket: não foi possível salvar o estado do menu.",
                erro
            );
        }
    }

    /* ======================================================
       8. RECUPERAR ESTADO ANTERIOR
    ====================================================== */

    let menuRecolhido = false;

    try {

        menuRecolhido =
            localStorage.getItem(CHAVE_MENU) === "true";

    } catch (erro) {

        console.warn(
            "SafeMarket: não foi possível recuperar o estado do menu.",
            erro
        );
    }

    atualizarMenu(menuRecolhido);

    /* ======================================================
       9. EVENTO DO BOTÃO
    ====================================================== */

    botaoMenu.addEventListener("click", () => {

        const recolhido =
            document.body.classList.contains("menu-recolhido");

        atualizarMenu(!recolhido);
    });

    /* ======================================================
       10. VERIFICAÇÃO FINAL
    ====================================================== */

    const quantidadeLinks =
        navegacao.querySelectorAll(":scope > a").length;

    if (quantidadeLinks !== 8) {

        console.error(
            "SafeMarket: quantidade incorreta de opções no menu.",
            quantidadeLinks
        );

    } else {

        console.info(
            "SafeMarket: menu administrativo carregado corretamente.",
            {
                pagina: paginaAtual,
                opcoes: quantidadeLinks
            }
        );
    }

}
