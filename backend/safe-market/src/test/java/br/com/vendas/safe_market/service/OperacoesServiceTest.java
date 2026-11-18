
package br.com.vendas.safe_market.service;

import br.com.vendas.safe_market.model.*;
import br.com.vendas.safe_market.repository.*;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class OperacoesServiceTest {

    JdbcTemplate db = mock(JdbcTemplate.class);

    UsuarioRepository usuarios = mock(UsuarioRepository.class);

    ProdutoRepository produtos = mock(ProdutoRepository.class);

    ObjectMapper objectMapper = new ObjectMapper();

    OperacoesService service = new OperacoesService(
            db,
            usuarios,
            produtos,
            objectMapper
    );

    Principal principal = () -> "comprador@example.com";

    Usuario usuario;

    @BeforeEach
    void setup() {

        usuario = new Usuario();

        org.springframework.test.util.ReflectionTestUtils.setField(
                usuario,
                "id",
                7L
        );

        usuario.setEmail("comprador@example.com");

        when(usuarios.findByEmail("comprador@example.com"))
                .thenReturn(Optional.of(usuario));
    }

    @Test
    void adicionarNaoPermiteQuantidadeAcumuladaAcimaDoEstoque() {

        when(db.queryForMap(
                contains("FROM usuarios"),
                eq(7L)
        )).thenReturn(Map.of("id", 7L));

        when(db.queryForList(
                contains("SELECT estoque FROM produtos"),
                eq(9L)
        )).thenReturn(List.of(Map.of("estoque", 5)));

        when(db.queryForObject(
                contains("COALESCE"),
                eq(Integer.class),
                eq(7L),
                eq(9L)
        )).thenReturn(4);

        assertThrows(
                ResponseStatusException.class,
                () -> service.carrinhoAdicionar(principal, 9L, 4)
        );
    }

    @Test
    void alterarQuantidadeNaoPermiteEstoqueInsuficiente() {

        when(db.queryForMap(
                contains("FROM usuarios"),
                eq(7L)
        )).thenReturn(Map.of("id", 7L));

        when(db.queryForList(
                contains("SELECT estoque FROM produtos"),
                eq(9L)
        )).thenReturn(List.of(Map.of("estoque", 5)));

        assertThrows(
                ResponseStatusException.class,
                () -> service.carrinhoQuantidade(principal, 9L, 6)
        );
    }

    @Test
    void contaBloqueadaNaoPodeComprar() {

        org.springframework.test.util.ReflectionTestUtils.setField(
                usuario,
                "status",
                StatusUsuario.BLOQUEADO
        );

        assertThrows(
                ResponseStatusException.class,
                () -> service.carrinho(principal)
        );
    }
}
