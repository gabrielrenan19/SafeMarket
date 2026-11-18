
/* =====================================================
   SAFEMARKET — API
   Arquivo: js/api.js

   Comunicação entre Frontend e Spring Boot
===================================================== */

"use strict";


// =====================================================
// 1. CONFIGURAÇÕES
// =====================================================

const API_URL = "http://127.0.0.1:8080/api";

let csrfTokenCache = null;


// =====================================================
// 2. OBTER TOKEN CSRF
// =====================================================

async function obterCsrf(forcarAtualizacao = false) {

    if (forcarAtualizacao) {
        csrfTokenCache = null;
    }

    if (csrfTokenCache) {
        return csrfTokenCache;
    }

    let resposta;

    try {

        resposta = await fetch(`${API_URL}/auth/csrf`, {
            method: "GET",
            credentials: "include",
            headers: {
                Accept: "application/json"
            },
            cache: "no-store"
        });

    } catch (erro) {

        console.error("SafeMarket: erro ao obter CSRF:", erro);

        throw new Error(
            "Não foi possível obter o token de segurança."
        );

    }

    if (!resposta.ok) {
        throw new Error(
            `Falha ao obter CSRF. HTTP ${resposta.status}.`
        );
    }

    const dados = await resposta.json();

    if (!dados || !dados.token) {
        throw new Error(
            "O servidor não retornou um token CSRF válido."
        );
    }

    csrfTokenCache = dados.token;

    return csrfTokenCache;
}


// =====================================================
// 3. IDENTIFICAR MÉTODOS QUE EXIGEM CSRF
// =====================================================

function exigeCSRF(metodo) {

    return [
        "POST",
        "PUT",
        "PATCH",
        "DELETE"
    ].includes(metodo.toUpperCase());

}


// =====================================================
// 4. PREPARAR CORPO DA REQUISIÇÃO
// =====================================================

function prepararCorpo(body) {

    if (
        body === undefined ||
        body === null
    ) {
        return body;
    }

    // FormData deve ser enviado diretamente.
    if (
        typeof FormData !== "undefined" &&
        body instanceof FormData
    ) {
        return body;
    }

    // Tipos que o fetch já sabe enviar diretamente.
    if (
        typeof body === "string" ||
        (typeof Blob !== "undefined" && body instanceof Blob) ||
        (typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer) ||
        (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) ||
        (typeof ReadableStream !== "undefined" && body instanceof ReadableStream) ||
        ArrayBuffer.isView(body)
    ) {
        return body;
    }

    // Objetos e arrays precisam ser serializados.
    if (typeof body === "object") {

        try {
            return JSON.stringify(body);
        } catch (erro) {

            console.error(
                "SafeMarket: erro ao converter dados para JSON.",
                erro
            );

            throw new Error(
                "Não foi possível preparar os dados para envio."
            );

        }

    }

    return body;
}


// =====================================================
// 5. INTERPRETAR RESPOSTA DO SERVIDOR
// =====================================================

async function interpretarResposta(resposta) {

    if (
        resposta.status === 204 ||
        resposta.status === 205
    ) {
        return null;
    }

    const tipoConteudo =
        resposta.headers.get("content-type") || "";

    if (tipoConteudo.includes("json")) {

        try {
            return await resposta.json();
        } catch {
            throw new Error(
                "O servidor retornou uma resposta JSON inválida."
            );
        }

    }

    const texto = await resposta.text();

    return texto || null;
}


// =====================================================
// 6. TRATAR ERROS HTTP
// =====================================================

function criarErroAPI(resposta, dados) {

    const mensagensHTTP = {

        400: "Os dados enviados são inválidos. Confira os campos.",
        401: "Sua sessão expirou ou você não está autenticado.",
        403: "Acesso negado. Verifique suas permissões.",
        404: "A rota ou o recurso solicitado não foi encontrado.",
        409: "Não foi possível concluir a operação devido a um conflito.",
        413: "O arquivo enviado ultrapassa o tamanho permitido.",
        429: "Muitas requisições. Aguarde um momento e tente novamente."

    };

    let mensagemErro =
        mensagensHTTP[resposta.status] ||
        `Erro na requisição: HTTP ${resposta.status}.`;

    if (resposta.status >= 500) {
        mensagemErro =
            "Ocorreu um erro interno no servidor.";
    }

    if (
        dados &&
        typeof dados === "object"
    ) {

        mensagemErro =
            dados.message ||
            dados.mensagem ||
            dados.detail ||
            dados.title ||
            mensagemErro;

    } else if (
        typeof dados === "string" &&
        dados.trim()
    ) {

        mensagemErro = dados;

    }

    const erro = new Error(mensagemErro);

    erro.status = resposta.status;
    erro.dados = dados;

    return erro;
}


// =====================================================
// 7. REQUISIÇÕES À API
// =====================================================

async function requisicaoAPI(endpoint, opcoes = {}) {

    if (
        typeof endpoint !== "string" ||
        !endpoint.trim()
    ) {

        throw new Error(
            "Endpoint da API não informado."
        );

    }

    const metodo = (
        opcoes.method || "GET"
    ).toUpperCase();

    const {
        _csrfTentouNovamente,
        ...opcoesFetch
    } = opcoes;


    // -----------------------------------------------
    // 7.1. PREPARAR ENDPOINT
    // -----------------------------------------------

    const caminho = endpoint.startsWith("/")
        ? endpoint
        : `/${endpoint}`;

    const url = `${API_URL}${caminho}`;


    // -----------------------------------------------
    // 7.2. PREPARAR CABEÇALHOS
    // -----------------------------------------------

    const headers = new Headers(
        opcoesFetch.headers || {}
    );

    if (!headers.has("Accept")) {
        headers.set(
            "Accept",
            "application/json"
        );
    }


    // -----------------------------------------------
    // 7.3. PREPARAR CORPO
    // -----------------------------------------------

    const corpoExiste =
        opcoesFetch.body !== undefined &&
        opcoesFetch.body !== null;

    const ehFormData =
        typeof FormData !== "undefined" &&
        opcoesFetch.body instanceof FormData;

    const corpoPreparado = prepararCorpo(
        opcoesFetch.body
    );

    if (
        corpoExiste &&
        !ehFormData &&
        !headers.has("Content-Type")
    ) {

        headers.set(
            "Content-Type",
            "application/json"
        );

    }


    // -----------------------------------------------
    // 7.4. OBTER TOKEN CSRF
    // -----------------------------------------------

    if (exigeCSRF(metodo)) {

        const token = await obterCsrf();

        headers.set(
            "X-XSRF-TOKEN",
            token
        );

    }


    // -----------------------------------------------
    // 7.5. EXECUTAR REQUISIÇÃO
    // -----------------------------------------------

    let resposta;

    try {

        resposta = await fetch(url, {

            ...opcoesFetch,

            method: metodo,

            headers,

            body: corpoPreparado,

            credentials: "include",

            cache: "no-store"

        });

    } catch (erro) {

        console.error(
            "SafeMarket: falha de conexão com a API.",
            erro
        );

        throw new Error(
            "Não foi possível conectar ao servidor. Verifique se o Spring Boot está iniciado."
        );

    }


    // -----------------------------------------------
    // 7.6. INTERPRETAR RESPOSTA
    // -----------------------------------------------

    const dados = await interpretarResposta(resposta);


    // -----------------------------------------------
    // 7.7. ATUALIZAR CSRF APÓS LOGIN OU LOGOUT
    // -----------------------------------------------

    if (
        caminho === "/auth/login" ||
        caminho === "/auth/logout"
    ) {

        csrfTokenCache = null;

    }


    // -----------------------------------------------
    // 7.8. RENOVAR CSRF SE NECESSÁRIO
    // -----------------------------------------------

    if (
        resposta.status === 403 &&
        exigeCSRF(metodo) &&
        !_csrfTentouNovamente
    ) {

        const tokenAnterior = headers.get(
            "X-XSRF-TOKEN"
        );

        csrfTokenCache = null;

        const novoToken = await obterCsrf(true);

        if (novoToken !== tokenAnterior) {

            console.warn(
                "SafeMarket: renovando token CSRF."
            );

            return requisicaoAPI(endpoint, {

                ...opcoesFetch,

                method: metodo,

                headers: {
                    ...Object.fromEntries(headers.entries()),
                    "X-XSRF-TOKEN": novoToken
                },

                _csrfTentouNovamente: true

            });

        }

    }


    // -----------------------------------------------
    // 7.9. VERIFICAR ERROS
    // -----------------------------------------------

    if (!resposta.ok) {

        throw criarErroAPI(
            resposta,
            dados
        );

    }


    // -----------------------------------------------
    // 7.10. RETORNAR DADOS
    // -----------------------------------------------

    return dados;

}


// =====================================================
// 8. DISPONIBILIZAR FUNÇÕES
// =====================================================

window.requisicaoAPI = requisicaoAPI;

window.obterCsrf = obterCsrf;


// =====================================================
// 9. CONFIRMAÇÃO DE CARREGAMENTO
// =====================================================

console.log(
    "SafeMarket: módulo de comunicação com a API carregado."
);
