
const formulario = document.getElementById("form-login");
const campoEmail = document.getElementById("email");
const campoSenha = document.getElementById("senha");
const mensagem = document.getElementById("mensagem-login");
const botaoLogin = formulario.querySelector('button[type="submit"]');

let autenticando = false;

function exibirMensagem(texto, tipo = "erro") {
    mensagem.textContent = texto;
    mensagem.style.color =
        tipo === "erro" ? "#ffb4b4" : "#8ff0c6";
}

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    if (autenticando) return;

    mensagem.textContent = "";

    const email = campoEmail.value.trim();
    const senha = campoSenha.value;

    if (!email || !campoEmail.checkValidity()) {
        exibirMensagem("Digite um e-mail válido.");
        campoEmail.focus();
        return;
    }

    if (!senha) {
        exibirMensagem("Digite sua senha.");
        campoSenha.focus();
        return;
    }

    // A rota de autenticação será adicionada após confirmar
    // o endpoint e o formato de resposta do backend.
    exibirMensagem(
        "Validação concluída. A autenticação com o servidor ainda não foi conectada.",
        "sucesso"
    );
});
