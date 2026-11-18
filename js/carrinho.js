
/* ==========================================================
   SAFEMARKET — CARRINHO
   Arquivo: js/carrinho.js

   RESPONSABILIDADES:
   - Carregar itens do carrinho
   - Exibir produtos e quantidades
   - Calcular subtotal e total
   - Remover produtos
   - Finalizar pedidos
   - Exibir histórico de pedidos
   - Tratar erros e estados de carregamento

   INTEGRAÇÃO:
   - API centralizada em api.js
   - Spring Boot / MySQL
   - Autenticação por sessão
   - CSRF centralizado em api.js
========================================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {

    /* ======================================================
       01. ELEMENTOS HTML
    ====================================================== */

    const itens = document.getElementById("itens");
    const total = document.getElementById("total");
    const mensagem = document.getElementById("mensagem");
    const pedidos = document.getElementById("pedidos");
    const botaoFinalizar = document.getElementById("finalizar");

    /* ======================================================
       02. VERIFICAÇÃO INICIAL
    ====================================================== */

    if (!itens || !total || !mensagem || !pedidos || !botaoFinalizar) {
        console.error(
            "SafeMarket: elementos necessários do carrinho não encontrados."
        );
        return;
    }

    if (typeof window.requisicaoAPI !== "function") {
        mensagem.textContent =
            "Não foi possível iniciar a comunicação com o servidor.";

        console.error(
            "SafeMarket: api.js não foi carregado corretamente."
        );

        return;
    }

    /* ======================================================
       03. CONFIGURAÇÕES
    ====================================================== */

    const ENDPOINT_CARRINHO = "/carrinho";
    const ENDPOINT_PEDIDOS = "/pedidos";

    let carregamentoEmAndamento = false;
    let finalizacaoEmAndamento = false;

    /* ======================================================
       04. FUNÇÕES AUXILIARES
    ====================================================== */

    function dinheiro(valor) {
        const numero = Number(valor);

        if (!Number.isFinite(numero)) {
            return "R$ 0,00";
        }

        return numero.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function obterNumero(valor, padrao = 0) {
        const numero = Number(valor);

        return Number.isFinite(numero)
            ? numero
            : padrao;
    }

    function mostrarMensagem(texto, tipo = "info") {
        mensagem.textContent = texto;
        mensagem.className = `mensagem-carrinho ${tipo}`;
    }

    function limparMensagem() {
        mensagem.textContent = "";
        mensagem.className = "mensagem-carrinho";
    }

    function extrairItens(resposta) {
        if (Array.isArray(resposta)) {
            return resposta;
        }

        if (Array.isArray(resposta?.itens)) {
            return resposta.itens;
        }

        if (Array.isArray(resposta?.content)) {
            return resposta.content;
        }

        return [];
    }

    function extrairPedidos(resposta) {
        if (Array.isArray(resposta)) {
            return resposta;
        }

        if (Array.isArray(resposta?.pedidos)) {
            return resposta.pedidos;
        }

        if (Array.isArray(resposta?.content)) {
            return resposta.content;
        }

        return [];
    }

    function criarTexto(tag, classe, texto) {
        const elemento = document.createElement(tag);

        if (classe) {
            elemento.className = classe;
        }

        elemento.textContent = texto;

        return elemento;
    }

    /* ======================================================
       05. ESTADO VAZIO
    ====================================================== */

    function mostrarCarrinhoVazio() {
        const vazio = criarTexto(
            "p",
            "carrinho-vazio",
            "Seu carrinho está vazio. Explore os produtos disponíveis no Marketplace."
        );

        itens.replaceChildren(vazio);
        total.textContent = "Total: R$ 0,00";
        botaoFinalizar.disabled = true;
    }

    /* ======================================================
       06. RENDERIZAR ITENS
    ====================================================== */

    function renderizarItens(lista) {
        itens.replaceChildren();

        if (lista.length === 0) {
            mostrarCarrinhoVazio();
            return;
        }

        let soma = 0;

        const fragmento = document.createDocumentFragment();

        lista.forEach(item => {
            const produtoId = item.produtoId ?? item.idProduto;

            const nome = item.nome ??
                item.titulo ??
                "Produto sem nome";

            const quantidade = Math.max(
                0,
                obterNumero(item.quantidade)
            );

            const preco = obterNumero(item.preco);

            const subtotalInformado = Number(item.subtotal);

            const subtotal = Number.isFinite(subtotalInformado)
                ? subtotalInformado
                : preco * quantidade;

            soma += subtotal;

            const artigo = document.createElement("article");
            artigo.className = "item-carrinho";

            if (produtoId !== undefined && produtoId !== null) {
                artigo.dataset.produtoId = String(produtoId);
            }

            const informacoes = document.createElement("div");
            informacoes.className = "item-carrinho-informacoes";

            const titulo = criarTexto(
                "h3",
                "item-carrinho-nome",
                nome
            );

            const detalhes = criarTexto(
                "p",
                "item-carrinho-detalhes",
                `${quantidade} x ${dinheiro(preco)}`
            );

            const valorSubtotal = criarTexto(
                "p",
                "item-carrinho-subtotal",
                dinheiro(subtotal)
            );

            informacoes.append(
                titulo,
                detalhes,
                valorSubtotal
            );

            const botaoRemover = criarTexto(
                "button",
                "item-carrinho-remover",
                "Remover"
            );

            botaoRemover.type = "button";

            botaoRemover.disabled =
                produtoId === undefined ||
                produtoId === null;

            botaoRemover.setAttribute(
                "aria-label",
                `Remover ${nome} do carrinho`
            );

            botaoRemover.addEventListener("click", () => {
                removerProduto(produtoId, botaoRemover);
            });

            artigo.append(informacoes, botaoRemover);
            fragmento.appendChild(artigo);
        });

        itens.appendChild(fragmento);

        total.textContent = `Total: ${dinheiro(soma)}`;

        botaoFinalizar.disabled = false;
    }

    /* ======================================================
       07. HISTÓRICO DE PEDIDOS
    ====================================================== */

    function renderizarPedidos(lista) {
        pedidos.replaceChildren();

        if (lista.length === 0) {
            pedidos.appendChild(
                criarTexto(
                    "p",
                    "pedidos-vazio",
                    "Você ainda não realizou nenhum pedido."
                )
            );

            return;
        }

        const fragmento = document.createDocumentFragment();

        lista.forEach(pedido => {
            const id = pedido.id ??
                pedido.pedidoId ??
                "—";

            const status = pedido.status ??
                "Status não informado";

            const valor = pedido.total ??
                pedido.valorTotal ??
                0;

            const artigo = document.createElement("article");

            artigo.className = "pedido-item";

            const identificacao = criarTexto(
                "strong",
                "pedido-identificacao",
                `Pedido #${id}`
            );

            const situacao = criarTexto(
                "span",
                "pedido-status",
                String(status)
            );

            const valorPedido = criarTexto(
                "span",
                "pedido-total",
                dinheiro(valor)
            );

            artigo.append(
                identificacao,
                situacao,
                valorPedido
            );

            fragmento.appendChild(artigo);
        });

        pedidos.appendChild(fragmento);
    }

    /* ======================================================
       08. CARREGAR CARRINHO
    ====================================================== */

    async function carregarItens() {
        const resposta = await window.requisicaoAPI(
            ENDPOINT_CARRINHO,
            {
                method: "GET"
            }
        );

        const lista = extrairItens(resposta);

        renderizarItens(lista);

        return lista;
    }

    /* ======================================================
       09. CARREGAR PEDIDOS
    ====================================================== */

    async function carregarPedidos() {
        const resposta = await window.requisicaoAPI(
            ENDPOINT_PEDIDOS,
            {
                method: "GET"
            }
        );

        const lista = extrairPedidos(resposta);

        renderizarPedidos(lista);

        return lista;
    }

    /* ======================================================
       10. ATUALIZAR TELA
    ====================================================== */

    async function atualizar(opcoes = {}) {
        if (carregamentoEmAndamento) {
            return;
        }

        carregamentoEmAndamento = true;

        const exibirCarregamento =
            opcoes.exibirCarregamento !== false;

        if (exibirCarregamento) {
            limparMensagem();

            itens.setAttribute("aria-busy", "true");

            itens.replaceChildren(
                criarTexto(
                    "p",
                    "carrinho-carregando",
                    "Carregando seu carrinho..."
                )
            );
        }

        try {
            await Promise.all([
                carregarItens(),
                carregarPedidos()
            ]);

        } catch (erro) {
            console.error(
                "SafeMarket: erro ao atualizar carrinho.",
                erro
            );

            mostrarMensagem(
                erro.message ||
                "Não foi possível carregar as informações do carrinho.",
                "erro"
            );

        } finally {
            itens.setAttribute("aria-busy", "false");

            carregamentoEmAndamento = false;
        }
    }

    /* ======================================================
       11. REMOVER PRODUTO
    ====================================================== */

    async function removerProduto(produtoId, botao) {
        if (
            produtoId === undefined ||
            produtoId === null
        ) {
            mostrarMensagem(
                "Não foi possível identificar o produto.",
                "erro"
            );

            return;
        }

        if (botao.disabled) {
            return;
        }

        botao.disabled = true;
        botao.textContent = "Removendo...";

        try {
            await window.requisicaoAPI(
                `${ENDPOINT_CARRINHO}/${encodeURIComponent(produtoId)}`,
                {
                    method: "DELETE"
                }
            );

            mostrarMensagem(
                "Produto removido do carrinho.",
                "sucesso"
            );

            await atualizar({
                exibirCarregamento: false
            });

        } catch (erro) {
            console.error(
                "SafeMarket: erro ao remover produto.",
                erro
            );

            mostrarMensagem(
                erro.message ||
                "Não foi possível remover o produto.",
                "erro"
            );

            botao.disabled = false;
            botao.textContent = "Tentar novamente";
        }
    }

    /* ======================================================
       12. FINALIZAR PEDIDO
    ====================================================== */

    async function finalizarPedido() {
        if (finalizacaoEmAndamento) {
            return;
        }

        if (botaoFinalizar.disabled) {
            return;
        }

        const confirmar = window.confirm(
            "Deseja realmente finalizar seu pedido?"
        );

        if (!confirmar) {
            return;
        }

        finalizacaoEmAndamento = true;

        botaoFinalizar.disabled = true;
        botaoFinalizar.textContent = "Finalizando...";

        limparMensagem();

        try {
            const pedido = await window.requisicaoAPI(
                ENDPOINT_PEDIDOS,
                {
                    method: "POST"
                }
            );

            const pedidoId = pedido?.id ??
                pedido?.pedidoId;

            mostrarMensagem(
                pedidoId !== undefined
                    ? `Pedido #${pedidoId} confirmado com sucesso!`
                    : "Pedido finalizado com sucesso!",
                "sucesso"
            );

            await atualizar({
                exibirCarregamento: false
            });

        } catch (erro) {
            console.error(
                "SafeMarket: erro ao finalizar pedido.",
                erro
            );

            mostrarMensagem(
                erro.message ||
                "Não foi possível finalizar o pedido.",
                "erro"
            );

        } finally {
            finalizacaoEmAndamento = false;

            botaoFinalizar.textContent = "Finalizar pedido";

            // O estado do botão será corrigido pelo próximo carregamento.
            if (!carregamentoEmAndamento) {
                botaoFinalizar.disabled =
                    itens.querySelector(".carrinho-vazio") !== null;
            }
        }
    }

    /* ======================================================
       13. EVENTOS
    ====================================================== */

    botaoFinalizar.addEventListener(
        "click",
        finalizarPedido
    );

    /* ======================================================
       14. INICIALIZAÇÃO
    ====================================================== */

    botaoFinalizar.disabled = true;

    atualizar();

    console.log(
        "SafeMarket: carrinho inicializado."
    );

});
