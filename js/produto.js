
/* ==========================================================
   SAFEMARKET — DETALHES DO PRODUTO
   Arquivo: js/produto.js

   RESPONSABILIDADES:
   - Carregar um produto pelo ID da URL
   - Exibir os detalhes reais do anúncio
   - Exibir e ampliar a imagem do produto
   - Controlar quantidade e valor total
   - Adicionar produto ao carrinho
   - Permitir denúncia do anúncio
   - Tratar carregamento, erros e indisponibilidade

   INTEGRAÇÃO:
   - GET  /api/produtos/{id}
   - POST /api/carrinho
   - POST /api/denuncias

   DEPENDÊNCIA:
   - js/api.js
   ========================================================== */

"use strict";

/* ==========================================================
   1. CONFIGURAÇÕES
   ========================================================== */

const URL_BACKEND = "http://127.0.0.1:8080";

const CONFIG_PRODUTO = {
    quantidadeMinima: 1,
    quantidadeMaximaPadrao: 1,
    imagemPadrao: "../imagem/sem-imagem.png"
};

/* ==========================================================
   2. ELEMENTOS DA PÁGINA
   ========================================================== */

const elementos = {
    carregamento: document.getElementById("produto-carregando"),
    erro: document.getElementById("produto-erro"),
    conteudo: document.getElementById("produto-conteudo"),

    breadcrumbCategoria: document.getElementById("breadcrumb-categoria"),
    breadcrumbProduto: document.getElementById("breadcrumb-produto"),

    imagem: document.getElementById("produto-imagem"),
    imagemPrincipal: document.getElementById("produto-imagem-principal"),
    imagemAmpliada: document.getElementById("imagem-ampliada"),
    fecharImagem: document.getElementById("fechar-imagem"),

    categoria: document.getElementById("produto-categoria"),
    titulo: document.getElementById("produto-titulo"),
    descricao: document.getElementById("produto-descricao"),
    preco: document.getElementById("produto-preco"),
    estoque: document.getElementById("produto-estoque"),
    localizacao: document.getElementById("produto-localizacao"),
    data: document.getElementById("produto-data"),

    quantidade: document.getElementById("produto-quantidade"),
    diminuirQuantidade: document.getElementById("diminuir-quantidade"),
    aumentarQuantidade: document.getElementById("aumentar-quantidade"),
    total: document.getElementById("produto-total"),

    botaoCarrinho: document.getElementById("adicionar-carrinho"),
    mensagem: document.getElementById("produto-mensagem"),

    botaoDenuncia: document.getElementById("denunciar-produto"),
    modalDenuncia: document.getElementById("modal-denuncia"),
    formularioDenuncia: document.getElementById("form-denuncia"),
    motivoDenuncia: document.getElementById("motivo-denuncia"),
    descricaoDenuncia: document.getElementById("descricao-denuncia"),
    fecharDenuncia: document.getElementById("fechar-denuncia"),

    botaoVoltar: document.getElementById("voltar-marketplace")
};

/* ==========================================================
   3. ESTADO DA PÁGINA
   ========================================================== */

let produtoAtual = null;
let usuarioAtual = null;
let quantidadeAtual = 1;
let carregandoCarrinho = false;
let carregandoDenuncia = false;

/* ==========================================================
   4. UTILITÁRIOS
   ========================================================== */

function obterIdDaUrl() {
    const parametros = new URLSearchParams(window.location.search);
    const id = parametros.get("id");

    if (!id || !/^[1-9]\d*$/.test(id)) {
        return null;
    }

    const numero = Number(id);

    if (!Number.isSafeInteger(numero)) {
        return null;
    }

    return numero;
}

function obterTitulo(produto) {
    return produto?.nome ??
        produto?.titulo ??
        produto?.nomeProduto ??
        "Produto sem título";
}

function obterDescricao(produto) {
    return produto?.descricao ?? "Nenhuma descrição foi informada.";
}

function obterCategoria(produto) {
    return produto?.categoria ?? "Sem categoria";
}

function obterPreco(produto) {
    const preco = Number(produto?.preco);

    return Number.isFinite(preco) && preco >= 0
        ? preco
        : null;
}

function obterEstoque(produto) {
    const estoque = Number(produto?.estoque);

    if (
        produto?.estoque === null ||
        produto?.estoque === undefined ||
        produto?.estoque === ""
    ) {
        return null;
    }

    return Number.isInteger(estoque) && estoque >= 0
        ? estoque
        : null;
}

function obterLocalizacao(produto) {
    return produto?.localizacao ?? "Localização não informada";
}

function obterData(produto) {
    return produto?.criadoEm ?? null;
}

function obterImagem(produto) {
    return produto?.imagemUrl ??
        produto?.urlImagem ??
        produto?.imagem ??
        produto?.foto ??
        null;
}

function formatarMoeda(valor) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(valor);
}

function formatarData(data) {
    if (!data) {
        return "Data não informada";
    }

    const dataConvertida = new Date(data);

    if (Number.isNaN(dataConvertida.getTime())) {
        return "Data não informada";
    }

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    }).format(dataConvertida);
}

function criarUrlImagem(caminho) {
    if (!caminho || typeof caminho !== "string") {
        return null;
    }

    const valor = caminho.trim();

    if (!valor) {
        return null;
    }

    try {
        const url = new URL(valor, URL_BACKEND);

        if (
            url.protocol !== "http:" &&
            url.protocol !== "https:"
        ) {
            return null;
        }

        if (url.origin !== new URL(URL_BACKEND).origin) {
            return null;
        }

        return url.href;
    } catch {
        return null;
    }
}

function definirTexto(elemento, valor) {
    if (elemento) {
        elemento.textContent = valor ?? "";
    }
}

function mostrarElemento(elemento) {
    if (elemento) {
        elemento.hidden = false;
    }
}

function ocultarElemento(elemento) {
    if (elemento) {
        elemento.hidden = true;
    }
}

/* ==========================================================
   5. ESTADOS DA PÁGINA
   ========================================================== */

function mostrarCarregamento() {
    mostrarElemento(elementos.carregamento);
    ocultarElemento(elementos.erro);
    ocultarElemento(elementos.conteudo);
}

function mostrarConteudo() {
    ocultarElemento(elementos.carregamento);
    ocultarElemento(elementos.erro);
    mostrarElemento(elementos.conteudo);
}

function mostrarErro(mensagem) {
    ocultarElemento(elementos.carregamento);
    ocultarElemento(elementos.conteudo);

    if (elementos.erro) {
        elementos.erro.textContent = mensagem;
        mostrarElemento(elementos.erro);
    }
}

function mostrarMensagem(mensagem, tipo = "sucesso") {
    if (!elementos.mensagem) {
        return;
    }

    elementos.mensagem.textContent = mensagem;
    elementos.mensagem.className = `produto-mensagem ${tipo}`;
    mostrarElemento(elementos.mensagem);
}

function limparMensagem() {
    if (!elementos.mensagem) {
        return;
    }

    elementos.mensagem.textContent = "";
    elementos.mensagem.className = "produto-mensagem";
    ocultarElemento(elementos.mensagem);
}

/* ==========================================================
   6. CARREGAMENTO DO PRODUTO
   ========================================================== */

async function carregarProduto() {
    mostrarCarregamento();

    const id = obterIdDaUrl();

    if (!id) {
        mostrarErro("Identificação do produto inválida.");
        return;
    }

    try {
        const produto = await requisicaoAPI(
            `/produtos/${encodeURIComponent(id)}`,
            {
                method: "GET"
            }
        );

        if (!produto || typeof produto !== "object") {
            mostrarErro("Não foi possível encontrar este produto.");
            return;
        }

        produtoAtual = produto;

        renderizarProduto(produto);
        await carregarUsuarioAtual();

        mostrarConteudo();

    } catch (erro) {
        console.error("Erro ao carregar produto:", erro);

        mostrarErro(
            erro.message ||
            "Não foi possível carregar os detalhes do produto."
        );
    }
}

/* ==========================================================
   7. RENDERIZAÇÃO DOS DETALHES
   ========================================================== */

function renderizarProduto(produto) {
    definirTexto(elementos.titulo, obterTitulo(produto));
    definirTexto(elementos.descricao, obterDescricao(produto));
    definirTexto(elementos.categoria, obterCategoria(produto));
    definirTexto(elementos.localizacao, obterLocalizacao(produto));
    definirTexto(elementos.data, formatarData(obterData(produto)));

    definirTexto(
        elementos.breadcrumbCategoria,
        obterCategoria(produto)
    );

    definirTexto(
        elementos.breadcrumbProduto,
        obterTitulo(produto)
    );

    const preco = obterPreco(produto);

    if (preco === null) {
        definirTexto(elementos.preco, "Preço indisponível");
    } else {
        definirTexto(elementos.preco, formatarMoeda(preco));
    }

    renderizarEstoque(produto);
    renderizarImagem(produto);
    configurarQuantidade(produto);
}

/* ==========================================================
   8. ESTOQUE
   ========================================================== */

function renderizarEstoque(produto) {
    const estoque = obterEstoque(produto);

    if (estoque === null) {
        definirTexto(
            elementos.estoque,
            "Estoque não informado"
        );

        return;
    }

    if (estoque === 0) {
        definirTexto(
            elementos.estoque,
            "Produto indisponível"
        );

        bloquearCompra("Produto sem estoque.");
        return;
    }

    definirTexto(
        elementos.estoque,
        estoque === 1
            ? "1 unidade disponível"
            : `${estoque} unidades disponíveis`
    );
}

/* ==========================================================
   9. IMAGEM DO PRODUTO
   ========================================================== */

function renderizarImagem(produto) {
    if (!elementos.imagem && !elementos.imagemPrincipal) {
        return;
    }

    const caminho = criarUrlImagem(obterImagem(produto));

    const imagem = elementos.imagemPrincipal || elementos.imagem;

    if (!imagem) {
        return;
    }

    if (!caminho) {
        imagem.removeAttribute("src");
        imagem.alt = "Imagem não disponível";
        imagem.classList.add("imagem-indisponivel");
        return;
    }

    imagem.src = caminho;
    imagem.alt = obterTitulo(produto);

    imagem.onerror = () => {
        imagem.removeAttribute("src");
        imagem.alt = "Imagem não disponível";
        imagem.classList.add("imagem-indisponivel");
    };

    imagem.onload = () => {
        imagem.classList.remove("imagem-indisponivel");
    };
}

/* ==========================================================
   10. QUANTIDADE E VALOR TOTAL
   ========================================================== */

function configurarQuantidade(produto) {
    const estoque = obterEstoque(produto);
    const preco = obterPreco(produto);

    quantidadeAtual = 1;

    if (elementos.quantidade) {
        elementos.quantidade.value = "1";
        elementos.quantidade.min = "1";

        if (estoque !== null) {
            elementos.quantidade.max = String(estoque);
        } else {
            elementos.quantidade.removeAttribute("max");
        }
    }

    const indisponivel =
        estoque === null ||
        estoque <= 0 ||
        preco === null;

    if (indisponivel) {
        bloquearCompra(
            estoque === 0
                ? "Produto sem estoque."
                : "Não é possível adicionar este produto ao carrinho."
        );
    } else {
        desbloquearCompra();
    }

    atualizarTotal();
    atualizarBotoesQuantidade();
}

function limitarQuantidade(valor) {
    const estoque = obterEstoque(produtoAtual);

    let quantidade = Number.parseInt(valor, 10);

    if (!Number.isFinite(quantidade)) {
        quantidade = 1;
    }

    quantidade = Math.max(1, quantidade);

    if (estoque !== null) {
        quantidade = Math.min(quantidade, estoque);
    }

    return quantidade;
}

function atualizarTotal() {
    if (!produtoAtual) {
        return;
    }

    const preco = obterPreco(produtoAtual);

    if (preco === null) {
        definirTexto(elementos.total, "Total indisponível");
        return;
    }

    const total = preco * quantidadeAtual;

    definirTexto(elementos.total, formatarMoeda(total));

    if (elementos.quantidade) {
        elementos.quantidade.value = String(quantidadeAtual);
    }

    atualizarBotoesQuantidade();
}

function atualizarBotoesQuantidade() {
    const estoque = obterEstoque(produtoAtual);

    if (elementos.diminuirQuantidade) {
        elementos.diminuirQuantidade.disabled =
            quantidadeAtual <= 1;
    }

    if (elementos.aumentarQuantidade) {
        elementos.aumentarQuantidade.disabled =
            estoque === null ||
            quantidadeAtual >= estoque;
    }
}

function diminuirQuantidade() {
    quantidadeAtual = Math.max(
        CONFIG_PRODUTO.quantidadeMinima,
        quantidadeAtual - 1
    );

    atualizarTotal();
}

function aumentarQuantidade() {
    const estoque = obterEstoque(produtoAtual);

    if (estoque === null || quantidadeAtual >= estoque) {
        return;
    }

    quantidadeAtual++;
    atualizarTotal();
}

function alterarQuantidade(valor) {
    quantidadeAtual = limitarQuantidade(valor);
    atualizarTotal();
}

/* ==========================================================
   11. BLOQUEIO E LIBERAÇÃO DA COMPRA
   ========================================================== */

function bloquearCompra(mensagem) {
    if (elementos.botaoCarrinho) {
        elementos.botaoCarrinho.disabled = true;
        elementos.botaoCarrinho.title = mensagem;
    }
}

function desbloquearCompra() {
    if (elementos.botaoCarrinho) {
        elementos.botaoCarrinho.disabled = false;
        elementos.botaoCarrinho.removeAttribute("title");
    }
}

/* ==========================================================
   12. ADICIONAR AO CARRINHO
   ========================================================== */

async function adicionarAoCarrinho() {
    if (carregandoCarrinho || !produtoAtual) {
        return;
    }

    const id = obterIdDaUrl();
    const estoque = obterEstoque(produtoAtual);
    const preco = obterPreco(produtoAtual);

    if (!id) {
        mostrarMensagem("Produto inválido.", "erro");
        return;
    }

    if (estoque === null || estoque <= 0) {
        mostrarMensagem(
            "Este produto não está disponível para compra.",
            "erro"
        );
        return;
    }

    if (preco === null) {
        mostrarMensagem(
            "Não foi possível confirmar o preço do produto.",
            "erro"
        );
        return;
    }

    quantidadeAtual = limitarQuantidade(quantidadeAtual);

    if (quantidadeAtual > estoque) {
        mostrarMensagem(
            "A quantidade solicitada ultrapassa o estoque.",
            "erro"
        );
        return;
    }

    carregandoCarrinho = true;
    limparMensagem();

    const botao = elementos.botaoCarrinho;

    if (botao) {
        botao.disabled = true;
        botao.dataset.textoOriginal = botao.textContent;
        botao.textContent = "Adicionando...";
    }

    try {
        await requisicaoAPI("/carrinho", {
            method: "POST",
            body: JSON.stringify({
                produtoId: Number(id),
                quantidade: Number(quantidadeAtual)
            })
        });

        mostrarMensagem(
            "Produto adicionado ao carrinho com sucesso!",
            "sucesso"
        );

        document.dispatchEvent(
            new CustomEvent("safemarket:carrinho-atualizado", {
                detail: {
                    produtoId: id,
                    quantidade: quantidadeAtual
                }
            })
        );

    } catch (erro) {
        console.error("Erro ao adicionar ao carrinho:", erro);

        mostrarMensagem(
            erro.message ||
            "Não foi possível adicionar o produto ao carrinho.",
            "erro"
        );

    } finally {
        carregandoCarrinho = false;

        if (botao) {
            botao.disabled = false;
            botao.textContent =
                botao.dataset.textoOriginal ||
                "Adicionar ao carrinho";
        }

        if (obterEstoque(produtoAtual) === 0) {
            bloquearCompra("Produto sem estoque.");
        }
    }
}

/* ==========================================================
   13. CARREGAR USUÁRIO ATUAL
   ========================================================== */

async function carregarUsuarioAtual() {
    try {
        usuarioAtual = await requisicaoAPI("/auth/me", {
            method: "GET"
        });
    } catch (erro) {
        usuarioAtual = null;

        console.info(
            "Usuário não autenticado ou sessão indisponível."
        );
    }
}

/* ==========================================================
   14. DENÚNCIA DO PRODUTO
   ========================================================== */

function abrirModalDenuncia() {
    if (!produtoAtual) {
        return;
    }

    if (!usuarioAtual) {
        mostrarMensagem(
            "Entre na sua conta para denunciar este anúncio.",
            "erro"
        );
        return;
    }

    if (elementos.modalDenuncia) {
        elementos.modalDenuncia.hidden = false;
        elementos.modalDenuncia.setAttribute(
            "aria-hidden",
            "false"
        );
    }
}

function fecharModalDenuncia() {
    if (elementos.modalDenuncia) {
        elementos.modalDenuncia.hidden = true;
        elementos.modalDenuncia.setAttribute(
            "aria-hidden",
            "true"
        );
    }
}

async function enviarDenuncia(evento) {
    evento.preventDefault();

    if (carregandoDenuncia || !produtoAtual) {
        return;
    }

    const id = obterIdDaUrl();

    const motivo = elementos.motivoDenuncia?.value;
    const descricao = elementos.descricaoDenuncia?.value?.trim() ?? "";

    if (!motivo) {
        mostrarMensagem(
            "Selecione um motivo para a denúncia.",
            "erro"
        );
        return;
    }

    if (!usuarioAtual) {
        mostrarMensagem(
            "Entre na sua conta para denunciar este anúncio.",
            "erro"
        );
        return;
    }

    carregandoDenuncia = true;

    const botaoEnviar =
        elementos.formularioDenuncia?.querySelector(
            'button[type="submit"]'
        );

    if (botaoEnviar) {
        botaoEnviar.disabled = true;
        botaoEnviar.textContent = "Enviando...";
    }

    try {
        await requisicaoAPI("/denuncias", {
            method: "POST",
            body: JSON.stringify({
                produtoId: Number(id),
                motivo,
                descricao
            })
        });

        fecharModalDenuncia();

        elementos.formularioDenuncia?.reset();

        mostrarMensagem(
            "Sua denúncia foi enviada com sucesso.",
            "sucesso"
        );

    } catch (erro) {
        console.error("Erro ao enviar denúncia:", erro);

        mostrarMensagem(
            erro.message ||
            "Não foi possível enviar sua denúncia.",
            "erro"
        );

    } finally {
        carregandoDenuncia = false;

        if (botaoEnviar) {
            botaoEnviar.disabled = false;
            botaoEnviar.textContent = "Enviar denúncia";
        }
    }
}

/* ==========================================================
   15. AMPLIAR IMAGEM
   ========================================================== */

function abrirImagemAmpliada() {
    if (!elementos.imagemAmpliada || !produtoAtual) {
        return;
    }

    const caminho = criarUrlImagem(obterImagem(produtoAtual));

    if (!caminho) {
        return;
    }

    const imagemModal =
        elementos.imagemAmpliada.querySelector("img");

    if (imagemModal) {
        imagemModal.src = caminho;
        imagemModal.alt = obterTitulo(produtoAtual);
    }

    elementos.imagemAmpliada.hidden = false;
    elementos.imagemAmpliada.setAttribute(
        "aria-hidden",
        "false"
    );
}

function fecharImagemAmpliada() {
    if (!elementos.imagemAmpliada) {
        return;
    }

    elementos.imagemAmpliada.hidden = true;
    elementos.imagemAmpliada.setAttribute(
        "aria-hidden",
        "true"
    );
}

/* ==========================================================
   16. EVENTOS
   ========================================================== */

function configurarEventos() {
    elementos.diminuirQuantidade?.addEventListener(
        "click",
        diminuirQuantidade
    );

    elementos.aumentarQuantidade?.addEventListener(
        "click",
        aumentarQuantidade
    );

    elementos.quantidade?.addEventListener(
        "change",
        (evento) => {
            alterarQuantidade(evento.target.value);
        }
    );

    elementos.quantidade?.addEventListener(
        "input",
        (evento) => {
            const valor = evento.target.value;

            if (valor !== "") {
                alterarQuantidade(valor);
            }
        }
    );

    elementos.botaoCarrinho?.addEventListener(
        "click",
        adicionarAoCarrinho
    );

    elementos.botaoDenuncia?.addEventListener(
        "click",
        abrirModalDenuncia
    );

    elementos.fecharDenuncia?.addEventListener(
        "click",
        fecharModalDenuncia
    );

    elementos.formularioDenuncia?.addEventListener(
        "submit",
        enviarDenuncia
    );

    elementos.fecharImagem?.addEventListener(
        "click",
        fecharImagemAmpliada
    );

    elementos.imagem?.addEventListener(
        "click",
        abrirImagemAmpliada
    );

    elementos.imagemPrincipal?.addEventListener(
        "click",
        abrirImagemAmpliada
    );

    elementos.botaoVoltar?.addEventListener(
        "click",
        () => {
            window.location.href = "marketplace.html";
        }
    );

    elementos.modalDenuncia?.addEventListener(
        "click",
        (evento) => {
            if (evento.target === elementos.modalDenuncia) {
                fecharModalDenuncia();
            }
        }
    );

    elementos.imagemAmpliada?.addEventListener(
        "click",
        (evento) => {
            if (evento.target === elementos.imagemAmpliada) {
                fecharImagemAmpliada();
            }
        }
    );

    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape") {
            fecharModalDenuncia();
            fecharImagemAmpliada();
        }
    });
}

/* ==========================================================
   17. INICIALIZAÇÃO
   ========================================================== */

async function inicializarPaginaProduto() {
    configurarEventos();

    if (typeof window.requisicaoAPI !== "function") {
        mostrarErro(
            "Não foi possível iniciar a página. Verifique o carregamento de api.js."
        );
        return;
    }

    await carregarProduto();
}

/* ==========================================================
   18. DISPONIBILIZAR FUNÇÕES
   ========================================================== */

window.carregarProduto = carregarProduto;
window.atualizarTotalProduto = atualizarTotal;
window.adicionarProdutoAoCarrinho = adicionarAoCarrinho;

/* ==========================================================
   19. EXECUÇÃO
   ========================================================== */

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        inicializarPaginaProduto
    );
} else {
    inicializarPaginaProduto();
}
