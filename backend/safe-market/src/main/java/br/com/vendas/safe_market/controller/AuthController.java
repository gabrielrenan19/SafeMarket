
package br.com.vendas.safe_market.controller;

import br.com.vendas.safe_market.dto.AlterarNomeRequest;
import br.com.vendas.safe_market.dto.CadastroRequest;
import br.com.vendas.safe_market.dto.LoginRequest;
import br.com.vendas.safe_market.dto.UsuarioResponse;
import br.com.vendas.safe_market.model.Usuario;
import br.com.vendas.safe_market.service.OperacoesService;
import br.com.vendas.safe_market.service.UsuarioService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UsuarioService usuarios;
    private final OperacoesService operacoes;
    private final SecurityContextRepository contextRepository;

    public AuthController(
            UsuarioService usuarios,
            SecurityContextRepository contextRepository,
            OperacoesService operacoes) {

        this.usuarios = usuarios;
        this.contextRepository = contextRepository;
        this.operacoes = operacoes;
    }

    // ==========================================
    // TOKEN CSRF
    // ==========================================

    @GetMapping("/csrf")
    public Map<String, String> csrf(
            org.springframework.security.web.csrf.CsrfToken token) {

        return Collections.singletonMap("token", token.getToken());
    }

    // ==========================================
    // CADASTRO DE USUÁRIO
    // ==========================================

    @PostMapping("/cadastro")
    public ResponseEntity<UsuarioResponse> cadastro(
            @Valid @RequestBody CadastroRequest req) {

        UsuarioResponse criado = usuarios.cadastrar(req);

        operacoes.log(
                null,
                "CADASTRAR",
                "USUARIO",
                criado.getId(),
                "Cadastro de usuário"
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(criado);
    }

    // ==========================================
    // LOGIN
    // ==========================================

    @PostMapping("/login")
    public UsuarioResponse login(
            @Valid @RequestBody LoginRequest req,
            HttpServletRequest request,
            HttpServletResponse response) {

        Usuario usuario;

        try {

            usuario = usuarios.autenticar(req);

        } catch (ResponseStatusException erro) {

            int status = erro.getStatusCode().value();

            // Registra falhas de autenticação.
            if (status == 401 || status == 403) {

                try {

                    operacoes.registrarFalhaLogin(
                            req.getEmail(),
                            request
                    );

                } catch (RuntimeException falhaLog) {

                    System.err.println(
                            "[SAFEMARKET] Não foi possível registrar "
                            + "uma tentativa de login recusada."
                    );
                }
            }

            // Mantém a resposta original da autenticação.
            throw erro;
        }

        // ======================================
        // PROTEÇÃO CONTRA FIXAÇÃO DE SESSÃO
        // ======================================

        if (request.getSession(false) != null) {
            request.changeSessionId();
        } else {
            request.getSession(true);
        }

        // ======================================
        // CRIAÇÃO DA AUTENTICAÇÃO
        // ======================================

        Authentication auth =
                UsernamePasswordAuthenticationToken.authenticated(
                        usuario.getEmail(),
                        null,
                        Collections.singletonList(
                                new SimpleGrantedAuthority(
                                        "ROLE_" + usuario.getPerfil().name()
                                )
                        )
                );

        SecurityContext context =
                SecurityContextHolder.createEmptyContext();

        context.setAuthentication(auth);

        SecurityContextHolder.setContext(context);

        contextRepository.saveContext(
                context,
                request,
                response
        );

        // ======================================
        // AUDITORIA — LOGIN BEM-SUCEDIDO
        // ======================================

        operacoes.log(
                usuario.getId(),
                "LOGIN",
                "USUARIO",
                usuario.getId(),
                "Login realizado",
                request
        );

        return UsuarioResponse.de(usuario);
    }

    // ==========================================
    // CONSULTAR USUÁRIO AUTENTICADO
    // ==========================================

    @GetMapping("/me")
    public UsuarioResponse me(Principal principal) {

        return UsuarioResponse.de(
                operacoes.usuario(principal)
        );
    }

    // ==========================================
    // ALTERAR NOME DO USUÁRIO
    // ==========================================

    @PutMapping("/me/nome")
    public UsuarioResponse alterarMeuNome(
            @Valid @RequestBody AlterarNomeRequest req,
            Principal principal) {

        operacoes.usuario(principal);

        return usuarios.alterarMeuNome(
                principal.getName(),
                req
        );
    }

    // ==========================================
    // LOGOUT
    // ==========================================

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            HttpServletRequest request,
            HttpServletResponse response,
            Principal principal) {

        if (principal != null) {

            operacoes.log(
                    operacoes.usuario(principal).getId(),
                    "LOGOUT",
                    "USUARIO",
                    null,
                    "Logout realizado",
                    request
            );
        }

        if (request.getSession(false) != null) {
            request.getSession(false).invalidate();
        }

        SecurityContextHolder.clearContext();

        SecurityContext empty =
                SecurityContextHolder.createEmptyContext();

        contextRepository.saveContext(
                empty,
                request,
                response
        );

        return ResponseEntity.noContent().build();
    }
}
