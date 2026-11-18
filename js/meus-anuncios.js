
(() => {
    "use strict";

    const API = window.requisicaoAPI;
    const URL_BASE_BACKEND = "http://127.0.0.1:8080";

    const elementos = {
        nomeUsuario: document.getElementById("nome-usuario"),
        btnSair: document.getElementById("btn-sair"),

        total: document.getElementById("total-anuncios"),
        ativos: document.getElementById("anuncios-ativos"),
        pendentes: document.getElementById("anuncios-pendentes"),
        semEstoque: document.getElementById("anuncios-sem-estoque"),

        pesquisa: document.getElementById("pesquisa-anuncios"),
        filtro: document.getElementById("filtro-status"),

        lista: document.getElementById("lista-anuncios"),
        vazios: document.getElementById("anuncios-vazios"),
        carregamento: document.getElementById("carregamento-anuncios"),
        mensagem: document.getElementById("mensagem-anuncios"),

        modalEdicao: document.getElementById("modal-edicao"),
        formularioEdicao: document.getElementById("form-edicao-anuncio"),
        idEdicao: document.getElementById("edicao-produto-id"),
        nomeEdicao: document.getElementById("edicao-nome"),
        descricaoEdicao: document.getElementById("edicao-descricao"),
        categoriaEdicao: document.getElementById("edicao-categoria"),
        localizacaoEdicao: document.getElementById("edicao-localizacao"),
        precoEdicao: document.getElementById("edicao-preco"),
        estoqueEdicao: document.getElementById("edicao-estoque"),

        fecharEdicao: document.getElementById("fechar-modal-edicao"),
        cancelarEdicao: document.getElementById("cancelar-edicao"),

        modalExclusao: document.getElementById("modal-exclusao"),
        idExclusao: document.getElementById("exclusao-produto-id"),
        textoExclusao: document.getElementById("texto-confirmacao-exclusao"),
        cancelarExclusao: document.getElementById("cancelar-exclusao"),
        confirmarExclusao: document.getElementById("confirmar-exclusao")
    };

    let anuncios = [];
    let usuarioAtual = null;
    let operacaoEmAndamento = false;

    // =====================================================
    // UTILITÁRIOS
    // =====================================================

    function escaparHTML(valor) {
        return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[caractere]);
    }

    function normalizarTexto(valor) {
        return String(valor ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function formatarPreco(valor) {
        const numero = Number(valor);

        if (!Number.isFinite(numero)) {
            return "Preço não informado";
        }

        return numero.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function formatarData(valor) {
        if (!valor) return "Data não informada";

        const data = new Date(valor);

        if (Number.isNaN(data.getTime())) {
            return "Data não informada";
        }

        return data.toLocaleString("pt-BR");
    }

    function mostrarMensagem(texto, tipo = "info") {
        elementos.mensagem.textContent = texto;
        elementos.mensagem.className = `mensagem-anuncios ${tipo}`;
        elementos.mensagem.hidden = false;
    }

    function limparMensagem() {
        elementos.mensagem.textContent = "";
        elementos.mensagem.className = "mensagem-anuncios";
        elementos.mensagem.hidden = true;
    }

    function extrairLista(resposta) {
        if (Array.isArray(resposta)) return resposta;
        if (Array.isArray(resposta?.content)) return resposta.content;
        if (Array.isArray(resposta?.dados)) return resposta.dados;
        if (Array.isArray(resposta?.data)) return resposta.data;
        if (Array.isArray(resposta?.produtos)) return resposta.produtos;

        return [];
    }

    function extrairProduto(item) {
        return item?.produto ?? item;
    }

    function obterId(produto) {
        return produto?.id ?? produto?.produtoId ?? null;
    }

    function obterStatus(item) {
        const produto = extrairProduto(item);

        return String(
            item?.statusModeracao ??
            produto?.statusModeracao ??
            produto?.status ??
            "INDEFINIDO"
        ).toUpperCase();
    }

    function obterNome(produto) {
        return produto?.titulo ??
            produto?.nome ??
            produto?.nomeProduto ??
            "Produto sem nome";
    }

    function obterImagem(produto) {
        return produto?.imagemUrl ??
            produto?.imagem ??
            produto?.urlImagem ??
            produto?.foto ??
            "";
    }

    // Converte o caminho retornado pela API em uma URL acessível.
    function montarUrlImagem(caminho) {
        if (!caminho) return "";

        const imagem = String(caminho).trim();

        if (!imagem) return "";

        // Mantém URLs completas, quando já fornecidas pela API.
        if (/^https?:\/\//i.test(imagem)) {
            return imagem;
        }

        // Imagens armazenadas no backend.
        return `${URL_BASE_BACKEND}/${imagem.replace(/^\/+/, "")}`;
    }

    function obterEstoque(produto) {
        const valor =
            produto?.estoque ??
            produto?.quantidadeEstoque ??
            produto?.quantidade ??
            0;

        const numero = Number(valor);

        return Number.isFinite(numero) ? numero : 0;
    }

    function obterClasseStatus(status) {
        const classes = {
            ATIVO: "status-ativo",
            APROVADO: "status-ativo",
            PENDENTE: "status-pendente",
            REJEITADO: "status-rejeitado",
            INATIVO: "status-inativo",
            BLOQUEADO: "status-inativo"
        };

        return classes[status] ?? "status-indefinido";
    }

    function obterTextoStatus(status) {
        const textos = {
            ATIVO: "Ativo",
            APROVADO: "Ativo",
            PENDENTE: "Pendente",
            REJEITADO: "Rejeitado",
            INATIVO: "Inativo",
            BLOQUEADO: "Bloqueado",
            INDEFINIDO: "Status não informado"
        };

        return textos[status] ?? status;
    }

    // =====================================================
    // INDICADORES
    // =====================================================

    function atualizarIndicadores(lista) {
        elementos.total.textContent = lista.length;

        elementos.ativos.textContent = lista.filter(item => {
            const status = obterStatus(item);
            return status === "ATIVO" || status === "APROVADO";
        }).length;

        elementos.pendentes.textContent = lista.filter(item =>
            obterStatus(item) === "PENDENTE"
        ).length;

        elementos.semEstoque.textContent = lista.filter(item =>
            obterEstoque(extrairProduto(item)) <= 0
        ).length;
    }

    // =====================================================
    // CARDS
    // =====================================================

    function criarCard(item) {
        const produto = extrairProduto(item);

        const id = obterId(produto);
        const nome = obterNome(produto);
        const descricao = produto?.descricao ?? "Sem descrição.";
        const categoria = produto?.categoria ?? "Não informada";
        const localizacao = produto?.localizacao ?? "Não informada";

        const preco = formatarPreco(produto?.preco);
        const estoque = obterEstoque(produto);
        const status = obterStatus(item);
        const imagem = montarUrlImagem(obterImagem(produto));
        const data = formatarData(produto?.criadoEm);

        const imagemHTML = imagem
            ? `
                <img
                    src="${escaparHTML(imagem)}"
                    alt="${escaparHTML(nome)}"
                    class="imagem-produto"
                    loading="lazy"
                    onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=&quot;imagem-sem-foto&quot;>Imagem indisponível</div>';">
            `
            : `
                <div class="imagem-sem-foto">
                    Sem imagem
                </div>
            `;

        return `
            <article class="card-anuncio" data-id="${escaparHTML(id)}">

                <div class="card-imagem">
                    ${imagemHTML}
                </div>

                <div class="card-conteudo">

                    <div class="card-topo">

                        <span class="status-anuncio ${obterClasseStatus(status)}">
                            ${escaparHTML(obterTextoStatus(status))}
                        </span>

                        <span class="data-anuncio">
                            ${escaparHTML(data)}
                        </span>

                    </div>

                    <h3>${escaparHTML(nome)}</h3>

                    <p class="descricao-anuncio">
                        ${escaparHTML(descricao)}
                    </p>

                    <div class="informacoes-anuncio">

                        <span>
                            <strong>Categoria:</strong>
                            ${escaparHTML(categoria)}
                        </span>

                        <span>
                            <strong>Localização:</strong>
                            ${escaparHTML(localizacao)}
                        </span>

                    </div>

                    <div class="dados-comerciais">

                        <div>
                            <span>Preço</span>
                            <strong>${escaparHTML(preco)}</strong>
                        </div>

                        <div>
                            <span>Disponível em estoque</span>

                            <strong class="${estoque <= 0 ? "estoque-esgotado" : ""}">
                                ${estoque}
                                ${estoque === 1 ? "unidade" : "unidades"}
                            </strong>
                        </div>

                    </div>

                    <div class="acoes-anuncio">

                        <button
                            type="button"
                            class="btn-editar"
                            data-acao="editar"
                            data-id="${escaparHTML(id)}">
                            Editar anúncio
                        </button>

                        <button
                            type="button"
                            class="btn-excluir"
                            data-acao="excluir"
                            data-id="${escaparHTML(id)}">
                            Excluir
                        </button>

                    </div>

                </div>

            </article>
        `;
    }

    // =====================================================
    // FILTROS
    // =====================================================

    function renderizarAnuncios() {
        const pesquisa = normalizarTexto(elementos.pesquisa.value);
        const filtro = elementos.filtro.value.toUpperCase();

        const filtrados = anuncios.filter(item => {
            const produto = extrairProduto(item);

            const nome = normalizarTexto(obterNome(produto));
            const descricao = normalizarTexto(produto?.descricao);
            const categoria = normalizarTexto(produto?.categoria);

            const correspondePesquisa =
                !pesquisa ||
                nome.includes(pesquisa) ||
                descricao.includes(pesquisa) ||
                categoria.includes(pesquisa);

            const status = obterStatus(item);

            const correspondeStatus =
                !filtro ||
                status === filtro ||
                (filtro === "ATIVO" && status === "APROVADO");

            return correspondePesquisa && correspondeStatus;
        });

        elementos.lista.innerHTML = filtrados.map(criarCard).join("");

        elementos.vazios.hidden = filtrados.length > 0;
        elementos.lista.hidden = filtrados.length === 0;
    }

    // =====================================================
    // USUÁRIO
    // =====================================================

    async function carregarUsuario() {
        const resposta = await API("/auth/me");

        usuarioAtual =
            resposta?.usuario ??
            resposta?.dados ??
            resposta?.data ??
            resposta;

        if (!usuarioAtual || typeof usuarioAtual !== "object") {
            throw new Error("Não foi possível identificar o usuário autenticado.");
        }

        elementos.nomeUsuario.textContent =
            usuarioAtual.nome ??
            usuarioAtual.nomeCompleto ??
            usuarioAtual.email ??
            "Minha conta";
    }

    // =====================================================
    // CARREGAR ANÚNCIOS
    // =====================================================

    async function carregarAnuncios() {
        limparMensagem();

        elementos.carregamento.hidden = false;
        elementos.lista.hidden = true;
        elementos.vazios.hidden = true;

        try {
            const resposta = await API("/produtos/meus-anuncios");

            anuncios = extrairLista(resposta);

            atualizarIndicadores(anuncios);
            renderizarAnuncios();

        } catch (erro) {
            console.error("Erro ao carregar anúncios:", erro);

            mostrarMensagem(
                erro.message || "Não foi possível carregar seus anúncios.",
                "erro"
            );

            elementos.lista.innerHTML = "";
            elementos.lista.hidden = true;
            elementos.vazios.hidden = true;

            throw erro;

        } finally {
            elementos.carregamento.hidden = true;
        }
    }

    // =====================================================
    // ABRIR EDIÇÃO
    // =====================================================

    function abrirEdicao(id) {
        const item = anuncios.find(anuncio => {
            const produto = extrairProduto(anuncio);
            return String(obterId(produto)) === String(id);
        });

        if (!item) {
            mostrarMensagem("Não foi possível localizar esse anúncio.", "erro");
            return;
        }

        const produto = extrairProduto(item);

        elementos.idEdicao.value = obterId(produto);
        elementos.nomeEdicao.value = obterNome(produto);
        elementos.descricaoEdicao.value = produto.descricao ?? "";
        elementos.categoriaEdicao.value = produto.categoria ?? "";
        elementos.localizacaoEdicao.value = produto.localizacao ?? "";
        elementos.precoEdicao.value = produto.preco ?? "";
        elementos.estoqueEdicao.value = obterEstoque(produto);

        elementos.modalEdicao.hidden = false;
    }

    function fecharEdicao() {
        elementos.modalEdicao.hidden = true;
        elementos.formularioEdicao.reset();
    }

    // =====================================================
    // SALVAR EDIÇÃO
    // =====================================================

    async function salvarEdicao(evento) {
        evento.preventDefault();

        if (operacaoEmAndamento) return;

        const id = elementos.idEdicao.value;

        const dados = {
            titulo: elementos.nomeEdicao.value.trim(),
            descricao: elementos.descricaoEdicao.value.trim(),
            categoria: elementos.categoriaEdicao.value.trim(),
            localizacao: elementos.localizacaoEdicao.value.trim(),
            preco: Number(elementos.precoEdicao.value),
            estoque: Number(elementos.estoqueEdicao.value)
        };

        if (
            !id ||
            !dados.titulo ||
            dados.titulo.length > 120 ||
            dados.descricao.length > 1000 ||
            dados.categoria.length > 80 ||
            dados.localizacao.length > 160 ||
            !Number.isFinite(dados.preco) ||
            dados.preco < 0.01 ||
            !Number.isInteger(dados.estoque) ||
            dados.estoque < 0
        ) {
            mostrarMensagem(
                "Confira os dados informados antes de salvar.",
                "erro"
            );

            return;
        }

        operacaoEmAndamento = true;

        const botao = elementos.formularioEdicao.querySelector(
            'button[type="submit"]'
        );

        botao.disabled = true;
        botao.textContent = "Salvando...";

        try {
            await API(`/produtos/${encodeURIComponent(id)}`, {
                method: "PUT",
                body: dados
            });

            fecharEdicao();

            mostrarMensagem(
                "Anúncio atualizado com sucesso.",
                "sucesso"
            );

            await carregarAnuncios();

        } catch (erro) {
            console.error("Erro ao editar anúncio:", erro);

            mostrarMensagem(
                erro.message || "Não foi possível atualizar o anúncio.",
                "erro"
            );

        } finally {
            operacaoEmAndamento = false;
            botao.disabled = false;
            botao.textContent = "Salvar alterações";
        }
    }

    // =====================================================
    // EXCLUSÃO
    // =====================================================

    function abrirExclusao(id) {
        const item = anuncios.find(anuncio => {
            const produto = extrairProduto(anuncio);
            return String(obterId(produto)) === String(id);
        });

        if (!item) {
            mostrarMensagem("Não foi possível localizar esse anúncio.", "erro");
            return;
        }

        const produto = extrairProduto(item);

        elementos.idExclusao.value = obterId(produto);

        elementos.textoExclusao.textContent =
            `Deseja realmente excluir o anúncio "${obterNome(produto)}"?`;

        elementos.modalExclusao.hidden = false;
    }

    function fecharExclusao() {
        elementos.modalExclusao.hidden = true;
        elementos.idExclusao.value = "";
    }

    async function excluirAnuncio() {
        if (operacaoEmAndamento) return;

        const id = elementos.idExclusao.value;

        if (!id) return;

        operacaoEmAndamento = true;

        elementos.confirmarExclusao.disabled = true;
        elementos.confirmarExclusao.textContent = "Excluindo...";

        try {
            await API(`/produtos/${encodeURIComponent(id)}`, {
                method: "DELETE"
            });

            fecharExclusao();

            mostrarMensagem(
                "Anúncio excluído com sucesso.",
                "sucesso"
            );

            await carregarAnuncios();

        } catch (erro) {
            console.error("Erro ao excluir anúncio:", erro);

            mostrarMensagem(
                erro.message || "Não foi possível excluir o anúncio.",
                "erro"
            );

        } finally {
            operacaoEmAndamento = false;

            elementos.confirmarExclusao.disabled = false;
            elementos.confirmarExclusao.textContent = "Confirmar exclusão";
        }
    }

    // =====================================================
    // SAIR
    // =====================================================

    async function sair() {
        if (operacaoEmAndamento) return;

        try {
            await API("/auth/logout", {
                method: "POST"
            });

            window.location.href = "login.html";

        } catch (erro) {
            console.error("Erro ao sair:", erro);

            mostrarMensagem(
                erro.message || "Não foi possível encerrar a sessão.",
                "erro"
            );
        }
    }

    // =====================================================
    // EVENTOS
    // =====================================================

    function registrarEventos() {
        elementos.pesquisa.addEventListener("input", renderizarAnuncios);
        elementos.filtro.addEventListener("change", renderizarAnuncios);

        elementos.lista.addEventListener("click", evento => {
            const botao = evento.target.closest("button[data-acao]");

            if (!botao) return;

            const id = botao.dataset.id;

            if (botao.dataset.acao === "editar") {
                abrirEdicao(id);
            }

            if (botao.dataset.acao === "excluir") {
                abrirExclusao(id);
            }
        });

        elementos.formularioEdicao.addEventListener(
            "submit",
            salvarEdicao
        );

        elementos.fecharEdicao.addEventListener("click", fecharEdicao);
        elementos.cancelarEdicao.addEventListener("click", fecharEdicao);

        elementos.cancelarExclusao.addEventListener("click", fecharExclusao);
        elementos.confirmarExclusao.addEventListener("click", excluirAnuncio);

        elementos.btnSair.addEventListener("click", sair);

        elementos.modalEdicao.addEventListener("click", evento => {
            if (evento.target === elementos.modalEdicao) {
                fecharEdicao();
            }
        });

        elementos.modalExclusao.addEventListener("click", evento => {
            if (evento.target === elementos.modalExclusao) {
                fecharExclusao();
            }
        });
    }

    // =====================================================
    // INICIALIZAÇÃO
    // =====================================================

    async function iniciar() {
        if (typeof API !== "function") {
            mostrarMensagem(
                "O serviço de comunicação com o servidor não foi carregado.",
                "erro"
            );

            return;
        }

        registrarEventos();

        try {
            await carregarUsuario();
            await carregarAnuncios();

        } catch (erro) {
            console.error("Erro ao iniciar a página:", erro);

            if (erro?.status === 401) {
                window.location.href = "login.html";
                return;
            }

            mostrarMensagem(
                erro.message || "Não foi possível carregar sua conta.",
                "erro"
            );
        }
    }

    iniciar();

})();
