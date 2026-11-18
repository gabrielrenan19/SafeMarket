
/* ==========================================================
   SAFEMARKET — MARKETPLACE
   Arquivo: js/marketplace.js

   FUNCIONALIDADES:
   - Carregamento de produtos pela API
   - Identificação do usuário autenticado
   - Controle de acesso ao link Meus anúncios
   - Pesquisa de produtos
   - Filtros por categoria
   - Ordenação
   - Cards padronizados
   - Detalhes do produto
   - Adição ao carrinho
   - Atualização do mini carrinho existente
   - Denúncias de anúncios
   - Exclusão de anúncios pelo proprietário ou administrador
   - Notificações
   - Estados de carregamento, erro e vazio

   IMPORTANTE:
   - Utiliza js/api.js
   - Não cria um segundo carrinho
   - Não altera endpoints do backend
========================================================== */

(() => {
    "use strict";

    /* ======================================================
       01. CONFIGURAÇÕES
    ====================================================== */

    const URL_BACKEND = "http://127.0.0.1:8080";

    const ENDPOINT_PRODUTOS = "/produtos";
    const ENDPOINT_USUARIO = "/auth/me";
    const ENDPOINT_CARRINHO = "/carrinho";
    const ENDPOINT_DENUNCIAS = "/denuncias";

    const MOTIVOS_DENUNCIA = [
        "Produto proibido ou ilegal",
        "Produto falsificado",
        "Anúncio enganoso",
        "Fraude ou tentativa de golpe",
        "Produto diferente da descrição",
        "Conteúdo impróprio",
        "Outro"
    ];

    const CATEGORIAS = {
        todos: "",
        eletronicos: "eletronicos",
        informatica: "informatica",
        celulares: "celulares",
        moveis: "moveis",
        roupas: "roupas",
        outros: "outros"
    };

    /* ======================================================
       02. ESTADO
    ====================================================== */

    let produtos = [];
    let produtosFiltrados = [];

    let usuarioAtual = null;

    let carregandoProdutos = false;
    let carregandoUsuario = false;
    let carregandoCarrinho = false;
    let enviandoDenuncia = false;

    const produtosExcluindo = new Set();

    let notificacaoTimer = null;

    /* ======================================================
       03. ELEMENTOS DO HTML
    ====================================================== */

    const $ = (id) => document.getElementById(id);

    const elementos = {
        listaProdutos: $("lista-produtos"),

        formularioPesquisa: $("form-pesquisa"),
        campoBusca: $("pesquisa-produto"),

        categorias: document.querySelectorAll(
            ".categoria-item[data-categoria]"
        ),

        ordenacao: $("ordenacao"),

        tituloAnuncios: $("titulo-anuncios"),
        textoResultados: $("texto-resultados"),

        carregando: $("carregando"),
        mensagemErro: $("mensagem-erro"),
        estadoVazio: $("estado-vazio"),

        // Localiza o link pelo ID ou pelo endereço.
linkMeusAnuncios:
    $("link-meus-anuncios") ||
    document.querySelector(
        '.market-nav a[href="meus-anuncios.html"]'
    ),

        menuCarrinho: $("menu-carrinho"),
        contadorCarrinho: $("contador-carrinho"),
        listaPreviaCarrinho: $("lista-previa-carrinho"),
        carrinhoVazio: $("carrinho-vazio"),
        totalItensCarrinho: $("total-itens-carrinho"),
        subtotalCarrinho: $("subtotal-carrinho")
    };

    /* ======================================================
       04. FUNÇÕES AUXILIARES
    ====================================================== */

    function escaparHTML(valor) {
        return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[caractere]);
    }

    function normalizarTexto(valor) {
        return String(valor ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function formatarMoeda(valor) {
        const numero = Number(valor);

        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL"
        }).format(Number.isFinite(numero) ? numero : 0);
    }

    function obterIdProduto(produto) {
        return (
            produto?.id ??
            produto?.produtoId ??
            produto?.produto_id ??
            null
        );
    }

    function obterNomeProduto(produto) {
        return (
            produto?.nome ||
            produto?.titulo ||
            produto?.produtoNome ||
            "Produto sem nome"
        );
    }

    function obterPrecoProduto(produto) {
        const preco = Number(
            produto?.preco ??
            produto?.valor ??
            0
        );

        return Number.isFinite(preco) ? preco : 0;
    }

    function obterEstoque(produto) {
        const estoque = Number(
            produto?.estoque ??
            produto?.quantidadeEstoque ??
            0
        );

        return Number.isFinite(estoque) ? estoque : 0;
    }

    function obterDescricao(produto) {
        return (
            produto?.descricao ||
            produto?.detalhes ||
            "Nenhuma descrição informada."
        );
    }

    function obterCategoria(produto) {
        const categoria = produto?.categoria;

        if (typeof categoria === "object" && categoria !== null) {
            return (
                categoria.nome ||
                categoria.descricao ||
                categoria.titulo ||
                "Outros"
            );
        }

        return categoria || "Outros";
    }

    function obterLocalizacao(produto) {
        return (
            produto?.localizacao ||
            produto?.local ||
            produto?.cidade ||
            produto?.endereco ||
            "Localização não informada"
        );
    }

    function obterImagemProduto(produto) {
        return (
            produto?.imagemUrl ||
            produto?.imagem ||
            produto?.urlImagem ||
            produto?.foto ||
            produto?.caminhoImagem ||
            produto?.imagem_url ||
            null
        );
    }

    function produtoDisponivel(produto) {
        return obterEstoque(produto) > 0;
    }

    function formatarImagem(caminho) {
        if (!caminho) {
            return "";
        }

        const imagem = String(caminho).trim();

        if (
            imagem.startsWith("http://") ||
            imagem.startsWith("https://") ||
            imagem.startsWith("data:")
        ) {
            return imagem;
        }

        if (imagem.startsWith("/")) {
            return `${URL_BACKEND}${imagem}`;
        }

        return `${URL_BACKEND}/${imagem.replace(/^\.?\//, "")}`;
    }

    function obterDataProduto(produto) {
        return (
            produto?.criadoEm ||
            produto?.dataCriacao ||
            produto?.createdAt ||
            produto?.dataCadastro ||
            null
        );
    }

    function requisicaoDisponivel() {
        if (typeof window.requisicaoAPI !== "function") {
            console.error(
                "SafeMarket: requisicaoAPI não encontrada. Verifique js/api.js."
            );

            return false;
        }

        return true;
    }

    async function requisicao(endpoint, opcoes = {}) {
        if (!requisicaoDisponivel()) {
            throw new Error(
                "O serviço de comunicação com a API não está disponível."
            );
        }

        return window.requisicaoAPI(endpoint, opcoes);
    }

    function obterListaProdutos(resposta) {
        if (Array.isArray(resposta)) {
            return resposta;
        }

        if (Array.isArray(resposta?.produtos)) {
            return resposta.produtos;
        }

        if (Array.isArray(resposta?.content)) {
            return resposta.content;
        }

        if (Array.isArray(resposta?.data)) {
            return resposta.data;
        }

        return [];
    }

    function obterListaCarrinho(resposta) {
        if (Array.isArray(resposta)) {
            return resposta;
        }

        if (Array.isArray(resposta?.itens)) {
            return resposta.itens;
        }

        if (Array.isArray(resposta?.content)) {
            return resposta.content;
        }

        if (Array.isArray(resposta?.data)) {
            return resposta.data;
        }

        return [];
    }

    /* ======================================================
       05. NOTIFICAÇÕES
    ====================================================== */

    function exibirNotificacao(mensagem, tipo = "sucesso") {
        let notificacao = $("notificacao-marketplace");

        if (!notificacao) {
            notificacao = document.createElement("div");

            notificacao.id = "notificacao-marketplace";
            notificacao.className = "market-notificacao";

            notificacao.setAttribute("role", "status");
            notificacao.setAttribute("aria-live", "polite");

            document.body.appendChild(notificacao);
        }

        notificacao.textContent = mensagem;

        notificacao.className = "market-notificacao";

        if (tipo === "erro") {
            notificacao.classList.add("erro");
        } else if (tipo === "aviso") {
            notificacao.classList.add("aviso");
        }

        notificacao.classList.add("ativa");

        clearTimeout(notificacaoTimer);

        notificacaoTimer = setTimeout(() => {
            notificacao.classList.remove("ativa");
        }, 3500);
    }

    /* ======================================================
       06. USUÁRIO AUTENTICADO
    ====================================================== */

    function atualizarAcessoMeusAnuncios() {
        const link = elementos.linkMeusAnuncios;

        if (!link) {
            return;
        }

        const autenticado = Boolean(usuarioAtual);

        link.hidden = !autenticado;

        link.setAttribute(
            "aria-hidden",
            String(!autenticado)
        );

        link.tabIndex = autenticado ? 0 : -1;
    }

    async function carregarUsuarioAtual() {
        if (carregandoUsuario) {
            return usuarioAtual;
        }

        carregandoUsuario = true;

        try {
            const resposta = await requisicao(
                ENDPOINT_USUARIO,
                { method: "GET" }
            );

            usuarioAtual =
                resposta?.usuario ||
                resposta?.data ||
                resposta ||
                null;

            window.usuarioMarketplace = usuarioAtual;

            atualizarAcessoMeusAnuncios();

            return usuarioAtual;

        } catch (erro) {
            console.warn(
                "Não foi possível identificar o usuário:",
                erro
            );

            usuarioAtual = null;

            window.usuarioMarketplace = null;

            // Se a API não confirmar a sessão, o link permanece oculto.
            atualizarAcessoMeusAnuncios();

            return null;

        } finally {
            carregandoUsuario = false;
        }
    }

    function usuarioPodeDenunciar() {
        return Boolean(usuarioAtual);
    }

    function usuarioEhDono(produto) {
        if (!usuarioAtual || !produto) {
            return false;
        }

        const idUsuario =
            usuarioAtual.id ??
            usuarioAtual.usuarioId ??
            usuarioAtual.usuario_id;

        const idCriador =
            produto.criadoPor?.id ??
            produto.criadoPor ??
            produto.usuario?.id ??
            produto.vendedor?.id ??
            produto.usuarioId ??
            produto.criadoPorId ??
            produto.usuario_id;

        if (idUsuario == null || idCriador == null) {
            return false;
        }

        return String(idUsuario) === String(idCriador);
    }

    function usuarioEhAdministrador() {
        if (!usuarioAtual) {
            return false;
        }

        const perfil = normalizarTexto(
            usuarioAtual.perfil ||
            usuarioAtual.tipo ||
            usuarioAtual.role ||
            usuarioAtual.papel ||
            ""
        );

        if ([
            "admin",
            "administrador",
            "role_admin"
        ].includes(perfil)) {
            return true;
        }

        const autoridades =
            usuarioAtual.authorities ||
            usuarioAtual.autoridades ||
            [];

        return Array.isArray(autoridades) &&
            autoridades.some(autoridade => {
                const valor = typeof autoridade === "object"
                    ? autoridade.authority ||
                      autoridade.nome ||
                      autoridade.name
                    : autoridade;

                return [
                    "role_admin",
                    "admin"
                ].includes(normalizarTexto(valor));
            });
    }

    function usuarioPodeExcluir(produto) {
        return usuarioEhAdministrador() || usuarioEhDono(produto);
    }

    /* ======================================================
       07. ESTADOS DA LISTAGEM
    ====================================================== */

    function ocultarEstados() {
        if (elementos.carregando) {
            elementos.carregando.hidden = true;
        }

        if (elementos.mensagemErro) {
            elementos.mensagemErro.hidden = true;
            elementos.mensagemErro.replaceChildren();
        }

        if (elementos.estadoVazio) {
            elementos.estadoVazio.hidden = true;
        }
    }

    function exibirCarregamento() {
        ocultarEstados();

        if (elementos.carregando) {
            elementos.carregando.hidden = false;
        } else if (elementos.listaProdutos) {
            elementos.listaProdutos.innerHTML = `
                <div class="market-loading">
                    Carregando anúncios...
                </div>
            `;
        }
    }

    function exibirEstadoVazio(mensagem) {
        ocultarEstados();

        if (elementos.estadoVazio) {
            elementos.estadoVazio.hidden = false;

            const paragrafo =
                elementos.estadoVazio.querySelector("p");

            if (paragrafo) {
                paragrafo.textContent = mensagem;
            }

            if (elementos.listaProdutos) {
                elementos.listaProdutos.replaceChildren();
            }

            return;
        }

        if (elementos.listaProdutos) {
            elementos.listaProdutos.innerHTML = `
                <div class="estado-marketplace vazio">
                    <h3>Nenhum produto encontrado</h3>
                    <p>${escaparHTML(mensagem)}</p>
                </div>
            `;
        }
    }

    function exibirErroProdutos(erro) {
        ocultarEstados();

        const mensagem =
            erro?.message ||
            "Ocorreu um erro ao consultar os anúncios.";

        if (elementos.mensagemErro) {
            elementos.mensagemErro.hidden = false;
            elementos.mensagemErro.replaceChildren();

            const texto = document.createElement("p");
            texto.textContent = mensagem;

            const botao = document.createElement("button");

            botao.type = "button";
            botao.className = "botao-tentar-novamente";
            botao.textContent = "Tentar novamente";

            botao.addEventListener("click", carregarProdutos);

            elementos.mensagemErro.append(texto, botao);

            return;
        }

        if (elementos.listaProdutos) {
            elementos.listaProdutos.innerHTML = `
                <div class="estado-marketplace erro">
                    <h3>Não foi possível carregar os produtos</h3>
                    <p>${escaparHTML(mensagem)}</p>
                    <button
                        type="button"
                        class="botao-tentar-novamente"
                        id="btn-recarregar-produtos">
                        Tentar novamente
                    </button>
                </div>
            `;

            $("btn-recarregar-produtos")?.addEventListener(
                "click",
                carregarProdutos
            );
        }
    }

    /* ======================================================
       08. CARREGAMENTO DOS PRODUTOS
    ====================================================== */

    async function carregarProdutos() {
        if (carregandoProdutos) {
            return;
        }

        if (!elementos.listaProdutos) {
            console.error(
                "SafeMarket: #lista-produtos não foi encontrado."
            );

            return;
        }

        carregandoProdutos = true;

        exibirCarregamento();

        try {
            const resposta = await requisicao(
                ENDPOINT_PRODUTOS,
                { method: "GET" }
            );

            produtos = obterListaProdutos(resposta);

            produtos = produtos.filter(produto => {
                const status = normalizarTexto(
                    produto?.statusModeracao ||
                    produto?.status_moderacao ||
                    produto?.status ||
                    "ativo"
                );

                return ![
                    "oculto",
                    "suspenso",
                    "inativo",
                    "bloqueado"
                ].includes(status);
            });

            produtosFiltrados = [...produtos];

            aplicarFiltros();

        } catch (erro) {
            console.error(
                "Erro ao carregar produtos:",
                erro
            );

            produtos = [];
            produtosFiltrados = [];

            exibirErroProdutos(erro);

        } finally {
            carregandoProdutos = false;
        }
    }

    /* ======================================================
       09. PESQUISA E CATEGORIAS
    ====================================================== */

    function obterCategoriaSelecionada() {
        const categoriaAtiva = document.querySelector(
            ".categoria-item.ativo[data-categoria]"
        );

        return categoriaAtiva?.dataset.categoria || "todos";
    }

    function categoriaCorresponde(produto, categoriaSelecionada) {
        if (
            !categoriaSelecionada ||
            categoriaSelecionada === "todos"
        ) {
            return true;
        }

        const categoriaProduto = normalizarTexto(
            obterCategoria(produto)
        );

        const categoriaFiltro = normalizarTexto(
            CATEGORIAS[categoriaSelecionada] ||
            categoriaSelecionada
        );

        if (!categoriaFiltro) {
            return true;
        }

        return (
            categoriaProduto === categoriaFiltro ||
            categoriaProduto.includes(categoriaFiltro)
        );
    }

    function obterFiltros() {
        return {
            busca: normalizarTexto(
                elementos.campoBusca?.value || ""
            ),

            categoria: obterCategoriaSelecionada(),

            ordenacao: elementos.ordenacao?.value || "recentes"
        };
    }

    function aplicarFiltros() {
        const filtros = obterFiltros();

        produtosFiltrados = produtos.filter(produto => {
            const nome = normalizarTexto(
                obterNomeProduto(produto)
            );

            const descricao = normalizarTexto(
                obterDescricao(produto)
            );

            const categoria = normalizarTexto(
                obterCategoria(produto)
            );

            const localizacao = normalizarTexto(
                obterLocalizacao(produto)
            );

            const correspondeBusca =
                !filtros.busca ||
                nome.includes(filtros.busca) ||
                descricao.includes(filtros.busca) ||
                categoria.includes(filtros.busca) ||
                localizacao.includes(filtros.busca);

            const correspondeCategoria =
                categoriaCorresponde(
                    produto,
                    filtros.categoria
                );

            return correspondeBusca && correspondeCategoria;
        });

        ordenarProdutos(filtros.ordenacao);

        atualizarResumoResultados();

        renderizarProdutos();
    }

    function configurarCategoriaAtiva(botaoSelecionado) {
        elementos.categorias.forEach(botao => {
            const ativo = botao === botaoSelecionado;

            botao.classList.toggle("ativo", ativo);

            botao.setAttribute(
                "aria-pressed",
                String(ativo)
            );
        });
    }

    function configurarEventosCategorias() {
        elementos.categorias.forEach(botao => {
            botao.addEventListener("click", () => {
                configurarCategoriaAtiva(botao);
                aplicarFiltros();
            });
        });
    }

    /* ======================================================
       10. ORDENAÇÃO
    ====================================================== */

    function ordenarProdutos(ordenacao) {
        switch (ordenacao) {
            case "menor-preco":
            case "preco-menor":
            case "menor":
                produtosFiltrados.sort(
                    (a, b) =>
                        obterPrecoProduto(a) -
                        obterPrecoProduto(b)
                );
                break;

            case "maior-preco":
            case "preco-maior":
            case "maior":
                produtosFiltrados.sort(
                    (a, b) =>
                        obterPrecoProduto(b) -
                        obterPrecoProduto(a)
                );
                break;

            case "recentes":
            case "mais-recentes":
                produtosFiltrados.sort((a, b) => {
                    const dataA = new Date(
                        obterDataProduto(a) || 0
                    ).getTime();

                    const dataB = new Date(
                        obterDataProduto(b) || 0
                    ).getTime();

                    return dataB - dataA;
                });
                break;

            case "mais-antigos":
                produtosFiltrados.sort((a, b) => {
                    const dataA = new Date(
                        obterDataProduto(a) || 0
                    ).getTime();

                    const dataB = new Date(
                        obterDataProduto(b) || 0
                    ).getTime();

                    return dataA - dataB;
                });
                break;

            default:
                break;
        }
    }

    function atualizarResumoResultados() {
        const quantidade = produtosFiltrados.length;

        if (elementos.textoResultados) {
            elementos.textoResultados.textContent =
                quantidade === 1
                    ? "1 anúncio encontrado"
                    : `${quantidade} anúncios encontrados`;
        }
    }

    /* ======================================================
       11. IMAGENS DOS PRODUTOS
    ====================================================== */

    function criarImagemProduto(produto) {
        const caminho = formatarImagem(
            obterImagemProduto(produto)
        );

        const nome = escaparHTML(
            obterNomeProduto(produto)
        );

        if (!caminho) {
            return `
                <div class="produto-imagem-placeholder">
                    <span aria-hidden="true">📦</span>
                    <small>Imagem não disponível</small>
                </div>
            `;
        }

        return `
            <img
                src="${escaparHTML(caminho)}"
                alt="${nome}"
                loading="lazy"
                class="imagem-anuncio">
            <div class="produto-imagem-placeholder" hidden>
                <span aria-hidden="true">📦</span>
                <small>Imagem não disponível</small>
            </div>
        `;
    }

    function configurarImagensProdutos() {
        document
            .querySelectorAll(".produto-imagem img.imagem-anuncio")
            .forEach(imagem => {
                imagem.addEventListener("error", () => {
                    imagem.hidden = true;

                    const placeholder =
                        imagem.parentElement?.querySelector(
                            ".produto-imagem-placeholder"
                        );

                    if (placeholder) {
                        placeholder.hidden = false;
                    }
                }, { once: true });
            });
    }

    /* ======================================================
       12. CRIAÇÃO DOS CARDS
    ====================================================== */

    function criarCardProduto(produto) {
        const id = obterIdProduto(produto);

        const nome = obterNomeProduto(produto);
        const preco = obterPrecoProduto(produto);
        const estoque = obterEstoque(produto);

        const categoria = obterCategoria(produto);
        const localizacao = obterLocalizacao(produto);
        const descricao = obterDescricao(produto);

        const disponivel = produtoDisponivel(produto);
        const dono = usuarioEhDono(produto);

        const idSeguro = escaparHTML(id);
        const nomeSeguro = escaparHTML(nome);

        const botaoCarrinho = disponivel
            ? `
                <button
                    type="button"
                    class="botao-adicionar-carrinho"
                    data-adicionar-carrinho="${idSeguro}">
                    Adicionar ao carrinho
                </button>
            `
            : `
                <button
                    type="button"
                    class="botao-adicionar-carrinho indisponivel"
                    disabled>
                    Produto indisponível
                </button>
            `;

        const botaoDenuncia = dono
            ? ""
            : `
                <button
                    type="button"
                    class="produto-denunciar"
                    data-denunciar-produto="${idSeguro}"
                    aria-label="Denunciar anúncio de ${nomeSeguro}">
                    Denunciar anúncio
                </button>
            `;

        const botaoExcluir =
            id != null && usuarioPodeExcluir(produto)
                ? `
                    <button
                        type="button"
                        class="produto-excluir"
                        data-excluir-produto="${idSeguro}"
                        aria-label="Excluir anúncio de ${nomeSeguro}">
                        Excluir anúncio
                    </button>
                `
                : "";

        return `
            <article
                class="produto-card"
                data-produto-id="${idSeguro}">

                <a
                    class="produto-card-link"
                    href="produto.html?id=${encodeURIComponent(id)}"
                    aria-label="Ver detalhes de ${nomeSeguro}">

                    <div class="produto-imagem">
                        ${criarImagemProduto(produto)}

                        ${!disponivel
                            ? `<span class="produto-esgotado">Esgotado</span>`
                            : ""}
                    </div>

                    <div class="produto-info">

                        <span class="produto-categoria">
                            ${escaparHTML(categoria)}
                        </span>

                        <h3 class="produto-titulo">
                            ${nomeSeguro}
                        </h3>

                        <p class="produto-descricao">
                            ${escaparHTML(descricao)}
                        </p>

                        <strong class="produto-preco">
                            ${formatarMoeda(preco)}
                        </strong>

                        <div class="produto-detalhes">

                            <span class="produto-localizacao">
                                <span aria-hidden="true">📍</span>
                                ${escaparHTML(localizacao)}
                            </span>

                            <span class="produto-estoque ${!disponivel ? "esgotado" : ""}">
                                ${disponivel
                                    ? `${estoque} disponível(is)`
                                    : "Sem estoque"}
                            </span>

                        </div>

                    </div>
                </a>

                <div class="produto-acoes">
                    ${botaoCarrinho}
                    ${botaoDenuncia}
                    ${botaoExcluir}
                </div>

            </article>
        `;
    }

    /* ======================================================
       13. RENDERIZAÇÃO DOS PRODUTOS
    ====================================================== */

    function renderizarProdutos() {
        const lista = elementos.listaProdutos;

        if (!lista) {
            return;
        }

        ocultarEstados();

        if (produtosFiltrados.length === 0) {
            exibirEstadoVazio(
                produtos.length === 0
                    ? "Ainda não existem anúncios disponíveis."
                    : "Experimente alterar a pesquisa ou selecionar outra categoria."
            );

            return;
        }

        lista.innerHTML = produtosFiltrados
            .map(criarCardProduto)
            .join("");

        configurarImagensProdutos();
    }

    /* ======================================================
       14. NAVEGAÇÃO PARA DETALHES
    ====================================================== */

    function abrirProduto(id) {
        if (id == null) {
            return;
        }

        window.location.href =
            `produto.html?id=${encodeURIComponent(id)}`;
    }

    /* ======================================================
       15. ADICIONAR AO CARRINHO
    ====================================================== */

    async function adicionarAoCarrinho(id, botao = null) {
        if (id == null) {
            exibirNotificacao(
                "Não foi possível identificar o produto.",
                "erro"
            );

            return;
        }

        const produto = produtos.find(item =>
            String(obterIdProduto(item)) === String(id)
        );

        if (!produto) {
            exibirNotificacao(
                "Produto não encontrado.",
                "erro"
            );

            return;
        }

        if (!produtoDisponivel(produto)) {
            exibirNotificacao(
                "Este produto está sem estoque.",
                "erro"
            );

            return;
        }

        if (botao?.disabled) {
            return;
        }

        const textoOriginal = botao?.innerHTML;

        if (botao) {
            botao.disabled = true;
            botao.textContent = "Adicionando...";
        }

        try {
            await requisicao(
                ENDPOINT_CARRINHO,
                {
                    method: "POST",
                    body: JSON.stringify({
                        produtoId: Number(id),
                        quantidade: 1
                    })
                }
            );

            exibirNotificacao(
                "Produto adicionado ao carrinho!",
                "sucesso"
            );

            await atualizarMiniCarrinho();

            window.dispatchEvent(
                new CustomEvent("safemarket:carrinho-atualizado")
            );

            if (botao) {
                botao.textContent = "Adicionado!";
            }

        } catch (erro) {
            console.error(
                "Erro ao adicionar produto ao carrinho:",
                erro
            );

            exibirNotificacao(
                erro?.message ||
                "Não foi possível adicionar o produto ao carrinho.",
                "erro"
            );

            if (botao) {
                botao.innerHTML =
                    textoOriginal || "Adicionar ao carrinho";
            }

        } finally {
            if (botao) {
                botao.disabled = false;
            }
        }
    }

    /* ======================================================
       16. MINI CARRINHO
    ====================================================== */

    function normalizarItemCarrinho(item) {
        const produto = item?.produto || {};

        const quantidade = Math.max(
            0,
            Number(item?.quantidade ?? 0)
        );

        const preco = Number(
            item?.preco ??
            produto?.preco ??
            0
        );

        const subtotalInformado = item?.subtotal;

        const subtotal =
            subtotalInformado != null
                ? Number(subtotalInformado)
                : preco * quantidade;

        return {
            produtoId:
                item?.produtoId ??
                item?.produto_id ??
                produto?.id ??
                item?.id,

            nome:
                item?.nome ||
                produto?.nome ||
                produto?.titulo ||
                "Produto",

            preco,
            quantidade,
            subtotal,

            imagem:
                item?.imagem ||
                item?.imagemUrl ||
                produto?.imagemUrl ||
                produto?.imagem ||
                null
        };
    }

    function criarItemPreviaCarrinho(item) {
        const linha = document.createElement("div");

        linha.className = "item-previa-carrinho";

        const imagem = document.createElement("img");

        imagem.className = "item-previa-imagem";
        imagem.alt = item.nome;

        const caminhoImagem = formatarImagem(item.imagem);

        if (caminhoImagem) {
            imagem.src = caminhoImagem;
        } else {
            imagem.hidden = true;
        }

        imagem.addEventListener("error", () => {
            imagem.hidden = true;
        });

        const informacoes = document.createElement("div");

        informacoes.className = "item-previa-info";

        const nome = document.createElement("strong");

        nome.className = "item-previa-nome";
        nome.textContent = item.nome;

        const quantidade = document.createElement("span");

        quantidade.className = "item-previa-quantidade";
        quantidade.textContent =
            `${item.quantidade} unidade(s)`;

        const preco = document.createElement("span");

        preco.className = "item-previa-preco";
        preco.textContent = formatarMoeda(item.subtotal);

        informacoes.append(
            nome,
            quantidade,
            preco
        );

        linha.append(
            imagem,
            informacoes
        );

        return linha;
    }

    function renderizarMiniCarrinho(itens) {
        const contador = elementos.contadorCarrinho;
        const lista = elementos.listaPreviaCarrinho;

        const totalItens = itens.reduce(
            (total, item) => total + item.quantidade,
            0
        );

        const subtotal = itens.reduce(
            (total, item) => total + item.subtotal,
            0
        );

        if (contador) {
            contador.textContent =
                totalItens > 99
                    ? "99+"
                    : String(totalItens);

            contador.setAttribute(
                "aria-label",
                `${totalItens} item(ns) no carrinho`
            );

            contador.hidden = totalItens === 0;
        }

        if (elementos.totalItensCarrinho) {
            elementos.totalItensCarrinho.textContent =
                String(totalItens);
        }

        if (elementos.subtotalCarrinho) {
            elementos.subtotalCarrinho.textContent =
                formatarMoeda(subtotal);
        }

        if (!lista) {
            return;
        }

        const estadoVazio = elementos.carrinhoVazio;

        lista.replaceChildren();

        if (itens.length === 0) {
            if (estadoVazio) {
                estadoVazio.hidden = false;
                lista.appendChild(estadoVazio);
            } else {
                const vazio = document.createElement("p");

                vazio.id = "carrinho-vazio";
                vazio.className = "carrinho-vazio";
                vazio.textContent =
                    "Seu carrinho está vazio.";

                lista.appendChild(vazio);
            }

            return;
        }

        if (estadoVazio) {
            estadoVazio.hidden = true;
        }

        itens.forEach(item => {
            lista.appendChild(
                criarItemPreviaCarrinho(item)
            );
        });
    }

    async function atualizarMiniCarrinho() {
        if (carregandoCarrinho) {
            return;
        }

        if (
            !elementos.contadorCarrinho &&
            !elementos.listaPreviaCarrinho
        ) {
            return;
        }

        carregandoCarrinho = true;

        try {
            const resposta = await requisicao(
                ENDPOINT_CARRINHO,
                { method: "GET" }
            );

            const itens = obterListaCarrinho(resposta)
                .map(normalizarItemCarrinho)
                .filter(item => item.quantidade > 0);

            renderizarMiniCarrinho(itens);

        } catch (erro) {
            console.error(
                "Erro ao atualizar mini carrinho:",
                erro
            );

        } finally {
            carregandoCarrinho = false;
        }
    }

    function configurarMiniCarrinho() {
        const menu = elementos.menuCarrinho;

        if (!menu) {
            console.warn(
                "Elemento #menu-carrinho não encontrado."
            );

            return;
        }

        menu.addEventListener("toggle", () => {
            if (menu.open) {
                atualizarMiniCarrinho();
            }
        });

        window.addEventListener(
            "safemarket:carrinho-atualizado",
            atualizarMiniCarrinho
        );

        atualizarMiniCarrinho();
    }

    /* ======================================================
       17. MODAL DE DENÚNCIA
    ====================================================== */

    function criarModalDenuncia() {
        let modal = $("modal-denuncia-marketplace");

        if (modal) {
            return modal;
        }

        modal = document.createElement("div");

        modal.id = "modal-denuncia-marketplace";
        modal.className = "modal-denuncia-marketplace";

        modal.innerHTML = `
            <div
                class="modal-denuncia-conteudo"
                role="dialog"
                aria-modal="true"
                aria-labelledby="titulo-modal-denuncia">

                <button
                    type="button"
                    class="modal-denuncia-fechar"
                    aria-label="Fechar">
                    &times;
                </button>

                <h2 id="titulo-modal-denuncia">
                    Denunciar anúncio
                </h2>

                <p>
                    Informe o motivo da denúncia.
                    Nossa equipe poderá analisar o anúncio.
                </p>

                <form id="form-denuncia-marketplace">

                    <input
                        type="hidden"
                        id="denuncia-produto-id">

                    <label for="denuncia-motivo">
                        Motivo da denúncia
                    </label>

                    <select
                        id="denuncia-motivo"
                        name="motivo"
                        required>

                        <option value="">
                            Selecione um motivo
                        </option>

                        ${MOTIVOS_DENUNCIA.map(motivo => `
                            <option value="${escaparHTML(motivo)}">
                                ${escaparHTML(motivo)}
                            </option>
                        `).join("")}

                    </select>

                    <label for="denuncia-descricao">
                        Descrição adicional
                        <span>(opcional)</span>
                    </label>

                    <textarea
                        id="denuncia-descricao"
                        name="descricao"
                        rows="4"
                        maxlength="1000"
                        placeholder="Explique o que aconteceu..."></textarea>

                    <div class="modal-denuncia-acoes">

                        <button
                            type="button"
                            class="botao-cancelar-denuncia">
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            class="botao-enviar-denuncia">
                            Enviar denúncia
                        </button>

                    </div>

                </form>
            </div>
        `;

        document.body.appendChild(modal);

        adicionarEventosModalDenuncia(modal);

        return modal;
    }

    function adicionarEventosModalDenuncia(modal) {
        modal.querySelector(
            ".modal-denuncia-fechar"
        )?.addEventListener("click", fecharModalDenuncia);

        modal.querySelector(
            ".botao-cancelar-denuncia"
        )?.addEventListener("click", fecharModalDenuncia);

        modal.addEventListener("click", evento => {
            if (evento.target === modal) {
                fecharModalDenuncia();
            }
        });

        modal.querySelector(
            "#form-denuncia-marketplace"
        )?.addEventListener("submit", enviarDenuncia);

        document.addEventListener("keydown", evento => {
            if (
                evento.key === "Escape" &&
                modal.classList.contains("ativo")
            ) {
                fecharModalDenuncia();
            }
        });
    }

    function abrirModalDenuncia(id) {
        if (!usuarioPodeDenunciar()) {
            exibirNotificacao(
                "Entre na sua conta para denunciar um anúncio.",
                "erro"
            );

            return;
        }

        const produto = produtos.find(item =>
            String(obterIdProduto(item)) === String(id)
        );

        if (!produto) {
            exibirNotificacao(
                "Produto não encontrado.",
                "erro"
            );

            return;
        }

        if (usuarioEhDono(produto)) {
            exibirNotificacao(
                "Você não pode denunciar seu próprio anúncio.",
                "erro"
            );

            return;
        }

        const modal = criarModalDenuncia();

        const campoProduto = $("denuncia-produto-id");
        const campoMotivo = $("denuncia-motivo");
        const campoDescricao = $("denuncia-descricao");

        if (campoProduto) {
            campoProduto.value = id;
        }

        if (campoMotivo) {
            campoMotivo.value = "";
        }

        if (campoDescricao) {
            campoDescricao.value = "";
        }

        modal.classList.add("ativo");

        document.body.classList.add(
            "modal-denuncia-aberto"
        );

        campoMotivo?.focus();
    }

    function fecharModalDenuncia() {
        const modal = $("modal-denuncia-marketplace");

        if (!modal || enviandoDenuncia) {
            return;
        }

        modal.classList.remove("ativo");

        document.body.classList.remove(
            "modal-denuncia-aberto"
        );
    }

    /* ======================================================
       18. ENVIAR DENÚNCIA
    ====================================================== */

    async function enviarDenuncia(evento) {
        evento.preventDefault();

        if (enviandoDenuncia) {
            return;
        }

        const produtoId = $("denuncia-produto-id")?.value;
        const motivo = $("denuncia-motivo")?.value;

        const descricao =
            $("denuncia-descricao")?.value.trim() || "";

        const botao = document.querySelector(
            ".botao-enviar-denuncia"
        );

        if (!produtoId || !motivo) {
            exibirNotificacao(
                "Selecione o motivo da denúncia.",
                "erro"
            );

            return;
        }

        enviandoDenuncia = true;

        const textoOriginal =
            botao?.textContent || "Enviar denúncia";

        if (botao) {
            botao.disabled = true;
            botao.textContent = "Enviando...";
        }

        try {
            await requisicao(
                ENDPOINT_DENUNCIAS,
                {
                    method: "POST",
                    body: JSON.stringify({
                        produtoId: Number(produtoId),
                        motivo,
                        descricao
                    })
                }
            );

            const modal = $("modal-denuncia-marketplace");

            modal?.classList.remove("ativo");

            document.body.classList.remove(
                "modal-denuncia-aberto"
            );

            $("form-denuncia-marketplace")?.reset();

            exibirNotificacao(
                "Denúncia enviada com sucesso. Obrigado por ajudar a manter o SafeMarket seguro.",
                "sucesso"
            );

        } catch (erro) {
            console.error(
                "Erro ao enviar denúncia:",
                erro
            );

            exibirNotificacao(
                erro?.message ||
                "Não foi possível enviar sua denúncia.",
                "erro"
            );

        } finally {
            enviandoDenuncia = false;

            if (botao) {
                botao.disabled = false;
                botao.textContent = textoOriginal;
            }
        }
    }

    /* ======================================================
       19. EXCLUSÃO DE ANÚNCIOS
    ====================================================== */

    async function excluirProduto(id, botao = null) {
        if (id == null || String(id).trim() === "") {
            exibirNotificacao(
                "Não foi possível identificar o anúncio.",
                "erro"
            );

            return;
        }

        const produto = produtos.find(item =>
            String(obterIdProduto(item)) === String(id)
        );

        if (!produto) {
            exibirNotificacao(
                "O anúncio não foi encontrado na listagem.",
                "erro"
            );

            return;
        }

        if (!usuarioPodeExcluir(produto)) {
            exibirNotificacao(
                "Você não tem permissão para excluir este anúncio.",
                "erro"
            );

            return;
        }

        if (produtosExcluindo.has(String(id))) {
            return;
        }

        const nomeProduto = obterNomeProduto(produto);

        const confirmou = window.confirm(
            `Tem certeza de que deseja excluir o anúncio "${nomeProduto}"?\n\nEssa ação não poderá ser desfeita.`
        );

        if (!confirmou) {
            return;
        }

        produtosExcluindo.add(String(id));

        const textoOriginal = botao?.textContent;

        if (botao) {
            botao.disabled = true;
            botao.textContent = "Excluindo...";
        }

        try {
            await requisicao(
                `${ENDPOINT_PRODUTOS}/${encodeURIComponent(id)}`,
                {
                    method: "DELETE"
                }
            );

            produtos = produtos.filter(item =>
                String(obterIdProduto(item)) !== String(id)
            );

            produtosFiltrados = produtosFiltrados.filter(item =>
                String(obterIdProduto(item)) !== String(id)
            );

            aplicarFiltros();

            exibirNotificacao(
                "Anúncio excluído com sucesso!",
                "sucesso"
            );

        } catch (erro) {
            console.error(
                "Erro ao excluir anúncio:",
                erro
            );

            exibirNotificacao(
                erro?.message ||
                "Não foi possível excluir o anúncio. Verifique se ele possui histórico de movimentações ou pedidos.",
                "erro"
            );

        } finally {
            produtosExcluindo.delete(String(id));

            if (botao && botao.isConnected) {
                botao.disabled = false;
                botao.textContent =
                    textoOriginal || "Excluir anúncio";
            }
        }
    }

    /* ======================================================
       20. EVENTOS DOS PRODUTOS
    ====================================================== */

    function configurarEventosProdutos() {
        const lista = elementos.listaProdutos;

        if (!lista) {
            return;
        }

        lista.addEventListener("click", evento => {
            const botaoCarrinho = evento.target.closest(
                "[data-adicionar-carrinho]"
            );

            if (botaoCarrinho) {
                evento.preventDefault();
                evento.stopPropagation();

                adicionarAoCarrinho(
                    botaoCarrinho.dataset.adicionarCarrinho,
                    botaoCarrinho
                );

                return;
            }

            const botaoDenuncia = evento.target.closest(
                "[data-denunciar-produto]"
            );

            if (botaoDenuncia) {
                evento.preventDefault();
                evento.stopPropagation();

                abrirModalDenuncia(
                    botaoDenuncia.dataset.denunciarProduto
                );

                return;
            }

            const botaoExcluir = evento.target.closest(
                "[data-excluir-produto]"
            );

            if (botaoExcluir) {
                evento.preventDefault();
                evento.stopPropagation();

                excluirProduto(
                    botaoExcluir.dataset.excluirProduto,
                    botaoExcluir
                );

                return;
            }
        });
    }

    /* ======================================================
       21. EVENTOS DA PESQUISA E ORDENAÇÃO
    ====================================================== */

    function configurarEventosFiltros() {
        elementos.formularioPesquisa?.addEventListener(
            "submit",
            evento => {
                evento.preventDefault();
                aplicarFiltros();
            }
        );

        elementos.campoBusca?.addEventListener(
            "input",
            aplicarFiltros
        );

        elementos.ordenacao?.addEventListener(
            "change",
            aplicarFiltros
        );

        configurarEventosCategorias();
    }

    /* ======================================================
       22. ATUALIZAÇÃO GERAL
    ====================================================== */

    async function atualizarMarketplace() {
        await carregarProdutos();
        await atualizarMiniCarrinho();
    }

    /* ======================================================
       23. INICIALIZAÇÃO
    ====================================================== */

    async function inicializarMarketplace() {
        // O link começa oculto até a API confirmar a sessão.
        atualizarAcessoMeusAnuncios();

        configurarEventosProdutos();
        configurarEventosFiltros();
        configurarMiniCarrinho();

        await Promise.allSettled([
            carregarUsuarioAtual(),
            carregarProdutos()
        ]);

        renderizarProdutos();
    }

    /* ======================================================
       24. FUNÇÕES PÚBLICAS
    ====================================================== */

    window.atualizarMarketplace = atualizarMarketplace;
    window.recarregarMarketplace = carregarProdutos;
    window.atualizarMiniCarrinho = atualizarMiniCarrinho;
    window.adicionarAoCarrinho = adicionarAoCarrinho;
    window.abrirModalDenuncia = abrirModalDenuncia;
    window.abrirProduto = abrirProduto;
    window.excluirProdutoMarketplace = excluirProduto;

    /* ======================================================
       25. INICIAR
    ====================================================== */

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            inicializarMarketplace,
            { once: true }
        );
    } else {
        inicializarMarketplace();
    }

})();
