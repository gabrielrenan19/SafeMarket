
(() => {
    "use strict";

    // ==========================================
    // CONFIGURAÇÕES E ELEMENTOS
    // ==========================================

    const API = window.requisicaoAPI;
    const URL_BASE_BACKEND = "http://127.0.0.1:8080";

    const elementos = {
        total: document.getElementById("total-anuncios"),
        ativos: document.getElementById("total-anuncios-ativos"),
        pendentes: document.getElementById("total-anuncios-pendentes"),
        excluidos: document.getElementById("total-anuncios-excluidos"),

        buscaAtivos: document.getElementById("buscar-anuncio"),
        buscaExcluidos: document.getElementById("buscar-anuncio-excluido"),
        filtro: document.getElementById("filtro-status-anuncio"),

        quantidadeAtivos: document.getElementById("quantidade-anuncios"),
        quantidadeExcluidos: document.getElementById("quantidade-anuncios-excluidos"),

        listaAtivos: document.getElementById("lista-anuncios"),
        listaExcluidos: document.getElementById("lista-anuncios-excluidos"),

        mensagem: document.getElementById("mensagem-anuncios"),

        abas: Array.from(
            document.querySelectorAll("[data-aba-anuncios]")
        ),

        painelAtivos: document.getElementById("painel-ativos"),
        painelExcluidos: document.getElementById("painel-excluidos"),

        contadorAbaAtivos: document.getElementById("contador-aba-ativos"),
        contadorAbaExcluidos: document.getElementById("contador-aba-excluidos")
    };

    let anuncios = [];
    let carregando = false;
    let abaAtual = "ativos";

    const exclusoesEmAndamento = new Set();

    // ==========================================
    // FUNÇÕES AUXILIARES
    // ==========================================

    function escaparHTML(valor) {
        return String(valor ?? "").replace(/[&<>"']/g, caractere => {
            const entidades = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return entidades[caractere];
        });
    }

    function normalizarTexto(valor) {
        return String(valor ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function obterStatus(item) {
        return String(
            item?.statusModeracao ??
            item?.produto?.statusModeracao ??
            item?.status ??
            ""
        ).trim().toUpperCase();
    }

    function obterNomeProduto(produto) {
        return (
            produto?.titulo ||
            produto?.nome ||
            produto?.nomeProduto ||
            "Produto sem nome"
        );
    }

    function obterMensagemErro(erro) {
        if (typeof erro === "string") {
            return erro;
        }

        return (
            erro?.message ||
            erro?.mensagem ||
            erro?.error ||
            "Não foi possível concluir a operação."
        );
    }

    function atualizarIcones() {
        if (window.lucide?.createIcons) {
            window.lucide.createIcons();
        }
    }

    // ==========================================
    // IMAGENS
    // ==========================================

    function obterImagem(produto) {
        const imagem = String(
            produto?.imagemUrl ??
            produto?.imagem ??
            produto?.urlImagem ??
            produto?.foto ??
            produto?.produtoDetalhe?.imagemUrl ??
            ""
        ).trim();

        if (!imagem) {
            return "";
        }

        if (/^https?:\/\//i.test(imagem)) {
            return imagem;
        }

        return `${URL_BASE_BACKEND}/${imagem.replace(/^\/+/, "")}`;
    }

    // ==========================================
    // FORMATAÇÃO
    // ==========================================

    function formatarPreco(valor) {
        const preco = Number(valor);

        if (!Number.isFinite(preco)) {
            return "Preço não informado";
        }

        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL"
        }).format(preco);
    }

    function formatarData(valor) {
        if (!valor) {
            return "Data não informada";
        }

        const data = new Date(valor);

        if (Number.isNaN(data.getTime())) {
            return "Data não informada";
        }

        return data.toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "short"
        });
    }

    function formatarDataCompleta(valor) {
        if (!valor) {
            return "Data e hora não informadas";
        }

        const data = new Date(valor);

        if (Number.isNaN(data.getTime())) {
            return "Data e hora não informadas";
        }

        return data.toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23"
        });
    }

    function obterClasseStatus(status) {
        switch (status) {
            case "ATIVO":
                return "ativo";

            case "PENDENTE":
                return "pendente";

            case "REJEITADO":
                return "rejeitado";

            case "EXCLUIDO":
                return "excluido";

            default:
                return "desconhecido";
        }
    }

    function obterNomeStatus(status) {
        switch (status) {
            case "ATIVO":
                return "Ativo";

            case "PENDENTE":
                return "Pendente";

            case "REJEITADO":
                return "Rejeitado";

            case "EXCLUIDO":
                return "Excluído";

            default:
                return status
                    ? status.replace(/_/g, " ")
                    : "Não informado";
        }
    }

    // ==========================================
    // DESCRIÇÃO E ESPECIFICAÇÕES
    // ==========================================

    /*
     * Converte uma formatação Markdown simples em HTML.
     *
     * São aceitos:
     * - **Texto em negrito**
     * - Listas iniciadas por -
     * - Listas iniciadas por *
     * - Parágrafos separados por linhas em branco
     *
     * O texto é escapado antes da conversão.
     * HTML enviado dentro da descrição não é executado.
     */

    function formatarDescricao(valor) {
        const texto = String(
            valor || "Sem descrição cadastrada."
        ).replace(/\r\n?/g, "\n");

        const linhas = texto.split("\n");

        const resultado = [];

        let paragrafos = [];
        let listaAberta = false;

        function formatarNegrito(linha) {
            return escaparHTML(linha).replace(
                /\*\*(.+?)\*\*/g,
                "<strong>$1</strong>"
            );
        }

        function finalizarParagrafo() {
            if (paragrafos.length === 0) {
                return;
            }

            resultado.push(
                `<p>${paragrafos.join(" ")}</p>`
            );

            paragrafos = [];
        }

        function finalizarLista() {
            if (!listaAberta) {
                return;
            }

            resultado.push("</ul>");
            listaAberta = false;
        }

        linhas.forEach(linha => {
            const conteudo = linha.trim();

            if (!conteudo) {
                finalizarParagrafo();
                finalizarLista();
                return;
            }

            const itemLista = conteudo.match(/^[-*]\s+(.+)$/);

            if (itemLista) {
                finalizarParagrafo();

                if (!listaAberta) {
                    resultado.push("<ul>");
                    listaAberta = true;
                }

                resultado.push(
                    `<li>${formatarNegrito(itemLista[1])}</li>`
                );

                return;
            }

            finalizarLista();

            paragrafos.push(
                formatarNegrito(conteudo)
            );
        });

        finalizarParagrafo();
        finalizarLista();

        return resultado.join("");
    }

    // ==========================================
    // MENSAGENS
    // ==========================================

    function mostrarMensagem(texto, tipo = "") {
        if (!elementos.mensagem) {
            return;
        }

        elementos.mensagem.textContent = texto;
        elementos.mensagem.className = "mensagem-anuncios";

        if (tipo) {
            elementos.mensagem.classList.add(tipo);
        }
    }

    function limparMensagem() {
        if (!elementos.mensagem) {
            return;
        }

        elementos.mensagem.textContent = "";
        elementos.mensagem.className = "mensagem-anuncios";
    }

    // ==========================================
    // EXTRAÇÃO DOS DADOS DA API
    // ==========================================

    function extrairLista(resposta) {
        if (Array.isArray(resposta)) {
            return resposta;
        }

        if (Array.isArray(resposta?.content)) {
            return resposta.content;
        }

        if (Array.isArray(resposta?.dados)) {
            return resposta.dados;
        }

        if (Array.isArray(resposta?.data)) {
            return resposta.data;
        }

        if (Array.isArray(resposta?.produtos)) {
            return resposta.produtos;
        }

        if (Array.isArray(resposta?.dados?.content)) {
            return resposta.dados.content;
        }

        return [];
    }

    function obterDadosExclusao(item) {
        const dados =
            item?.exclusao ??
            item?.dadosExclusao ??
            item?.auditoriaExclusao ??
            item ??
            {};

        return {
            logId:
                dados.logExclusaoId ??
                dados.logIdExclusao ??
                dados.logId ??
                null,

            data:
                dados.excluidoEm ??
                dados.dataExclusao ??
                dados.dataHoraExclusao ??
                null,

            usuarioId:
                dados.excluidoPor ??
                dados.usuarioIdExclusao ??
                dados.responsavelExclusaoId ??
                null,

            nome:
                dados.nomeResponsavelExclusao ??
                dados.nomeExclusor ??
                dados.responsavelExclusao ??
                "",

            email:
                dados.emailResponsavelExclusao ??
                dados.emailExclusor ??
                dados.emailExclusao ??
                "",

            perfil:
                dados.perfilResponsavelExclusao ??
                dados.perfilExclusor ??
                "",

            ip:
                dados.ipExclusao ??
                dados.ipOrigemExclusao ??
                "",

            metodo:
                dados.metodoExclusao ??
                "",

            endpoint:
                dados.endpointExclusao ??
                "",

            userAgent:
                dados.userAgentExclusao ??
                dados.userAgent ??
                ""
        };
    }

    function prepararAnuncios(lista) {
        return lista
            .filter(item => item && item.produto)
            .map(item => ({
                id: item.produto.id,

                produto: item.produto,

                status: obterStatus(item),

                emailPublicador:
                    item.emailPublicador || "",

                criadoPor:
                    item.criadoPor ?? null,

                exclusao:
                    obterDadosExclusao(item)
            }));
    }

    // ==========================================
    // INDICADORES E CONTADORES
    // ==========================================

    function atualizarIndicadores() {
        const total = anuncios.length;

        const ativos = anuncios.filter(
            anuncio => anuncio.status === "ATIVO"
        ).length;

        const pendentes = anuncios.filter(
            anuncio => anuncio.status === "PENDENTE"
        ).length;

        const excluidos = anuncios.filter(
            anuncio => anuncio.status === "EXCLUIDO"
        ).length;

        const naoExcluidos = total - excluidos;

        if (elementos.total) {
            elementos.total.textContent = total;
        }

        if (elementos.ativos) {
            elementos.ativos.textContent = ativos;
        }

        if (elementos.pendentes) {
            elementos.pendentes.textContent = pendentes;
        }

        if (elementos.excluidos) {
            elementos.excluidos.textContent = excluidos;
        }

        if (elementos.contadorAbaAtivos) {
            elementos.contadorAbaAtivos.textContent =
                naoExcluidos;
        }

        if (elementos.contadorAbaExcluidos) {
            elementos.contadorAbaExcluidos.textContent =
                excluidos;
        }
    }

    // ==========================================
    // ABAS: ATIVOS E EXCLUÍDOS
    // ==========================================

    function selecionarAba(nomeAba) {
        if (!["ativos", "excluidos"].includes(nomeAba)) {
            return;
        }

        abaAtual = nomeAba;

        elementos.abas.forEach(aba => {
            const selecionada =
                aba.dataset.abaAnuncios === abaAtual;

            aba.classList.toggle("ativa", selecionada);

            aba.setAttribute(
                "aria-selected",
                String(selecionada)
            );

            aba.tabIndex = selecionada ? 0 : -1;
        });

        if (elementos.painelAtivos) {
            const mostrar = abaAtual === "ativos";

            elementos.painelAtivos.hidden = !mostrar;
            elementos.painelAtivos.classList.toggle(
                "ativo",
                mostrar
            );
        }

        if (elementos.painelExcluidos) {
            const mostrar = abaAtual === "excluidos";

            elementos.painelExcluidos.hidden = !mostrar;
            elementos.painelExcluidos.classList.toggle(
                "ativo",
                mostrar
            );
        }

        renderizarAnuncios();
    }

    // ==========================================
    // FILTRO E PESQUISA
    // ==========================================

    function obterAnunciosFiltrados(tipo) {
        const excluidos = tipo === "excluidos";

        const termo = normalizarTexto(
            excluidos
                ? elementos.buscaExcluidos?.value
                : elementos.buscaAtivos?.value
        );

        const statusSelecionado =
            elementos.filtro?.value || "todos";

        return anuncios.filter(anuncio => {
            const anuncioExcluido =
                anuncio.status === "EXCLUIDO";

            // Separação entre as duas listagens.
            if (excluidos && !anuncioExcluido) {
                return false;
            }

            if (!excluidos && anuncioExcluido) {
                return false;
            }

            const produto = anuncio.produto;

            const nome = normalizarTexto(
                obterNomeProduto(produto)
            );

            const email = normalizarTexto(
                anuncio.emailPublicador
            );

            const nomeResponsavel = normalizarTexto(
                anuncio.exclusao.nome
            );

            const emailResponsavel = normalizarTexto(
                anuncio.exclusao.email
            );

            const id = String(anuncio.id ?? "");

            const correspondePesquisa =
                !termo ||
                nome.includes(termo) ||
                email.includes(termo) ||
                nomeResponsavel.includes(termo) ||
                emailResponsavel.includes(termo) ||
                id.includes(termo);

            const correspondeStatus =
                excluidos ||
                statusSelecionado === "todos" ||
                anuncio.status === statusSelecionado;

            return (
                correspondePesquisa &&
                correspondeStatus
            );
        });
    }

    // ==========================================
    // INFORMAÇÕES DA EXCLUSÃO
    // ==========================================

    function renderizarInformacoesExclusao(exclusao) {
        const nome = escaparHTML(
            exclusao.nome || "Responsável não identificado"
        );

        const email = escaparHTML(
            exclusao.email || "E-mail não registrado"
        );

        const usuarioId = escaparHTML(
            exclusao.usuarioId ?? "Não registrado"
        );

        const perfil = escaparHTML(
            exclusao.perfil || "Não registrado"
        );

        const data = escaparHTML(
            formatarDataCompleta(exclusao.data)
        );

        const ip = escaparHTML(
            exclusao.ip || "Não registrado"
        );

        const logId = escaparHTML(
            exclusao.logId ?? "Não informado"
        );

        const metodo = escaparHTML(
            exclusao.metodo || "Não registrado"
        );

        const endpoint = escaparHTML(
            exclusao.endpoint || "Não registrado"
        );

        const userAgent = escaparHTML(
            exclusao.userAgent || "Não registrado"
        );

        const possuiDados =
            exclusao.logId ||
            exclusao.data ||
            exclusao.usuarioId ||
            exclusao.nome ||
            exclusao.email;

        return `
            <div class="anuncio-exclusao">

                <div class="anuncio-exclusao-titulo">
                    <i data-lucide="shield-check"></i>
                    <strong>Registro da exclusão</strong>
                </div>

                ${
                    possuiDados
                        ? `
                            <div class="anuncio-exclusao-detalhes">

                                <span>
                                    <i data-lucide="calendar-clock"></i>
                                    <strong>Data e hora:</strong>
                                    ${data}
                                </span>

                                <span>
                                    <i data-lucide="user"></i>
                                    <strong>Responsável:</strong>
                                    ${nome}
                                </span>

                                <span>
                                    <i data-lucide="mail"></i>
                                    <strong>E-mail:</strong>
                                    ${email}
                                </span>

                                <span>
                                    <i data-lucide="fingerprint"></i>
                                    <strong>ID do usuário:</strong>
                                    ${usuarioId}
                                </span>

                                <span>
                                    <i data-lucide="shield"></i>
                                    <strong>Perfil:</strong>
                                    ${perfil}
                                </span>

                                <span>
                                    <i data-lucide="network"></i>
                                    <strong>IP de origem:</strong>
                                    ${ip}
                                </span>

                                <span>
                                    <i data-lucide="file-text"></i>
                                    <strong>Log de auditoria:</strong>
                                    #${logId}
                                </span>

                                <span>
                                    <i data-lucide="terminal"></i>
                                    <strong>Método HTTP:</strong>
                                    ${metodo}
                                </span>

                                <span>
                                    <i data-lucide="route"></i>
                                    <strong>Endpoint:</strong>
                                    ${endpoint}
                                </span>

                                <span class="anuncio-dado-tecnico">
                                    <i data-lucide="monitor"></i>
                                    <strong>Navegador:</strong>
                                    ${userAgent}
                                </span>

                            </div>
                        `
                        : `
                            <div class="exclusao-sem-dados">
                                <i data-lucide="alert-circle"></i>

                                <span>
                                    O anúncio está marcado como excluído,
                                    mas os dados detalhados da exclusão
                                    não foram retornados pela API.
                                    É necessário verificar o retorno
                                    administrativo do backend.
                                </span>
                            </div>
                        `
                }

                <div class="anuncio-exclusao-aviso">
                    <i data-lucide="info"></i>

                    <span>
                        Este anúncio foi excluído logicamente.
                        Seus dados e registros históricos foram
                        preservados para consulta e auditoria.
                    </span>
                </div>

            </div>
        `;
    }

    // ==========================================
    // CARD DO ANÚNCIO
    // ==========================================

    function renderizarCard(anuncio) {
        const produto = anuncio.produto;

        const excluido =
            anuncio.status === "EXCLUIDO";

        const id = escaparHTML(anuncio.id);

        const nome = escaparHTML(
            obterNomeProduto(produto)
        );

        const descricao = formatarDescricao(
            produto.descricao
        );

        const categoria = escaparHTML(
            produto.categoria || "Não informada"
        );

        const localizacao = escaparHTML(
            produto.localizacao || "Não informada"
        );

        const email = escaparHTML(
            anuncio.emailPublicador ||
            "Publicador não identificado"
        );

        const preco = escaparHTML(
            formatarPreco(produto.preco)
        );

        const estoque = escaparHTML(
            produto.estoque ?? 0
        );

        const data = escaparHTML(
            formatarData(produto.criadoEm)
        );

        const status = escaparHTML(
            obterNomeStatus(anuncio.status)
        );

        const classeStatus = obterClasseStatus(
            anuncio.status
        );

        const imagem = obterImagem(produto);

        const informacoesExclusao = excluido
            ? renderizarInformacoesExclusao(anuncio.exclusao)
            : "";

        const acao = excluido
            ? ""
            : `
                <div class="anuncio-acoes">

                    <button
                        type="button"
                        class="botao-excluir-anuncio"
                        data-acao="excluir"
                        data-id="${id}"
                        aria-label="Excluir anúncio ${nome}"
                        title="Excluir anúncio">

                        <i data-lucide="trash-2"></i>
                        <span>Excluir</span>

                    </button>

                </div>
            `;

        return `
            <article class="anuncio-item ${excluido ? "excluido" : ""}">

                <div class="anuncio-imagem">

                    ${
                        imagem
                            ? `
                                <img
                                    src="${escaparHTML(imagem)}"
                                    alt="${nome}"
                                    loading="lazy">
                            `
                            : `
                                <i data-lucide="image-off"></i>
                            `
                    }

                </div>

                <div class="anuncio-informacoes">

                    <div class="anuncio-resumo">

                        <div>
                            <h4>${nome}</h4>

                            <span class="status-anuncio ${classeStatus}">
                                ${status}
                            </span>
                        </div>

                        <strong class="anuncio-preco">
                            ${preco}
                        </strong>

                    </div>

                    <div class="anuncio-descricao">
                        ${descricao}
                    </div>

                    <div class="anuncio-detalhes">

                        <span>
                            <i data-lucide="tag"></i>
                            ${categoria}
                        </span>

                        <span>
                            <i data-lucide="map-pin"></i>
                            ${localizacao}
                        </span>

                        <span class="anuncio-estoque">
                            <i data-lucide="package"></i>
                            Estoque: ${estoque}
                        </span>

                    </div>

                    <div class="anuncio-publicador">

                        <span>
                            <i data-lucide="user"></i>
                            ${email}
                        </span>

                        <span>
                            <i data-lucide="calendar"></i>
                            Cadastro: ${data}
                        </span>

                    </div>

                    ${informacoesExclusao}

                </div>

                ${acao}

            </article>
        `;
    }

    // ==========================================
    // ESTADOS VAZIOS E CARREGAMENTO
    // ==========================================

    function mostrarCarregamento(lista) {
        if (!lista) {
            return;
        }

        lista.setAttribute("aria-busy", "true");

        lista.innerHTML = `
            <div class="estado-vazio">
                <i data-lucide="loader-circle"></i>
                <p>Carregando anúncios...</p>
            </div>
        `;
    }

    function mostrarErroLista(lista, mensagem) {
        if (!lista) {
            return;
        }

        lista.innerHTML = `
            <div class="estado-vazio">
                <i data-lucide="alert-circle"></i>
                <p>${escaparHTML(mensagem)}</p>
            </div>
        `;

        lista.setAttribute("aria-busy", "false");
    }

    function mostrarListaVazia(lista, tipo, quantidadeOriginal) {
        if (!lista) {
            return;
        }

        let mensagem;

        if (tipo === "excluidos") {
            mensagem = quantidadeOriginal > 0
                ? "Nenhum anúncio excluído encontrado para essa pesquisa."
                : "Nenhum anúncio foi excluído até o momento.";
        } else {
            mensagem = quantidadeOriginal > 0
                ? "Nenhum anúncio encontrado para essa pesquisa."
                : "Não existem anúncios ativos ou pendentes.";
        }

        lista.innerHTML = `
            <div class="estado-vazio">
                <i data-lucide="package-search"></i>
                <p>${escaparHTML(mensagem)}</p>
            </div>
        `;

        lista.setAttribute("aria-busy", "false");
    }

    // ==========================================
    // RENDERIZAÇÃO DE CADA LISTA
    // ==========================================

    function renderizarLista(tipo) {
        const excluidos = tipo === "excluidos";

        const lista = excluidos
            ? elementos.listaExcluidos
            : elementos.listaAtivos;

        const quantidade = excluidos
            ? elementos.quantidadeExcluidos
            : elementos.quantidadeAtivos;

        if (!lista) {
            return;
        }

        const filtrados = obterAnunciosFiltrados(tipo);

        const quantidadeOriginal = anuncios.filter(anuncio => {
            return excluidos
                ? anuncio.status === "EXCLUIDO"
                : anuncio.status !== "EXCLUIDO";
        }).length;

        if (quantidade) {
            quantidade.textContent =
                `${filtrados.length} ${
                    filtrados.length === 1
                        ? "anúncio"
                        : "anúncios"
                }`;
        }

        if (filtrados.length === 0) {
            mostrarListaVazia(
                lista,
                tipo,
                quantidadeOriginal
            );

            atualizarIcones();
            return;
        }

        lista.innerHTML = filtrados
            .map(renderizarCard)
            .join("");

        lista.setAttribute("aria-busy", "false");

        // Trata imagens que não carregaram.
        lista
            .querySelectorAll(".anuncio-imagem img")
            .forEach(imagem => {
                imagem.addEventListener("error", () => {
                    const container = imagem.parentElement;

                    if (!container) {
                        return;
                    }

                    container.innerHTML = `
                        <i data-lucide="image-off"></i>
                    `;

                    atualizarIcones();
                }, { once: true });
            });

        atualizarIcones();
    }

    // ==========================================
    // RENDERIZAÇÃO GERAL
    // ==========================================

    function renderizarAnuncios() {
        renderizarLista("ativos");
        renderizarLista("excluidos");
    }

    // ==========================================
    // CARREGAMENTO DOS ANÚNCIOS
    // ==========================================

    async function carregarAnuncios() {
        if (carregando) {
            return false;
        }

        if (typeof API !== "function") {
            mostrarMensagem(
                "O serviço de comunicação com a API não foi encontrado. Verifique o carregamento de api.js.",
                "erro"
            );

            return false;
        }

        carregando = true;

        limparMensagem();

        mostrarCarregamento(elementos.listaAtivos);
        mostrarCarregamento(elementos.listaExcluidos);

        atualizarIcones();

        try {
            const resposta = await API("/produtos/admin");

            const lista = extrairLista(resposta);

            anuncios = prepararAnuncios(lista);

            atualizarIndicadores();
            renderizarAnuncios();

            return true;

        } catch (erro) {
            console.error(
                "Erro ao carregar anúncios:",
                erro
            );

            anuncios = [];

            atualizarIndicadores();

            mostrarErroLista(
                elementos.listaAtivos,
                "Não foi possível carregar os anúncios."
            );

            mostrarErroLista(
                elementos.listaExcluidos,
                "Não foi possível carregar o histórico de exclusões."
            );

            mostrarMensagem(
                obterMensagemErro(erro),
                "erro"
            );

            atualizarIcones();

            return false;

        } finally {
            carregando = false;
        }
    }

    // ==========================================
    // EXCLUSÃO LÓGICA DE ANÚNCIOS
    // ==========================================

    async function excluirAnuncio(id) {
        if (!id || exclusoesEmAndamento.has(String(id))) {
            return;
        }

        const anuncio = anuncios.find(
            item => String(item.id) === String(id)
        );

        if (!anuncio || anuncio.status === "EXCLUIDO") {
            mostrarMensagem(
                "O anúncio selecionado não está disponível para exclusão.",
                "erro"
            );

            return;
        }

        const nome = obterNomeProduto(anuncio.produto);

        const confirmou = window.confirm(
            `Tem certeza de que deseja excluir o anúncio "${nome}"?\n\n` +
            "O anúncio deixará de aparecer na listagem de ativos. " +
            "Os dados e registros históricos serão preservados " +
            "para auditoria."
        );

        if (!confirmou) {
            return;
        }

        if (typeof API !== "function") {
            mostrarMensagem(
                "Não foi possível acessar o serviço da API.",
                "erro"
            );

            return;
        }

        exclusoesEmAndamento.add(String(id));

        limparMensagem();

        const botao = elementos.listaAtivos?.querySelector(
            `[data-acao="excluir"][data-id="${CSS.escape(String(id))}"]`
        );

        if (botao) {
            botao.disabled = true;

            botao.innerHTML = `
                <i data-lucide="loader-circle"></i>
                <span>Excluindo...</span>
            `;

            atualizarIcones();
        }

        try {
            await API(`/produtos/${encodeURIComponent(id)}`, {
                method: "DELETE"
            });

            /*
             * A API é consultada novamente para obter
             * o status EXCLUIDO e os dados atualizados.
             *
             * A atualização da tela não substitui
             * nem cria registros de auditoria.
             */

            const atualizou = await carregarAnuncios();

            if (atualizou) {
                mostrarMensagem(
                    "Anúncio excluído com sucesso. O registro foi preservado para auditoria.",
                    "sucesso"
                );
            } else {
                mostrarMensagem(
                    "A exclusão foi realizada, mas não foi possível atualizar as listagens. Recarregue a página para consultar os dados.",
                    "erro"
                );
            }

        } catch (erro) {
            console.error(
                "Erro ao excluir anúncio:",
                erro
            );

            if (
                erro?.status === 409 ||
                erro?.statusCode === 409
            ) {
                mostrarMensagem(
                    "Este anúncio já foi excluído ou não pode ser excluído novamente.",
                    "erro"
                );
            } else {
                mostrarMensagem(
                    obterMensagemErro(erro),
                    "erro"
                );
            }

            if (botao) {
                botao.disabled = false;

                botao.innerHTML = `
                    <i data-lucide="trash-2"></i>
                    <span>Excluir</span>
                `;

                atualizarIcones();
            }

        } finally {
            exclusoesEmAndamento.delete(String(id));
        }
    }

    // ==========================================
    // EVENTOS DAS PESQUISAS E FILTROS
    // ==========================================

    if (elementos.buscaAtivos) {
        elementos.buscaAtivos.addEventListener(
            "input",
            () => renderizarLista("ativos")
        );
    }

    if (elementos.buscaExcluidos) {
        elementos.buscaExcluidos.addEventListener(
            "input",
            () => renderizarLista("excluidos")
        );
    }

    if (elementos.filtro) {
        elementos.filtro.addEventListener(
            "change",
            () => renderizarLista("ativos")
        );
    }

    // ==========================================
    // EVENTOS DAS ABAS
    // ==========================================

    elementos.abas.forEach(aba => {
        aba.addEventListener("click", () => {
            selecionarAba(aba.dataset.abaAnuncios);
        });
    });

    // ==========================================
    // EVENTOS DE EXCLUSÃO
    // ==========================================

    if (elementos.listaAtivos) {
        elementos.listaAtivos.addEventListener("click", evento => {
            const botao = evento.target.closest(
                '[data-acao="excluir"]'
            );

            if (!botao || botao.disabled) {
                return;
            }

            excluirAnuncio(botao.dataset.id);
        });
    }

    // ==========================================
    // DISPONIBILIZAÇÃO
    // ==========================================

    window.anunciosAdminSafeMarket = {
        carregar: carregarAnuncios,

        selecionarAba,

        obterAnuncios: () => [...anuncios]
    };

    // ==========================================
    // INICIALIZAÇÃO
    // ==========================================

    selecionarAba("ativos");
    carregarAnuncios();

})();
