package br.com.vendas.safe_market.controller;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;
@RestControllerAdvice
public class ApiErrorHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String,String>> validation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream().findFirst()
            .map(err -> err.getDefaultMessage() == null ? "Dados inválidos" : err.getDefaultMessage())
            .orElse("Dados inválidos");
        return ResponseEntity.badRequest().body(java.util.Collections.singletonMap("message", message));
    }
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String,String>> status(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(java.util.Collections.singletonMap("message", e.getReason() == null ? "Erro na solicitação" : e.getReason()));
    }
}
