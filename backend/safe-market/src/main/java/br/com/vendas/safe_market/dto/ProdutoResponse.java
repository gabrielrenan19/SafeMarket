
package br.com.vendas.safe_market.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ProdutoResponse(
        Long id,
        String titulo,
        String nome,
        String descricao,
        BigDecimal preco,
        Integer estoque,
        String categoria,
        String localizacao,
        String imagem,
        LocalDateTime criadoEm,
        Long criadoPor
) {}
