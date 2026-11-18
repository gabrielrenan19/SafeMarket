"use strict";

/* =========================================================
   SAFEMARKET — CENTRAL DE ALERTAS
   Integração: GET /api/admin/alertas
========================================================= */

/* ELEMENTOS */

const listaAlertas = document.getElementById("lista-alertas");
const mensagemAlertas = document.getElementById("mensagem-alertas");
const quantidadeAlertas = document.getElementById("quantidade-alertas");

const totalAlertas = document.getElementById("total-alertas");
const alertasCriticos = document.getElementById("alertas-criticos");
const alertasPendentes = document.getElementById("alertas-pendentes");
const alertasResolvidos = document.getElementById("alertas-resolvidos");

const pesquisaAlertas = document.getElementById("pesquisa-alertas");
const filtroGravidade = document.getElementById("filtro-gravidade");
const filtroStatus = document.getElementById("filtro-status");
const filtroData = document.getElementById("filtro-data");

/* ESTADO */

let alertasOriginais = [];

/* NORMALIZAÇÃO */

function normalizarTexto(valor) {
    return String(valor ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function normalizarSeveridade(valor) {
    const valorNormalizado = normalizarTexto(valor);

    const equivalencias = {
        informativo: "informativo",
        info: "informativo",
        baixo: "baixo",
        baixa: "baixo",
        medio: "medio",
        media: "medio",
        alto: "alto",
        alta: "alto",
        critico: "critico",
        critica: "critico"
    };

    return equivalencias[valorNormalizado] || "nao_classificada";
}

function normalizarStatus(valor) {
    const status = normalizarTexto(valor)
        .replace(/[\s-]+/g, "_");

    if ([
        "resolvido",
        "resolvida",
        "concluido",
        "concluida",
        "encerrado",
        "encerrada"
    ].includes(status)) {
        return "resolvido";
    }

    if ([
        "em_analise",
        "em_andamento",
        "analise"
    ].includes(status)) {
        return "em_analise";
    }

    return "pendente";
}

/* FORMATAÇÃO */

function formatarTexto(valor, padrao = "Não informado") {
    if (valor === null || valor === undefined || valor === "") {
        return padrao;
    }

    return String(valor);
}

function formatarData(valor) {
    if (!valor) {
        return "Data não informada";
    }

    const texto = String(valor);

    // Preserva a data e o horário local recebidos do backend.
    const correspondencia = texto.match(
        /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/
    );

    if (correspondencia) {
        const [, ano, mes, dia, hora, minuto, segundo] = correspondencia;

        const data = `${dia}/${mes}/${ano}`;

        if (hora !== undefined) {
            return `${data} às ${hora}:${minuto || "00"}:${segundo || "00"}`;
        }

        return data;
    }

    const data = new Date(texto);

    if (Number.isNaN(data.getTime())) {
        return texto;
    }

    return data.toLocaleString("pt-BR");
}

function obterDataFiltro(valor) {
    if (!valor) return "";

    const correspondencia = String(valor).match(/^(\d{4}-\d{2}-\d{2})/);

    if (correspondencia) {
        return correspondencia[1];
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return "";
    }

    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

function obterDataOrdenacao(valor) {
    if (!valor) return 0;

    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? 0 : data.getTime();
}

/* PREPARAÇÃO DOS REGISTROS */

function prepararAlerta(alerta) {
    return {
        ...alerta,

        tipo: formatarTexto(alerta.tipo, "OUTRO"),

        descricao: formatarTexto(
            alerta.descricao,
            "Alerta sem descrição."
        ),

        severidadeNormalizada: normalizarSeveridade(
            alerta.severidade
        ),

        statusNormalizado: normalizarStatus(
            alerta.status
        ),

        dataFormatada: formatarData(alerta.data),

        dataFiltro: obterDataFiltro(alerta.data)
    };
}

/* RÓTULOS */

function obterRotuloSeveridade(severidade) {
    const rotulos = {
        informativo: "Informativo",
        baixo: "Baixo",
        medio: "Médio",
        alto: "Alto",
        critico: "Crítico",
        nao_classificada: "Não classificada"
    };

    return rotulos[severidade] || "Não classificada";
}

function obterRotuloStatus(status) {
    const rotulos = {
        pendente: "Pendente",
        em_analise: "Em análise",
        resolvido: "Resolvido"
    };

    return rotulos[status] || "Pendente";
}

function obterRotuloTipo(tipo) {
    const rotulos = {
        CONTA: "Conta",
        DENUNCIA: "Denúncia",
        MODERACAO: "Moderação"
    };

    return rotulos[String(tipo).toUpperCase()] || tipo;
}

function obterIconeTipo(tipo) {
    const icones = {
        CONTA: "user-round",
        DENUNCIA: "flag",
        MODERACAO: "shield-alert"
    };

    return icones[String(tipo).toUpperCase()] || "bell";
}

/* CRIAÇÃO SEGURA DE ELEMENTOS */

function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);

    if (classe) {
        elemento.className = classe;
    }

    if (texto !== undefined && texto !== null) {
        elemento.textContent = texto;
    }

    return elemento;
}

function criarIcone(nome) {
    const icone = document.createElement("i");
    icone.setAttribute("data-lucide", nome);
    icone.setAttribute("aria-hidden", "true");

    return icone;
}

/* INDICADORES */

function atualizarIndicadores(alertas) {
    const total = alertas.length;

    const criticos = alertas.filter(
        alerta => alerta.severidadeNormalizada === "critico"
    ).length;

    const pendentes = alertas.filter(
        alerta =>
            alerta.statusNormalizado === "pendente" ||
            alerta.statusNormalizado === "em_analise"
    ).length;

    const resolvidos = alertas.filter(
        alerta => alerta.statusNormalizado === "resolvido"
    ).length;

    if (totalAlertas) totalAlertas.textContent = total;
    if (alertasCriticos) alertasCriticos.textContent = criticos;
    if (alertasPendentes) alertasPendentes.textContent = pendentes;
    if (alertasResolvidos) alertasResolvidos.textContent = resolvidos;
}

function atualizarQuantidade(quantidade) {
    if (!quantidadeAlertas) return;

    quantidadeAlertas.textContent =
        `${quantidade} ${quantidade === 1 ? "registro" : "registros"}`;
}

/* CARTÃO INDIVIDUAL */

function criarCartaoAlerta(alerta) {
    const cartao = criarElemento(
        "article",
        `item-alerta gravidade-${alerta.severidadeNormalizada}`
    );

    cartao.dataset.alertaId = formatarTexto(alerta.id, "");
    cartao.dataset.alertaTipo = alerta.tipo;

    // Ícone e identificação
    const icone = criarElemento("div", "alerta-icone");
    icone.appendChild(criarIcone(obterIconeTipo(alerta.tipo)));

    const conteudo = criarElemento("div", "alerta-conteudo");

    // Cabeçalho
    const cabecalho = criarElemento("div", "alerta-cabecalho");

    const identificacao = criarElemento("div", "alerta-identificacao");

    const tipo = criarElemento(
        "span",
        "alerta-tipo",
        obterRotuloTipo(alerta.tipo)
    );

    const identificador = criarElemento(
        "span",
        "alerta-identificador",
        alerta.id ? `#${alerta.id}` : ""
    );

    identificacao.append(tipo, identificador);

    const gravidade = criarElemento(
        "span",
        `badge-gravidade badge-${alerta.severidadeNormalizada}`,
        obterRotuloSeveridade(alerta.severidadeNormalizada)
    );

    cabecalho.append(identificacao, gravidade);

    // Descrição
    const descricao = criarElemento(
        "p",
        "alerta-descricao",
        alerta.descricao
    );

    // Metadados
    const metadados = criarElemento("div", "alerta-metadados");

    const status = criarElemento(
        "span",
        `badge-status badge-${alerta.statusNormalizado}`,
        obterRotuloStatus(alerta.statusNormalizado)
    );

    const data = criarElemento(
        "span",
        "alerta-data"
    );

    data.appendChild(criarIcone("calendar-clock"));
    data.appendChild(document.createTextNode(alerta.dataFormatada));

    metadados.append(status, data);

    // Referência à entidade, quando disponível
    if (alerta.entidadeId !== null && alerta.entidadeId !== undefined) {
        const entidade = criarElemento(
            "span",
            "alerta-entidade",
            `Referência: ${alerta.entidadeId}`
        );

        metadados.appendChild(entidade);
    }

    conteudo.append(cabecalho, descricao, metadados);
    cartao.append(icone, conteudo);

    return cartao;
}

/* FILTROS */

function obterAlertasFiltrados() {
    const pesquisa = pesquisaAlertas
        ? normalizarTexto(pesquisaAlertas.value)
        : "";

    const gravidade = filtroGravidade
        ? filtroGravidade.value
        : "";

    const status = filtroStatus
        ? filtroStatus.value
        : "";

    const data = filtroData
        ? filtroData.value
        : "";

    return alertasOriginais
        .filter(alerta => {
            const camposPesquisa = [
                alerta.descricao,
                alerta.tipo,
                alerta.severidade,
                alerta.status,
                alerta.entidadeId,
                alerta.id
            ];

            const correspondePesquisa =
                !pesquisa ||
                camposPesquisa.some(valor =>
                    normalizarTexto(valor).includes(pesquisa)
                );

            const correspondeGravidade =
                !gravidade ||
                alerta.severidadeNormalizada === gravidade;

            const correspondeStatus =
                !status ||
                alerta.statusNormalizado === status;

            const correspondeData =
                !data ||
                alerta.dataFiltro === data;

            return (
                correspondePesquisa &&
                correspondeGravidade &&
                correspondeStatus &&
                correspondeData
            );
        })
        .sort((a, b) =>
            obterDataOrdenacao(b.data) - obterDataOrdenacao(a.data)
        );
}

/* ESTADOS DA LISTA */

function renderizarEstado(classe, icone, mensagem) {
    const estado = criarElemento("div", classe);
    estado.appendChild(criarIcone(icone));
    estado.appendChild(criarElemento("p", "", mensagem));

    listaAlertas.replaceChildren(estado);

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

/* RENDERIZAÇÃO */

function renderizarAlertas() {
    if (!listaAlertas) return;

    const alertasFiltrados = obterAlertasFiltrados();

    atualizarQuantidade(alertasFiltrados.length);

    if (alertasFiltrados.length === 0) {
        const mensagem = alertasOriginais.length === 0
            ? "Nenhum alerta foi registrado até o momento."
            : "Nenhum alerta corresponde aos filtros selecionados.";

        renderizarEstado("estado-vazio", "inbox", mensagem);
        return;
    }

    const fragmento = document.createDocumentFragment();

    alertasFiltrados.forEach(alerta => {
        fragmento.appendChild(criarCartaoAlerta(alerta));
    });

    listaAlertas.replaceChildren(fragmento);

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

/* ATUALIZAÇÃO DO PAINEL */

function atualizarPainel(alertas) {
    if (!Array.isArray(alertas)) {
        throw new Error(
            "O backend retornou uma lista de alertas inválida."
        );
    }

    alertasOriginais = alertas.map(prepararAlerta);

    atualizarIndicadores(alertasOriginais);
    renderizarAlertas();

    if (mensagemAlertas) {
        mensagemAlertas.textContent = "";
    }

    if (listaAlertas) {
        listaAlertas.setAttribute("aria-busy", "false");
    }
}

/* ERROS */

function exibirErroAlertas(mensagem) {
    if (mensagemAlertas) {
        mensagemAlertas.textContent =
            mensagem || "Não foi possível carregar os alertas.";
    }

    if (listaAlertas) {
        listaAlertas.setAttribute("aria-busy", "false");

        renderizarEstado(
            "estado-erro",
            "alert-circle",
            "Não foi possível consultar os alertas. Verifique sua sessão e tente novamente."
        );
    }

    atualizarQuantidade(0);
}

/* EVENTOS DOS FILTROS */

function configurarFiltros() {
    [
        pesquisaAlertas,
        filtroGravidade,
        filtroStatus,
        filtroData
    ].forEach(elemento => {
        if (!elemento) return;

        elemento.addEventListener("input", renderizarAlertas);
        elemento.addEventListener("change", renderizarAlertas);
    });
}

/* CARREGAMENTO */

async function carregarAlertas() {
    try {
        if (listaAlertas) {
            listaAlertas.setAttribute("aria-busy", "true");

            renderizarEstado(
                "estado-carregamento",
                "loader-circle",
                "Carregando alertas..."
            );
        }

        if (mensagemAlertas) {
            mensagemAlertas.textContent = "";
        }

        const resposta = await requisicaoAPI("/admin/alertas");

        atualizarPainel(resposta);

    } catch (erro) {
        console.error("Erro ao carregar alertas:", erro);

        exibirErroAlertas(
            erro?.message || "Não foi possível carregar os alertas."
        );
    }
}

/* INICIALIZAÇÃO */

configurarFiltros();

window.alertasSafeMarket = {
    atualizar: atualizarPainel,
    renderizar: renderizarAlertas,
    carregar: carregarAlertas,
    exibirErro: exibirErroAlertas
};

carregarAlertas();