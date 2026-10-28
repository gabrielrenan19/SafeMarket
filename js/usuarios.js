
"use strict";

const listaUsuarios = document.getElementById("lista-usuarios");
const mensagemUsuarios = document.getElementById("mensagem-usuarios");

const statusPermitidos = [
    "ativo",
    "bloqueado",
    "em análise"
];

function atualizarUsuarios(usuarios) {
    if (!Array.isArray(usuarios)) {
        throw new Error("A lista de usuários recebida é inválida.");
    }

    if (!listaUsuarios) return;

    if (usuarios.length === 0) {
        const vazio = document.createElement("p");
        vazio.textContent = "Nenhum usuário encontrado.";

        listaUsuarios.replaceChildren(vazio);
        return;
    }

    const fragmento = document.createDocumentFragment();

    usuarios.forEach((usuario) => {
        const atividade = document.createElement("div");
        atividade.className = "atividade";

        const nomePerfil = document.createElement("p");

        const nome = typeof usuario.nome === "string"
            ? usuario.nome
            : "Nome não informado";

        const perfil = typeof usuario.perfil === "string"
            ? usuario.perfil
            : "Perfil não informado";

        nomePerfil.textContent = `${nome} — ${perfil}`;
        atividade.appendChild(nomePerfil);

        const status = document.createElement("span");
        const statusRecebido = String(usuario.status || "").toLowerCase();

        if (statusPermitidos.includes(statusRecebido)) {
            status.textContent = statusRecebido;
        } else {
            status.textContent = "Status não informado";
        }

        atividade.appendChild(status);

        fragmento.appendChild(atividade);
    });

    listaUsuarios.replaceChildren(fragmento);
}

function exibirErroUsuarios(mensagem) {
    if (mensagemUsuarios) {
        mensagemUsuarios.textContent =
            mensagem || "Não foi possível carregar os usuários.";
    }
}

window.usuariosSafeMarket = {
    atualizar: atualizarUsuarios,
    exibirErro: exibirErroUsuarios
};
