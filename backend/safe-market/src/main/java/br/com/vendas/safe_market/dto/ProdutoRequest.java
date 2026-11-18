package br.com.vendas.safe_market.dto;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
public class ProdutoRequest {
 @NotBlank @Size(max=120) public String titulo;
 @Size(max=1000) public String descricao;
 @NotNull @DecimalMin("0.01") public BigDecimal preco;
 @Size(max=80) public String categoria;
 @Size(max=160) public String localizacao;
 @Min(0) public Integer estoque;
 public String getTitulo(){return titulo;} public void setTitulo(String v){titulo=v;}
 public String getDescricao(){return descricao;} public void setDescricao(String v){descricao=v;}
 public BigDecimal getPreco(){return preco;} public void setPreco(BigDecimal v){preco=v;}
 public String getCategoria(){return categoria;} public void setCategoria(String v){categoria=v;}
 public String getLocalizacao(){return localizacao;} public void setLocalizacao(String v){localizacao=v;}
 public Integer getEstoque(){return estoque;} public void setEstoque(Integer v){estoque=v;}
}
