
package br.com.vendas.safe_market.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "denuncias")
public class Denuncia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "produto_id", nullable = false)
    public Long produtoId;

    @Column(name = "denunciante_id", nullable = false)
    public Long denuncianteId;

    @Column(name = "vendedor_id", nullable = false)
    public Long vendedorId;

    @Column(nullable = false, length = 50)
    public String motivo;

    @Column(length = 1000)
    public String descricao;

    @Column(nullable = false, length = 20)
    public String status = "PENDENTE";

    @Column(name = "administrador_id")
    public Long administradorId;

    @Column(name = "data_denuncia", nullable = false)
    public LocalDateTime dataDenuncia = LocalDateTime.now();

    @Column(name = "data_analise")
    public LocalDateTime dataAnalise;
}
