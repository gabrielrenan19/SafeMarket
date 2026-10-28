
"use strict";

const listaInvestigacoes = document.getElementById("lista-investigacoes");
const pesquisaCaso = document.getElementById("pesquisa-caso");
const filtroStatus = document.getElementById("filtro-status");
const semResultados = document.getElementById("sem-resultados");
const mensagemPericia = document.getElementById("mensagem-pericia");

const painelDetalhes = document.getElementById("detalhes-investigacao");
const tituloInvestigacao = document.getElementById("titulo-investigacao");
const descricaoInvestigacao = document.getElementById("descricao-investigacao");
const gravidadeInvestigacao = document.getElementById("gravidade-investigacao");
const linhaTempo = document.getElementById("linha-tempo");
const listaEvidencias = document.getElementById("lista-evidencias");

let investigacoes = [];

const statusValidos = ["aberta", "analise", "concluida"];

function normalizarTexto(valor) {
    return String(valor ?? "").trim().toLocaleLowerCase("pt-BR");
}

function exibirMensagem(mensagem) {
    mensagemPericia.textContent = mensagem || "";
}

function atualizarIndicadores(indicadores) {
    if (!indicadores || typeof indicadores !== "object") {
        throw new Error("Os indicadores de perícia são inválidos.");
    }

    const campos = {
        "total-abertas": indicadores.abertas,
        "total-analise": indicadores.emAnalise,
        "total-concluidas": indicadores.concluidas,
        "total-evidencias": indicadores.evidencias
    };

    for (const [id, valor] of Object.entries(campos)) {
        if (!Number.isSafeInteger(valor) || valor < 0) {
            throw new Error(`Indicador inválido: ${id}.`);
        }
    }

    for (const [id, valor] of Object.entries(campos)) {
        document.getElementById(id).textContent = String(valor);
    }
}

function validarInvestigacoes(dados) {
    if (!Array.isArray(dados)) {
        throw new Error("A lista de investigações é inválida.");
    }

    const ids = new Set();

    for (const caso of dados) {
        if (
            !caso ||
            typeof caso.id !== "string" ||
            !caso.id.trim() ||
            typeof caso.descricao !== "string" ||
            !statusValidos.includes(caso.status)
        ) {
            throw new Error("Foi recebida uma investigação com dados inválidos.");
        }

        if (ids.has(caso.id)) {
            throw new Error("Existem investigações com IDs duplicados.");
        }

        ids.add(caso.id);

        if (
            caso.evidencias !== undefined &&
            !Array.isArray(caso.evidencias)
        ) {
            throw new Error("A lista de evidências é inválida.");
        }

        if (
            caso.linhaTempo !== undefined &&
            !Array.isArray(caso.linhaTempo)
        ) {
            throw new Error("A linha do tempo é inválida.");
        }
    }
}

function criarTexto(tag, texto) {
    const elemento = document.createElement(tag);
    elemento.textContent = texto;
    return elemento;
}

function renderizarInvestigacoes() {
    const termo = normalizarTexto(pesquisaCaso.value);
    const statusSelecionado = filtroStatus.value;

    const filtradas = investigacoes.filter((caso) => {
        const correspondeTexto =
            normalizarTexto(caso.id).includes(termo) ||
            normalizarTexto(caso.descricao).includes(termo);

        const correspondeStatus =
            !statusSelecionado || caso.status === statusSelecionado;

        return correspondeTexto && correspondeStatus;
    });

    const fragmento = document.createDocumentFragment();

    filtradas.forEach((caso) => {
        const artigo = document.createElement("article");
        artigo.className = "caso-pericia";
        artigo.dataset.status = caso.status;

        const cabecalho = document.createElement("div");
        cabecalho.className = "caso-cabecalho";

        cabecalho.appendChild(criarTexto("h3", caso.id));

        const status = criarTexto(
            "span",
            caso.status === "analise"
                ? "Em análise"
                : caso.status === "concluida"
                    ? "Concluída"
                    : "Aberta"
        );

        status.className = `status-caso ${
            caso.status === "analise"
                ? "em-analise"
                : caso.status
        }`;

        cabecalho.appendChild(status);
        artigo.appendChild(cabecalho);

        artigo.appendChild(criarTexto("p", caso.descricao));

        if (typeof caso.gravidade === "string" && caso.gravidade.trim()) {
            const gravidade = criarTexto(
                "span",
                `Gravidade: ${caso.gravidade}`
            );

            gravidade.className = "detalhe-caso";
            artigo.appendChild(gravidade);
        }

        const botao = criarTexto("button", "Consultar investigação");
        botao.type = "button";
        botao.className = "botao-detalhes";
        botao.dataset.caso = caso.id;

        artigo.appendChild(botao);
        fragmento.appendChild(artigo);
    });

    listaInvestigacoes.replaceChildren(fragmento);
    semResultados.hidden = filtradas.length > 0;
}

function mostrarDetalhes(id) {
    const caso = investigacoes.find((item) => item.id === id);

    if (!caso) {
        exibirMensagem("A investigação selecionada não foi encontrada.");
        return;
    }

    tituloInvestigacao.textContent = `Investigação ${caso.id}`;
    descricaoInvestigacao.textContent = caso.descricao;

    gravidadeInvestigacao.textContent =
        typeof caso.gravidade === "string" && caso.gravidade.trim()
            ? `Gravidade: ${caso.gravidade}`
            : "Gravidade não informada.";

    const eventos = Array.isArray(caso.linhaTempo)
        ? caso.linhaTempo
        : [];

    if (eventos.length === 0) {
        linhaTempo.replaceChildren(
            criarTexto("p", "Nenhum evento registrado.")
        );
    } else {
        const fragmentoTempo = document.createDocumentFragment();

        eventos.forEach((evento) => {
            const item = document.createElement("div");
            item.className = "evento-tempo";

            item.appendChild(
                criarTexto(
                    "p",
                    typeof evento.descricao === "string"
                        ? evento.descricao
                        : "Evento sem descrição"
                )
            );

            if (evento.data) {
                item.appendChild(criarTexto("span", String(evento.data)));
            }

            fragmentoTempo.appendChild(item);
        });

        linhaTempo.replaceChildren(fragmentoTempo);
    }

    const evidencias = Array.isArray(caso.evidencias)
        ? caso.evidencias
        : [];

    if (evidencias.length === 0) {
        listaEvidencias.replaceChildren(
            criarTexto("li", "Nenhuma evidência registrada.")
        );
    } else {
        const fragmentoEvidencias = document.createDocumentFragment();

        evidencias.forEach((evidencia) => {
            const descricao = typeof evidencia === "string"
                ? evidencia
                : evidencia.descricao;

            fragmentoEvidencias.appendChild(
                criarTexto(
                    "li",
                    typeof descricao === "string"
                        ? descricao
                        : "Evidência sem descrição"
                )
            );
        });

        listaEvidencias.replaceChildren(fragmentoEvidencias);
    }

    painelDetalhes.hidden = false;
    exibirMensagem("");

    painelDetalhes.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

pesquisaCaso.addEventListener("input", renderizarInvestigacoes);
filtroStatus.addEventListener("change", renderizarInvestigacoes);

listaInvestigacoes.addEventListener("click", (evento) => {
    const botao = evento.target.closest("button[data-caso]");

    if (!botao || !listaInvestigacoes.contains(botao)) return;

    mostrarDetalhes(botao.dataset.caso);
});

window.periciaSafeMarket = {
    atualizarIndicadores,
    atualizarInvestigacoes(dados) {
        validarInvestigacoes(dados);

        investigacoes = dados;
        renderizarInvestigacoes();
        painelDetalhes.hidden = true;
        exibirMensagem("");
    },
    mostrarDetalhes,
    exibirErro(mensagem) {
        exibirMensagem(
            mensagem || "Não foi possível carregar os dados da perícia."
        );
    }
};
