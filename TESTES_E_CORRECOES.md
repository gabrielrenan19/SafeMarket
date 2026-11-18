# SafeMarket — revisão e testes (Windows 11)

## Correções desta revisão
- Carrinho: quantidade acumulada e alteração de quantidade agora verificam estoque e limite de 1000.
- Carrinho/checkout: bloqueio transacional da linha do usuário, além da linha do produto, para serializar operações concorrentes da mesma conta.
- Logs: `detalhes` é gravado em JSON em vez de texto genérico.
- Produtos: exclusão de produtos com histórico de pedidos ou movimentações retorna HTTP 409; exclusão lógica requer acordo com o DBA.
- Dashboard: indicador corrigido de `usuariosConectados` para `usuariosAtivos`. O frontend deve usar o novo campo.
- Usuários bloqueados: verificação explícita nas operações de produto e no endpoint `/auth/me`.
- Quantidades: DTO de carrinho não aceita valor nulo silenciosamente.

## Limites da validação neste ambiente
- Foram executadas verificações estáticas de rotas, sintaxe JS, estrutura do ZIP e presença das alterações.
- **Não** foram executados Maven/JUnit nem integração com MySQL, pois Maven/dependências e servidor MySQL não estão disponíveis neste ambiente.
- Não é possível afirmar que o aplicativo compilou ou que o fluxo end-to-end passou.

## Testes obrigatórios no Windows 11
1. Faça backup do banco `safemarket_db`; execute apenas migrações ainda não aplicadas (`database/02_...`, `03_...`).
2. Instale JDK 21 e Maven 3.9+, configure `DB_URL`, `DB_USER`, `DB_PASSWORD` e execute `mvn clean test` em `backend/safe-market`.
3. Execute `mvn spring-boot:run`; abra `http://localhost:8080/SafeMarket/cadastro.html` (não use Live Server/porta 3000).
4. Cadastre usuário e confira o HTTP 201, `usuarios.senha_hash` começando com `$2` e e-mail único (segundo cadastro: 409).
5. Faça login, acesse `/api/auth/me`, logout, e confirme que `/api/auth/me` não é acessível sem login.
6. Com usuário VENDEDOR, publique produto; com COMPRADOR, confirme bloqueio de publicação.
7. Adicione produto com estoque 5: adicionar 4 e depois 4 deve retornar 409; alterar quantidade para 6 deve retornar 409.
8. Finalize compra de 2 unidades; verifique `pedidos`, `itens_pedido`, estoque decrementado e `movimentacoes_estoque`.
9. Em dois navegadores, tente finalizar o mesmo produto com estoque 1 simultaneamente: apenas uma compra deve confirmar.
10. Tente excluir produto já vendido: resposta esperada 409.
11. Verifique `/api/admin/dashboard` com ADMIN: `usuariosAtivos` é contagem de contas ativas, não de sessões.
12. Bloqueie uma conta autenticada e confirme que novas operações protegidas sejam negadas.
13. Confirme logs de login/cadastro/pedido e JSON de detalhes no banco.

## Observações
- A versão é um protótipo acadêmico com pagamento simulado.
- OAuth Google/Facebook, recuperação de senha e perícia digital real não estão implementados.
- Antes de produção: revisar transações, logging sensível, limitação de tentativas, proteção de uploads e migrações versionadas.

## Testes adicionados
- `OperacoesServiceTest`: casos de estoque acumulado, quantidade acima do estoque e conta bloqueada (executar com `mvn test`).
- `testes/validacao_estatica.py`: verificações de rotas, configurações e correções, sem exigir MySQL.
