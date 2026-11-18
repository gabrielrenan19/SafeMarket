
package br.com.vendas.safe_market.repository;

import br.com.vendas.safe_market.model.ProdutoDetalhe;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ProdutoDetalheRepository
        extends JpaRepository<ProdutoDetalhe, Long> {

    /**
     * Busca todas as categorias já utilizadas nos anúncios.
     * Remove duplicadas, ignora valores nulos ou vazios
     * e organiza alfabeticamente.
     */
    @Query("""
        SELECT DISTINCT d.categoria
        FROM ProdutoDetalhe d
        WHERE d.categoria IS NOT NULL
          AND TRIM(d.categoria) <> ''
        ORDER BY LOWER(d.categoria)
    """)
    List<String> buscarCategoriasDisponiveis();
}
