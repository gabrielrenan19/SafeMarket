package br.com.vendas.safe_market.service;
import br.com.vendas.safe_market.dto.*;
import br.com.vendas.safe_market.model.*;
import br.com.vendas.safe_market.repository.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.Locale;

@Service
public class UsuarioService {
    private final UsuarioRepository repo;
    private final PasswordEncoder encoder;
    public UsuarioService(UsuarioRepository repo, PasswordEncoder encoder) {
        this.repo = repo; this.encoder = encoder;
    }
    @Transactional
    public UsuarioResponse cadastrar(CadastroRequest req) {
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        if (repo.existsByEmail(email)) throw new ResponseStatusException(HttpStatus.CONFLICT, "E-mail já cadastrado");
        Usuario u = new Usuario();
        u.setNome(req.nome().trim());
        u.setEmail(email);
        u.setSenhaHash(encoder.encode(req.senha()));
        // Perfil COMPRADOR e status ATIVO são definidos na entidade; o cliente não escolhe.
        return UsuarioResponse.de(repo.saveAndFlush(u));
    }
    @Transactional(readOnly = true)
    public Usuario autenticar(LoginRequest req) {
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        Usuario u = repo.findByEmail(email).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-mail ou senha inválidos"));
        if (!encoder.matches(req.senha(), u.getSenhaHash()))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-mail ou senha inválidos");
        if (u.getStatus() != StatusUsuario.ATIVO)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Conta não está ativa");
        return u;
    }
    // Alteração permitida apenas ao próprio usuário autenticado.
    // O identificador do autor vem da sessão, nunca do JSON enviado pelo cliente.
    @Transactional
    public UsuarioResponse alterarMeuNome(String emailAutenticado, AlterarNomeRequest req) {
        Usuario usuario = repo.findByEmail(emailAutenticado).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sessão inválida"));
        usuario.setNome(req.nome().trim());
        usuario.setAtualizadoPor(usuario.getId());
        return UsuarioResponse.de(repo.saveAndFlush(usuario));
    }

    @Transactional(readOnly = true)
    public UsuarioResponse buscarPorEmail(String email) {
        return repo.findByEmail(email).map(UsuarioResponse::de).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sessão inválida"));
    }
}
