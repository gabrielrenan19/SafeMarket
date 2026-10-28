
"use strict";

// Elementos do dashboard.
const elementosDashboard = {
    usuariosConectados: document.getElementById("usuarios-conectados"),
    totalAlertas: document.getElementById("total-alertas"),
    nivelSeguranca: document.getElementById("nivel-seguranca"),
    totalAuditorias: document.getElementById("total-auditorias"),
    estadoAlertas: document.getElementById("estado-alertas"),
    estadoSeguranca: document.getElementById("estado-seguranca"),
    statusSistema: document.getElementById("status-sistema-operacional"),
    statusBanco: document.getElementById("status-banco-dados"),
    statusMonitoramento: document.getElementById("status-monitoramento"),
    listaAtividades: document.getElementById("lista-atividades"),
    mensagem: document.getElementById("mensagem-dashboard")
};

// Atualiza um elemento somente se ele existir.
function atualizarTexto(elemento, valor) {
    if (elemento) {
        elemento.textContent = valor ?? "—";
    }
}

// Atualiza os indicadores com dados recebidos de uma fonte real.
function atualizarIndicadores(dados) {
    if (!dados || typeof dados !== "object") {
        throw new Error("Os dados dos indicadores são inválidos.");
    }

    atualizarTexto(
        elementosDashboard.usuariosConectados,
        dados.usuariosConectados
    );

    atualizarTexto(
        elementosDashboard.totalAlertas,
        dados.totalAlertas
    );

    atualizarTexto(
        elementosDashboard.nivelSeguranca,
        dados.nivelSeguranca
    );

    atualizarTexto(
        elementosDashboard.totalAuditorias,
        dados.totalAuditorias
    );
}

// Atualiza os estados conforme informações verificadas pelo servidor.
function atualizarStatus(status) {
    if (!status || typeof status !== "object") {
        throw new Error("Os dados de status são inválidos.");
    }

    atualizarTexto(
        elementosDashboard.statusSistema,
        status.sistemaOperacional
    );

    atualizarTexto(
        elementosDashboard.statusBanco,
        status.bancoDados
    );

    atualizarTexto(
        elementosDashboard.statusMonitoramento,
        status.monitoramento
    );
}

// Exibe atividades recebidas da API.
function atualizarAtividades(atividades) {
    const lista = elementosDashboard.listaAtividades;

    if (!lista) return;

    lista.replaceChildren();

    if (!Array.isArray(atividades) || atividades.length === 0) {
        const vazio = document.createElement("p");
        vazio.textContent = "Nenhuma atividade encontrada.";
        lista.appendChild(vazio);
        return;
    }

    atividades.forEach((atividade) => {
        const item = document.createElement("div");
        item.className = "atividade";

        const descricao = document.createElement("p");
        descricao.textContent = atividade.descricao ?? "Atividade sem descrição";

        item.appendChild(descricao);

        if (atividade.data) {
            const data = document.createElement("span");
            data.textContent = atividade.data;
            item.appendChild(data);
        }

        lista.appendChild(item);
    });
}

// Informa erros sem apresentar dados fictícios.
function exibirErroDashboard(mensagem) {
    atualizarTexto(
        elementosDashboard.mensagem,
        mensagem || "Não foi possível carregar os dados do dashboard."
    );
}

// As funções ficam disponíveis para a futura integração com a API.
// Nenhuma requisição é feita enquanto as rotas não forem definidas.
window.dashboardSafeMarket = {
    atualizarIndicadores,
    atualizarStatus,
    atualizarAtividades,
    exibirErro: exibirErroDashboard
};
