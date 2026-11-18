
"use strict";

/* =========================================================
   SAFEMARKET — CONFIGURAÇÕES
   Arquivo: js/configuracoes.js

   RESPONSABILIDADES:
   - Carregar preferências da API
   - Atualizar os interruptores
   - Salvar alterações no backend
   - Exibir mensagens de retorno
========================================================= */


const formularioConfiguracoes = document.getElementById(
    "form-configuracoes"
);

const mensagemConfiguracoes = document.getElementById(
    "mensagem-configuracoes"
);


/* =========================================================
   1. MENSAGENS DE RETORNO
========================================================= */

function exibirMensagemConfiguracoes(mensagem) {

    mensagemConfiguracoes.textContent = mensagem;

    mensagemConfiguracoes.hidden = false;

}


/* =========================================================
   2. CARREGAR PREFERÊNCIAS
========================================================= */

async function carregarConfiguracoes() {

    try {

        const dados = await requisicaoAPI("/configuracoes");

        document.getElementById("notificacoes").checked =
            !!dados.notificacoes;

        document.getElementById("alertas-seguranca").checked =
            !!dados.alertasSeguranca;

        document.getElementById("alertas-fraude").checked =
            !!dados.alertasFraude;

    } catch (erro) {

        exibirMensagemConfiguracoes(
            erro.message || "Não foi possível carregar as configurações."
        );

    }

}


/* =========================================================
   3. SALVAR PREFERÊNCIAS
========================================================= */

async function salvarConfiguracoes(evento) {

    evento.preventDefault();

    const botao = document.getElementById(
        "botao-salvar-configuracoes"
    );

    botao.disabled = true;

    try {

        const preferencias = {

            notificacoes: document.getElementById(
                "notificacoes"
            ).checked,

            alertasSeguranca: document.getElementById(
                "alertas-seguranca"
            ).checked,

            alertasFraude: document.getElementById(
                "alertas-fraude"
            ).checked

        };

        await requisicaoAPI("/configuracoes", {

            method: "PUT",

            body: JSON.stringify(preferencias)

        });

        exibirMensagemConfiguracoes(
            "Preferências salvas com sucesso."
        );

    } catch (erro) {

        exibirMensagemConfiguracoes(
            erro.message || "Não foi possível salvar as preferências."
        );

    } finally {

        botao.disabled = false;

    }

}


/* =========================================================
   4. INICIALIZAÇÃO
========================================================= */

if (formularioConfiguracoes && mensagemConfiguracoes) {

    carregarConfiguracoes();

    formularioConfiguracoes.addEventListener(
        "submit",
        salvarConfiguracoes
    );

}
