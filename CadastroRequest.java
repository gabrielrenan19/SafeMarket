package br.com.vendas.safe_market.dto;

import jakarta.validation.constraints.*;

public class CadastroRequest {
    @NotBlank @Size(max=120) private String nome;
    @NotBlank @Email @Size(max=150) private String email;
    @NotBlank @Size(min=8, max=72) private String senha;

    public CadastroRequest() {}

    public CadastroRequest(String nome, String email, String senha) {
        this.nome = nome;
        this.email = email;
        this.senha = senha;
    }

    public String nome() { return nome; }
    public String email() { return email; }
    public String senha() { return senha; }
}
