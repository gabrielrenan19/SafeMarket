
/* ==========================================================
   SAFEMARKET — CARRINHO DO CABEÇALHO
   Arquivo: js/carrinho-header.js

   Responsabilidades:
   - Consultar o carrinho real pela API
   - Atualizar o contador
   - Exibir a prévia dos produtos
   - Remover produtos
   - Atualizar quantidades
   - Sincronizar alterações entre páginas
========================================================== */

(() => {
    "use strict";

    const API = window.requisicaoAPI;

    const elementos = {
        container: document.getElementById("carrinhoHeader"),
        botao: document.getElementById("botaoCarrinhoHeader"),
        contador: document.getElementById("contadorCarrinho"),
        previa: document.getElementById("previaCarrinho"),
        fechar: document.getElementById("fecharPreviaCarrinho"),
        lista: document.getElementById("listaPreviaCarrinho"),
        quantidade: document.getElementById("quantidadeItensCarrinho"),
        total: document.getElementById("totalPreviaCarrinho")
    };

    if (!elementos.container || !elementos.botao) return;

    if (typeof API !== "function") {
        console.error(
            "SafeMarket: requisicaoAPI não está disponível."
        );
        return;
    }

    let itensCarrinho = [];
    let carregando = false;

    const moeda = valor => {
        return Number(valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    };

    const escaparHTML = valor => {
        return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[caractere]);
    };

    function obterQuantidadeTotal() {
        return itensCarrinho.reduce(
            (total, item) => total + Number(item.quantidade || 0),
            0
        );
    }

    function obterTotal() {
        return itensCarrinho.reduce(
            (total, item) => total + Number(
                item.subtotal ??
                Number(item.preco || 0) * Number(item.quantidade || 0)
            ),
            0
        );
    }

    function atualizarIndicadores() {
        const quantidade = obterQuantidadeTotal();

        elementos.contador.textContent =
            quantidade > 99 ? "99+" : quantidade;

        elementos.contador.setAttribute(
            "aria-label",
            `${quantidade} itens no carrinho`
        );

        elementos.quantidade.textContent =
            `${quantidade} ${quantidade === 1 ? "produto" : "produtos"}`;

        elementos.total.textContent = moeda(obterTotal());
    }

    function renderizarCarrinho() {
        atualizarIndicadores();

        if (itensCarrinho.length === 0) {
            elementos.lista.innerHTML = `
                <div class="carrinho-vazio">
                    <i data-lucide="shopping-basket"></i>
                    <strong>Seu carrinho está vazio</strong>
                    <p>Adicione produtos para começar suas compras.</p>
                </div>
            `;

            if (window.lucide) {
                window.lucide.createIcons();
            }

            return;
        }

        elementos.lista.innerHTML = itensCarrinho.map(item => {
            const id = Number(item.produtoId);
            const nome = escaparHTML(item.nome);
            const quantidade = Number(item.quantidade || 0);
            const preco = moeda(item.preco);
            const subtotal = moeda(
                item.subtotal ?? Number(item.preco) * quantidade
            );

            return `
                <article class="item-previa-carrinho">

                    <div class="imagem-previa-carrinho">
                        <i data-lucide="package"></i>
                    </div>

                    <div class="info-previa-carrinho">
                        <strong title="${nome}">
                            ${nome}
                        </strong>

                        <span>
                            ${quantidade} x ${preco}
                        </span>
                    </div>

                    <div class="previa-item-acoes">
                        <strong>${subtotal}</strong>

                        <button
                            type="button"
                            class="remover-previa-carrinho"
                            data-remover="${id}"
                            aria-label="Remover ${nome} do carrinho">
                            Remover
                        </button>
                    </div>

                </article>
            `;
        }).join("");

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    async function carregarCarrinho() {
        if (carregando) return;

        carregando = true;

        try {
            const resposta = await API("/carrinho");

            itensCarrinho = Array.isArray(resposta)
                ? resposta
                : Array.isArray(resposta?.itens)
                    ? resposta.itens
                    : [];

            renderizarCarrinho();

            return itensCarrinho;

        } catch (erro) {
            console.error(
                "Erro ao carregar prévia do carrinho:",
                erro
            );

            elementos.lista.innerHTML = `
                <p class="carrinho-erro">
                    Não foi possível carregar seu carrinho.
                    <br>
                    <button
                        type="button"
                        id="tentarCarregarCarrinho">
                        Tentar novamente
                    </button>
                </p>
            `;

        } finally {
            carregando = false;
        }
    }

    function abrirPrevia() {
        elementos.previa.hidden = false;

        elementos.botao.setAttribute(
            "aria-expanded",
            "true"
        );

        carregarCarrinho();
    }

    function fecharPrevia() {
        elementos.previa.hidden = true;

        elementos.botao.setAttribute(
            "aria-expanded",
            "false"
        );
    }

    function alternarPrevia() {
        if (elementos.previa.hidden) {
            abrirPrevia();
        } else {
            fecharPrevia();
        }
    }

    async function removerProduto(produtoId) {
        try {
            await API(`/carrinho/${produtoId}`, {
                method: "DELETE"
            });

            await carregarCarrinho();

            window.dispatchEvent(
                new CustomEvent("safemarket:carrinho-atualizado", {
                    detail: {
                        origem: "cabecalho",
                        produtoId
                    }
                })
            );

        } catch (erro) {
            console.error("Erro ao remover produto:", erro);
            alert(erro.message || "Não foi possível remover o produto.");
        }
    }

    async function atualizarQuantidade(produtoId, quantidade) {
        try {
            await API(`/carrinho/${produtoId}`, {
                method: "PUT",
                body: JSON.stringify({
                    quantidade: Number(quantidade)
                })
            });

            await carregarCarrinho();

            window.dispatchEvent(
                new CustomEvent("safemarket:carrinho-atualizado", {
                    detail: {
                        origem: "cabecalho",
                        produtoId
                    }
                })
            );

        } catch (erro) {
            console.error("Erro ao atualizar quantidade:", erro);
            alert(erro.message || "Não foi possível atualizar a quantidade.");
        }
    }

    // ABRIR E FECHAR

    elementos.botao.addEventListener("click", alternarPrevia);

    elementos.fechar.addEventListener("click", fecharPrevia);

    // AÇÕES DOS PRODUTOS

    elementos.lista.addEventListener("click", async evento => {
        const remover = evento.target.closest("[data-remover]");

        if (remover) {
            await removerProduto(Number(remover.dataset.remover));
            return;
        }

        if (evento.target.closest("#tentarCarregarCarrinho")) {
            await carregarCarrinho();
        }
    });

    // FECHAR AO CLICAR FORA

    document.addEventListener("click", evento => {
        if (!elementos.container.contains(evento.target)) {
            fecharPrevia();
        }
    });

    // FECHAR COM ESC

    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape") {
            fecharPrevia();
        }
    });

    // SINCRONIZAÇÃO COM OUTRAS FUNCIONALIDADES

    window.addEventListener(
        "safemarket:carrinho-atualizado",
        () => carregarCarrinho()
    );

    window.addEventListener("pageshow", () => {
        carregarCarrinho();
    });

    // DISPONIBILIZAR ATUALIZAÇÃO GLOBAL

    window.atualizarPreviaCarrinho = carregarCarrinho;

    window.abrirPreviaCarrinho = abrirPrevia;

    window.fecharPreviaCarrinho = fecharPrevia;

    // INICIALIZAÇÃO

    carregarCarrinho();

})();
