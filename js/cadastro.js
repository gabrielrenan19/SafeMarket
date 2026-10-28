
const formulario = document.getElementById("form-cadastro");

const campoNome = document.getElementById("nome");
const campoEmail = document.getElementById("email");
const campoSenha = document.getElementById("senha");
const campoConfirmacao = document.getElementById("confirmar-senha");
const mensagem = document.getElementById("mensagem-cadastro");
const botaoCadastro = formulario.querySelector('button[type="submit"]');

let enviando = false;

function exibirMensagem(texto, tipo = "erro") {
    mensagem.textContent = texto;
    mensagem.style.color =
        tipo === "erro" ? "#ffb4b4" : "#8ff0c6";
}

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    if (enviando) return;

    mensagem.textContent = "";

    const nome = campoNome.value.trim();
    const email = campoEmail.value.trim();
    const senha = campoSenha.value;
    const confirmacao = campoConfirmacao.value;

    if (!nome) {
        exibirMensagem("Informe seu nome completo.");
        campoNome.focus();
        return;
    }

    if (!email || !campoEmail.checkValidity()) {
        exibirMensagem("Digite um e-mail válido.");
        campoEmail.focus();
        return;
    }

    if (senha.length < 8) {
        exibirMensagem("A senha deve ter pelo menos 8 caracteres.");
        campoSenha.focus();
        return;
    }

    if (senha !== confirmacao) {
        exibirMensagem("As senhas não coincidem.");
        campoConfirmacao.focus();
        return;
    }

    // A integração será feita após confirmar a rota do backend.
    exibirMensagem(
        "Validação concluída. O cadastro ainda não foi enviado ao servidor.",
        "sucesso"
    );
});

document.getElementById("cadastro-google")
    .addEventListener("click", function () {
        alert("A autenticação com Google ainda não foi implementada.");
    });

document.getElementById("cadastro-facebook")
    .addEventListener("click", function () {
        alert("A autenticação com Facebook ainda não foi implementada.");
    });
