package br.com.vendas.safe_market.repository;

import br.com.vendas.safe_market.model.Produto;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProdutoRepository extends JpaRepository<Produto, Long> {

    // Busca produtos por situação de moderação,
    // organizando pelos mais recentes.
    List<Produto> findByStatusModeracaoOrderByCriadoEmDesc(
            String statusModeracao
    );

    // Busca anúncios do vendedor, exceto os excluídos,
    // organizando pelos mais recentes.
    List<Produto> findByCriadoPorAndStatusModeracaoNotOrderByCriadoEmDesc(
            Long criadoPor,
            String statusModeracao
    );

}