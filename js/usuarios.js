
/* =====================================================
   SAFEMARKET — GERENCIAMENTO DE USUÁRIOS
   Arquivo: js/usuarios.js

   RESPONSABILIDADES:
   - Comunicação com a API
   - Carregamento dos usuários
   - Atualização dos indicadores
   - Pesquisa por nome e e-mail
   - Filtro por status
   - Renderização dos usuários
   - Tratamento de erros
===================================================== */

"use strict";


// =====================================================
// 1. ELEMENTOS HTML
// =====================================================

const listaUsuarios = document.getElementById("lista-usuarios");

const mensagemUsuarios = document.getElementById(
    "mensagem-usuarios"
);

const campoBusca = document.getElementById("buscar-usuario");

const filtroStatus = document.getElementById("filtro-status");

const totalUsuarios = document.getElementById("total-usuarios");

const totalAtivos = document.getElementById("total-ativos");

const totalInativos = document.getElementById("total-inativos");


// =====================================================
// 2. VARIÁVEIS
// =====================================================

let usuariosCarregados = [];


// =====================================================
// 3. STATUS PERMITIDOS
// =====================================================

const statusPermitidos = [
    "ativo",
    "inativo",
    "bloqueado",
    "em análise"
];


// =====================================================
// 4. NORMALIZAR STATUS
// =====================================================

function normalizarStatus(status) {

    if (typeof status !== "string") {
        return "não informado";
    }

    const statusNormalizado = status
        .trim()
        .toLowerCase();

    if (statusPermitidos.includes(statusNormalizado)) {
        return statusNormalizado;
    }

    return "não informado";
}


// =====================================================
// 5. NORMALIZAR RESPOSTA DA API
// =====================================================

function normalizarListaUsuarios(resposta) {

    if (Array.isArray(resposta)) {
        return resposta;
    }

    if (resposta && Array.isArray(resposta.usuarios)) {
        return resposta.usuarios;
    }

    if (resposta && Array.isArray(resposta.content)) {
        return resposta.content;
    }

    if (resposta && Array.isArray(resposta.data)) {
        return resposta.data;
    }

    throw new Error(
        "O servidor não retornou uma lista de usuários válida."
    );
}


// =====================================================
// 6. LIMPAR MENSAGENS
// =====================================================

function limparMensagem() {

    if (mensagemUsuarios) {
        mensagemUsuarios.textContent = "";
    }

}


// =====================================================
// 7. ATUALIZAR INDICADORES
// =====================================================

function atualizarIndicadores(usuarios) {

    const total = usuarios.length;

    const ativos = usuarios.filter((usuario) => {

        return normalizarStatus(usuario.status) === "ativo";

    }).length;

    const inativos = usuarios.filter((usuario) => {

        return [
            "inativo",
            "bloqueado"
        ].includes(normalizarStatus(usuario.status));

    }).length;

    if (totalUsuarios) {
        totalUsuarios.textContent = total;
    }

    if (totalAtivos) {
        totalAtivos.textContent = ativos;
    }

    if (totalInativos) {
        totalInativos.textContent = inativos;
    }

}


// =====================================================
// 8. EXIBIR ESTADO DA LISTA
// =====================================================

function exibirEstado(mensagem, icone = "info") {

    if (!listaUsuarios) return;

    const container = document.createElement("div");

    container.className = "estado-vazio";

    const elementoIcone = document.createElement("i");

    elementoIcone.setAttribute("data-lucide", icone);

    const texto = document.createElement("p");

    texto.textContent = mensagem;

    container.appendChild(elementoIcone);
    container.appendChild(texto);

    listaUsuarios.replaceChildren(container);

    atualizarIcones();

}


// =====================================================
// 9. ATUALIZAR ÍCONES
// =====================================================

function atualizarIcones() {

    if (window.lucide) {
        window.lucide.createIcons();
    }

}


// =====================================================
// 10. CRIAR CARD DO USUÁRIO
// =====================================================

function criarCardUsuario(usuario) {

    const card = document.createElement("article");

    card.className = "atividade";

    // Nome

    const nome = document.createElement("p");

    nome.className = "usuario-nome";

    nome.textContent =
        typeof usuario.nome === "string" && usuario.nome.trim()
            ? usuario.nome.trim()
            : "Nome não informado";


    // E-mail

    const email = document.createElement("p");

    email.className = "usuario-email";

    email.textContent =
        typeof usuario.email === "string"
            ? usuario.email
            : "E-mail não informado";


    // Perfil

    const perfil = document.createElement("p");

    perfil.className = "usuario-perfil";

    perfil.textContent =
        typeof usuario.perfil === "string" && usuario.perfil.trim()
            ? usuario.perfil.trim()
            : "Perfil não informado";


    // Status

    const status = document.createElement("span");

    const statusUsuario = normalizarStatus(usuario.status);

    status.textContent = statusUsuario;

    status.className = "status-usuario";

    if (statusUsuario === "ativo") {

        status.classList.add("status-ativo");

    } else if (
        statusUsuario === "inativo" ||
        statusUsuario === "bloqueado"
    ) {

        status.classList.add("status-inativo");

    } else {

        status.classList.add("status-pendente");

    }


    // Montagem

    card.appendChild(nome);
    card.appendChild(email);
    card.appendChild(perfil);
    card.appendChild(status);

    return card;

}


// =====================================================
// 11. RENDERIZAR USUÁRIOS
// =====================================================

function renderizarUsuarios(usuarios) {

    if (!listaUsuarios) return;

    if (usuarios.length === 0) {

        exibirEstado(
            "Nenhum usuário encontrado.",
            "users"
        );

        return;
    }

    const fragmento = document.createDocumentFragment();

    usuarios.forEach((usuario) => {

        if (!usuario || typeof usuario !== "object") {
            return;
        }

        const card = criarCardUsuario(usuario);

        fragmento.appendChild(card);

    });

    if (fragmento.childNodes.length === 0) {

        exibirEstado(
            "Nenhum usuário disponível para consulta.",
            "users"
        );

        return;
    }

    listaUsuarios.replaceChildren(fragmento);

    atualizarIcones();

}


// =====================================================
// 12. PESQUISAR E FILTRAR USUÁRIOS
// =====================================================

function aplicarFiltros() {

    const termoBusca = campoBusca
        ? campoBusca.value.trim().toLowerCase()
        : "";

    const statusSelecionado = filtroStatus
        ? filtroStatus.value
        : "todos";

    const usuariosFiltrados = usuariosCarregados.filter(
        (usuario) => {

            const nome = String(usuario.nome || "")
                .toLowerCase();

            const email = String(usuario.email || "")
                .toLowerCase();

            const status = normalizarStatus(usuario.status);

            const correspondeBusca =
                nome.includes(termoBusca) ||
                email.includes(termoBusca);

            let correspondeStatus = true;

            if (statusSelecionado === "ativo") {

                correspondeStatus = status === "ativo";

            } else if (statusSelecionado === "inativo") {

                correspondeStatus = [
                    "inativo",
                    "bloqueado"
                ].includes(status);

            }

            return correspondeBusca && correspondeStatus;

        }
    );

    renderizarUsuarios(usuariosFiltrados);

}


// =====================================================
// 13. ATUALIZAR LISTA DE USUÁRIOS
// =====================================================

function atualizarUsuarios(resposta) {

    if (!listaUsuarios) {

        console.error(
            "SafeMarket: elemento #lista-usuarios não encontrado."
        );

        return;

    }

    const usuarios = normalizarListaUsuarios(resposta);

    usuariosCarregados = usuarios.filter((usuario) => {

        return usuario && typeof usuario === "object";

    });

    atualizarIndicadores(usuariosCarregados);

    limparMensagem();

    aplicarFiltros();

    listaUsuarios.setAttribute("aria-busy", "false");

}


// =====================================================
// 14. EXIBIR ERROS
// =====================================================

function exibirErroUsuarios(mensagem) {

    const textoErro = mensagem ||
        "Não foi possível carregar os usuários.";

    if (mensagemUsuarios) {
        mensagemUsuarios.textContent = textoErro;
    }

    if (listaUsuarios) {

        listaUsuarios.setAttribute("aria-busy", "false");

        exibirEstado(
            "Não foi possível carregar os usuários.",
            "alert-circle"
        );

    }

    console.error(
        "SafeMarket: erro ao carregar usuários:",
        textoErro
    );

}


// =====================================================
// 15. CARREGAR USUÁRIOS DA API
// =====================================================

async function carregarUsuarios() {

    if (!listaUsuarios) {

        console.error(
            "SafeMarket: elemento #lista-usuarios não encontrado."
        );

        return;

    }

    if (typeof window.requisicaoAPI !== "function") {

        exibirErroUsuarios(
            "Função de comunicação com a API não encontrada."
        );

        return;

    }

    listaUsuarios.setAttribute("aria-busy", "true");

    exibirEstado(
        "Carregando usuários...",
        "loader-circle"
    );

    limparMensagem();

    try {

        const resposta = await window.requisicaoAPI(
            "/admin/usuarios",
            {
                method: "GET"
            }
        );

        atualizarUsuarios(resposta);

        console.log(
            "SafeMarket: usuários carregados com sucesso.",
            usuariosCarregados.length
        );

    } catch (erro) {

        exibirErroUsuarios(erro.message);

    }

}


// =====================================================
// 16. EVENTOS DE PESQUISA E FILTRO
// =====================================================

if (campoBusca) {

    campoBusca.addEventListener("input", aplicarFiltros);

}

if (filtroStatus) {

    filtroStatus.addEventListener("change", aplicarFiltros);

}


// =====================================================
// 17. DISPONIBILIZAR FUNÇÕES
// =====================================================

window.usuariosSafeMarket = {

    atualizar: atualizarUsuarios,

    carregar: carregarUsuarios,

    filtrar: aplicarFiltros,

    exibirErro: exibirErroUsuarios

};


// =====================================================
// 18. INICIALIZAÇÃO
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

    atualizarIcones();

    carregarUsuarios();

});
