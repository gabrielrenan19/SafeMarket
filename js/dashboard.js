
/* ==========================================================
   SAFEMARKET — DASHBOARD ADMINISTRATIVO
   Arquivo: js/dashboard.js

   INTEGRAÇÕES:
   - api.js
   - GestaoController.java
   - ProdutoController.java

   FUNCIONALIDADES:
   - Indicadores administrativos
   - Contagem real de usuários cadastrados
   - Contagem de anúncios
   - Contas ativas
   - Logins malsucedidos
   - Alertas de segurança
   - Registros de auditoria
   - Atividades recentes
   - Status dos serviços
   - Tratamento de erros
   - Renderização segura com textContent
========================================================== */

(() => {
    "use strict";

    // ==================================================
    // 1. CONFIGURAÇÕES
    // ==================================================

    const CONFIG = {
        endpoints: {
            dashboard: "/admin/dashboard",
            usuarios: "/admin/usuarios",
            produtos: "/produtos"
        },

        mensagens: {
            carregando: "Carregando informações...",
            sucesso: "Dashboard atualizado com sucesso.",
            parcial: "Algumas informações não puderam ser carregadas.",
            erro: "Não foi possível carregar os dados do dashboard.",
            semAtividades: "Nenhuma atividade registrada."
        }
    };


    // ==================================================
    // 2. IDENTIFICAR ELEMENTOS HTML
    // ==================================================

    const elementos = {
        totalUsuarios:
            document.getElementById("total-usuarios"),

        totalAnuncios:
            document.getElementById("total-anuncios"),

        usuariosAtivos:
            document.getElementById("usuarios-conectados"),

        totalLoginsFalhos:
            document.getElementById("total-logins-falhos"),

        totalAlertas:
            document.getElementById("total-alertas"),

        estadoAlertas:
            document.getElementById("estado-alertas"),

        totalAuditorias:
            document.getElementById("total-auditorias"),

        listaAtividades:
            document.getElementById("lista-atividades"),

        mensagem:
            document.getElementById("mensagem-dashboard"),

        statusServidor:
            document.getElementById("status-sistema-operacional"),

        statusBanco:
            document.getElementById("status-banco-dados"),

        statusMonitoramento:
            document.getElementById("status-monitoramento")
    };


    // ==================================================
    // 3. VERIFICAR DISPONIBILIDADE DA API
    // ==================================================

    function verificarAPI() {

        if (typeof window.requisicaoAPI !== "function") {

            throw new Error(
                "O módulo api.js não foi carregado corretamente."
            );

        }

    }


    // ==================================================
    // 4. FORMATAR NÚMEROS
    // ==================================================

    function formatarNumero(valor) {

        if (
            valor === null ||
            valor === undefined ||
            valor === ""
        ) {
            return "N/D";
        }

        const numero = Number(valor);

        if (!Number.isFinite(numero)) {
            return "N/D";
        }

        return new Intl.NumberFormat("pt-BR").format(numero);

    }


    // ==================================================
    // 5. ATUALIZAR TEXTO DOS ELEMENTOS
    // ==================================================

    function atualizarTexto(elemento, valor) {

        if (!elemento) {
            return;
        }

        elemento.textContent = String(valor);

    }


    // ==================================================
    // 6. EXIBIR MENSAGENS
    // ==================================================

    function exibirMensagem(texto, tipo = "info") {

        if (!elementos.mensagem) {
            return;
        }

        elementos.mensagem.textContent = texto;

        elementos.mensagem.dataset.tipo = tipo;

    }


    // ==================================================
    // 7. NORMALIZAR LISTAS DA API
    // ==================================================

    function extrairLista(resposta) {

        if (Array.isArray(resposta)) {
            return resposta;
        }

        if (!resposta || typeof resposta !== "object") {
            return [];
        }

        const propriedades = [
            "content",
            "usuarios",
            "produtos",
            "data",
            "items"
        ];

        for (const propriedade of propriedades) {

            if (Array.isArray(resposta[propriedade])) {
                return resposta[propriedade];
            }

        }

        return [];

    }


    // ==================================================
    // 8. OBTER TOTAL DE REGISTROS
    // ==================================================

    function obterTotalRegistros(resposta) {

        if (Array.isArray(resposta)) {
            return resposta.length;
        }

        if (!resposta || typeof resposta !== "object") {
            return null;
        }

        const totalizadores = [
            "totalElements",
            "total",
            "totalRegistros",
            "quantidade"
        ];

        for (const propriedade of totalizadores) {

            const valor = resposta[propriedade];

            if (
                valor !== undefined &&
                valor !== null &&
                Number.isFinite(Number(valor))
            ) {
                return Number(valor);
            }

        }

        return extrairLista(resposta).length;

    }


    // ==================================================
    // 9. CARREGAR TOTAL DE USUÁRIOS
    // ==================================================

    async function carregarUsuarios() {

        const resposta = await window.requisicaoAPI(
            CONFIG.endpoints.usuarios
        );

        const total = obterTotalRegistros(resposta);

        if (total === null) {

            throw new Error(
                "Formato de resposta dos usuários inválido."
            );

        }

        atualizarTexto(
            elementos.totalUsuarios,
            formatarNumero(total)
        );

        return total;

    }


    // ==================================================
    // 10. CARREGAR TOTAL DE ANÚNCIOS
    // ==================================================

    async function carregarAnuncios() {

        const resposta = await window.requisicaoAPI(
            CONFIG.endpoints.produtos
        );

        const total = obterTotalRegistros(resposta);

        if (total === null) {

            throw new Error(
                "Formato de resposta dos produtos inválido."
            );

        }

        atualizarTexto(
            elementos.totalAnuncios,
            formatarNumero(total)
        );

        return total;

    }


    // ==================================================
    // 11. ATUALIZAR INDICADORES DO DASHBOARD
    // ==================================================

    function atualizarIndicadores(dados) {

        if (!dados || typeof dados !== "object") {

            throw new Error(
                "O servidor retornou dados inválidos para o dashboard."
            );

        }


        // ----------------------------------------------
        // CONTAS ATIVAS
        // ----------------------------------------------

        atualizarTexto(
            elementos.usuariosAtivos,
            formatarNumero(dados.usuariosAtivos)
        );


        // ----------------------------------------------
        // LOGINS MALSUCEDIDOS
        // ----------------------------------------------

        atualizarTexto(
            elementos.totalLoginsFalhos,
            formatarNumero(dados.totalLoginsFalhos)
        );


        // ----------------------------------------------
        // ALERTAS DE SEGURANÇA
        // ----------------------------------------------

        atualizarTexto(
            elementos.totalAlertas,
            formatarNumero(dados.totalAlertas)
        );

        atualizarTexto(
            elementos.estadoAlertas,
            "Contas bloqueadas"
        );


        // ----------------------------------------------
        // AUDITORIAS
        // ----------------------------------------------

        atualizarTexto(
            elementos.totalAuditorias,
            formatarNumero(dados.totalAuditorias)
        );


        // ----------------------------------------------
        // STATUS DO SISTEMA
        // ----------------------------------------------

        const status = dados.status || {};

        atualizarTexto(
            elementos.statusServidor,
            status.sistemaOperacional || "Não informado"
        );

        atualizarTexto(
            elementos.statusBanco,
            status.bancoDados || "Não informado"
        );

        atualizarTexto(
            elementos.statusMonitoramento,
            status.monitoramento || "Não informado"
        );


        // ----------------------------------------------
        // ATIVIDADES
        // ----------------------------------------------

        renderizarAtividades(dados.atividades);

    }


    // ==================================================
    // 12. FORMATAR DATA DAS ATIVIDADES
    // ==================================================

    function formatarData(valor) {

        if (!valor) {
            return "Data não informada";
        }

        const data = new Date(valor);

        if (Number.isNaN(data.getTime())) {
            return String(valor);
        }

        return new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short"
        }).format(data);

    }


    // ==================================================
    // 13. RENDERIZAR ATIVIDADES RECENTES
    // ==================================================

    function renderizarAtividades(atividades) {

        const lista = elementos.listaAtividades;

        if (!lista) {
            return;
        }

        lista.replaceChildren();

        if (!Array.isArray(atividades) || atividades.length === 0) {

            const mensagem = document.createElement("p");

            mensagem.textContent =
                CONFIG.mensagens.semAtividades;

            lista.appendChild(mensagem);

            return;

        }

        const fragmento = document.createDocumentFragment();

        atividades.forEach((atividade) => {

            const item = document.createElement("div");

            item.className = "atividade";


            // ------------------------------------------
            // DESCRIÇÃO
            // ------------------------------------------

            const descricao = document.createElement("p");

            descricao.className = "descricao-atividade";

            descricao.textContent =
                atividade.descricao ||
                atividade.acao ||
                "Atividade registrada";


            // ------------------------------------------
            // DATA
            // ------------------------------------------

            const data = document.createElement("span");

            data.className = "data-atividade";

            data.textContent = formatarData(
                atividade.data || atividade.criadoEm
            );


            // ------------------------------------------
            // MONTAR ITEM
            // ------------------------------------------

            item.append(
                descricao,
                data
            );

            fragmento.appendChild(item);

        });

        lista.appendChild(fragmento);

    }


    // ==================================================
    // 14. PROCESSAR REQUISIÇÕES INDEPENDENTES
    // ==================================================

    async function executarRequisicao(
        funcao,
        identificacao
    ) {

        try {

            return await funcao();

        } catch (erro) {

            console.error(
                `SafeMarket: erro ao carregar ${identificacao}:`,
                erro
            );

            return null;

        }

    }


    // ==================================================
    // 15. CARREGAR DASHBOARD COMPLETO
    // ==================================================

    async function carregarDashboard() {

        try {

            verificarAPI();

            exibirMensagem(
                CONFIG.mensagens.carregando,
                "info"
            );


            // ------------------------------------------
            // ESTADO INICIAL DOS INDICADORES
            // ------------------------------------------

            atualizarTexto(elementos.totalUsuarios, "—");

            atualizarTexto(elementos.totalAnuncios, "—");

            atualizarTexto(elementos.usuariosAtivos, "—");

            atualizarTexto(elementos.totalLoginsFalhos, "—");

            atualizarTexto(elementos.totalAlertas, "—");

            atualizarTexto(elementos.totalAuditorias, "—");


            // ------------------------------------------
            // CONSULTAS À API
            // ------------------------------------------

            const resultados = await Promise.allSettled([

                window.requisicaoAPI(
                    CONFIG.endpoints.dashboard
                ),

                carregarUsuarios(),

                carregarAnuncios()

            ]);


            // ------------------------------------------
            // PROCESSAR DASHBOARD
            // ------------------------------------------

            const resultadoDashboard = resultados[0];

            let dashboardCarregado = false;

            if (resultadoDashboard.status === "fulfilled") {

                atualizarIndicadores(
                    resultadoDashboard.value
                );

                dashboardCarregado = true;

            } else {

                console.error(
                    "SafeMarket: falha ao carregar dashboard:",
                    resultadoDashboard.reason
                );

            }


            // ------------------------------------------
            // IDENTIFICAR RESULTADOS PARCIAIS
            // ------------------------------------------

            const falhas = resultados.filter(
                resultado => resultado.status === "rejected"
            );

            if (falhas.length > 0) {

                exibirMensagem(
                    CONFIG.mensagens.parcial,
                    "warning"
                );

                return;

            }


            // ------------------------------------------
            // RESULTADO FINAL
            // ------------------------------------------

            if (dashboardCarregado) {

                exibirMensagem(
                    CONFIG.mensagens.sucesso,
                    "success"
                );

            }

        } catch (erro) {

            console.error(
                "SafeMarket: erro geral no dashboard:",
                erro
            );

            exibirMensagem(
                erro.message || CONFIG.mensagens.erro,
                "error"
            );

        }

    }


    // ==================================================
    // 16. DISPONIBILIZAR FUNCIONALIDADES
    // ==================================================

    window.dashboardSafeMarket = {

        carregarDashboard,

        carregarUsuarios,

        carregarAnuncios,

        atualizarIndicadores,

        renderizarAtividades

    };


    // ==================================================
    // 17. INICIALIZAR DASHBOARD
    // ==================================================

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            carregarDashboard,
            { once: true }
        );

    } else {

        carregarDashboard();

    }


    // ==================================================
    // 18. CONFIRMAÇÃO
    // ==================================================

    console.log(
        "SafeMarket: dashboard administrativo inicializado."
    );

})();
