package br.com.vendas.safe_market.dto;

import br.com.vendas.safe_market.model.Usuario;

public class UsuarioResponse {
    private Long id;
    private String nome;
    private String email;
    private String perfil;

    public UsuarioResponse() {}

    public UsuarioResponse(Long id, String nome, String email, String perfil) {
        this.id = id;
        this.nome = nome;
        this.email = email;
        this.perfil = perfil;
    }

    public Long id() { return id; }
    public String nome() { return nome; }
    public String email() { return email; }
    public String perfil() { return perfil; }

    public static UsuarioResponse de(Usuario u) {
        return new UsuarioResponse(u.getId(), u.getNome(), u.getEmail(), u.getPerfil().name());
    }
}
