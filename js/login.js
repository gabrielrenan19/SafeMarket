"use strict";

// =====================================================
// SAFEMARKET — LOGIN
// Autenticação e redirecionamento por perfil
// =====================================================

const formulario = document.getElementById("form-login");
const campoEmail = document.getElementById("email");
const campoSenha = document.getElementById("senha");
const mensagem = document.getElementById("mensagem-login");

const botaoLogin = formulario.querySelector(
    'button[type="submit"]'
);

let autenticando = false;


// =====================================================
// MENSAGENS
// =====================================================

function exibirMensagem(texto, tipo = "erro") {

    mensagem.textContent = texto;

    mensagem.dataset.tipo = tipo;

}


// =====================================================
// REDIRECIONAMENTO POR PERFIL
// =====================================================

function redirecionarPorPerfil(perfil) {

    const perfilNormalizado = String(perfil || "")
        .trim()
        .toUpperCase();

    switch (perfilNormalizado) {

        case "ADMIN":

            window.location.href = "dashboard.html";

            break;


        case "COMPRADOR":

            window.location.href = "marketplace.html";

            break;


        default:

            exibirMensagem(
                "Perfil não reconhecido. Entre em contato com o suporte."
            );

            console.error(
                "Perfil sem redirecionamento configurado:",
                perfil
            );

            break;
    }
}


// =====================================================
// AUTENTICAÇÃO
// =====================================================

formulario.addEventListener("submit", async function (evento) {

    evento.preventDefault();

    if (autenticando) return;

    mensagem.textContent = "";
    delete mensagem.dataset.tipo;

    const email = campoEmail.value.trim();
    const senha = campoSenha.value;


    // -------------------------------------------------
    // VALIDAR E-MAIL
    // -------------------------------------------------

    if (!email || !campoEmail.checkValidity()) {

        exibirMensagem("Digite um e-mail válido.");

        campoEmail.focus();

        return;
    }


    // -------------------------------------------------
    // VALIDAR SENHA
    // -------------------------------------------------

    if (!senha) {

        exibirMensagem("Digite sua senha.");

        campoSenha.focus();

        return;
    }


    // -------------------------------------------------
    // INICIAR AUTENTICAÇÃO
    // -------------------------------------------------

    autenticando = true;

    botaoLogin.disabled = true;


    try {

        // Enviar credenciais ao Spring Boot
        const dados = await requisicaoAPI(
            "/auth/login",
            {
                method: "POST",

                body: JSON.stringify({
                    email,
                    senha
                })
            }
        );


        // -------------------------------------------------
        // REGISTRAR RESPOSTA
        // -------------------------------------------------

        console.log("Resposta do login:", {
            id: dados?.id,
            nome: dados?.nome,
            perfil: dados?.perfil
        });


        // -------------------------------------------------
        // VERIFICAR RESPOSTA
        // -------------------------------------------------

        if (!dados || !dados.perfil) {

            throw new Error(
                "O servidor não retornou o perfil do usuário."
            );
        }


        // -------------------------------------------------
        // REDIRECIONAR CONFORME O PERFIL
        // -------------------------------------------------

        redirecionarPorPerfil(dados.perfil);


    } catch (erro) {

        console.error("Erro no login:", erro);

        exibirMensagem(
            erro.message || "Não foi possível realizar o login."
        );


    } finally {

        autenticando = false;

        botaoLogin.disabled = false;

    }

});