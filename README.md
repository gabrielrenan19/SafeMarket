# SafeMarket — Backend e frontend integrados (Windows 11)

## Requisitos
Java 21, Maven 3.9+, MySQL/MariaDB, Windows 11 (ou outro sistema com JDK 21).

## Banco existente
1. **Faça backup do banco atual.** Não execute o SQL original novamente.
2. Confirme que as tabelas `usuarios`, `produtos`, `logs_sistema`, `movimentacoes_estoque` existem.
3. Se ainda não executou, rode `database/01_usuarios_atualizado_por_SE_NECESSARIO.sql` e `database/02_produto_detalhes.sql` conforme o README anterior (verifique colunas/tabelas primeiro).
4. Execute **uma única vez** `database/03_vendas_carrinho_preferencias.sql`. Esse script cria `pedidos`, `itens_pedido`, `carrinho_itens` e `preferencias_usuario`, sem apagar dados existentes.

## Executar
```powershell
cd backend/safe-market
$env:DB_URL='jdbc:mysql://localhost:3306/safemarket_db'
$env:DB_USER='root'
$env:DB_PASSWORD=''
.\mvnw.cmd spring-boot:run
```
Acesse `http://localhost:8080/SafeMarket/index.html` e `http://localhost:8080/SafeMarket/carrinho.html`.

## Endpoints novos
- `GET /api/carrinho`, `POST /api/carrinho` com `{"produtoId":1,"quantidade":1}`, `PUT /api/carrinho/{id}` com `{"quantidade":2}`, `DELETE /api/carrinho/{id}`.
- `POST /api/pedidos` (finaliza com pagamento **simulado**), `GET /api/pedidos`, `GET /api/pedidos/{id}`.
- `GET /api/admin/usuarios`, `PUT /api/admin/usuarios/{id}/status` com `{"status":"BLOQUEADO"}`, `PUT /api/admin/usuarios/{id}/perfil` com `{"perfil":"VENDEDOR"}`.
- `GET /api/admin/dashboard`, `/api/admin/monitoramento`, `/api/admin/auditoria`, `/api/admin/alertas`.
- `GET /api/configuracoes`, `PUT /api/configuracoes`.

Todas as chamadas que modificam dados exigem token CSRF de `GET /api/auth/csrf`, enviado no header `X-XSRF-TOKEN`; use `requisicaoAPI()` do frontend. Administração exige perfil ADMIN, que deve ser atribuído por DBA autorizado; nunca por cadastro público.

## Limitações e testes
O carrinho/checkout é uma página funcional simples adicionada ao frontend; a página original de marketplace ainda requer ajustes de UX para exibir botões individuais de compra conforme seu HTML. Pagamento é simulado; não existe gateway financeiro real. Alertas refletem contas bloqueadas, não um motor de detecção de fraude. Dashboard exibe quantidade de contas ativas, não sessões conectadas em tempo real. A perícia digital e a recuperação de senha por e-mail não foram integradas.

**Não foi possível validar o projeto contra o MySQL real do grupo neste ambiente.** Execute `mvn test` e faça testes de ponta a ponta antes de apresentar. Não publique credenciais ou arquivos de upload sensíveis no GitHub.


## Diagnóstico de cadastro/login (Windows 11)

1. **Abra a pasta `backend/safe-market`**, onde está `pom.xml`.
2. Tenha Java 21 e Maven disponíveis; execute `mvn clean test` e depois `mvn spring-boot:run`.
3. Acesse **http://localhost:8080/SafeMarket/cadastro.html** (não abra o HTML via `file://` nem pelo Live Server em outra porta).
4. No phpMyAdmin, selecione `safemarket_db` e confirme `usuarios`, `logs_sistema`, `produtos`, `movimentacoes_estoque`, `produto_detalhes`, `pedidos`, `itens_pedido`, `carrinho_itens`, `preferencias_usuario`.
5. Se ainda não tiver aplicado as migrações, rode **somente as que faltarem**, na ordem `01` (se necessário), `02`, `03`. Faça backup antes. `01` falha se `atualizado_por` já existir.
6. `GET /api/auth/csrf` deve responder JSON com `token`; cadastro exige `POST /api/auth/cadastro` e header `X-XSRF-TOKEN` com esse token e cookie de sessão. A página faz isso automaticamente via `js/api.js`.
7. `409` indica e-mail já cadastrado ou restrição; `400` indica JSON/validação; `403` pode indicar CSRF; `500` exige consultar o stack trace do servidor.
8. Rode `powershell -ExecutionPolicy Bypass -File .\testes\smoke-cadastro.ps1` na raiz do pacote para testar cadastro, login e sessão com dados temporários. O script cria um usuário de teste no banco.

### Alterações nesta revisão
- Rotas `POST /api/auth/cadastro` e `POST /api/auth/login` verificadas contra o frontend.
- Mensagens JSON padronizadas para erros de validação, JSON inválido, método HTTP incorreto e restrição de banco.
- Rotação do ID da sessão no login e limpeza do contexto no logout.
- Frontend renova o token CSRF após login/logout e tenta renovar uma vez em caso de token expirado.
- Testes automatizados unitários do serviço de usuários e script de teste HTTP ponta a ponta.

**Limitações:** o teste unitário não substitui teste com MySQL; execução real de Maven + MySQL deve ser feita no Windows 11. Não compartilhe senhas reais ou `.env` no GitHub.
