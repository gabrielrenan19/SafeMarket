package br.com.vendas.safe_market.controller;
import br.com.vendas.safe_market.service.OperacoesService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.*;
@RestController @RequestMapping("/api") public class VendasController {
 private final OperacoesService service; public VendasController(OperacoesService s){service=s;}
 public record ItemRequest(@NotNull Long produtoId,@NotNull @Min(1) @Max(1000) Integer quantidade){}
 public record QuantidadeRequest(@NotNull @Min(1) @Max(1000) Integer quantidade){}
 @GetMapping("/carrinho") public List<Map<String,Object>> carrinho(Principal p){return service.carrinho(p);}
 @PostMapping("/carrinho") public List<Map<String,Object>> adicionar(@Valid @RequestBody ItemRequest r,Principal p){return service.carrinhoAdicionar(p,r.produtoId(),r.quantidade());}
 @PutMapping("/carrinho/{id}") public List<Map<String,Object>> quantidade(@PathVariable Long id,@Valid @RequestBody QuantidadeRequest r,Principal p){return service.carrinhoQuantidade(p,id,r.quantidade());}
 @DeleteMapping("/carrinho/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void remover(@PathVariable Long id,Principal p){service.carrinhoRemover(p,id);}
 @PostMapping("/pedidos") @ResponseStatus(HttpStatus.CREATED) public Map<String,Object> finalizar(Principal p){return service.finalizar(p);}
 @GetMapping("/pedidos") public List<Map<String,Object>> listar(Principal p){return service.pedidos(p);}
 @GetMapping("/pedidos/{id}") public Map<String,Object> consultar(@PathVariable Long id,Principal p){return service.pedido(p,id);}
}
