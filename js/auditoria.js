/* ==========================================================
   SAFEMARKET — AUDITORIA E LOGS
   Arquivo: js/auditoria.js

   INTEGRAÇÃO:
   GET /api/admin/auditoria
   GET /api/produtos/admin

   FUNCIONALIDADES:
   - Consulta dos registros reais
   - Indicadores dinâmicos
   - Identificação do responsável por snapshots
   - Nome, e-mail, ID e perfil
   - Identificação real do produto/anúncio
   - Valores anteriores e novos
   - IP, método HTTP e endpoint
   - Data e horário com segundos
   - Filtros por responsável, ação, grupo,
     resultado e data
   - Pesquisa por informações técnicas
   - Atualização dos registros
   - Proteção contra HTML injetado
========================================================== */

(() => {
    "use strict";

    const API_URL = "http://127.0.0.1:8080/api/admin/auditoria";

    /* ======================================================
       1. ELEMENTOS DA PÁGINA
    ====================================================== */

    const elementos = {
        totalRegistros: document.getElementById("total-registros"),
        totalAcessos: document.getElementById("total-acessos"),
        totalAlteracoes: document.getElementById("total-alteracoes"),
        totalOperacoes: document.getElementById("total-operacoes"),

        pesquisa: document.getElementById("pesquisa-auditoria"),
        filtroResponsavel: document.getElementById("filtro-responsavel"),
        filtroTipo: document.getElementById("filtro-tipo"),
        filtroGrupo: document.getElementById("filtro-status"),
        filtroResultado: document.getElementById("filtro-resultado"),
        filtroData: document.getElementById("filtro-data"),

        limparFiltros: document.getElementById("limpar-filtros"),
        atualizar: document.getElementById("atualizar-auditoria"),

        quantidade: document.getElementById("quantidade-registros"),
        lista: document.getElementById("lista-auditoria"),
        mensagem: document.getElementById("mensagem-auditoria")
    };

    let registros = [];
    let carregando = false;

    // Armazena os nomes dos produtos relacionados aos IDs.
    const nomesProdutos = new Map();

    /* ======================================================
       2. CLASSIFICAÇÃO DAS ATIVIDADES
    ====================================================== */

    const GRUPOS = {
        LOGIN: "ACESSO",
        LOGOUT: "ACESSO",

        CADASTRAR: "ALTERACAO",
        ATUALIZAR: "ALTERACAO",
        EXCLUIR: "ALTERACAO",

        CONSULTAR: "OPERACAO",
        MOVIMENTAR_ESTOQUE: "OPERACAO",
        DENUNCIAR: "OPERACAO"
    };

    const NOMES_ACOES = {
        LOGIN: "Login",
        LOGOUT: "Logout",
        CADASTRAR: "Cadastro",
        ATUALIZAR: "Atualização",
        EXCLUIR: "Exclusão",
        CONSULTAR: "Consulta",
        MOVIMENTAR_ESTOQUE: "Movimentação de estoque",
        DENUNCIAR: "Denúncia"
    };

    const NOMES_ENTIDADES = {
        USUARIO: "Usuário",
        PRODUTO: "Produto",
        DENUNCIA: "Denúncia",
        MOVIMENTACAO_ESTOQUE: "Movimentação de estoque"
    };

    /* ======================================================
       3. SEGURANÇA E UTILITÁRIOS
    ====================================================== */

    function escaparHTML(valor) {
        return String(valor ?? "").replace(
            /[&<>"']/g,
            caractere => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            })[caractere]
        );
    }

    function obterPrimeiro(...valores) {
        return valores.find(valor =>
            valor !== undefined &&
            valor !== null &&
            String(valor).trim() !== ""
        );
    }

    function lerJSON(valor) {
        if (!valor) return {};

        if (typeof valor === "object") {
            return valor;
        }

        if (typeof valor === "string") {
            try {
                const resultado = JSON.parse(valor);

                if (resultado && typeof resultado === "object") {
                    return resultado;
                }
            } catch {
                return {};
            }
        }

        return {};
    }

    function obterDataRegistro(registro) {
        return obterPrimeiro(
            registro.data,
            registro.criadoEm,
            registro.criado_em,
            registro.dataHora,
            registro.data_hora
        );
    }

    function formatarData(valor) {
        if (!valor) return "Data não informada";

        const data = new Date(valor);

        if (Number.isNaN(data.getTime())) {
            return "Data inválida";
        }

        return new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }).format(data);
    }

    function formatarValor(valor, campo = "") {
        if (valor === null || valor === undefined || valor === "") {
            return "Não informado";
        }

        const campoNormalizado = String(campo).toLowerCase();

        if (
            campoNormalizado.includes("preco") ||
            campoNormalizado.includes("price") ||
            campoNormalizado.includes("valor")
        ) {
            const numero = Number(valor);

            if (Number.isFinite(numero)) {
                return numero.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                });
            }
        }

        if (typeof valor === "boolean") {
            return valor ? "Sim" : "Não";
        }

        if (typeof valor === "object") {
            return escaparHTML(JSON.stringify(valor));
        }

        return escaparHTML(valor);
    }

    function normalizarNomeCampo(campo) {
        const nomes = {
            preco: "Preço",
            estoque: "Estoque",
            quantidade: "Quantidade",
            nome: "Nome",
            descricao: "Descrição",
            categoria: "Categoria",
            localizacao: "Localização",
            imagem: "Imagem",
            status: "Status",
            ativo: "Ativo",
            telefone: "Telefone",
            email: "E-mail"
        };

        const chave = String(campo || "").toLowerCase();

        return nomes[chave] ||
            chave.replace(/_/g, " ").replace(/\b\w/g, letra =>
                letra.toUpperCase()
            );
    }

    /* ======================================================
       4. NORMALIZAÇÃO DOS PRODUTOS

       O endpoint /api/produtos/admin retorna registros
       que podem conter o produto dentro da propriedade
       "produto".

       Também aceita respostas em outros formatos.
    ====================================================== */

    function normalizarListaProdutos(resposta) {
        if (Array.isArray(resposta)) {
            return resposta;
        }

        if (!resposta || typeof resposta !== "object") {
            return [];
        }

        const possibilidades = [
            resposta.produtos,
            resposta.content,
            resposta.dados,
            resposta.data,
            resposta.registros,
            resposta.items,
            resposta.resultados
        ];

        for (const possibilidade of possibilidades) {
            if (Array.isArray(possibilidade)) {
                return possibilidade;
            }

            if (possibilidade && typeof possibilidade === "object") {
                const listaInterna = normalizarListaProdutos(
                    possibilidade
                );

                if (listaInterna.length > 0) {
                    return listaInterna;
                }
            }
        }

        return [];
    }

    /* ======================================================
       5. CARREGAMENTO DOS NOMES DOS PRODUTOS

       Faz somente uma consulta para buscar os anúncios.

       Depois relaciona:
       ID do produto -> Nome do produto

       Assim, logs antigos também conseguem exibir o nome
       mesmo quando ele não foi gravado dentro do JSON.
    ====================================================== */

    async function carregarNomesProdutos() {
        if (typeof window.requisicaoAPI !== "function") {
            console.warn(
                "[SafeMarket] requisicaoAPI não está disponível. " +
                "Os nomes serão obtidos dos próprios logs, quando possível."
            );

            return;
        }

        try {
            const resposta = await window.requisicaoAPI(
                "/produtos/admin"
            );

            const listaProdutos = normalizarListaProdutos(resposta);

            if (!Array.isArray(listaProdutos)) {
                return;
            }

            nomesProdutos.clear();

            listaProdutos.forEach(item => {
                if (!item || typeof item !== "object") {
                    return;
                }

                // O endpoint administrativo pode retornar:
                // { produto: { id, nome }, ... }
                // ou diretamente:
                // { id, nome, ... }

                const produto = lerJSON(
                    item.produto ?? item.anuncio ?? item
                );

                const id = obterPrimeiro(
                    produto.id,
                    produto.produtoId,
                    produto.produto_id,
                    item.produtoId,
                    item.produto_id
                );

                const nome = obterPrimeiro(
                    produto.nome,
                    produto.titulo,
                    produto.nomeProduto,
                    produto.nome_produto,
                    item.nomeProduto,
                    item.nome_produto
                );

                if (
                    id !== undefined &&
                    id !== null &&
                    nome
                ) {
                    nomesProdutos.set(
                        String(id),
                        String(nome)
                    );
                }
            });

            console.info(
                `[SafeMarket] ${nomesProdutos.size} nome(s) de produto carregado(s).`
            );

        } catch (erro) {
            // A falha desta consulta não deve impedir
            // a exibição dos registros de auditoria.

            console.warn(
                "[SafeMarket] Não foi possível carregar os nomes dos anúncios:",
                erro
            );
        }
    }

    /* ======================================================
       6. INTERPRETAÇÃO DOS DETALHES DA AUDITORIA
    ====================================================== */

    function obterInformacoes(registro) {
        const detalhes = lerJSON(
            registro.detalhes ??
            registro.detalhesJson ??
            registro.detalhes_json
        );

        const envelope = lerJSON(
            detalhes.dados ?? detalhes
        );

        const dados = lerJSON(
            envelope.dados ?? envelope
        );

        const responsavel = lerJSON(
            envelope.responsavel ??
            detalhes.responsavel ??
            dados.responsavel ??
            {}
        );

        const produtoAnterior = lerJSON(
            dados.produto_anterior ??
            dados.produtoAnterior ??
            envelope.produto_anterior ??
            envelope.produtoAnterior ??
            {}
        );

        const produtoNovo = lerJSON(
            dados.produto_novo ??
            dados.produtoNovo ??
            envelope.produto_novo ??
            envelope.produtoNovo ??
            {}
        );

        // Alguns registros antigos guardam o produto
        // diretamente em dados.produto ou dados.anuncio.

        const produtoDetalhes = lerJSON(
            dados.produto ??
            dados.anuncio ??
            envelope.produto ??
            envelope.anuncio ??
            {}
        );

        const usuarioId = obterPrimeiro(
            registro.usuarioId,
            registro.usuario_id,
            responsavel.id
        );

        const usuarioNome = obterPrimeiro(
            registro.usuarioNomeSnapshot,
            registro.usuario_nome_snapshot,
            registro.usuarioNome,
            registro.usuario_nome,
            responsavel.nome,
            registro.nomeUsuario,
            registro.nome_usuario
        );

        const usuarioEmail = obterPrimeiro(
            registro.usuarioEmailSnapshot,
            registro.usuario_email_snapshot,
            registro.usuarioEmail,
            registro.usuario_email,
            responsavel.email,
            registro.emailUsuario,
            registro.email_usuario
        );

        const usuarioPerfil = obterPrimeiro(
            registro.usuarioPerfilSnapshot,
            registro.usuario_perfil_snapshot,
            registro.usuarioPerfil,
            registro.usuario_perfil,
            responsavel.perfil
        );

        const ip = obterPrimeiro(
            registro.ipOrigem,
            registro.ip_origem,
            registro.ip,
            registro.enderecoIp,
            registro.endereco_ip
        );

        const metodo = obterPrimeiro(
            registro.metodoHttp,
            registro.metodo_http,
            registro.metodo
        );

        const endpoint = obterPrimeiro(
            registro.endpoint,
            registro.rota,
            registro.url
        );

        const userAgent = obterPrimeiro(
            registro.userAgent,
            registro.user_agent
        );

        const origem = obterPrimeiro(
            registro.origem,
            dados.origem,
            envelope.origem
        );

        const resultado = obterPrimeiro(
            registro.resultado,
            dados.resultado,
            envelope.resultado
        );

        // Busca o nome em diferentes estruturas do JSON.
        const nomeProduto = obterPrimeiro(
            produtoNovo.nome,
            produtoNovo.nomeProduto,
            produtoNovo.nome_produto,

            produtoAnterior.nome,
            produtoAnterior.nomeProduto,
            produtoAnterior.nome_produto,

            produtoDetalhes.nome,
            produtoDetalhes.nomeProduto,
            produtoDetalhes.nome_produto,

            dados.produto_nome,
            dados.produtoNome,
            dados.nome_produto,
            dados.nomeProduto,
            dados.anuncio_nome,
            dados.anuncioNome,

            envelope.produto_nome,
            envelope.produtoNome,
            envelope.nome_produto,
            envelope.nomeProduto,

            registro.produtoNome,
            registro.produto_nome,
            registro.nomeProduto,
            registro.nome_produto
        );

        const camposAlterados = lerJSON(
            dados.campos_alterados ??
            dados.camposAlterados ??
            envelope.campos_alterados ??
            envelope.camposAlterados ??
            {}
        );

        return {
            detalhes,
            envelope,
            dados,
            responsavel,

            produtoAnterior,
            produtoNovo,
            produtoDetalhes,

            camposAlterados,

            usuarioId,
            usuarioNome,
            usuarioEmail,
            usuarioPerfil,

            ip,
            metodo,
            endpoint,
            userAgent,
            origem,
            resultado,

            nomeProduto
        };
    }

    /* ======================================================
       7. DESCRIÇÃO E IDENTIFICAÇÃO DO REGISTRO
    ====================================================== */

    function obterDescricao(registro) {
        const info = obterInformacoes(registro);

        const descricao = obterPrimeiro(
            registro.descricao,
            info.dados.mensagem,
            info.envelope.evento,
            info.detalhes.mensagem
        );

        if (!descricao) {
            return "Nenhuma descrição adicional registrada.";
        }

        if (typeof descricao === "object") {
            return descricao.mensagem ||
                JSON.stringify(descricao);
        }

        return String(descricao);
    }

    function obterEntidade(registro) {
        return obterPrimeiro(
            registro.entidade,
            registro.entidadeNome,
            registro.entidade_nome,
            "Não informada"
        );
    }

    function obterIdEntidade(registro) {
        const info = obterInformacoes(registro);

        return obterPrimeiro(
            registro.entidadeId,
            registro.entidade_id,
            info.dados.produto_id,
            info.dados.produtoId,
            info.dados.anuncio_id,
            info.dados.anuncioId,
            info.produtoNovo.id,
            info.produtoAnterior.id,
            info.produtoDetalhes.id
        );
    }

    function obterResponsavel(registro) {
        const info = obterInformacoes(registro);

        return {
            id: info.usuarioId,
            nome: info.usuarioNome,
            email: info.usuarioEmail,
            perfil: info.usuarioPerfil
        };
    }

    function obterDataComparacao(registro) {
        const valor = obterDataRegistro(registro);

        if (!valor) return "";

        const data = new Date(valor);

        if (Number.isNaN(data.getTime())) {
            return String(valor).substring(0, 10);
        }

        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, "0");
        const dia = String(data.getDate()).padStart(2, "0");

        return `${ano}-${mes}-${dia}`;
    }

    /* ======================================================
       8. OBTENÇÃO DO NOME REAL DO PRODUTO

       Prioridade:
       1. Nome registrado no próprio log.
       2. Nome encontrado na consulta dos produtos.
       3. Identificação pelo ID.
    ====================================================== */

    function obterNomeProduto(registro, info = null) {
        const informacoes = info || obterInformacoes(registro);

        const entidade = String(
            obterEntidade(registro)
        ).toUpperCase();

        if (
            entidade !== "PRODUTO" &&
            entidade !== "ANUNCIO" &&
            entidade !== "ANÚNCIO"
        ) {
            return "Não identificado";
        }

        const nomeHistorico = obterPrimeiro(
            informacoes.nomeProduto,
            informacoes.produtoNovo.nome,
            informacoes.produtoAnterior.nome,
            informacoes.produtoDetalhes.nome
        );

        if (nomeHistorico) {
            return String(nomeHistorico);
        }

        const id = obterIdEntidade(registro);

        if (id !== undefined && id !== null) {
            const nomeAtual = nomesProdutos.get(String(id));

            if (nomeAtual) {
                return nomeAtual;
            }

            return `Produto #${id}`;
        }

        return "Produto não identificado";
    }

    /* ======================================================
       9. NORMALIZAÇÃO DA RESPOSTA DA AUDITORIA
    ====================================================== */

    function normalizarRegistros(resposta) {
        if (Array.isArray(resposta)) {
            return resposta;
        }

        if (!resposta || typeof resposta !== "object") {
            return [];
        }

        if (Array.isArray(resposta.registros)) {
            return resposta.registros;
        }

        if (Array.isArray(resposta.content)) {
            return resposta.content;
        }

        if (Array.isArray(resposta.auditoria)) {
            return resposta.auditoria;
        }

        if (Array.isArray(resposta.dados)) {
            return resposta.dados;
        }

        return [];
    }

    /* ======================================================
       10. MENSAGENS
    ====================================================== */

    function mostrarMensagem(texto, tipo = "info") {
        if (!elementos.mensagem) return;

        elementos.mensagem.textContent = texto;
        elementos.mensagem.dataset.tipo = tipo;
        elementos.mensagem.classList.add("visivel");
    }

    function limparMensagem() {
        if (!elementos.mensagem) return;

        elementos.mensagem.textContent = "";
        elementos.mensagem.classList.remove("visivel");

        delete elementos.mensagem.dataset.tipo;
    }

    /* ======================================================
       11. CONSULTA AO BACKEND
    ====================================================== */

    async function carregarAuditoria() {
        if (carregando) return;

        carregando = true;

        limparMensagem();

        if (elementos.atualizar) {
            elementos.atualizar.disabled = true;
        }

        if (elementos.quantidade) {
            elementos.quantidade.textContent =
                "Consultando registros...";
        }

        if (elementos.lista) {
            elementos.lista.innerHTML = `
                <div class="estado-carregamento">
                    <i data-lucide="loader-circle"></i>
                    <p>Consultando banco de dados...</p>
                    <span>Aguarde enquanto carregamos o histórico.</span>
                </div>
            `;
        }

        atualizarIcones();

        try {
            const resposta = await fetch(API_URL, {
                method: "GET",
                credentials: "include",
                headers: {
                    "Accept": "application/json"
                }
            });

            if (resposta.status === 401) {
                throw new Error(
                    "Sua sessão expirou. Entre novamente no sistema."
                );
            }

            if (resposta.status === 403) {
                throw new Error(
                    "Acesso negado. É necessário ter permissão de administrador."
                );
            }

            if (!resposta.ok) {
                throw new Error(
                    `Erro ao consultar auditoria: HTTP ${resposta.status}`
                );
            }

            const dados = await resposta.json();

            registros = normalizarRegistros(dados);

            // Consulta os anúncios para relacionar os nomes
            // aos IDs dos produtos registrados nos logs.
            await carregarNomesProdutos();

            atualizarIndicadores();
            aplicarFiltros();

        } catch (erro) {
            console.error(
                "[SafeMarket] Erro na auditoria:",
                erro
            );

            registros = [];

            atualizarIndicadores();

            if (elementos.lista) {
                elementos.lista.innerHTML = `
                    <div class="estado-vazio">
                        <i data-lucide="alert-circle"></i>
                        <h3>Não foi possível carregar os registros</h3>
                        <p>${escaparHTML(erro.message)}</p>
                    </div>
                `;
            }

            if (elementos.quantidade) {
                elementos.quantidade.textContent =
                    "Falha na consulta";
            }

            mostrarMensagem(erro.message, "erro");

            atualizarIcones();

        } finally {
            carregando = false;

            if (elementos.atualizar) {
                elementos.atualizar.disabled = false;
            }
        }
    }

    /* ======================================================
       12. INDICADORES
    ====================================================== */

    function atualizarIndicadores() {
        const total = registros.length;

        const acessos = registros.filter(registro =>
            ["LOGIN", "LOGOUT"].includes(registro.acao)
        ).length;

        const alteracoes = registros.filter(registro =>
            ["CADASTRAR", "ATUALIZAR", "EXCLUIR"]
                .includes(registro.acao)
        ).length;

        const operacoes = registros.filter(registro =>
            [
                "CONSULTAR",
                "MOVIMENTAR_ESTOQUE",
                "DENUNCIAR"
            ].includes(registro.acao)
        ).length;

        if (elementos.totalRegistros) {
            elementos.totalRegistros.textContent = total;
        }

        if (elementos.totalAcessos) {
            elementos.totalAcessos.textContent = acessos;
        }

        if (elementos.totalAlteracoes) {
            elementos.totalAlteracoes.textContent = alteracoes;
        }

        if (elementos.totalOperacoes) {
            elementos.totalOperacoes.textContent = operacoes;
        }
    }

    /* ======================================================
       13. FILTROS
    ====================================================== */

    function aplicarFiltros() {
        const pesquisa = elementos.pesquisa?.value
            .trim()
            .toLowerCase() || "";

        const responsavelFiltro =
            elementos.filtroResponsavel?.value
                .trim()
                .toLowerCase() || "";

        const tipo = elementos.filtroTipo?.value || "";
        const grupo = elementos.filtroGrupo?.value || "";

        const resultadoFiltro =
            elementos.filtroResultado?.value || "";

        const dataFiltro = elementos.filtroData?.value || "";

        const filtrados = registros.filter(registro => {
            const info = obterInformacoes(registro);
            const responsavel = obterResponsavel(registro);

            const descricao = obterDescricao(registro);
            const entidade = obterEntidade(registro);
            const entidadeId = obterIdEntidade(registro);

            const nomeProduto = obterNomeProduto(registro, info);

            const textoPesquisa = [
                registro.id,
                info.usuarioId,
                info.usuarioNome,
                info.usuarioEmail,
                info.usuarioPerfil,
                registro.acao,
                entidade,
                entidadeId,
                info.nomeProduto,
                nomeProduto,
                info.ip,
                info.metodo,
                info.endpoint,
                info.resultado,
                descricao
            ].join(" ").toLowerCase();

            const correspondePesquisa =
                !pesquisa || textoPesquisa.includes(pesquisa);

            const textoResponsavel = [
                responsavel.id,
                responsavel.nome,
                responsavel.email,
                responsavel.perfil
            ].join(" ").toLowerCase();

            const correspondeResponsavel =
                !responsavelFiltro ||
                textoResponsavel.includes(responsavelFiltro);

            const correspondeTipo =
                !tipo || registro.acao === tipo;

            const correspondeGrupo =
                !grupo || GRUPOS[registro.acao] === grupo;

            const resultadoNormalizado =
                String(info.resultado || "").toUpperCase();

            const correspondeResultado =
                !resultadoFiltro ||
                resultadoNormalizado === resultadoFiltro;

            const correspondeData =
                !dataFiltro ||
                obterDataComparacao(registro) === dataFiltro;

            return (
                correspondePesquisa &&
                correspondeResponsavel &&
                correspondeTipo &&
                correspondeGrupo &&
                correspondeResultado &&
                correspondeData
            );
        });

        renderizarRegistros(filtrados);
    }

    /* ======================================================
       14. IDENTIFICAÇÃO VISUAL DA AÇÃO
    ====================================================== */

    function iconeAcao(acao) {
        const icones = {
            LOGIN: "log-in",
            LOGOUT: "log-out",
            CADASTRAR: "user-plus",
            ATUALIZAR: "file-pen-line",
            EXCLUIR: "trash-2",
            CONSULTAR: "search",
            MOVIMENTAR_ESTOQUE: "package",
            DENUNCIAR: "flag"
        };

        return icones[acao] || "activity";
    }

    function classeAcao(acao) {
        const classes = {
            LOGIN: "acesso",
            LOGOUT: "acesso",
            CADASTRAR: "cadastro",
            ATUALIZAR: "atualizacao",
            EXCLUIR: "exclusao",
            CONSULTAR: "consulta",
            MOVIMENTAR_ESTOQUE: "estoque",
            DENUNCIAR: "denuncia"
        };

        return classes[acao] || "padrao";
    }

    function nomeAcao(acao) {
        return NOMES_ACOES[acao] || acao || "Atividade não identificada";
    }

    function obterResultadoVisual(resultado) {
        const valor = String(resultado || "").toUpperCase();

        if (valor === "SUCESSO") {
            return {
                texto: "Sucesso",
                classe: "sucesso"
            };
        }

        if (valor === "FALHA" || valor === "ERRO") {
            return {
                texto: "Falha",
                classe: "falha"
            };
        }

        return {
            texto: resultado || "Não informado",
            classe: "indefinido"
        };
    }

    /* ======================================================
       15. RENDERIZAÇÃO DAS ALTERAÇÕES
    ====================================================== */

    function renderizarAlteracoes(info) {
        const campos = info.camposAlterados;

        const nomes = Object.keys(campos || {});

        if (nomes.length === 0) {
            return "";
        }

        const linhas = nomes.map(campo => {
            const alteracao = lerJSON(campos[campo]);

            const anterior = formatarValor(
                alteracao.anterior,
                campo
            );

            const novo = formatarValor(
                alteracao.novo,
                campo
            );

            return `
                <div class="alteracao-campo">
                    <strong>${escaparHTML(normalizarNomeCampo(campo))}</strong>

                    <div class="valores-alteracao">
                        <span class="valor-anterior">
                            ${anterior}
                        </span>

                        <i data-lucide="arrow-right"></i>

                        <span class="valor-novo">
                            ${novo}
                        </span>
                    </div>
                </div>
            `;
        }).join("");

        return `
            <div class="bloco-detalhes-auditoria">
                <div class="titulo-detalhes-auditoria">
                    <i data-lucide="file-pen-line"></i>
                    <strong>Alterações realizadas</strong>
                </div>

                <div class="lista-alteracoes-auditoria">
                    ${linhas}
                </div>
            </div>
        `;
    }

    /* ======================================================
       16. RENDERIZAÇÃO DE UM REGISTRO
    ====================================================== */

    function renderizarRegistro(registro) {
        const info = obterInformacoes(registro);
        const responsavel = obterResponsavel(registro);

        const acao = registro.acao || "";
        const entidade = obterEntidade(registro);
        const entidadeId = obterIdEntidade(registro);

        const data = formatarData(
            obterDataRegistro(registro)
        );

        const resultado = obterResultadoVisual(info.resultado);

        const nomeResponsavel = responsavel.nome ||
            "Responsável não identificado";

        const idResponsavel = responsavel.id != null
            ? `#${escaparHTML(responsavel.id)}`
            : "Não informado";

        const emailResponsavel = responsavel.email ||
            "E-mail não informado";

        const perfilResponsavel = responsavel.perfil ||
            "Perfil não informado";

        const nomeEntidade =
            NOMES_ENTIDADES[String(entidade).toUpperCase()] ||
            entidade;

        const identificacaoEntidade = entidadeId != null
            ? `${nomeEntidade} #${entidadeId}`
            : nomeEntidade;

        // Recupera o nome real do anúncio pelo ID.
        const produto = obterNomeProduto(registro, info);

        const entidadeEhProduto = [
            "PRODUTO",
            "ANUNCIO",
            "ANÚNCIO"
        ].includes(String(entidade).toUpperCase());

        const descricao = obterDescricao(registro);

        const ip = info.ip || "Não informado";
        const metodo = info.metodo || "Não informado";
        const endpoint = info.endpoint || "Não informado";
        const origem = info.origem || "Não informada";

        const userAgent = info.userAgent || "";

        const motivo = obterPrimeiro(
            info.dados.motivo,
            info.dados.justificativa
        );

        const observacoes = info.dados.observacao ||
            info.dados.observacoes;

        const alteracoes = renderizarAlteracoes(info);

        const nomeEvento = nomeAcao(acao);

        // No título, mostra o nome real do anúncio.
        // O ID continua disponível no bloco Entidade.
        const tituloRegistro = entidadeEhProduto
            ? produto
            : identificacaoEntidade;

        const item = document.createElement("article");

        item.className = `item-auditoria registro-${classeAcao(acao)}`;

        item.innerHTML = `
            <div class="icone-registro">
                <i data-lucide="${iconeAcao(acao)}"></i>
            </div>

            <div class="informacoes-registro">

                <!-- IDENTIFICAÇÃO DA ATIVIDADE -->
                <div class="topo-registro">

                    <div class="identificacao-atividade">
                        <span class="etiqueta-acao etiqueta-${classeAcao(acao)}">
                            ${escaparHTML(nomeEvento)}
                        </span>

                        <h3>
                            ${escaparHTML(acao)}
                            - ${escaparHTML(tituloRegistro)}
                        </h3>
                    </div>

                    <span class="identificador-registro">
                        Log #${escaparHTML(registro.id)}
                    </span>

                </div>

                <!-- RESPONSÁVEL -->
                <div class="bloco-detalhes-auditoria">

                    <div class="titulo-detalhes-auditoria">
                        <i data-lucide="user-round"></i>
                        <strong>Responsável pela atividade</strong>
                    </div>

                    <div class="dados-responsavel-auditoria">

                        <div class="campo-dado-auditoria">
                            <span>Nome</span>
                            <strong>${escaparHTML(nomeResponsavel)}</strong>
                        </div>

                        <div class="campo-dado-auditoria">
                            <span>E-mail</span>
                            <strong>${escaparHTML(emailResponsavel)}</strong>
                        </div>

                        <div class="campo-dado-auditoria">
                            <span>Identificação</span>
                            <strong>Usuário ${idResponsavel}</strong>
                        </div>

                        <div class="campo-dado-auditoria">
                            <span>Perfil</span>
                            <strong>${escaparHTML(perfilResponsavel)}</strong>
                        </div>

                    </div>
                </div>

                <!-- ALVO DA OPERAÇÃO -->
                <div class="bloco-detalhes-auditoria">

                    <div class="titulo-detalhes-auditoria">
                        <i data-lucide="package"></i>
                        <strong>Registro afetado</strong>
                    </div>

                    <div class="dados-responsavel-auditoria">

                        <div class="campo-dado-auditoria">
                            <span>Produto ou anúncio</span>
                            <strong>${escaparHTML(produto)}</strong>
                        </div>

                        <div class="campo-dado-auditoria">
                            <span>Entidade</span>
                            <strong>${escaparHTML(identificacaoEntidade)}</strong>
                        </div>

                    </div>

                </div>

                <!-- ALTERAÇÕES -->
                ${alteracoes}

                <!-- DESCRIÇÃO -->
                <div class="descricao-registro">
                    ${escaparHTML(descricao)}
                </div>

                <!-- INFORMAÇÕES TÉCNICAS -->
                <div class="bloco-detalhes-auditoria">

                    <div class="titulo-detalhes-auditoria">
                        <i data-lucide="shield-check"></i>
                        <strong>Informações técnicas</strong>
                    </div>

                    <div class="dados-responsavel-auditoria">

                        <div class="campo-dado-auditoria">
                            <span>Data e horário</span>
                            <strong>${escaparHTML(data)}</strong>
                        </div>

                        <div class="campo-dado-auditoria">
                            <span>IP de origem</span>
                            <strong>${escaparHTML(ip)}</strong>
                        </div>

                        <div class="campo-dado-auditoria">
                            <span>Método HTTP</span>
                            <strong>${escaparHTML(metodo)}</strong>
                        </div>

                        <div class="campo-dado-auditoria">
                            <span>Origem</span>
                            <strong>${escaparHTML(origem)}</strong>
                        </div>

                        <div class="campo-dado-auditoria campo-endpoint-auditoria">
                            <span>Endpoint</span>
                            <strong>${escaparHTML(endpoint)}</strong>
                        </div>

                    </div>

                    ${motivo ? `
                        <div class="observacao-auditoria">
                            <strong>Motivo:</strong>
                            ${escaparHTML(motivo)}
                        </div>
                    ` : ""}

                    ${observacoes ? `
                        <div class="observacao-auditoria">
                            <strong>Observação:</strong>
                            ${escaparHTML(observacoes)}
                        </div>
                    ` : ""}

                    ${userAgent ? `
                        <details class="dados-navegador-auditoria">
                            <summary>Consultar navegador e dispositivo</summary>
                            <p>${escaparHTML(userAgent)}</p>
                        </details>
                    ` : ""}

                </div>

                <!-- RESULTADO -->
                <div class="rodape-registro-auditoria">

                    <span class="resultado-auditoria resultado-${resultado.classe}">
                        <i data-lucide="${
                            resultado.classe === "sucesso"
                                ? "check-circle-2"
                                : resultado.classe === "falha"
                                    ? "alert-circle"
                                    : "info"
                        }"></i>

                        ${escaparHTML(resultado.texto)}
                    </span>

                    <span class="identificador-registro">
                        Registro #${escaparHTML(registro.id)}
                    </span>

                </div>

            </div>
        `;

        return item;
    }

    /* ======================================================
       17. RENDERIZAÇÃO DA LISTA
    ====================================================== */

    function renderizarRegistros(lista) {
        if (!elementos.lista) return;

        elementos.lista.innerHTML = "";

        if (elementos.quantidade) {
            elementos.quantidade.textContent =
                `${lista.length} registro(s) encontrado(s)`;
        }

        if (lista.length === 0) {
            elementos.lista.innerHTML = `
                <div class="estado-vazio">
                    <i data-lucide="search-x"></i>

                    <h3>Nenhum registro encontrado</h3>

                    <p>
                        Não existem atividades correspondentes
                        aos filtros selecionados.
                    </p>
                </div>
            `;

            atualizarIcones();
            return;
        }

        const fragmento = document.createDocumentFragment();

        lista.forEach(registro => {
            fragmento.appendChild(
                renderizarRegistro(registro)
            );
        });

        elementos.lista.appendChild(fragmento);

        elementos.lista.setAttribute("aria-busy", "false");

        atualizarIcones();
    }

    /* ======================================================
       18. ÍCONES
    ====================================================== */

    function atualizarIcones() {
        if (
            window.lucide &&
            typeof window.lucide.createIcons === "function"
        ) {
            window.lucide.createIcons();
        }
    }

    /* ======================================================
       19. EVENTOS
    ====================================================== */

    function registrarEventos() {
        elementos.pesquisa?.addEventListener(
            "input",
            aplicarFiltros
        );

        elementos.filtroResponsavel?.addEventListener(
            "input",
            aplicarFiltros
        );

        elementos.filtroTipo?.addEventListener(
            "change",
            aplicarFiltros
        );

        elementos.filtroGrupo?.addEventListener(
            "change",
            aplicarFiltros
        );

        elementos.filtroResultado?.addEventListener(
            "change",
            aplicarFiltros
        );

        elementos.filtroData?.addEventListener(
            "change",
            aplicarFiltros
        );

        elementos.limparFiltros?.addEventListener(
            "click",
            () => {
                if (elementos.pesquisa) {
                    elementos.pesquisa.value = "";
                }

                if (elementos.filtroResponsavel) {
                    elementos.filtroResponsavel.value = "";
                }

                if (elementos.filtroTipo) {
                    elementos.filtroTipo.value = "";
                }

                if (elementos.filtroGrupo) {
                    elementos.filtroGrupo.value = "";
                }

                if (elementos.filtroResultado) {
                    elementos.filtroResultado.value = "";
                }

                if (elementos.filtroData) {
                    elementos.filtroData.value = "";
                }

                limparMensagem();
                aplicarFiltros();
            }
        );

        elementos.atualizar?.addEventListener(
            "click",
            carregarAuditoria
        );
    }

    /* ======================================================
       20. INICIALIZAÇÃO
    ====================================================== */

    function iniciar() {
        registrarEventos();
        atualizarIcones();
        carregarAuditoria();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            iniciar,
            { once: true }
        );
    } else {
        iniciar();
    }

})();