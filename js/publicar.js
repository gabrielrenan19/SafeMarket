
/* ==========================================================
   SAFEMARKET - PUBLICAR ANÚNCIO
   Integração com Spring Boot + MySQL

   FRONTEND: Live Server (5500)
   BACKEND: Spring Boot (8080)
   API: js/api.js

   FUNCIONALIDADES:
   - Validação dos campos
   - Validação da quantidade em estoque
   - Preview de imagens
   - Autenticação por sessão HTTP
   - CSRF centralizado no api.js
   - Cadastro de produtos
   - Cadastro do estoque inicial
   - Upload multipart de imagens
   - Proteção contra publicação duplicada
   - Recuperação de publicação pendente
   - Carregamento dinâmico de categorias
   - Criação de novas categorias
   - Verificação de categorias duplicadas
========================================================== */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";

    // =====================================================
    // 1. ELEMENTOS HTML
    // =====================================================

    const formulario = document.getElementById(
        "form-publicar-anuncio"
    );

    const campoTitulo = document.getElementById("titulo");
    const campoDescricao = document.getElementById("descricao");
    const campoCategoria = document.getElementById("categoria");
    const campoNovaCategoria = document.getElementById("nova-categoria");
    const containerNovaCategoria = document.getElementById(
        "container-nova-categoria"
    );

    const contadorNovaCategoria = document.getElementById(
        "contador-nova-categoria"
    );

    const campoPreco = document.getElementById("preco");
    const campoEstoque = document.getElementById("estoque");
    const campoLocalizacao = document.getElementById("localizacao");
    const campoImagem = document.getElementById("imagem");

    const contadorDescricao = document.getElementById(
        "contador-descricao"
    );

    const previewImagem = document.getElementById("preview-imagem");

    const imagemSelecionada = document.getElementById(
        "imagem-selecionada"
    );

    const botaoRemoverImagem = document.getElementById(
        "remover-imagem"
    );

    const mensagem = document.getElementById(
        "mensagem-publicacao"
    );

    const botaoPublicar = document.getElementById(
        "botao-publicar"
    );

    // =====================================================
    // 2. VERIFICAR ELEMENTOS
    // =====================================================

    if (!formulario) {
        console.error(
            "SafeMarket: formulário de publicação não encontrado."
        );
        return;
    }

    const elementosObrigatorios = [
        campoTitulo,
        campoDescricao,
        campoCategoria,
        campoNovaCategoria,
        containerNovaCategoria,
        campoPreco,
        campoEstoque,
        campoLocalizacao,
        campoImagem,
        mensagem,
        botaoPublicar
    ];

    if (elementosObrigatorios.some(elemento => !elemento)) {
        console.error(
            "SafeMarket: existem elementos obrigatórios ausentes no HTML."
        );
        return;
    }

    // =====================================================
    // 3. INTEGRAÇÃO COM API.JS
    // =====================================================

    const chamarAPI =
        typeof window.requisicaoAPI === "function"
            ? window.requisicaoAPI.bind(window)
            : null;

    if (!chamarAPI) {

        console.error(
            "SafeMarket: requisicaoAPI não está disponível."
        );

        mensagem.textContent =
            "Erro de configuração: não foi possível carregar a comunicação com o servidor.";

        mensagem.className = "mensagem-publicacao erro";
        mensagem.hidden = false;

        botaoPublicar.disabled = true;

        return;
    }

    // =====================================================
    // 4. CONFIGURAÇÕES
    // =====================================================

    const TAMANHO_MAXIMO_IMAGEM = 5 * 1024 * 1024;

    const FORMATOS_PERMITIDOS = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    const TAMANHO_MINIMO_TITULO = 5;
    const TAMANHO_MAXIMO_TITULO = 120;

    const TAMANHO_MINIMO_DESCRICAO = 15;
    const TAMANHO_MAXIMO_DESCRICAO = 1000;

    const TAMANHO_MAXIMO_CATEGORIA = 80;
    const TAMANHO_MAXIMO_LOCALIZACAO = 160;

    const PRECO_MAXIMO = 99999999.99;

    const ESTOQUE_MINIMO = 0;
    const ESTOQUE_MAXIMO = 999999;

    const VALOR_NOVA_CATEGORIA = "__nova_categoria__";

    const CHAVE_PUBLICACAO_PENDENTE =
        "safemarket_publicacao_pendente";

    const CATEGORIAS_PADRAO = [
        {
            valor: "eletronicos",
            nome: "Eletrônicos"
        },
        {
            valor: "informatica",
            nome: "Informática"
        },
        {
            valor: "celulares",
            nome: "Celulares e acessórios"
        },
        {
            valor: "moveis",
            nome: "Móveis e decoração"
        },
        {
            valor: "veiculos",
            nome: "Veículos"
        },
        {
            valor: "eletrodomesticos",
            nome: "Eletrodomésticos"
        },
        {
            valor: "moda",
            nome: "Moda e acessórios"
        },
        {
            valor: "esportes",
            nome: "Esportes e lazer"
        }
    ];

    let categoriasDisponiveis = [];

    let urlImagemAtual = null;

    let publicacaoEmAndamento = false;

    let produtoPendenteImagem = recuperarPublicacaoPendente();

    // =====================================================
    // 5. NORMALIZAÇÃO DE CATEGORIAS
    // =====================================================

    function normalizarCategoria(valor) {

        return String(valor || "")
            .trim()
            .replace(/\s+/g, " ");
    }

    function chaveCategoria(valor) {

        return normalizarCategoria(valor)
            .toLocaleLowerCase("pt-BR");
    }

    function categoriaJaExiste(valor) {

        const chave = chaveCategoria(valor);

        return categoriasDisponiveis.some(categoria =>
            chaveCategoria(categoria.valor) === chave
        );
    }

    // =====================================================
    // 6. MENSAGENS
    // =====================================================

    function exibirMensagem(texto, tipo = "aviso") {

        mensagem.textContent = texto;

        mensagem.className =
            `mensagem-publicacao ${tipo}`;

        mensagem.hidden = false;
    }

    function limparMensagem() {

        mensagem.textContent = "";

        mensagem.className = "mensagem-publicacao";

        mensagem.hidden = true;
    }

    // =====================================================
    // 7. VALIDAÇÃO VISUAL
    // =====================================================

    function marcarCampo(campo, invalido) {

        if (!campo) return;

        if (invalido) {
            campo.setAttribute("aria-invalid", "true");
        } else {
            campo.removeAttribute("aria-invalid");
        }
    }

    function limparValidacao(campo) {
        marcarCampo(campo, false);
    }

    // =====================================================
    // 8. CARREGAR CATEGORIAS DO BACKEND
    // =====================================================

    function adicionarCategoriaDisponivel(valor, nomeExibicao = null) {

        const categoria = normalizarCategoria(valor);

        if (!categoria) return;

        if (categoria.length > TAMANHO_MAXIMO_CATEGORIA) {
            return;
        }

        if (categoriaJaExiste(categoria)) {
            return;
        }

        categoriasDisponiveis.push({

            valor: categoria,

            nome: nomeExibicao || categoria

        });
    }

    function atualizarOpcoesCategoria() {

        const valorAnterior = campoCategoria.value;

        campoCategoria.replaceChildren();

        const opcaoInicial = document.createElement("option");

        opcaoInicial.value = "";
        opcaoInicial.textContent = "Selecione uma categoria";

        campoCategoria.appendChild(opcaoInicial);

        categoriasDisponiveis.forEach(categoria => {

            const opcao = document.createElement("option");

            opcao.value = categoria.valor;
            opcao.textContent = categoria.nome;

            campoCategoria.appendChild(opcao);
        });

        const opcaoNova = document.createElement("option");

        opcaoNova.value = VALOR_NOVA_CATEGORIA;
        opcaoNova.textContent = "+ Criar nova categoria";

        campoCategoria.appendChild(opcaoNova);

        if (
            valorAnterior &&
            valorAnterior !== VALOR_NOVA_CATEGORIA &&
            categoriaJaExiste(valorAnterior)
        ) {

            campoCategoria.value = valorAnterior;

        } else {

            campoCategoria.value = "";
        }
    }

    async function carregarCategorias() {

        categoriasDisponiveis = [];

        // Categorias iniciais mantidas no sistema.
        CATEGORIAS_PADRAO.forEach(categoria => {

            adicionarCategoriaDisponivel(
                categoria.valor,
                categoria.nome
            );

        });

        try {

            const resposta = await chamarAPI(
                "/produtos/categorias",
                {
                    method: "GET"
                }
            );

            if (!Array.isArray(resposta)) {

                console.warn(
                    "SafeMarket: o servidor não retornou uma lista válida de categorias."
                );

                atualizarOpcoesCategoria();

                return;
            }

            resposta.forEach(categoria => {

                if (typeof categoria === "string") {

                    adicionarCategoriaDisponivel(categoria);

                }

            });

            console.log(
                "SafeMarket: categorias carregadas.",
                categoriasDisponiveis
            );

        } catch (erro) {

            console.error(
                "SafeMarket: não foi possível carregar as categorias do servidor.",
                erro
            );

            /*
               Se a API estiver indisponível, as categorias
               padrão continuam disponíveis para publicação.
            */

        }

        atualizarOpcoesCategoria();
    }

    // =====================================================
    // 9. CONTROLAR CAMPO DE NOVA CATEGORIA
    // =====================================================

    function atualizarContadorNovaCategoria() {

        if (!contadorNovaCategoria) return;

        const quantidade = campoNovaCategoria.value.length;

        contadorNovaCategoria.textContent =
            `${quantidade}/${TAMANHO_MAXIMO_CATEGORIA}`;
    }

    function atualizarCampoNovaCategoria() {

        const criarNova =
            campoCategoria.value === VALOR_NOVA_CATEGORIA;

        containerNovaCategoria.hidden = !criarNova;

        campoNovaCategoria.required = criarNova;

        if (!criarNova) {

            campoNovaCategoria.value = "";

            limparValidacao(campoNovaCategoria);
        }

        atualizarContadorNovaCategoria();
    }

    campoCategoria.addEventListener("change", () => {

        limparMensagem();

        limparValidacao(campoCategoria);

        atualizarCampoNovaCategoria();

        if (
            campoCategoria.value === VALOR_NOVA_CATEGORIA
        ) {

            campoNovaCategoria.focus();
        }
    });

    campoNovaCategoria.addEventListener("input", () => {

        limparMensagem();

        limparValidacao(campoNovaCategoria);

        atualizarContadorNovaCategoria();
    });

    // =====================================================
    // 10. CONTADOR DE DESCRIÇÃO
    // =====================================================

    function atualizarContadorDescricao() {

        if (!contadorDescricao) return;

        const quantidade = campoDescricao.value.length;

        contadorDescricao.textContent =
            `${quantidade}/${TAMANHO_MAXIMO_DESCRICAO}`;
    }

    campoDescricao.maxLength = TAMANHO_MAXIMO_DESCRICAO;
    campoTitulo.maxLength = TAMANHO_MAXIMO_TITULO;

    campoDescricao.addEventListener(
        "input",
        atualizarContadorDescricao
    );

    atualizarContadorDescricao();
    atualizarContadorNovaCategoria();

    // =====================================================
    // 11. GERENCIAMENTO DE IMAGENS
    // =====================================================

    function liberarUrlImagem() {

        if (!urlImagemAtual) return;

        URL.revokeObjectURL(urlImagemAtual);

        urlImagemAtual = null;
    }

    function removerImagem() {

        campoImagem.value = "";

        liberarUrlImagem();

        if (imagemSelecionada) {
            imagemSelecionada.removeAttribute("src");
        }

        if (previewImagem) {
            previewImagem.hidden = true;
        }
    }

    function exibirPreviewImagem(arquivo) {

        if (!previewImagem || !imagemSelecionada) return;

        liberarUrlImagem();

        urlImagemAtual = URL.createObjectURL(arquivo);

        imagemSelecionada.src = urlImagemAtual;

        previewImagem.hidden = false;
    }

    // =====================================================
    // 12. VALIDAÇÃO DE IMAGEM
    // =====================================================

    function validarImagem(arquivo) {

        if (!arquivo) return true;

        if (!FORMATOS_PERMITIDOS.includes(arquivo.type)) {

            exibirMensagem(
                "Formato inválido. Utilize JPG, PNG ou WEBP.",
                "erro"
            );

            marcarCampo(campoImagem, true);

            return false;
        }

        if (arquivo.size === 0) {

            exibirMensagem(
                "O arquivo selecionado está vazio.",
                "erro"
            );

            marcarCampo(campoImagem, true);

            return false;
        }

        if (arquivo.size > TAMANHO_MAXIMO_IMAGEM) {

            exibirMensagem(
                "A imagem deve ter no máximo 5 MB.",
                "erro"
            );

            marcarCampo(campoImagem, true);

            return false;
        }

        limparValidacao(campoImagem);

        return true;
    }

    // =====================================================
    // 13. SELEÇÃO DE IMAGEM
    // =====================================================

    campoImagem.addEventListener("change", () => {

        limparMensagem();

        const arquivo = campoImagem.files[0];

        if (!arquivo) {
            removerImagem();
            return;
        }

        if (!validarImagem(arquivo)) {

            removerImagem();

            marcarCampo(campoImagem, true);

            campoImagem.focus();

            return;
        }

        exibirPreviewImagem(arquivo);
    });

    // =====================================================
    // 14. REMOVER IMAGEM
    // =====================================================

    if (botaoRemoverImagem) {

        botaoRemoverImagem.addEventListener("click", () => {

            if (produtoPendenteImagem) {

                exibirMensagem(
                    "Existe um produto cadastrado aguardando o envio da imagem. Conclua essa publicação antes de remover o arquivo.",
                    "aviso"
                );

                return;
            }

            removerImagem();

            limparMensagem();

            limparValidacao(campoImagem);
        });
    }

    // =====================================================
    // 15. VALIDAR TÍTULO
    // =====================================================

    function validarTitulo() {

        const titulo = campoTitulo.value.trim();

        if (!titulo) {

            marcarCampo(campoTitulo, true);

            exibirMensagem(
                "Informe o título do anúncio.",
                "erro"
            );

            campoTitulo.focus();

            return false;
        }

        if (titulo.length < TAMANHO_MINIMO_TITULO) {

            marcarCampo(campoTitulo, true);

            exibirMensagem(
                "O título precisa ter pelo menos 5 caracteres.",
                "erro"
            );

            campoTitulo.focus();

            return false;
        }

        if (titulo.length > TAMANHO_MAXIMO_TITULO) {

            marcarCampo(campoTitulo, true);

            exibirMensagem(
                "O título não pode ultrapassar 120 caracteres.",
                "erro"
            );

            campoTitulo.focus();

            return false;
        }

        limparValidacao(campoTitulo);

        return true;
    }

    // =====================================================
    // 16. VALIDAR DESCRIÇÃO
    // =====================================================

    function validarDescricao() {

        const descricao = campoDescricao.value.trim();

        if (!descricao) {

            marcarCampo(campoDescricao, true);

            exibirMensagem(
                "Informe a descrição do produto.",
                "erro"
            );

            campoDescricao.focus();

            return false;
        }

        if (descricao.length < TAMANHO_MINIMO_DESCRICAO) {

            marcarCampo(campoDescricao, true);

            exibirMensagem(
                "A descrição precisa ter pelo menos 15 caracteres.",
                "erro"
            );

            campoDescricao.focus();

            return false;
        }

        if (descricao.length > TAMANHO_MAXIMO_DESCRICAO) {

            marcarCampo(campoDescricao, true);

            exibirMensagem(
                "A descrição não pode ultrapassar 1.000 caracteres.",
                "erro"
            );

            campoDescricao.focus();

            return false;
        }

        limparValidacao(campoDescricao);

        return true;
    }

    // =====================================================
    // 17. VALIDAR CATEGORIA
    // =====================================================

    function validarCategoria() {

        const valorSelecionado = campoCategoria.value;

        if (!valorSelecionado) {

            marcarCampo(campoCategoria, true);

            exibirMensagem(
                "Selecione uma categoria para o produto.",
                "erro"
            );

            campoCategoria.focus();

            return false;
        }

        // Categoria já existente.
        if (valorSelecionado !== VALOR_NOVA_CATEGORIA) {

            const categoria = normalizarCategoria(
                valorSelecionado
            );

            if (!categoria || categoria.length > TAMANHO_MAXIMO_CATEGORIA) {

                marcarCampo(campoCategoria, true);

                exibirMensagem(
                    "Selecione uma categoria válida.",
                    "erro"
                );

                campoCategoria.focus();

                return false;
            }

            limparValidacao(campoCategoria);

            return true;
        }

        // Categoria personalizada.
        const novaCategoria = normalizarCategoria(
            campoNovaCategoria.value
        );

        if (!novaCategoria) {

            marcarCampo(campoNovaCategoria, true);

            exibirMensagem(
                "Digite o nome da nova categoria.",
                "erro"
            );

            campoNovaCategoria.focus();

            return false;
        }

        if (novaCategoria.length > TAMANHO_MAXIMO_CATEGORIA) {

            marcarCampo(campoNovaCategoria, true);

            exibirMensagem(
                "A categoria não pode ultrapassar 80 caracteres.",
                "erro"
            );

            campoNovaCategoria.focus();

            return false;
        }

        if (categoriaJaExiste(novaCategoria)) {

            marcarCampo(campoNovaCategoria, true);

            exibirMensagem(
                "Essa categoria já existe. Selecione a categoria disponível na lista.",
                "erro"
            );

            campoNovaCategoria.focus();

            return false;
        }

        limparValidacao(campoNovaCategoria);
        limparValidacao(campoCategoria);

        return true;
    }

    // =====================================================
    // 18. VALIDAR PREÇO
    // =====================================================

    function validarPreco() {

        const precoTexto = campoPreco.value.trim();

        if (!precoTexto) {

            marcarCampo(campoPreco, true);

            exibirMensagem(
                "Informe o preço do produto.",
                "erro"
            );

            campoPreco.focus();

            return false;
        }

        if (!/^\d+(\.\d{1,2})?$/.test(precoTexto)) {

            marcarCampo(campoPreco, true);

            exibirMensagem(
                "Informe um preço válido com até duas casas decimais.",
                "erro"
            );

            campoPreco.focus();

            return false;
        }

        const preco = Number(precoTexto);

        if (!Number.isFinite(preco) || preco <= 0) {

            marcarCampo(campoPreco, true);

            exibirMensagem(
                "O preço precisa ser maior que zero.",
                "erro"
            );

            campoPreco.focus();

            return false;
        }

        if (preco > PRECO_MAXIMO) {

            marcarCampo(campoPreco, true);

            exibirMensagem(
                "O preço ultrapassa o limite permitido.",
                "erro"
            );

            campoPreco.focus();

            return false;
        }

        limparValidacao(campoPreco);

        return true;
    }

    // =====================================================
    // 19. VALIDAR ESTOQUE
    // =====================================================

    function validarEstoque() {

        const estoqueTexto = campoEstoque.value.trim();

        if (!estoqueTexto) {

            marcarCampo(campoEstoque, true);

            exibirMensagem(
                "Informe a quantidade disponível em estoque.",
                "erro"
            );

            campoEstoque.focus();

            return false;
        }

        if (!/^\d+$/.test(estoqueTexto)) {

            marcarCampo(campoEstoque, true);

            exibirMensagem(
                "A quantidade em estoque deve ser um número inteiro.",
                "erro"
            );

            campoEstoque.focus();

            return false;
        }

        const estoque = Number(estoqueTexto);

        if (!Number.isSafeInteger(estoque)) {

            marcarCampo(campoEstoque, true);

            exibirMensagem(
                "Informe uma quantidade válida.",
                "erro"
            );

            campoEstoque.focus();

            return false;
        }

        if (
            estoque < ESTOQUE_MINIMO ||
            estoque > ESTOQUE_MAXIMO
        ) {

            marcarCampo(campoEstoque, true);

            exibirMensagem(
                "A quantidade deve estar entre 0 e 999.999 unidades.",
                "erro"
            );

            campoEstoque.focus();

            return false;
        }

        limparValidacao(campoEstoque);

        return true;
    }

    // =====================================================
    // 20. VALIDAR LOCALIZAÇÃO
    // =====================================================

    function validarLocalizacao() {

        const localizacao = campoLocalizacao.value.trim();

        if (!localizacao) {

            limparValidacao(campoLocalizacao);

            return true;
        }

        if (localizacao.length > TAMANHO_MAXIMO_LOCALIZACAO) {

            marcarCampo(campoLocalizacao, true);

            exibirMensagem(
                "A localização não pode ultrapassar 160 caracteres.",
                "erro"
            );

            campoLocalizacao.focus();

            return false;
        }

        limparValidacao(campoLocalizacao);

        return true;
    }

    // =====================================================
    // 21. VALIDAÇÃO GERAL
    // =====================================================

    function validarFormulario() {

        if (!validarTitulo()) return false;

        if (!validarDescricao()) return false;

        if (!validarCategoria()) return false;

        if (!validarPreco()) return false;

        if (!validarEstoque()) return false;

        if (!validarLocalizacao()) return false;

        const arquivo = campoImagem.files[0];

        if (!validarImagem(arquivo)) {

            campoImagem.focus();

            return false;
        }

        return true;
    }

    // =====================================================
    // 22. COLETAR DADOS DO ANÚNCIO
    // =====================================================

    function obterDadosAnuncio() {

        let categoria;

        if (
            campoCategoria.value === VALOR_NOVA_CATEGORIA
        ) {

            categoria = normalizarCategoria(
                campoNovaCategoria.value
            );

        } else {

            categoria = normalizarCategoria(
                campoCategoria.value
            );
        }

        return {

            titulo: campoTitulo.value.trim(),

            descricao: campoDescricao.value.trim(),

            categoria: categoria,

            preco: Number(campoPreco.value),

            estoque: Number(campoEstoque.value),

            localizacao: campoLocalizacao.value.trim() || null,

            imagem: campoImagem.files[0] || null
        };
    }

    // =====================================================
    // 23. PUBLICAÇÃO PENDENTE
    // =====================================================

    function recuperarPublicacaoPendente() {

        try {

            const registro = sessionStorage.getItem(
                CHAVE_PUBLICACAO_PENDENTE
            );

            if (!registro) return null;

            const dados = JSON.parse(registro);

            if (
                !dados ||
                dados.id == null ||
                dados.aguardandoImagem !== true
            ) {

                sessionStorage.removeItem(
                    CHAVE_PUBLICACAO_PENDENTE
                );

                return null;
            }

            return {

                id: dados.id,

                imagem: null,

                aguardandoImagem: true
            };

        } catch (erro) {

            console.error(
                "SafeMarket: erro ao recuperar publicação pendente.",
                erro
            );

            return null;
        }
    }

    function salvarPublicacaoPendente(produto) {

        produtoPendenteImagem = produto;

        try {

            sessionStorage.setItem(
                CHAVE_PUBLICACAO_PENDENTE,

                JSON.stringify({

                    id: produto.id,

                    aguardandoImagem: true
                })
            );

        } catch (erro) {

            console.error(
                "SafeMarket: não foi possível salvar a publicação pendente.",
                erro
            );

            exibirMensagem(
                "O produto foi cadastrado, mas não foi possível salvar o controle de recuperação desta publicação no navegador. Não atualize a página antes de concluir o envio da imagem.",
                "aviso"
            );
        }
    }

    function limparPublicacaoPendente() {

        produtoPendenteImagem = null;

        try {

            sessionStorage.removeItem(
                CHAVE_PUBLICACAO_PENDENTE
            );

        } catch (erro) {

            console.error(
                "SafeMarket: erro ao limpar publicação pendente.",
                erro
            );
        }
    }

    // =====================================================
    // 24. CADASTRAR PRODUTO
    // =====================================================

    async function cadastrarProduto(dadosAnuncio) {

        const produto = await chamarAPI(
            "/produtos",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    titulo: dadosAnuncio.titulo,

                    descricao: dadosAnuncio.descricao,

                    categoria: dadosAnuncio.categoria,

                    preco: dadosAnuncio.preco,

                    localizacao: dadosAnuncio.localizacao,

                    estoque: dadosAnuncio.estoque
                })
            }
        );

        if (!produto || produto.id == null) {

            throw new Error(
                "O servidor não retornou o ID do produto cadastrado."
            );
        }

        return produto;
    }

    // =====================================================
    // 25. ENVIAR IMAGEM
    // =====================================================

    async function enviarImagem(produtoId, arquivo) {

        if (!arquivo) {

            throw new Error(
                "Selecione uma imagem para concluir a publicação."
            );
        }

        const dados = new FormData();

        dados.append("imagem", arquivo);

        return await chamarAPI(
            `/produtos/${encodeURIComponent(produtoId)}/imagem`,
            {
                method: "POST",
                body: dados
            }
        );
    }

    // =====================================================
    // 26. FINALIZAR PUBLICAÇÃO
    // =====================================================

    function finalizarPublicacao() {

        limparPublicacaoPendente();

        formulario.reset();

        atualizarContadorDescricao();

        atualizarCampoNovaCategoria();

        removerImagem();

        formulario.querySelectorAll(
            '[aria-invalid="true"]'
        ).forEach(campo => {

            campo.removeAttribute("aria-invalid");
        });

        exibirMensagem(
            "Anúncio publicado com sucesso!",
            "sucesso"
        );

        botaoPublicar.textContent = "Publicar anúncio";
    }

    // =====================================================
    // 27. PROCESSAR PUBLICAÇÃO
    // =====================================================

    async function processarPublicacao() {

        // ---------------------------------------------
        // ETAPA 1: AGUARDAR CARREGAMENTO DAS CATEGORIAS
        // ---------------------------------------------

        await carregamentoCategorias;

        // ---------------------------------------------
        // ETAPA 2: VERIFICAR PUBLICAÇÃO PENDENTE
        // ---------------------------------------------

        if (produtoPendenteImagem) {

            const arquivo = campoImagem.files[0];

            if (!arquivo) {

                exibirMensagem(
                    `O produto ID ${produtoPendenteImagem.id} já foi cadastrado. Selecione novamente a imagem para concluir o envio sem criar outro anúncio.`,
                    "aviso"
                );

                campoImagem.focus();

                return;
            }

            if (!validarImagem(arquivo)) {

                campoImagem.focus();

                return;
            }

            produtoPendenteImagem.imagem = arquivo;

        } else {

            // -----------------------------------------
            // ETAPA 3: VALIDAR FORMULÁRIO
            // -----------------------------------------

            if (!validarFormulario()) return;

            const dadosAnuncio = obterDadosAnuncio();

            // -----------------------------------------
            // ETAPA 4: CADASTRAR PRODUTO
            // -----------------------------------------

            exibirMensagem(
                "Enviando anúncio para o servidor...",
                "aviso"
            );

            const produto = await cadastrarProduto(
                dadosAnuncio
            );

            console.log(
                "SafeMarket: produto cadastrado.",
                produto
            );

            // -----------------------------------------
            // ETAPA 5: PRODUTO SEM IMAGEM
            // -----------------------------------------

            if (!dadosAnuncio.imagem) {

                finalizarPublicacao();

                return;
            }

            // -----------------------------------------
            // ETAPA 6: GUARDAR ID PENDENTE
            // -----------------------------------------

            salvarPublicacaoPendente({

                id: produto.id,

                imagem: dadosAnuncio.imagem,

                aguardandoImagem: true
            });
        }

        // ---------------------------------------------
        // ETAPA 7: ENVIAR IMAGEM
        // ---------------------------------------------

        exibirMensagem(
            "Produto cadastrado. Enviando imagem...",
            "aviso"
        );

        await enviarImagem(
            produtoPendenteImagem.id,
            produtoPendenteImagem.imagem
        );

        console.log(
            "SafeMarket: imagem enviada.",
            produtoPendenteImagem.id
        );

        // ---------------------------------------------
        // ETAPA 8: CONCLUIR
        // ---------------------------------------------

        finalizarPublicacao();

        console.log(
            "SafeMarket: publicação concluída."
        );
    }

    // =====================================================
    // 28. ENVIAR FORMULÁRIO
    // =====================================================

    formulario.addEventListener(
        "submit",
        async (evento) => {

            evento.preventDefault();

            if (publicacaoEmAndamento) return;

            limparMensagem();

            publicacaoEmAndamento = true;

            botaoPublicar.disabled = true;

            botaoPublicar.textContent = "Publicando...";

            try {

                await processarPublicacao();

            } catch (erro) {

                console.error(
                    "SafeMarket: falha na publicação.",
                    erro
                );

                const mensagemErro =
                    erro && erro.message
                        ? erro.message
                        : "Não foi possível publicar o anúncio.";

                if (produtoPendenteImagem) {

                    exibirMensagem(
                        `O produto ID ${produtoPendenteImagem.id} já foi cadastrado. O envio da imagem ainda não foi concluído. Tente novamente sem criar outro anúncio. Erro: ${mensagemErro}`,
                        "aviso"
                    );

                } else {

                    exibirMensagem(
                        mensagemErro,
                        "erro"
                    );
                }

            } finally {

                publicacaoEmAndamento = false;

                botaoPublicar.disabled = false;

                botaoPublicar.textContent =
                    produtoPendenteImagem
                        ? "Concluir envio da imagem"
                        : "Publicar anúncio";
            }
        }
    );

    // =====================================================
    // 29. LIMPAR MENSAGENS AO EDITAR
    // =====================================================

    formulario.addEventListener(
        "input",
        (evento) => {

            const campo = evento.target;

            if (
                campo.matches("input, textarea, select")
            ) {

                limparMensagem();

                limparValidacao(campo);
            }
        }
    );

    formulario.addEventListener(
        "change",
        (evento) => {

            const campo = evento.target;

            if (campo !== campoImagem) {

                limparMensagem();

                limparValidacao(campo);
            }
        }
    );

    // =====================================================
    // 30. LIMPEZA DE RECURSOS
    // =====================================================

    window.addEventListener(
        "beforeunload",
        () => {

            liberarUrlImagem();
        }
    );

    // =====================================================
    // 31. INICIALIZAÇÃO
    // =====================================================

    atualizarCampoNovaCategoria();

    const carregamentoCategorias = carregarCategorias();

    if (produtoPendenteImagem) {

        botaoPublicar.textContent =
            "Concluir envio da imagem";

        exibirMensagem(
            `Foi encontrada uma publicação pendente (ID ${produtoPendenteImagem.id}). Selecione novamente a imagem para concluir o envio.`,
            "aviso"
        );

    } else {

        botaoPublicar.textContent =
            "Publicar anúncio";
    }

    console.log(
        "SafeMarket: módulo de publicação inicializado com api.js."
    );

});
