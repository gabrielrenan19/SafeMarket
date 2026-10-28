
"use strict";

const elementoListaAuditoria = document.getElementById("lista-auditoria");
const elementoMensagemAuditoria = document.getElementById("mensagem-auditoria");

// Renderiza registros recebidos de uma fonte de dados real.
function atualizarRegistrosAuditoria(registros) {
    if (!Array.isArray(registros)) {
        throw new Error("A lista de registros de auditoria é inválida.");
    }

    if (!elementoListaAuditoria) return;

    if (registros.length === 0) {
        const vazio = document.createElement("p");
        vazio.textContent = "Nenhum registro encontrado.";

        elementoListaAuditoria.replaceChildren(vazio);
        return;
    }

    const fragmento = document.createDocumentFragment();

    registros.forEach((registro) => {
        const atividade = document.createElement("div");
        atividade.className = "atividade";

        const descricao = document.createElement("p");
        descricao.textContent =
            typeof registro.descricao === "string"
                ? registro.descricao
                : "Registro sem descrição";

        atividade.appendChild(descricao);

        if (registro.data) {
            const data = document.createElement("span");
            data.textContent = registro.data;
            atividade.appendChild(data);
        }

        fragmento.appendChild(atividade);
    });

    elementoListaAuditoria.replaceChildren(fragmento);
}

// Exibe mensagens de erro sem inserir conteúdo HTML externo.
function exibirErroAuditoria(mensagem) {
    if (elementoMensagemAuditoria) {
        elementoMensagemAuditoria.textContent =
            mensagem || "Não foi possível carregar os registros de auditoria.";
    }
}

// Interface disponível para futura integração com a API.
window.auditoriaSafeMarket = {
    atualizarRegistros: atualizarRegistrosAuditoria,
    exibirErro: exibirErroAuditoria
};
