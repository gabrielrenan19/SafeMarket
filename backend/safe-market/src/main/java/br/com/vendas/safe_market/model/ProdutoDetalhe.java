package br.com.vendas.safe_market.model;
import jakarta.persistence.*;
@Entity @Table(name="produto_detalhes") public class ProdutoDetalhe {
 @Id @Column(name="produto_id") public Long produtoId;
 @Column(length=80) public String categoria;
 @Column(length=160) public String localizacao;
 @Column(name="imagem_url",length=500) public String imagemUrl;
}
