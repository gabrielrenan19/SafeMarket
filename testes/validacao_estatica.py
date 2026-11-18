from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
java=root/'backend/safe-market/src/main/java/br/com/vendas/safe_market'
checks={
 'rota cadastro': ('controller/AuthController.java','@PostMapping("/cadastro")'),
 'BCrypt': ('config/SecurityConfig.java','BCryptPasswordEncoder'),
 'CSRF': ('config/SecurityConfig.java','CookieCsrfTokenRepository'),
 'estoque bloqueado': ('service/OperacoesService.java','FOR UPDATE'),
 'carrinho verifica total': ('service/OperacoesService.java','novo>estoque'),
 'logs com detalhes': ('service/OperacoesService.java','put("mensagem", detalhes'),
 'dashboard usuarios ativos': ('controller/GestaoController.java','d.put("usuariosAtivos"'),
 'exclusao historico': ('controller/ProdutoController.java','Produto possui histórico'),
 'status de conta': ('service/OperacoesService.java','StatusUsuario.ATIVO'),
}
for label,(path,needle) in checks.items():
 assert needle in (java/path).read_text(),label
 print('OK:',label)
front=(root/'js/api.js').read_text()
assert 'const API_URL = "/api"' in front
assert '3000' not in front
assert 'requisicaoAPI("/auth/cadastro"' in (root/'js/cadastro.js').read_text()
print('OK: URL e formulario de cadastro')
