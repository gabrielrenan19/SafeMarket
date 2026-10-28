
"use strict";

const formularioRecuperacao = document.getElementById("form-recuperacao");
const emailRecuperacao = document.getElementById("email-recuperacao");
const botaoRecuperacao = document.getElementById("btn-recuperacao");
const mensagemRecuperacao = document.getElementById("mensagem-recuperacao");

function exibirMensagemRecuperacao(mensagem, tipo) {
    mensagemRecuperacao.textContent = mensagem;
    mensagemRecuperacao.className = `mensagem-recuperacao ${tipo}`;
    mensagemRecuperacao.hidden = false;
}

emailRecuperacao.addEventListener("input", () => {
    mensagemRecuperacao.hidden = true;
});

formularioRecuperacao.addEventListener("submit", (evento) => {
    evento.preventDefault();

    const email = emailRecuperacao.value.trim();

    if (!email || !emailRecuperacao.validity.valid) {
        exibirMensagemRecuperacao(
            "Informe um endereço de e-mail válido.",
            "erro"
        );

        emailRecuperacao.focus();
        return;
    }

    exibirMensagemRecuperacao(
        "O e-mail foi validado. A recuperação ainda não está conectada ao servidor",
        "info"
    );
});
