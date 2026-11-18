
package br.com.vendas.safe_market.service;

import br.com.vendas.safe_market.model.*;
import br.com.vendas.safe_market.repository.*;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.security.Principal;
import java.util.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

@Service
public class OperacoesService {

    private final JdbcTemplate db;
    private final UsuarioRepository usuarios;
    private final ProdutoRepository produtos;
    private final ObjectMapper objectMapper;

    public OperacoesService(
            JdbcTemplate db,
            UsuarioRepository usuarios,
            ProdutoRepository produtos,
            ObjectMapper objectMapper) {

        this.db = db;
        this.usuarios = usuarios;
        this.produtos = produtos;
        this.objectMapper = objectMapper;
    }

    // ==========================================
    // IDENTIFICAÇÃO DO USUÁRIO
    // ==========================================

    public Usuario usuario(Principal p) {

        if (p == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Faça login"
            );
        }

        Usuario u = usuarios.findByEmail(p.getName())
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED
                        )
                );

        if (u.getStatus() != StatusUsuario.ATIVO) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Conta inativa ou bloqueada"
            );
        }

        return u;
    }

    // ==========================================
    // VERIFICAÇÃO DE ADMINISTRADOR
    // ==========================================

    public Usuario admin(Principal p) {

        Usuario u = usuario(p);

        if (u.getPerfil() != Perfil.ADMIN) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Somente administrador"
            );
        }

        return u;
    }

    // ==========================================
    // AUDITORIA — COMPATIBILIDADE
    // ==========================================

    /**
     * Mantém compatibilidade com os métodos antigos.
     *
     * Como não recebe uma requisição HTTP,
     * não consegue identificar IP, endpoint,
     * método HTTP ou navegador.
     */
    public void log(
            Long uid,
            String acao,
            String entidade,
            Long eid,
            String detalhes) {

        registrarLog(
                uid,
                acao,
                entidade,
                eid,
                detalhes,
                null,
                "SUCESSO",
                null,
                null
        );
    }

    // ==========================================
    // AUDITORIA — COM REQUISIÇÃO HTTP
    // ==========================================

    /**
     * Registra a operação com os dados disponíveis
     * na requisição HTTP.
     */
    public void log(
            Long uid,
            String acao,
            String entidade,
            Long eid,
            String detalhes,
            HttpServletRequest request) {

        registrarLog(
                uid,
                acao,
                entidade,
                eid,
                detalhes,
                request,
                "SUCESSO",
                null,
                null
        );
    }

    // ==========================================
    // AUDITORIA — DADOS ESTRUTURADOS
    // ==========================================

    /**
     * Registra informações estruturadas em JSON.
     *
     * Exemplo:
     *
     * {
     *   "precoAnterior": 2900.00,
     *   "precoNovo": 2500.00
     * }
     */
    public void logDetalhado(
            Long uid,
            String acao,
            String entidade,
            Long eid,
            Map<String, Object> dados,
            HttpServletRequest request) {

        registrarLog(
                uid,
                acao,
                entidade,
                eid,
                null,
                request,
                "SUCESSO",
                null,
                dados
        );
    }

    // ==========================================
    // AUDITORIA — TENTATIVA DE LOGIN FALHA
    // ==========================================

    /**
     * Registra tentativas de autenticação recusadas.
     *
     * Quando o e-mail existe, identifica o usuário.
     * Quando não existe, preserva o e-mail informado.
     *
     * Nunca registra senha, hash ou token.
     */
    public void registrarFalhaLogin(
            String email,
            HttpServletRequest request) {

        String identificador = email == null
                ? ""
                : email.trim().toLowerCase(Locale.ROOT);

        Long usuarioId = null;

        Usuario usuarioEncontrado = null;

        if (!identificador.isBlank()) {

            usuarioEncontrado = usuarios.findByEmail(identificador)
                    .orElse(null);

            if (usuarioEncontrado != null) {
                usuarioId = usuarioEncontrado.getId();
            }
        }

        Map<String, Object> dados = new LinkedHashMap<>();

        dados.put("tipo", "TENTATIVA_LOGIN");
        dados.put("emailInformado", identificador);

        registrarLog(
                usuarioId,
                "LOGIN_FALHA",
                "USUARIO",
                usuarioId,
                "Tentativa de login malsucedida",
                request,
                "FALHA",
                identificador,
                dados
        );
    }

    // ==========================================
    // REGISTRO CENTRALIZADO DE AUDITORIA
    // ==========================================

    /**
     * Centraliza a gravação dos registros de auditoria.
     *
     * Preserva a identificação histórica do usuário
     * e os dados disponíveis da requisição.
     */
    private void registrarLog(
            Long uid,
            String acao,
            String entidade,
            Long eid,
            String detalhes,
            HttpServletRequest request,
            String resultado,
            String emailFallback,
            Map<String, Object> dados) {

        Usuario responsavel = null;

        if (uid != null) {
            responsavel = usuarios.findById(uid).orElse(null);
        }

        // --------------------------------------
        // MONTAGEM DOS DETALHES EM JSON
        // --------------------------------------

        ObjectNode json = objectMapper.createObjectNode();

        if (detalhes != null) {
            json.put("mensagem", detalhes);
        }

        if (dados != null && !dados.isEmpty()) {
            json.set(
                    "dados",
                    objectMapper.valueToTree(dados)
            );
        }

        // --------------------------------------
        // IDENTIFICAÇÃO HISTÓRICA DO RESPONSÁVEL
        // --------------------------------------

        String nomeSnapshot = responsavel == null
                ? null
                : responsavel.getNome();

        String emailSnapshot = responsavel == null
                ? emailFallback
                : responsavel.getEmail();

        String perfilSnapshot = responsavel == null
                ? null
                : responsavel.getPerfil() == null
                    ? null
                    : responsavel.getPerfil().name();

        // --------------------------------------
        // DADOS DA REQUISIÇÃO
        // --------------------------------------

        String ip = null;
        String metodo = null;
        String endpoint = null;
        String userAgent = null;

        String origem;

        if (request != null) {

            ip = request.getRemoteAddr();

            metodo = limitar(
                    request.getMethod(),
                    10
            );

            endpoint = limitar(
                    request.getRequestURI(),
                    255
            );

            userAgent = limitar(
                    request.getHeader("User-Agent"),
                    500
            );

            origem = "API";

        } else {

            origem = "SISTEMA";
        }

        // --------------------------------------
        // GRAVAÇÃO NO BANCO
        // --------------------------------------

        db.update(
                """
                INSERT INTO logs_sistema (
                    usuario_id,
                    acao,
                    entidade,
                    entidade_id,
                    detalhes,
                    ip_origem,
                    usuario_nome_snapshot,
                    usuario_email_snapshot,
                    usuario_perfil_snapshot,
                    metodo_http,
                    endpoint,
                    user_agent,
                    origem,
                    resultado
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                uid,
                acao,
                entidade,
                eid,
                json.toString(),
                ip,
                limitar(nomeSnapshot, 120),
                limitar(emailSnapshot, 180),
                limitar(perfilSnapshot, 30),
                metodo,
                endpoint,
                userAgent,
                origem,
                resultado
        );
    }

    // ==========================================
    // LIMITAR TAMANHO DOS CAMPOS
    // ==========================================

    private String limitar(
            String valor,
            int tamanho) {

        if (valor == null) {
            return null;
        }

        String limpo = valor.trim();

        if (limpo.isEmpty()) {
            return null;
        }

        return limpo.length() > tamanho
                ? limpo.substring(0, tamanho)
                : limpo;
    }

    // ==========================================
    // CONSULTAR EXCLUSÕES DE ANÚNCIOS
    // ==========================================

    /**
     * Recupera os registros de exclusão lógica dos anúncios.
     *
     * Consulta os registros de auditoria existentes,
     * sem gerar novos logs ou alterar o histórico.
     *
     * Recupera:
     * - ID do registro de auditoria;
     * - ID do produto;
     * - Data e hora da exclusão;
     * - ID de quem realizou a exclusão;
     * - Nome, e-mail e perfil do responsável;
     * - IP, método HTTP e endpoint.
     *
     * Quando existem vários registros de exclusão
     * para o mesmo produto, considera o mais recente.
     */
    public Map<Long, Map<String, Object>> buscarExclusoesProdutos(
            Collection<Long> produtoIds) {

        Map<Long, Map<String, Object>> resultado =
                new LinkedHashMap<>();

        if (produtoIds == null || produtoIds.isEmpty()) {
            return resultado;
        }

        List<Long> idsValidos = produtoIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        if (idsValidos.isEmpty()) {
            return resultado;
        }

        String marcadores = String.join(
                ",",
                Collections.nCopies(idsValidos.size(), "?")
        );

        String sql = """
                SELECT
                    id AS logExclusaoId,
                    entidade_id AS produtoId,
                    criado_em AS excluidoEm,
                    usuario_id AS excluidoPor,
                    usuario_nome_snapshot AS nomeResponsavelExclusao,
                    usuario_email_snapshot AS emailResponsavelExclusao,
                    usuario_perfil_snapshot AS perfilResponsavelExclusao,
                    ip_origem AS ipExclusao,
                    metodo_http AS metodoExclusao,
                    endpoint AS endpointExclusao
                FROM logs_sistema
                WHERE acao = 'EXCLUIR'
                  AND entidade = 'PRODUTO'
                  AND entidade_id IN (%s)
                  AND JSON_UNQUOTE(
                      JSON_EXTRACT(
                          detalhes,
                          '$.dados.evento'
                      )
                  ) = 'PRODUTO_EXCLUIDO'
                ORDER BY criado_em DESC, id DESC
                """.formatted(marcadores);

        List<Map<String, Object>> registros =
                db.queryForList(
                        sql,
                        idsValidos.toArray()
                );

        for (Map<String, Object> registro : registros) {

            Object valorId = registro.get("produtoId");

            if (!(valorId instanceof Number)) {
                continue;
            }

            Long produtoId = ((Number) valorId).longValue();

            // A consulta está ordenada do mais recente
            // para o mais antigo.
            // Mantém somente a exclusão mais recente.

            resultado.putIfAbsent(
                    produtoId,
                    new LinkedHashMap<>(registro)
            );
        }

        return resultado;
    }

    // ==========================================
    // CONSULTAR CARRINHO
    // ==========================================

    public List<Map<String, Object>> carrinho(Principal p) {

        Long id = usuario(p).getId();

        return db.queryForList(
                """
                SELECT
                    c.produto_id AS produtoId,
                    p.nome,
                    p.preco,
                    c.quantidade,
                    (p.preco * c.quantidade) AS subtotal,
                    p.estoque
                FROM carrinho_itens c
                JOIN produtos p
                    ON p.id = c.produto_id
                WHERE c.usuario_id = ?
                ORDER BY c.produto_id
                """,
                id
        );
    }

    // ==========================================
    // ADICIONAR AO CARRINHO
    // ==========================================

    @Transactional
    public List<Map<String, Object>> carrinhoAdicionar(
            Principal p,
            Long produtoId,
            int qtd) {

        Usuario u = usuario(p);

        db.queryForMap(
                """
                SELECT id
                FROM usuarios
                WHERE id = ?
                FOR UPDATE
                """,
                u.getId()
        );

        if (qtd < 1 || qtd > 1000) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Quantidade inválida"
            );
        }

        List<Map<String, Object>> produtosAtuais =
                db.queryForList(
                        """
                        SELECT estoque
                        FROM produtos
                        WHERE id = ?
                        FOR UPDATE
                        """,
                        produtoId
                );

        if (produtosAtuais.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Produto não encontrado"
            );
        }

        int estoque = ((Number)
                produtosAtuais.get(0).get("estoque"))
                .intValue();

        Integer atual = db.queryForObject(
                """
                SELECT COALESCE(SUM(quantidade), 0)
                FROM carrinho_itens
                WHERE usuario_id = ?
                  AND produto_id = ?
                """,
                Integer.class,
                u.getId(),
                produtoId
        );

        int novo = (atual == null ? 0 : atual) + qtd;

        if (novo > 1000 || novo > estoque) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Quantidade solicitada maior que o estoque"
            );
        }

        db.update(
                """
                INSERT INTO carrinho_itens (
                    usuario_id,
                    produto_id,
                    quantidade
                )
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    quantidade = VALUES(quantidade)
                """,
                u.getId(),
                produtoId,
                novo
        );

        return carrinho(p);
    }

    // ==========================================
    // ALTERAR QUANTIDADE DO CARRINHO
    // ==========================================

    @Transactional
    public List<Map<String, Object>> carrinhoQuantidade(
            Principal p,
            Long id,
            int qtd) {

        Usuario u = usuario(p);

        db.queryForMap(
                """
                SELECT id
                FROM usuarios
                WHERE id = ?
                FOR UPDATE
                """,
                u.getId()
        );

        if (qtd < 1 || qtd > 1000) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Quantidade inválida"
            );
        }

        List<Map<String, Object>> rows = db.queryForList(
                """
                SELECT estoque
                FROM produtos
                WHERE id = ?
                FOR UPDATE
                """,
                id
        );

        if (rows.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Produto não encontrado"
            );
        }

        if (qtd > ((Number)
                rows.get(0).get("estoque")).intValue()) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Estoque insuficiente"
            );
        }

        int n = db.update(
                """
                UPDATE carrinho_itens
                SET quantidade = ?
                WHERE usuario_id = ?
                  AND produto_id = ?
                """,
                qtd,
                u.getId(),
                id
        );

        if (n == 0) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Item não encontrado"
            );
        }

        return carrinho(p);
    }

    // ==========================================
    // REMOVER ITEM DO CARRINHO
    // ==========================================

    @Transactional
    public void carrinhoRemover(
            Principal p,
            Long id) {

        Usuario u = usuario(p);

        db.queryForMap(
                """
                SELECT id
                FROM usuarios
                WHERE id = ?
                FOR UPDATE
                """,
                u.getId()
        );

        db.update(
                """
                DELETE FROM carrinho_itens
                WHERE usuario_id = ?
                  AND produto_id = ?
                """,
                u.getId(),
                id
        );
    }

    // ==========================================
    // FINALIZAR PEDIDO
    // ==========================================

    @Transactional
    public Map<String, Object> finalizar(Principal p) {

        Usuario u = usuario(p);

        db.queryForMap(
                """
                SELECT id
                FROM usuarios
                WHERE id = ?
                FOR UPDATE
                """,
                u.getId()
        );

        List<Map<String, Object>> itens = carrinho(p);

        if (itens.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Carrinho vazio"
            );
        }

        BigDecimal total = BigDecimal.ZERO;

        // Bloqueia os estoques durante a transação.

        for (Map<String, Object> item : itens) {

            Long pid = ((Number)
                    item.get("produtoId")).longValue();

            int quantidade = ((Number)
                    item.get("quantidade")).intValue();

            Map<String, Object> prod = db.queryForMap(
                    """
                    SELECT preco, estoque
                    FROM produtos
                    WHERE id = ?
                    FOR UPDATE
                    """,
                    pid
            );

            if (((Number) prod.get("estoque")).intValue()
                    < quantidade) {

                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Estoque insuficiente para produto " + pid
                );
            }

            total = total.add(
                    ((BigDecimal) prod.get("preco"))
                            .multiply(
                                    BigDecimal.valueOf(quantidade)
                            )
            );
        }

        // Criar pedido.

        db.update(
                """
                INSERT INTO pedidos (
                    usuario_id,
                    total,
                    status
                )
                VALUES (?, ?, 'CONFIRMADO')
                """,
                u.getId(),
                total
        );

        Long pedidoId = db.queryForObject(
                "SELECT LAST_INSERT_ID()",
                Long.class
        );

        // Registrar itens e movimentações de estoque.

        List<Map<String, Object>> resumoItens =
                new ArrayList<>();

        for (Map<String, Object> item : itens) {

            Long pid = ((Number)
                    item.get("produtoId")).longValue();

            int qtd = ((Number)
                    item.get("quantidade")).intValue();

            Map<String, Object> prod = db.queryForMap(
                    """
                    SELECT preco, estoque
                    FROM produtos
                    WHERE id = ?
                    """,
                    pid
            );

            int antes = ((Number)
                    prod.get("estoque")).intValue();

            BigDecimal preco =
                    (BigDecimal) prod.get("preco");

            db.update(
                    """
                    INSERT INTO itens_pedido (
                        pedido_id,
                        produto_id,
                        quantidade,
                        preco_unitario
                    )
                    VALUES (?, ?, ?, ?)
                    """,
                    pedidoId,
                    pid,
                    qtd,
                    preco
            );

            db.update(
                    """
                    UPDATE produtos
                    SET estoque = estoque - ?
                    WHERE id = ?
                    """,
                    qtd,
                    pid
            );

            db.update(
                    """
                    INSERT INTO movimentacoes_estoque (
                        produto_id,
                        usuario_id,
                        tipo,
                        variacao,
                        estoque_anterior,
                        estoque_posterior,
                        motivo
                    )
                    VALUES (?, ?, 'SAIDA', ?, ?, ?, ?)
                    """,
                    pid,
                    u.getId(),
                    -qtd,
                    antes,
                    antes - qtd,
                    "Pedido #" + pedidoId
            );

            Map<String, Object> resumo = new LinkedHashMap<>();

            resumo.put("produtoId", pid);
            resumo.put("quantidade", qtd);
            resumo.put("precoUnitario", preco);
            resumo.put("estoqueAnterior", antes);
            resumo.put("estoqueNovo", antes - qtd);

            resumoItens.add(resumo);
        }

        // Limpar carrinho.

        db.update(
                """
                DELETE FROM carrinho_itens
                WHERE usuario_id = ?
                """,
                u.getId()
        );

        // Registrar auditoria do pedido.

        Map<String, Object> dadosPedido =
                new LinkedHashMap<>();

        dadosPedido.put("pedidoId", pedidoId);
        dadosPedido.put("total", total);
        dadosPedido.put("status", "CONFIRMADO");
        dadosPedido.put("itens", resumoItens);

        logDetalhado(
                u.getId(),
                "CADASTRAR",
                "PEDIDO",
                pedidoId,
                dadosPedido,
                null
        );

        return db.queryForMap(
                """
                SELECT
                    id,
                    usuario_id AS usuarioId,
                    total,
                    status,
                    criado_em AS criadoEm
                FROM pedidos
                WHERE id = ?
                """,
                pedidoId
        );
    }

    // ==========================================
    // LISTAR PEDIDOS
    // ==========================================

    public List<Map<String, Object>> pedidos(Principal p) {

        Usuario u = usuario(p);

        if (u.getPerfil() == Perfil.ADMIN) {

            return db.queryForList(
                    """
                    SELECT
                        id,
                        usuario_id AS usuarioId,
                        total,
                        status,
                        criado_em AS criadoEm
                    FROM pedidos
                    ORDER BY id DESC
                    """
            );
        }

        return db.queryForList(
                """
                SELECT
                    id,
                    usuario_id AS usuarioId,
                    total,
                    status,
                    criado_em AS criadoEm
                FROM pedidos
                WHERE usuario_id = ?
                ORDER BY id DESC
                """,
                u.getId()
        );
    }

    // ==========================================
    // CONSULTAR PEDIDO
    // ==========================================

    public Map<String, Object> pedido(
            Principal p,
            Long id) {

        Usuario u = usuario(p);

        List<Map<String, Object>> rows = db.queryForList(
                """
                SELECT
                    id,
                    usuario_id AS usuarioId,
                    total,
                    status,
                    criado_em AS criadoEm
                FROM pedidos
                WHERE id = ?
                """,
                id
        );

        if (rows.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND
            );
        }

        Map<String, Object> result =
                new LinkedHashMap<>(rows.get(0));

        if (u.getPerfil() != Perfil.ADMIN
                && ((Number) result.get("usuarioId"))
                .longValue() != u.getId()) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN
            );
        }

        result.put(
                "itens",
                db.queryForList(
                        """
                        SELECT
                            produto_id AS produtoId,
                            quantidade,
                            preco_unitario AS precoUnitario
                        FROM itens_pedido
                        WHERE pedido_id = ?
                        """,
                        id
                )
        );

        return result;
    }
}
