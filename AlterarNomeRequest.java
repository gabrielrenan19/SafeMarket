package br.com.vendas.safe_market.dto;

import jakarta.validation.constraints.*;

public class AlterarNomeRequest {
    @NotBlank @Size(max=120) private String nome;

    public AlterarNomeRequest() {}

    public AlterarNomeRequest(String nome) {
        this.nome = nome;
    }

    public String nome() { return nome; }
}
