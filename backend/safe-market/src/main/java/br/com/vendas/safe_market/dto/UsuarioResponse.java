
package br.com.vendas.safe_market.dto;

import br.com.vendas.safe_market.model.Usuario;

public class UsuarioResponse {

    private Long id;
    private String nome;
    private String email;
    private String perfil;

    public UsuarioResponse() {
    }

    public UsuarioResponse(Long id, String nome, String email, String perfil) {
        this.id = id;
        this.nome = nome;
        this.email = email;
        this.perfil = perfil;
    }

    public Long getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public String getEmail() {
        return email;
    }

    public String getPerfil() {
        return perfil;
    }

    public static UsuarioResponse de(Usuario usuario) {

        return new UsuarioResponse(
            usuario.getId(),
            usuario.getNome(),
            usuario.getEmail(),
            usuario.getPerfil().name()
        );
    }
}
