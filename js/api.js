
const API_URL = "http://localhost:3000/api";

async function requisicaoAPI(endpoint, opcoes = {}) {
    const headers = {
        ...opcoes.headers
    };

    if (opcoes.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    let resposta;

    try {
        resposta = await fetch(`${API_URL}${endpoint}`, {
            ...opcoes,
            headers
        });
    } catch {
        throw new Error(
            "Não foi possível conectar ao servidor. Verifique se ele está disponível."
        );
    }

    if (resposta.status === 204) {
        return null;
    }

    const tipoConteudo = resposta.headers.get("content-type") || "";
    let dados = null;

    if (tipoConteudo.includes("application/json")) {
        try {
            dados = await resposta.json();
        } catch {
            throw new Error("O servidor retornou uma resposta JSON inválida.");
        }
    } else {
        const texto = await resposta.text();
        dados = texto ? { message: texto } : null;
    }

    if (!resposta.ok) {
        throw new Error(
            dados?.message ||
            dados?.mensagem ||
            `Erro na requisição (HTTP ${resposta.status}).`
        );
    }

    return dados;
}
