
"use strict";

const listaAlertas = document.getElementById("lista-alertas");
const mensagemAlertas = document.getElementById("mensagem-alertas");

const severidadesPermitidas = ["baixa", "media", "alta", "critica"];

function atualizarAlertas(alertas) {
    if (!Array.isArray(alertas)) {
        throw new Error("A lista de alertas recebida é inválida.");
    }

    if (!listaAlertas) return;

    if (alertas.length === 0) {
        const vazio = document.createElement("p");
        vazio.textContent = "Nenhum alerta encontrado.";

        listaAlertas.replaceChildren(vazio);
        return;
    }

    const fragmento = document.createDocumentFragment();

    alertas.forEach((alerta) => {
        const atividade = document.createElement("div");
        atividade.className = "atividade";

        const descricao = document.createElement("p");
        descricao.textContent =
            typeof alerta.descricao === "string"
                ? alerta.descricao
                : "Alerta sem descrição";

        const severidade = String(alerta.severidade || "").toLowerCase();

        if (severidadesPermitidas.includes(severidade)) {
            descricao.textContent =
                `[${severidade.toUpperCase()}] ${descricao.textContent}`;
        }

        atividade.appendChild(descricao);

        if (alerta.data) {
            const data = document.createElement("span");
            data.textContent = String(alerta.data);
            atividade.appendChild(data);
        }

        fragmento.appendChild(atividade);
    });

    listaAlertas.replaceChildren(fragmento);
}

function exibirErroAlertas(mensagem) {
    if (mensagemAlertas) {
        mensagemAlertas.textContent =
            mensagem || "Não foi possível carregar os alertas.";
    }
}

window.alertasSafeMarket = {
    atualizar: atualizarAlertas,
    exibirErro: exibirErroAlertas
};
