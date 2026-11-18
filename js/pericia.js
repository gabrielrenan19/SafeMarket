
/* =====================================================
   SAFEMARKET — PERÍCIA DIGITAL
   Arquivo: js/pericia.js

   Consulta, filtros e investigação de registros.
   Apresentação estruturada dos dados de auditoria.
===================================================== */

"use strict";


// =====================================================
// 1. CONFIGURAÇÕES
// =====================================================

const API_PERICIA = "/admin/pericia";

const LIMITE_REGISTROS = 200;

const ACOES_DISPONIVEIS = [
    "LOGIN",
    "LOGIN_FALHA",
    "LOGOUT",
    "CADASTRAR",
    "ATUALIZAR",
    "EXCLUIR",
    "CONSULTAR",
    "MOVIMENTAR_ESTOQUE",
    "DENUNCIAR"
];

const elementos = {};

let registrosPericia = [];
let registrosFiltrados = [];
let registroSelecionado = null;
let carregandoPericia = false;


// =====================================================
// 2. ELEMENTOS DA PÁGINA
// =====================================================

function obterElementos() {

    const ids = [
        "total-registros",
        "total-usuarios",
        "total-acoes",
        "total-ips",

        "pesquisa-caso",
        "filtro-usuario",
        "filtro-acao",
        "filtro-ip",
        "data-inicio",
        "data-fim",

        "btn-filtrar",
        "btn-limpar-filtros",

        "mensagem-pericia",
        "lista-investigacoes",
        "sem-resultados",

        "detalhes-investigacao",
        "fechar-detalhes",

        "detalhe-id",
        "detalhe-usuario",
        "detalhe-email",
        "detalhe-acao",
        "detalhe-entidade",
        "detalhe-entidade-id",
        "detalhe-ip",
        "detalhe-data",
        "detalhe-descricao"
    ];

    ids.forEach(id => {
        elementos[id] = document.getElementById(id);
    });

}


// =====================================================
// 3. FUNÇÕES AUXILIARES
// =====================================================

function obterValor(valor, alternativa = "Não informado") {

    if (
        valor === null ||
        valor === undefined ||
        String(valor).trim() === ""
    ) {
        return alternativa;
    }

    return String(valor);

}


function obterCampo(objeto, ...nomes) {

    if (!objeto || typeof objeto !== "object") {
        return undefined;
    }

    for (const nome of nomes) {

        const valor = objeto[nome];

        if (
            valor !== undefined &&
            valor !== null &&
            String(valor).trim() !== ""
        ) {
            return valor;
        }

    }

    return undefined;

}


function normalizarTexto(valor) {

    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

}


function criarElemento(tag, classe, texto) {

    const elemento = document.createElement(tag);

    if (classe) {
        elemento.className = classe;
    }

    if (texto !== undefined && texto !== null) {
        elemento.textContent = String(texto);
    }

    return elemento;

}


function formatarRotulo(valor) {

    const rotulos = {

        evento: "Evento",
        formato: "Formato",
        imagem_nova: "Nova imagem",
        imagem_anterior: "Imagem anterior",
        tamanho_bytes: "Tamanho do arquivo",
        tipo_operacao: "Tipo de operação",
        nome_arquivo_novo: "Nome do arquivo",

        produto_id: "ID do produto",
        nome_produto_snapshot: "Nome do anúncio",

        id: "ID",
        nome: "Nome",
        email: "E-mail",
        perfil: "Perfil",

        mensagem: "Descrição",
        descricao: "Descrição",

        metodo_http: "Método HTTP",
        endpoint: "Endpoint",
        user_agent: "User-Agent",
        ip_origem: "IP de origem",
        origem: "Origem",
        resultado: "Resultado",

        valoresAnteriores: "Valores anteriores",
        valoresNovos: "Valores novos"

    };

    if (rotulos[valor]) {
        return rotulos[valor];
    }

    return String(valor)
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/_/g, " ")
        .replace(/\b\w/g, letra => letra.toUpperCase());

}


function formatarTamanho(bytes) {

    const numero = Number(bytes);

    if (!Number.isFinite(numero) || numero < 0) {
        return obterValor(bytes);
    }

    if (numero < 1024) {
        return `${numero} bytes`;
    }

    if (numero < 1024 * 1024) {
        return `${(numero / 1024).toFixed(2)} KB`;
    }

    return `${(numero / (1024 * 1024)).toFixed(2)} MB`;

}


function formatarValorCampo(chave, valor) {

    if (
        chave === "tamanho_bytes" ||
        chave === "tamanhoBytes"
    ) {
        return formatarTamanho(valor);
    }

    if (typeof valor === "boolean") {
        return valor ? "Sim" : "Não";
    }

    if (valor === null || valor === undefined) {
        return "Não informado";
    }

    if (Array.isArray(valor)) {
        return valor.length
            ? valor.map(item => String(item)).join(", ")
            : "Nenhum registro";
    }

    if (typeof valor === "object") {
        return JSON.stringify(valor, null, 2);
    }

    return String(valor);

}


// =====================================================
// 4. FORMATAÇÃO DE DATA E HORÁRIO
// =====================================================

function formatarData(valor) {

    if (!valor) {
        return "Data não informada";
    }

    let data;

    if (Array.isArray(valor)) {

        const [
            ano,
            mes,
            dia,
            hora = 0,
            minuto = 0,
            segundo = 0,
            nanos = 0
        ] = valor;

        data = new Date(
            ano,
            mes - 1,
            dia,
            hora,
            minuto,
            segundo,
            Math.floor(nanos / 1000000)
        );

    } else {

        data = new Date(valor);

    }

    if (Number.isNaN(data.getTime())) {
        return String(valor);
    }

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    }).format(data);

}


// =====================================================
// 5. INTERPRETAR DETALHES DO REGISTRO
// =====================================================

function interpretarDetalhes(detalhes) {

    if (!detalhes) {
        return {};
    }

    if (typeof detalhes === "object") {
        return detalhes;
    }

    if (typeof detalhes === "string") {

        try {
            return JSON.parse(detalhes);
        } catch {
            return {
                mensagem: detalhes
            };
        }

    }

    return {
        mensagem: String(detalhes)
    };

}


// =====================================================
// 6. IDENTIFICAÇÃO DO RESPONSÁVEL
// =====================================================

function obterNomeUsuario(registro) {

    const detalhes = interpretarDetalhes(registro.detalhes);

    return obterValor(
        obterCampo(registro,
            "usuarioNomeSnapshot",
            "usuario_nome_snapshot",
            "usuarioNome",
            "usuario_nome"
        ) ??
        obterCampo(detalhes.responsavel, "nome")
    );

}


function obterEmailUsuario(registro) {

    const detalhes = interpretarDetalhes(registro.detalhes);

    return obterValor(
        obterCampo(registro,
            "usuarioEmailSnapshot",
            "usuario_email_snapshot",
            "usuarioEmail",
            "usuario_email"
        ) ??
        obterCampo(detalhes.responsavel, "email")
    );

}


function obterPerfilUsuario(registro) {

    const detalhes = interpretarDetalhes(registro.detalhes);

    return obterValor(
        obterCampo(registro,
            "usuarioPerfilSnapshot",
            "usuario_perfil_snapshot",
            "usuarioPerfil",
            "usuario_perfil"
        ) ??
        obterCampo(detalhes.responsavel, "perfil")
    );

}


function obterIdUsuario(registro) {

    const detalhes = interpretarDetalhes(registro.detalhes);

    return obterValor(
        obterCampo(registro,
            "usuarioId",
            "usuario_id"
        ) ??
        obterCampo(detalhes.responsavel, "id")
    );

}


function obterAcao(registro) {

    const detalhes = interpretarDetalhes(registro.detalhes);

    return obterValor(
        obterCampo(registro, "acao") ??
        obterCampo(detalhes, "evento")
    );

}


function obterDataRegistro(registro) {

    return obterCampo(
        registro,
        "data",
        "criadoEm",
        "criado_em",
        "dataCriacao",
        "data_criacao"
    );

}


function obterIpRegistro(registro) {

    return obterValor(
        obterCampo(
            registro,
            "ipOrigem",
            "ip_origem",
            "ip"
        )
    );

}


// =====================================================
// 7. MENSAGENS DA INTERFACE
// =====================================================

function mostrarMensagem(texto, tipo = "info") {

    const mensagem = elementos["mensagem-pericia"];

    if (!mensagem) return;

    mensagem.textContent = texto;

    mensagem.className = "mensagem-pericia";

    mensagem.classList.add(`mensagem-${tipo}`);

}


function limparMensagem() {

    const mensagem = elementos["mensagem-pericia"];

    if (!mensagem) return;

    mensagem.textContent = "";

    mensagem.className = "mensagem-pericia";

}


// =====================================================
// 8. CARREGAR REGISTROS DA API
// =====================================================

async function carregarPericia() {

    if (carregandoPericia) return;

    carregandoPericia = true;

    limparMensagem();

    elementos["btn-filtrar"].disabled = true;

    elementos["btn-filtrar"].textContent = "Consultando...";

    mostrarMensagem(
        "Consultando os registros de auditoria...",
        "info"
    );

    try {

        const parametros = new URLSearchParams();

        const usuarioId =
            elementos["filtro-usuario"].value.trim();

        const acao =
            elementos["filtro-acao"].value.trim();

        const ip =
            elementos["filtro-ip"].value.trim();

        const dataInicio =
            elementos["data-inicio"].value;

        const dataFim =
            elementos["data-fim"].value;


        if (usuarioId) {

            const id = Number(usuarioId);

            if (!Number.isInteger(id) || id <= 0) {
                throw new Error("Informe um ID de usuário válido.");
            }

            parametros.set("usuarioId", id);

        }

        if (acao) parametros.set("acao", acao);

        if (ip) parametros.set("ip", ip);

        if (dataInicio) parametros.set("dataInicio", dataInicio);

        if (dataFim) parametros.set("dataFim", dataFim);


        const query = parametros.toString();

        const endpoint = query
            ? `${API_PERICIA}?${query}`
            : API_PERICIA;


        const resposta = await requisicaoAPI(endpoint, {
            method: "GET"
        });


        if (!Array.isArray(resposta)) {
            throw new Error(
                "O servidor retornou um formato inesperado de registros."
            );
        }


        registrosPericia = resposta.slice(0, LIMITE_REGISTROS);

        registrosFiltrados = [...registrosPericia];

        aplicarPesquisaLocal();

        mostrarMensagem(
            `${resposta.length} registro(s) recebido(s) do servidor.`,
            "sucesso"
        );


    } catch (erro) {

        console.error(
            "SafeMarket: erro ao carregar perícia digital:",
            erro
        );

        registrosPericia = [];

        registrosFiltrados = [];

        atualizarIndicadores();

        renderizarRegistros();


        if (erro.status === 401) {

            mostrarMensagem(
                "Sua sessão expirou. Faça login novamente para consultar a perícia.",
                "erro"
            );

        } else if (erro.status === 403) {

            mostrarMensagem(
                "Acesso negado. Somente administradores podem consultar a perícia digital.",
                "erro"
            );

        } else {

            mostrarMensagem(
                erro.message ||
                "Não foi possível carregar os registros de perícia.",
                "erro"
            );

        }

    } finally {

        carregandoPericia = false;

        elementos["btn-filtrar"].disabled = false;

        elementos["btn-filtrar"].textContent = "Aplicar filtros";

    }

}


// =====================================================
// 9. ATUALIZAR INDICADORES
// =====================================================

function atualizarIndicadores() {

    const usuarios = new Set();
    const acoes = new Set();
    const ips = new Set();


    registrosFiltrados.forEach(registro => {

        const usuarioId = obterIdUsuario(registro);

        const acao = obterAcao(registro);

        const ip = obterIpRegistro(registro);

        if (usuarioId !== "Não informado") {
            usuarios.add(usuarioId);
        }

        if (acao !== "Não informado") {
            acoes.add(acao);
        }

        if (ip !== "Não informado") {
            ips.add(ip);
        }

    });


    elementos["total-registros"].textContent =
        registrosFiltrados.length;

    elementos["total-usuarios"].textContent =
        usuarios.size;

    elementos["total-acoes"].textContent =
        acoes.size;

    elementos["total-ips"].textContent =
        ips.size;

}


// =====================================================
// 10. PESQUISA LOCAL
// =====================================================

function aplicarPesquisaLocal() {

    const pesquisa = normalizarTexto(
        elementos["pesquisa-caso"].value
    );


    if (!pesquisa) {

        registrosFiltrados = [...registrosPericia];

    } else {

        registrosFiltrados = registrosPericia.filter(registro => {

            const detalhes = interpretarDetalhes(
                registro.detalhes
            );

            const conteudo = [

                registro.id,
                obterIdUsuario(registro),
                obterNomeUsuario(registro),
                obterEmailUsuario(registro),
                obterPerfilUsuario(registro),

                obterAcao(registro),

                registro.entidade,
                registro.entidadeId,
                registro.entidade_id,

                obterIpRegistro(registro),

                registro.metodoHttp,
                registro.metodo_http,

                registro.endpoint,
                registro.userAgent,
                registro.user_agent,

                registro.origem,
                registro.resultado,

                JSON.stringify(detalhes)

            ].join(" ");

            return normalizarTexto(conteudo).includes(pesquisa);

        });

    }


    atualizarIndicadores();

    renderizarRegistros();

}


// =====================================================
// 11. CRIAR CARTÃO DE REGISTRO
// =====================================================

function criarCartaoRegistro(registro) {

    const detalhes = interpretarDetalhes(registro.detalhes);

    const cartao = criarElemento(
        "article",
        "registro-pericia"
    );


    const cabecalho = criarElemento(
        "div",
        "cabecalho-registro"
    );


    const identificacao = criarElemento(
        "div",
        "identificacao-registro"
    );


    identificacao.appendChild(
        criarElemento(
            "strong",
            "",
            `Registro #${obterValor(registro.id)}`
        )
    );


    identificacao.appendChild(
        criarElemento(
            "span",
            "registro-acao",
            obterAcao(registro)
        )
    );


    cabecalho.appendChild(identificacao);


    cabecalho.appendChild(
        criarElemento(
            "span",
            "data-registro",
            formatarData(obterDataRegistro(registro))
        )
    );


    const corpo = criarElemento(
        "div",
        "corpo-registro"
    );


    const nomeProduto = obterCampo(
        detalhes,
        "nome_produto_snapshot",
        "nomeProdutoSnapshot"
    );

    const produtoId = obterCampo(
        detalhes,
        "produto_id",
        "produtoId"
    );


    const informacoes = [

        ["Responsável", obterNomeUsuario(registro)],

        ["E-mail", obterEmailUsuario(registro)],

        ["ID do usuário", obterIdUsuario(registro)],

        ["Perfil", obterPerfilUsuario(registro)],

        [
            "Anúncio",
            nomeProduto
                ? nomeProduto
                : obterValor(registro.entidade)
        ],

        [
            "ID do anúncio",
            produtoId ?? registro.entidadeId ?? registro.entidade_id
        ],

        ["IP de origem", obterIpRegistro(registro)],

        [
            "Resultado",
            obterValor(registro.resultado)
        ]

    ];


    informacoes.forEach(([rotulo, valor]) => {

        const campo = criarElemento("p", "campo-registro");

        const titulo = criarElemento(
            "strong",
            "",
            `${rotulo}: `
        );

        const conteudo = criarElemento(
            "span",
            "",
            obterValor(valor)
        );

        campo.append(titulo, conteudo);

        corpo.appendChild(campo);

    });


    const botao = criarElemento(
        "button",
        "botao-detalhes",
        "Investigar registro"
    );

    botao.type = "button";

    botao.addEventListener("click", () => {
        abrirDetalhes(registro);
    });


    cartao.append(
        cabecalho,
        corpo,
        botao
    );


    return cartao;

}


// =====================================================
// 12. RENDERIZAR REGISTROS
// =====================================================

function renderizarRegistros() {

    const lista = elementos["lista-investigacoes"];

    const vazio = elementos["sem-resultados"];

    lista.querySelectorAll(".registro-pericia").forEach(item => {
        item.remove();
    });


    if (registrosFiltrados.length === 0) {

        vazio.hidden = false;

        return;

    }


    vazio.hidden = true;

    const fragmento = document.createDocumentFragment();


    registrosFiltrados.forEach(registro => {

        fragmento.appendChild(
            criarCartaoRegistro(registro)
        );

    });


    lista.appendChild(fragmento);

}


// =====================================================
// 13. PREENCHER CAMPOS DO PAINEL
// =====================================================

function preencherDetalhe(id, valor) {

    const campo = elementos[id];

    if (!campo) return;

    campo.textContent = obterValor(valor);

}


// =====================================================
// 14. CONSTRUIR SEÇÕES DA INVESTIGAÇÃO
// =====================================================

function criarSecaoDetalhe(titulo, subtitulo = "") {

    const secao = criarElemento(
        "section",
        "pericia-secao-detalhe"
    );

    const cabecalho = criarElemento(
        "div",
        "pericia-secao-cabecalho"
    );

    cabecalho.appendChild(
        criarElemento("h3", "", titulo)
    );

    if (subtitulo) {
        cabecalho.appendChild(
            criarElemento("p", "", subtitulo)
        );
    }

    secao.appendChild(cabecalho);

    const grade = criarElemento(
        "div",
        "pericia-grade-detalhes"
    );

    secao.appendChild(grade);

    return {
        secao,
        grade
    };

}


function adicionarCampoDetalhe(grade, rotulo, valor, classe = "") {

    const campo = criarElemento(
        "div",
        `pericia-campo-detalhe ${classe}`.trim()
    );

    campo.appendChild(
        criarElemento("span", "pericia-campo-rotulo", rotulo)
    );

    campo.appendChild(
        criarElemento(
            "strong",
            "pericia-campo-valor",
            obterValor(valor)
        )
    );

    grade.appendChild(campo);

}


function adicionarTextoDetalhe(grade, rotulo, valor) {

    const campo = criarElemento(
        "div",
        "pericia-campo-detalhe pericia-campo-completo"
    );

    campo.appendChild(
        criarElemento("span", "pericia-campo-rotulo", rotulo)
    );

    campo.appendChild(
        criarElemento(
            "p",
            "pericia-campo-texto",
            obterValor(valor)
        )
    );

    grade.appendChild(campo);

}


// =====================================================
// 15. RENDERIZAR OBJETOS ESTRUTURADOS
// =====================================================

function renderizarObjetoDetalhes(objeto, titulo, destino) {

    if (
        !objeto ||
        typeof objeto !== "object" ||
        Array.isArray(objeto)
    ) {
        return;
    }


    const { secao, grade } = criarSecaoDetalhe(titulo);


    Object.entries(objeto).forEach(([chave, valor]) => {

        if (valor === undefined) return;

        const rotulo = formatarRotulo(chave);

        if (
            valor !== null &&
            typeof valor === "object" &&
            !Array.isArray(valor)
        ) {

            const bloco = criarElemento(
                "div",
                "pericia-subgrupo"
            );

            bloco.appendChild(
                criarElemento("h4", "", rotulo)
            );

            const subgrade = criarElemento(
                "div",
                "pericia-grade-detalhes"
            );

            Object.entries(valor).forEach(([subChave, subValor]) => {

                adicionarCampoDetalhe(
                    subgrade,
                    formatarRotulo(subChave),
                    formatarValorCampo(subChave, subValor)
                );

            });

            bloco.appendChild(subgrade);

            grade.appendChild(bloco);

        } else {

            adicionarCampoDetalhe(
                grade,
                rotulo,
                formatarValorCampo(chave, valor)
            );

        }

    });


    if (grade.children.length > 0) {
        destino.appendChild(secao);
    }

}


// =====================================================
// 16. RENDERIZAR INFORMAÇÕES DA REQUISIÇÃO
// =====================================================

function renderizarRequisicao(registro, destino) {

    const { secao, grade } = criarSecaoDetalhe(
        "Informações da requisição",
        "Dados técnicos da operação registrada no sistema."
    );


    const campos = [

        [
            "Método HTTP",
            obterCampo(registro, "metodoHttp", "metodo_http")
        ],

        [
            "Endpoint",
            obterCampo(registro, "endpoint")
        ],

        [
            "IP de origem",
            obterCampo(registro, "ipOrigem", "ip_origem")
        ],

        [
            "Origem",
            obterCampo(registro, "origem")
        ],

        [
            "Resultado",
            obterCampo(registro, "resultado")
        ],

        [
            "Data e horário",
            formatarData(obterDataRegistro(registro))
        ],

        [
            "User-Agent",
            obterCampo(registro, "userAgent", "user_agent")
        ]

    ];


    campos.forEach(([rotulo, valor]) => {

        if (rotulo === "User-Agent") {

            adicionarTextoDetalhe(
                grade,
                rotulo,
                valor
            );

        } else {

            adicionarCampoDetalhe(
                grade,
                rotulo,
                valor
            );

        }

    });


    destino.appendChild(secao);

}


// =====================================================
// 17. ABRIR DETALHES DO REGISTRO
// =====================================================

function abrirDetalhes(registro) {

    registroSelecionado = registro;

    const detalhes = interpretarDetalhes(
        registro.detalhes
    );


    preencherDetalhe("detalhe-id", registro.id);

    preencherDetalhe(
        "detalhe-usuario",
        `${obterNomeUsuario(registro)} (ID: ${obterIdUsuario(registro)})`
    );

    preencherDetalhe(
        "detalhe-email",
        obterEmailUsuario(registro)
    );

    preencherDetalhe(
        "detalhe-acao",
        obterAcao(registro)
    );

    preencherDetalhe(
        "detalhe-entidade",
        obterCampo(registro, "entidade")
    );

    preencherDetalhe(
        "detalhe-entidade-id",
        obterCampo(registro, "entidadeId", "entidade_id")
    );

    preencherDetalhe(
        "detalhe-ip",
        obterIpRegistro(registro)
    );

    preencherDetalhe(
        "detalhe-data",
        formatarData(obterDataRegistro(registro))
    );


    const descricao = elementos["detalhe-descricao"];

    descricao.replaceChildren();

    descricao.classList.add("detalhes-visuais");


    // -------------------------------------------------
    // RESUMO DO EVENTO
    // -------------------------------------------------

    const resumo = criarSecaoDetalhe(
        "Identificação do evento",
        "Informações principais do registro investigado."
    );


    adicionarCampoDetalhe(
        resumo.grade,
        "Evento",
        obterCampo(detalhes, "evento") ?? obterAcao(registro)
    );

    adicionarCampoDetalhe(
        resumo.grade,
        "Registro",
        `#${obterValor(registro.id)}`
    );

    adicionarCampoDetalhe(
        resumo.grade,
        "Perfil",
        obterPerfilUsuario(registro)
    );

    adicionarCampoDetalhe(
        resumo.grade,
        "Data e horário",
        formatarData(obterDataRegistro(registro))
    );


    const nomeProduto = obterCampo(
        detalhes,
        "nome_produto_snapshot",
        "nomeProdutoSnapshot"
    );

    const produtoId = obterCampo(
        detalhes,
        "produto_id",
        "produtoId"
    );


    if (nomeProduto || produtoId) {

        adicionarCampoDetalhe(
            resumo.grade,
            "Anúncio",
            nomeProduto
        );

        adicionarCampoDetalhe(
            resumo.grade,
            "ID do anúncio",
            produtoId
        );

    }


    descricao.appendChild(resumo.secao);


    // -------------------------------------------------
    // RESPONSÁVEL
    // -------------------------------------------------

    const responsavel = detalhes.responsavel || {};

    const secaoResponsavel = criarSecaoDetalhe(
        "Responsável pela operação",
        "Identificação de quem realizou a ação."
    );


    adicionarCampoDetalhe(
        secaoResponsavel.grade,
        "Nome",
        obterCampo(responsavel, "nome") ??
        obterNomeUsuario(registro)
    );

    adicionarCampoDetalhe(
        secaoResponsavel.grade,
        "E-mail",
        obterCampo(responsavel, "email") ??
        obterEmailUsuario(registro)
    );

    adicionarCampoDetalhe(
        secaoResponsavel.grade,
        "ID do usuário",
        obterCampo(responsavel, "id") ??
        obterIdUsuario(registro)
    );

    adicionarCampoDetalhe(
        secaoResponsavel.grade,
        "Perfil",
        obterCampo(responsavel, "perfil") ??
        obterPerfilUsuario(registro)
    );


    descricao.appendChild(secaoResponsavel.secao);


    // -------------------------------------------------
    // DADOS ESTRUTURADOS
    // -------------------------------------------------

    if (
        detalhes.dados &&
        typeof detalhes.dados === "object"
    ) {

        renderizarObjetoDetalhes(
            detalhes.dados,
            "Dados da operação",
            descricao
        );

    }


    // -------------------------------------------------
    // VALORES ANTERIORES E NOVOS
    // -------------------------------------------------

    const valoresAnteriores = obterCampo(
        detalhes,
        "valoresAnteriores",
        "valores_anteriores"
    );

    const valoresNovos = obterCampo(
        detalhes,
        "valoresNovos",
        "valores_novos"
    );


    if (valoresAnteriores) {

        renderizarObjetoDetalhes(
            valoresAnteriores,
            "Valores anteriores",
            descricao
        );

    }


    if (valoresNovos) {

        renderizarObjetoDetalhes(
            valoresNovos,
            "Valores novos",
            descricao
        );

    }


    // -------------------------------------------------
    // DESCRIÇÃO TEXTUAL
    // -------------------------------------------------

    const mensagem = obterCampo(
        detalhes,
        "mensagem",
        "descricao",
        "detalhes"
    );


    if (
        mensagem &&
        typeof mensagem !== "object"
    ) {

        const secaoDescricao = criarSecaoDetalhe(
            "Descrição da ocorrência"
        );

        adicionarTextoDetalhe(
            secaoDescricao.grade,
            "Descrição",
            mensagem
        );

        descricao.appendChild(secaoDescricao.secao);

    }


    // -------------------------------------------------
    // INFORMAÇÕES TÉCNICAS DA REQUISIÇÃO
    // -------------------------------------------------

    renderizarRequisicao(
        registro,
        descricao
    );


    // -------------------------------------------------
    // EXIBIR PAINEL
    // -------------------------------------------------

    elementos["detalhes-investigacao"].hidden = false;

    elementos["detalhes-investigacao"].scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


// =====================================================
// 18. FECHAR DETALHES
// =====================================================

function fecharDetalhes() {

    elementos["detalhes-investigacao"].hidden = true;

    registroSelecionado = null;

}


// =====================================================
// 19. LIMPAR FILTROS
// =====================================================

function limparFiltros() {

    elementos["pesquisa-caso"].value = "";

    elementos["filtro-usuario"].value = "";

    elementos["filtro-acao"].value = "";

    elementos["filtro-ip"].value = "";

    elementos["data-inicio"].value = "";

    elementos["data-fim"].value = "";

    fecharDetalhes();

    carregarPericia();

}


// =====================================================
// 20. CONFIGURAR OPÇÕES DE AÇÃO
// =====================================================

function configurarAcoes() {

    const select = elementos["filtro-acao"];

    const existentes = new Set(
        Array.from(select.options).map(opcao => opcao.value)
    );


    ACOES_DISPONIVEIS.forEach(acao => {

        if (existentes.has(acao)) return;

        const opcao = document.createElement("option");

        opcao.value = acao;

        opcao.textContent = acao;

        select.appendChild(opcao);

    });

}


// =====================================================
// 21. VALIDAR PERÍODO
// =====================================================

function validarPeriodo() {

    const inicio = elementos["data-inicio"].value;

    const fim = elementos["data-fim"].value;


    if (inicio && fim && inicio > fim) {

        mostrarMensagem(
            "A data inicial não pode ser posterior à data final.",
            "erro"
        );

        return false;

    }

    limparMensagem();

    return true;

}


// =====================================================
// 22. EVENTOS DA INTERFACE
// =====================================================

function configurarEventos() {

    elementos["btn-filtrar"].addEventListener(
        "click",
        () => {

            if (!validarPeriodo()) return;

            fecharDetalhes();

            carregarPericia();

        }
    );


    elementos["btn-limpar-filtros"].addEventListener(
        "click",
        limparFiltros
    );


    elementos["pesquisa-caso"].addEventListener(
        "input",
        aplicarPesquisaLocal
    );


    elementos["fechar-detalhes"].addEventListener(
        "click",
        fecharDetalhes
    );


    [
        elementos["filtro-usuario"],
        elementos["filtro-ip"]
    ].forEach(campo => {

        campo.addEventListener("keydown", evento => {

            if (evento.key === "Enter") {

                evento.preventDefault();

                elementos["btn-filtrar"].click();

            }

        });

    });


    elementos["data-inicio"].addEventListener(
        "change",
        validarPeriodo
    );

    elementos["data-fim"].addEventListener(
        "change",
        validarPeriodo
    );

}


// =====================================================
// 23. INICIALIZAÇÃO
// =====================================================

function iniciarPericia() {

    obterElementos();


    const elementosObrigatorios = [
        "total-registros",
        "total-usuarios",
        "total-acoes",
        "total-ips",

        "pesquisa-caso",
        "filtro-usuario",
        "filtro-acao",
        "filtro-ip",
        "data-inicio",
        "data-fim",

        "btn-filtrar",
        "btn-limpar-filtros",

        "mensagem-pericia",
        "lista-investigacoes",
        "sem-resultados",

        "detalhes-investigacao",
        "fechar-detalhes"
    ];


    const ausentes = elementosObrigatorios.filter(id => {
        return !elementos[id];
    });


    if (ausentes.length > 0) {

        console.error(
            "SafeMarket: elementos obrigatórios ausentes no HTML:",
            ausentes
        );

        return;

    }


    if (typeof window.requisicaoAPI !== "function") {

        mostrarMensagem(
            "O módulo de comunicação com a API não foi carregado.",
            "erro"
        );

        return;

    }


    configurarAcoes();

    configurarEventos();

    carregarPericia();


    console.log(
        "SafeMarket: módulo de perícia digital inicializado."
    );

}


document.addEventListener(
    "DOMContentLoaded",
    iniciarPericia
);
