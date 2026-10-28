
"use strict";

const formularioConfiguracoes = document.getElementById("form-configuracoes");
const mensagemConfiguracoes = document.getElementById("mensagem-configuracoes");
const botaoSalvar = formularioConfiguracoes.querySelector('button[type="submit"]');

let salvando = false;

formularioConfiguracoes.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    if (salvando) return;

    mensagemConfiguracoes.textContent = "";

    const preferencias = {
        notificacoes: document.getElementById("notificacoes").checked,
        alertasSeguranca: document.getElementById("alertas-seguranca").checked,
        alertasFraude: document.getElementById("alertas-fraude").checked
    };

    // A integração será feita quando a API de configurações for definida.
    // Não informar sucesso enquanto as preferências não forem salvas.
    salvando = true;
    botaoSalvar.disabled = true;

    mensagemConfiguracoes.textContent =
        "Preferências selecionadas. O salvamento no servidor ainda não foi conectado.";

    console.log("Preferências selecionadas:", preferencias);

    salvando = false;
    botaoSalvar.disabled = false;
});
