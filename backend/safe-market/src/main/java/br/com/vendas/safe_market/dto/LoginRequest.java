package br.com.vendas.safe_market.dto;

import jakarta.validation.constraints.*;

public class LoginRequest {
    @NotBlank @Email private String email;
    @NotBlank private String senha;

    public LoginRequest() {}

    public LoginRequest(String email, String senha) {
        this.email = email;
        this.senha = senha;
    }

    public String email() { return email; }
    public String senha() { return senha; }
    public String getEmail() { return email; }
    public void setEmail(String value) { this.email = value; }
    public String getSenha() { return senha; }
    public void setSenha(String value) { this.senha = value; }
}
