
package br.com.vendas.safe_market.controller;

import br.com.vendas.safe_market.model.Denuncia;
import br.com.vendas.safe_market.model.Usuario;
import br.com.vendas.safe_market.repository.UsuarioRepository;
import br.com.vendas.safe_market.service.DenunciaService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class DenunciaController {

    private final DenunciaService denunciaService;
    private final UsuarioRepository usuarioRepository;

    public DenunciaController(
            DenunciaService denunciaService,
            UsuarioRepository usuarioRepository) {

        this.denunciaService = denunciaService;
        this.usuarioRepository = usuarioRepository;
    }

    // Dados recebidos do Marketplace
    public static class DenunciaRequest {

        @NotNull(message = "O produto é obrigatório.")
        public Long produtoId;

        @NotBlank(message = "Informe o motivo da denúncia.")
        @Size(max = 50)
        public String motivo;

        @Size(max = 1000)
        public String descricao;
    }

    // Registrar denúncia
    @PostMapping("/denuncias")
    public ResponseEntity<Denuncia> registrar(
            @Valid @RequestBody DenunciaRequest request,
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName().equals("anonymousUser")) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Usuario denunciante = usuarioRepository
                .findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Usuário autenticado não encontrado."
                ));

        Denuncia denuncia = denunciaService.registrarDenuncia(
                request.produtoId,
                denunciante.getId(),
                request.motivo,
                request.descricao
        );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(denuncia);
    }

    // Listar denúncias - administrador
    @GetMapping("/admin/denuncias")
    public ResponseEntity<List<Denuncia>> listarTodas() {

        return ResponseEntity.ok(
                denunciaService.listarTodas()
        );
    }

    // Consultar denúncias de um produto - administrador
    @GetMapping("/admin/denuncias/produto/{produtoId}")
    public ResponseEntity<List<Denuncia>> buscarPorProduto(
            @PathVariable Long produtoId) {

        return ResponseEntity.ok(
                denunciaService.buscarPorProduto(produtoId)
        );
    }
}
