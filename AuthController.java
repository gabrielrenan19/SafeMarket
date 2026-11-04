package br.com.vendas.safe_market.controller;
import br.com.vendas.safe_market.dto.*;
import br.com.vendas.safe_market.model.Usuario;
import br.com.vendas.safe_market.service.UsuarioService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.*;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.Collections;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UsuarioService usuarios;
    private final SecurityContextRepository contextRepository;
    public AuthController(UsuarioService usuarios, SecurityContextRepository contextRepository) {
        this.usuarios = usuarios; this.contextRepository = contextRepository;
    }
    @PostMapping("/cadastro")
    public ResponseEntity<UsuarioResponse> cadastro(@Valid @RequestBody CadastroRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(usuarios.cadastrar(req));
    }
    @PostMapping("/login")
    public UsuarioResponse login(@Valid @RequestBody LoginRequest req,
                                  HttpServletRequest request, HttpServletResponse response) {
        Usuario usuario = usuarios.autenticar(req);
        request.getSession(true); // cria sessão HTTP no servidor
        Authentication auth = UsernamePasswordAuthenticationToken.authenticated(
            usuario.getEmail(), null,
            Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + usuario.getPerfil().name())));
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        contextRepository.saveContext(context, request, response);
        return UsuarioResponse.de(usuario);
    }
    @GetMapping("/me")
    public UsuarioResponse me(Principal principal) {
        return usuarios.buscarPorEmail(principal.getName());
    }
    @PutMapping("/me/nome")
    public UsuarioResponse alterarMeuNome(@Valid @RequestBody AlterarNomeRequest req,
                                           Principal principal) {
        return usuarios.alterarMeuNome(principal.getName(), req);
    }
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        if (request.getSession(false) != null) request.getSession(false).invalidate();
        SecurityContextHolder.clearContext();
        return ResponseEntity.noContent().build();
    }
}
