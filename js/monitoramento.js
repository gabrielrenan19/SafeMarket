
"use strict";

// Referências aos elementos da página.
const elementosMonitoramento = {
    usuariosAtivos: document.getElementById("usuarios-ativos"),
    anunciosAtivos: document.getElementById("anuncios-ativos"),
    acoesSuspeitas: document.getElementById("acoes-suspeitas"),
    totalNegociacoes: document.getElementById("total-negociacoes"),
    listaAtividades: document.getElementById("lista-atividades"),
    mensagem: document.getElementById("mensagem-monitoramento")
};

// Atualiza o texto de um elemento com segurança.
function atualizarTexto(elemento, valor) {
    if (elemento) {
        elemento.textContent = valor ?? "—";
    }
}

// Atualiza os indicadores com dados recebidos de uma fonte real.
function atualizarIndicadoresMonitoramento(dados) {
    if (!dados || typeof dados !== "object") {
        throw new Error("Os dados do monitoramento são inválidos.");
    }

    const indicadores = [
        ["usuariosAtivos", dados.usuariosAtivos],
        ["anunciosAtivos", dados.anunciosAtivos],
        ["acoesSuspeitas", dados.acoesSuspeitas],
        ["totalNegociacoes", dados.totalNegociacoes]
    ];

    for (const [chave, valor] of indicadores) {
        if (!Number.isSafeInteger(valor) || valor < 0) {
            throw new Error(`Valor inválido para o indicador: ${chave}.`);
        }

        atualizarTexto(elementosMonitoramento[chave], valor);
    }
}

// Renderiza as atividades recebidas do servidor.
function atualizarAtividadesMonitoramento(atividades) {
    const lista = elementosMonitoramento.listaAtividades;

    if (!lista) return;

    if (!Array.isArray(atividades)) {
        throw new Error("A lista de atividades é inválida.");
    }

    const fragmento = document.createDocumentFragment();

    if (atividades.length === 0) {
        const vazio = document.createElement("p");
        vazio.textContent = "Nenhuma atividade encontrada.";
        lista.replaceChildren(vazio);
        return;
    }

    for (const atividade of atividades) {
        const item = document.createElement("div");
        item.className = "atividade";

        const icone = document.createElement("i");
        icone.setAttribute("aria-hidden", "true");

        const descricao = document.createElement("p");
        descricao.textContent =
            typeof atividade.descricao === "string"
                ? atividade.descricao
                : "Atividade sem descrição";

        item.appendChild(icone);
        item.appendChild(descricao);

        if (atividade.data) {
            const data = document.createElement("span");
            data.textContent = atividade.data;
            item.appendChild(data);
        }

        if (atividade.suspeita === true) {
            icone.setAttribute("data-lucide", "shield-alert");
            icone.classList.add("icone-atividade", "suspeita");
        } else {
            icone.setAttribute("data-lucide", "check-circle");
            icone.classList.add("icone-atividade", "normal");
        }

        fragmento.appendChild(item);
    }

    lista.replaceChildren(fragmento);

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// Exibe uma mensagem de erro sem inserir HTML fornecido externamente.
function exibirErroMonitoramento(mensagem) {
    atualizarTexto(
        elementosMonitoramento.mensagem,
        mensagem || "Não foi possível carregar o monitoramento."
    );
}

// Interface pública para a futura integração com a API.
window.monitoramentoSafeMarket = {
    atualizarIndicadores: atualizarIndicadoresMonitoramento,
    atualizarAtividades: atualizarAtividadesMonitoramento,
    exibirErro: exibirErroMonitoramento
};
