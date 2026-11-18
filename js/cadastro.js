
"use strict";

// =====================================================
// SAFEMARKET — CADASTRO
// Integração com Spring Boot e MySQL
// Cadastro + autenticação automática
// =====================================================

// Elementos do formulário
const formulario = document.getElementById("form-cadastro");

const campoNome = document.getElementById("nome");
const campoEmail = document.getElementById("email");
const campoSenha = document.getElementById("senha");
const campoConfirmacao = document.getElementById("confirmar-senha");

const mensagem = document.getElementById("mensagem-cadastro");

const botaoCadastro = formulario?.querySelector(
    'button[type="submit"]'
);

let enviando = false;

// =====================================================
// REQUISITOS VISUAIS DA SENHA
// =====================================================

const regrasSenha = {
    tamanho: document.getElementById("regra-tamanho"),
    maiuscula: document.getElementById("regra-maiuscula"),
    minuscula: document.getElementById("regra-minuscula"),
    numero: document.getElementById("regra-numero"),
    especial: document.getElementById("regra-especial")
};

// =====================================================
// INDICADOR DE FORÇA
// =====================================================

const textoForca = document.getElementById("texto-forca");
const progressoForca = document.getElementById("progresso-forca");

// =====================================================
// MENSAGENS
// =====================================================

function exibirMensagem(texto, tipo = "erro") {

    if (!mensagem) return;

    mensagem.textContent = texto;

    mensagem.style.color =
        tipo === "erro" ? "#ffb4b4" : "#8ff0c6";
}

// =====================================================
// VERIFICAR REQUISITOS DA SENHA
// =====================================================

function verificarRequisitosSenha(senha) {

    return {
        tamanho: senha.length >= 8,
        maiuscula: /[A-Z]/.test(senha),
        minuscula: /[a-z]/.test(senha),
        numero: /[0-9]/.test(senha),
        especial: /[^A-Za-z0-9\s]/.test(senha)
    };
}

// =====================================================
// BLOQUEIO DE SENHAS COMUNS
// =====================================================

const senhasComuns = [
    "senhaforte@123",
    "admin123456!",
    "qwerty@123456",
    "abcd12345678!",
    "123456789012",
    "password123!",
    "brasil123456!"
];

function verificarSenhaComum(senha) {

    return senhasComuns.includes(senha.toLowerCase());
}

// =====================================================
// INDICADOR DE FORÇA DA SENHA
// =====================================================

function atualizarForcaSenha(senha) {

    if (!textoForca || !progressoForca) return;

    const requisitos = verificarRequisitosSenha(senha);

    const pontos = Object.values(requisitos)
        .filter(Boolean).length;

    if (!senha) {

        textoForca.textContent = "Não informada";
        progressoForca.style.width = "0%";
        progressoForca.style.backgroundColor = "#999";

        return;
    }

    const estados = {
        0: {
            texto: "Fraca",
            cor: "#dc5555",
            largura: "10%"
        },
        1: {
            texto: "Fraca",
            cor: "#dc5555",
            largura: "20%"
        },
        2: {
            texto: "Fraca",
            cor: "#dc5555",
            largura: "40%"
        },
        3: {
            texto: "Média",
            cor: "#e5a52c",
            largura: "60%"
        },
        4: {
            texto: "Forte",
            cor: "#36a96b",
            largura: "80%"
        },
        5: {
            texto: "Muito forte",
            cor: "#16834c",
            largura: "100%"
        }
    };

    const estado = estados[pontos];

    textoForca.textContent = estado.texto;
    progressoForca.style.width = estado.largura;
    progressoForca.style.backgroundColor = estado.cor;
}

// =====================================================
// ATUALIZAR CHECKLIST
// =====================================================

function atualizarRequisitosSenha() {

    if (!campoSenha) return;

    const verificacoes = verificarRequisitosSenha(
        campoSenha.value
    );

    atualizarForcaSenha(campoSenha.value);

    for (const regra in verificacoes) {

        const elemento = regrasSenha[regra];

        if (!elemento) continue;

        const indicador = elemento.querySelector(".indicador");

        if (verificacoes[regra]) {

            elemento.classList.add("validado");

            if (indicador) {
                indicador.textContent = "✓";
            }

        } else {

            elemento.classList.remove("validado");

            if (indicador) {
                indicador.textContent = "○";
            }
        }
    }
}

campoSenha?.addEventListener(
    "input",
    atualizarRequisitosSenha
);

// =====================================================
// VALIDAR SENHA
// =====================================================

function validarSenha(senha) {

    const requisitos = verificarRequisitosSenha(senha);

    if (!requisitos.tamanho) {
        return "A senha deve ter pelo menos 8 caracteres.";
    }

    if (!requisitos.maiuscula) {
        return "Adicione pelo menos uma letra maiúscula.";
    }

    if (!requisitos.minuscula) {
        return "Adicione pelo menos uma letra minúscula.";
    }

    if (!requisitos.numero) {
        return "Adicione pelo menos um número.";
    }

    if (!requisitos.especial) {
        return "Adicione pelo menos um caractere especial.";
    }

    if (verificarSenhaComum(senha)) {
        return "Essa senha é muito comum. Escolha outra mais segura.";
    }

    return null;
}

// =====================================================
// CONTROLAR BOTÃO
// =====================================================

function alterarEstadoBotao(estado, texto) {

    if (!botaoCadastro) return;

    botaoCadastro.disabled = estado;

    botaoCadastro.textContent = estado
        ? texto
        : "CRIAR MINHA CONTA";
}

// =====================================================
// REDIRECIONAR POR PERFIL
// Mesmo comportamento utilizado no login
// =====================================================

function redirecionarPorPerfil(perfil) {

    const perfilNormalizado = String(perfil || "")
        .trim()
        .toUpperCase();

    switch (perfilNormalizado) {

        case "ADMIN":

            window.location.replace("dashboard.html");

            break;

        case "COMPRADOR":

            window.location.replace("marketplace.html");

            break;

        default:

            throw new Error(
                "Cadastro realizado e login efetuado, mas o perfil recebido não possui redirecionamento configurado: " +
                perfilNormalizado
            );
    }
}

// =====================================================
// PROCESSAR CADASTRO
// =====================================================

formulario?.addEventListener("submit", async function (evento) {

    evento.preventDefault();

    if (enviando) return;

    exibirMensagem("");

    const nome = campoNome.value.trim();

    const email = campoEmail.value.trim().toLowerCase();

    const senha = campoSenha.value;

    const confirmacao = campoConfirmacao.value;

    // VALIDAR NOME

    if (!nome) {

        exibirMensagem("Informe seu nome completo.");
        campoNome.focus();

        return;
    }

    if (nome.length > 120) {

        exibirMensagem("O nome deve ter no máximo 120 caracteres.");
        campoNome.focus();

        return;
    }

    // VALIDAR E-MAIL

    if (!email || !campoEmail.checkValidity()) {

        exibirMensagem("Digite um e-mail válido.");
        campoEmail.focus();

        return;
    }

    if (email.length > 150) {

        exibirMensagem("O e-mail deve ter no máximo 150 caracteres.");
        campoEmail.focus();

        return;
    }

    // VALIDAR SENHA

    const erroSenha = validarSenha(senha);

    if (erroSenha) {

        exibirMensagem(erroSenha);
        campoSenha.focus();

        return;
    }

    if (senha.length > 72) {

        exibirMensagem("A senha deve ter no máximo 72 caracteres.");
        campoSenha.focus();

        return;
    }

    // CONFIRMAR SENHA

    if (!confirmacao) {

        exibirMensagem("Confirme sua senha.");
        campoConfirmacao.focus();

        return;
    }

    if (senha !== confirmacao) {

        exibirMensagem("As senhas não coincidem.");
        campoConfirmacao.focus();

        return;
    }

    // INICIAR PROCESSAMENTO

    enviando = true;

    let cadastroConcluido = false;

    alterarEstadoBotao(true, "CRIANDO CONTA...");

    try {

        if (typeof requisicaoAPI !== "function") {

            throw new Error(
                "Arquivo api.js não foi carregado corretamente."
            );
        }

        // =============================================
        // ETAPA 1 — CADASTRAR USUÁRIO
        // =============================================

        const respostaCadastro = await requisicaoAPI(
            "/auth/cadastro",
            {
                method: "POST",

                body: JSON.stringify({
                    nome,
                    email,
                    senha
                })
            }
        );

        console.log(
            "Resposta do cadastro:",
            respostaCadastro
        );

        cadastroConcluido = true;

        exibirMensagem(
            "Conta criada! Preparando seu acesso...",
            "sucesso"
        );

        // =============================================
        // ETAPA 2 — LOGIN AUTOMÁTICO
        // =============================================

        alterarEstadoBotao(true, "AUTENTICANDO...");

        const dadosLogin = await requisicaoAPI(
            "/auth/login",
            {
                method: "POST",

                body: JSON.stringify({
                    email,
                    senha
                })
            }
        );

        console.log("Resposta do login automático:", {
            id: dadosLogin?.id,
            nome: dadosLogin?.nome,
            perfil: dadosLogin?.perfil
        });

        // =============================================
        // ETAPA 3 — VALIDAR AUTENTICAÇÃO
        // =============================================

        if (!dadosLogin || !dadosLogin.perfil) {

            throw new Error(
                "A conta foi criada, mas o servidor não retornou os dados necessários para confirmar o login."
            );
        }

        exibirMensagem(
            "Cadastro e autenticação realizados! Redirecionando...",
            "sucesso"
        );

        // =============================================
        // ETAPA 4 — REDIRECIONAR
        // =============================================

        console.log(
            "Redirecionando usuário com perfil:",
            dadosLogin.perfil
        );

        redirecionarPorPerfil(dadosLogin.perfil);

    } catch (erro) {

        console.error(
            "Erro no processo de cadastro/login:",
            erro
        );

        if (cadastroConcluido) {

            exibirMensagem(
                "Sua conta foi criada, mas não foi possível entrar automaticamente. Faça login com o e-mail e a senha cadastrados. Detalhe: " +
                erro.message
            );

        } else {

            exibirMensagem(
                erro.message || "Não foi possível realizar o cadastro."
            );
        }

    } finally {

        enviando = false;

        alterarEstadoBotao(false);
    }
});

// =====================================================
// CADASTRO COM GOOGLE
// =====================================================

document.getElementById("cadastro-google")
    ?.addEventListener("click", function () {

        alert(
            "A autenticação com Google ainda não foi implementada."
        );
    });

// =====================================================
// CADASTRO COM FACEBOOK
// =====================================================

document.getElementById("cadastro-facebook")
    ?.addEventListener("click", function () {

        alert(
            "A autenticação com Facebook ainda não foi implementada."
        );
    });

// =====================================================
// INICIALIZAÇÃO
// =====================================================

atualizarRequisitosSenha();
