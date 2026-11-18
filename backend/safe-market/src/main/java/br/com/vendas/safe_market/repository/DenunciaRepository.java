
package br.com.vendas.safe_market.repository;

import br.com.vendas.safe_market.model.Denuncia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DenunciaRepository extends JpaRepository<Denuncia, Long> {

    // Buscar denúncias de um produto específico
    List<Denuncia> findByProdutoIdOrderByDataDenunciaDesc(Long produtoId);

    // Buscar denúncias por situação
    List<Denuncia> findByStatusOrderByDataDenunciaDesc(String status);

    // Listar todas, das mais recentes para as mais antigas
    List<Denuncia> findAllByOrderByDataDenunciaDesc();

    // Contabilizar denúncias por situação
    long countByStatus(String status);

}
