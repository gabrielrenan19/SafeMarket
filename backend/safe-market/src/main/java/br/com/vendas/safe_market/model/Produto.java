
package br.com.vendas.safe_market.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "produtos")
public class Produto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(nullable = false, length = 120)
    public String nome;

    @Column(length = 1000)
    public String descricao;

    @Column(nullable = false, precision = 10, scale = 2)
    public BigDecimal preco;

    @Column(nullable = false)
    public Integer estoque = 1;

    // Controle de moderação do anúncio
    @Column(
        name = "status_moderacao",
        nullable = false,
        length = 20
    )
    public String statusModeracao = "ATIVO";

    // Auditoria de criação e atualização
    @Column(name = "criado_por")
    public Long criadoPor;

    @Column(name = "atualizado_por")
    public Long atualizadoPor;

    @Column(
        name = "criado_em",
        insertable = false,
        updatable = false
    )
    public LocalDateTime criadoEm;

    @Column(
        name = "atualizado_em",
        insertable = false,
        updatable = false
    )
    public LocalDateTime atualizadoEm;
}
