package br.com.vendas.safe_market.controller;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
@Controller public class HomeController { @GetMapping("/") public String home(){return "redirect:/SafeMarket/index.html";} }
