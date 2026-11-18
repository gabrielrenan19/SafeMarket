
package br.com.vendas.safe_market.service;

import br.com.vendas.safe_market.model.Denuncia;
import br.com.vendas.safe_market.model.Produto;
import br.com.vendas.safe_market.repository.DenunciaRepository;
import br.com.vendas.safe_market.repository.ProdutoRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DenunciaService {

    private final DenunciaRepository denunciaRepository;
    private final ProdutoRepository produtoRepository;
    private final OperacoesService operacoesService;

    public DenunciaService(
            DenunciaRepository denunciaRepository,
            ProdutoRepository produtoRepository,
            OperacoesService operacoesService) {

        this.denunciaRepository = denunciaRepository;
        this.produtoRepository = produtoRepository;
        this.operacoesService = operacoesService;
    }

    // Registrar uma nova denúncia
    @Transactional
    public Denuncia registrarDenuncia(
            Long produtoId,
            Long denuncianteId,
            String motivo,
            String descricao) {

        if (produtoId == null || denuncianteId == null) {
            throw new IllegalArgumentException(
                "Produto e denunciante são obrigatórios."
            );
        }

        if (motivo == null || motivo.isBlank()) {
            throw new IllegalArgumentException(
                "Informe o motivo da denúncia."
            );
        }

        motivo = motivo.trim();

        if (motivo.length() > 50) {
            throw new IllegalArgumentException(
                "O motivo deve ter no máximo 50 caracteres."
            );
        }

        if (descricao != null) {
            descricao = descricao.trim();

            if (descricao.length() > 1000) {
                throw new IllegalArgumentException(
                    "A descrição deve ter no máximo 1000 caracteres."
                );
            }
        }

        Produto produto = produtoRepository.findById(produtoId)
            .orElseThrow(() -> new IllegalArgumentException(
                "Produto não encontrado."
            ));

        if (produto.criadoPor == null) {
            throw new IllegalStateException(
                "Não foi possível identificar o vendedor deste anúncio."
            );
        }

        Denuncia denuncia = new Denuncia();

        denuncia.produtoId = produto.id;
        denuncia.denuncianteId = denuncianteId;
        denuncia.vendedorId = produto.criadoPor;
        denuncia.motivo = motivo;
        denuncia.descricao = descricao;
        denuncia.status = "PENDENTE";

        // Salva a denúncia
        Denuncia denunciaSalva = denunciaRepository.save(denuncia);

        // Registra a operação na auditoria existente
        String detalhes = String.format(
            "Denúncia registrada. Produto: %d | Vendedor: %d | Motivo: %s",
            produto.id,
            produto.criadoPor,
            motivo
        );

        operacoesService.log(
            denuncianteId,
            "DENUNCIAR",
            "DENUNCIA",
            denunciaSalva.id,
            detalhes
        );

        return denunciaSalva;
    }

    // Listar todas as denúncias
    @Transactional(readOnly = true)
    public List<Denuncia> listarTodas() {
        return denunciaRepository.findAllByOrderByDataDenunciaDesc();
    }

    // Buscar denúncias de um produto
    @Transactional(readOnly = true)
    public List<Denuncia> buscarPorProduto(Long produtoId) {
        return denunciaRepository
            .findByProdutoIdOrderByDataDenunciaDesc(produtoId);
    }

    // Buscar denúncias por situação
    @Transactional(readOnly = true)
    public List<Denuncia> buscarPorStatus(String status) {

        if (status == null || status.isBlank()) {
            throw new IllegalArgumentException(
                "Informe uma situação válida."
            );
        }

        return denunciaRepository
            .findByStatusOrderByDataDenunciaDesc(
                status.trim().toUpperCase()
            );
    }

    // Contabilizar denúncias por situação
    @Transactional(readOnly = true)
    public long contarPorStatus(String status) {
        return denunciaRepository.countByStatus(status);
    }
}
