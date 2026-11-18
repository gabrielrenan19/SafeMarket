package br.com.vendas.safe_market.service;

import br.com.vendas.safe_market.dto.CadastroRequest;
import br.com.vendas.safe_market.dto.LoginRequest;
import br.com.vendas.safe_market.model.Usuario;
import br.com.vendas.safe_market.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class UsuarioServiceTest {
    private UsuarioRepository repo;
    private PasswordEncoder encoder;
    private UsuarioService service;

    @BeforeEach void setup() {
        repo = mock(UsuarioRepository.class);
        encoder = mock(PasswordEncoder.class);
        service = new UsuarioService(repo, encoder);
    }

    @Test void cadastroSalvaHashNuncaSenhaEmTexto() {
        when(repo.existsByEmail("ana@example.com")).thenReturn(false);
        when(encoder.encode("SenhaSegura123")).thenReturn("$2a$hash-test");
        when(repo.saveAndFlush(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));
        service.cadastrar(new CadastroRequest("Ana", " ANA@EXAMPLE.COM ", "SenhaSegura123"));
        var captor = org.mockito.ArgumentCaptor.forClass(Usuario.class);
        verify(repo).saveAndFlush(captor.capture());
        assertEquals("ana@example.com", captor.getValue().getEmail());
        assertEquals("$2a$hash-test", captor.getValue().getSenhaHash());
        assertNotEquals("SenhaSegura123", captor.getValue().getSenhaHash());
    }

    @Test void cadastroRejeitaEmailDuplicado() {
        when(repo.existsByEmail("ana@example.com")).thenReturn(true);
        var e = assertThrows(ResponseStatusException.class,
            () -> service.cadastrar(new CadastroRequest("Ana", "ana@example.com", "SenhaSegura123")));
        assertEquals(HttpStatus.CONFLICT, e.getStatusCode());
        verify(repo, never()).saveAndFlush(any());
    }

    @Test void loginRejeitaSenhaIncorreta() {
        Usuario u = new Usuario();
        u.setEmail("ana@example.com");
        u.setSenhaHash("$2a$hash-test");
        when(repo.findByEmail("ana@example.com")).thenReturn(Optional.of(u));
        when(encoder.matches("errada", "$2a$hash-test")).thenReturn(false);
        var e = assertThrows(ResponseStatusException.class,
            () -> service.autenticar(new LoginRequest("ana@example.com", "errada")));
        assertEquals(HttpStatus.UNAUTHORIZED, e.getStatusCode());
    }

    @Test void loginValidoRetornaUsuario() {
        Usuario u = new Usuario();
        u.setEmail("ana@example.com");
        u.setSenhaHash("$2a$hash-test");
        when(repo.findByEmail("ana@example.com")).thenReturn(Optional.of(u));
        when(encoder.matches("SenhaSegura123", "$2a$hash-test")).thenReturn(true);
        assertSame(u, service.autenticar(new LoginRequest("ana@example.com", "SenhaSegura123")));
    }
}
