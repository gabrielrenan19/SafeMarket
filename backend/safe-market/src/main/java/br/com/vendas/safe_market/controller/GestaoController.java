
package br.com.vendas.safe_market.controller;

import br.com.vendas.safe_market.model.Perfil;
import br.com.vendas.safe_market.model.StatusUsuario;
import br.com.vendas.safe_market.model.Usuario;
import br.com.vendas.safe_market.service.OperacoesService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.sql.Date;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class GestaoController {

    private final OperacoesService service;
    private final JdbcTemplate db;

    public GestaoController(
            OperacoesService service,
            JdbcTemplate db) {

        this.service = service;
        this.db = db;
    }

    // ==========================================
    // DTOs DE REQUISIÇÃO
    // ==========================================

    public record StatusRequest(
            @NotNull StatusUsuario status
    ) {}

    public record PerfilRequest(
            @NotNull Perfil perfil
    ) {}

    public record PreferenciasRequest(
            boolean notificacoes,
            boolean alertasSeguranca,
            boolean alertasFraude
    ) {}

    // ==========================================
    // GERENCIAMENTO DE USUÁRIOS
    // ==========================================

    @GetMapping("/admin/usuarios")
    public List<Map<String, Object>> usuarios(
            Principal principal) {

        service.admin(principal);

        return db.queryForList("""
                SELECT
                    id,
                    nome,
                    email,
                    perfil,
                    status,
                    criado_em AS criadoEm
                FROM usuarios
                ORDER BY id DESC
                """);
    }

    // ==========================================
    // ALTERAÇÃO DO STATUS DO USUÁRIO
    // ==========================================

    @PutMapping("/admin/usuarios/{id}/status")
    @Transactional
    public Map<String, Object> status(
            @PathVariable Long id,
            @Valid @RequestBody StatusRequest request,
            Principal principal) {

        Usuario administrador = service.admin(principal);

        validarId(id);

        if (administrador.getId().equals(id)
                && request.status() != StatusUsuario.ATIVO) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Não bloqueie sua própria conta"
            );
        }

        verificarUsuarioExiste(id);

        db.update(
                """
                UPDATE usuarios
                SET status = ?, atualizado_por = ?
                WHERE id = ?
                """,
                request.status().name(),
                administrador.getId(),
                id
        );

        service.log(
                administrador.getId(),
                "ATUALIZAR",
                "USUARIO",
                id,
                "Status alterado para: " + request.status()
        );

        return db.queryForMap(
                """
                SELECT
                    id,
                    nome,
                    email,
                    perfil,
                    status
                FROM usuarios
                WHERE id = ?
                """,
                id
        );
    }

    // ==========================================
    // ALTERAÇÃO DO PERFIL DO USUÁRIO
    // ==========================================

    @PutMapping("/admin/usuarios/{id}/perfil")
    @Transactional
    public Map<String, Object> perfil(
            @PathVariable Long id,
            @Valid @RequestBody PerfilRequest request,
            Principal principal) {

        Usuario administrador = service.admin(principal);

        validarId(id);

        if (administrador.getId().equals(id)
                && request.perfil() != Perfil.ADMIN) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Não remova seu próprio perfil de administrador"
            );
        }

        verificarUsuarioExiste(id);

        db.update(
                """
                UPDATE usuarios
                SET perfil = ?, atualizado_por = ?
                WHERE id = ?
                """,
                request.perfil().name(),
                administrador.getId(),
                id
        );

        service.log(
                administrador.getId(),
                "ATUALIZAR",
                "USUARIO",
                id,
                "Perfil alterado para: " + request.perfil()
        );

        return db.queryForMap(
                """
                SELECT
                    id,
                    nome,
                    email,
                    perfil,
                    status
                FROM usuarios
                WHERE id = ?
                """,
                id
        );
    }

    // ==========================================
    // AUDITORIA DO SISTEMA
    // HISTÓRICO COMPLETO E RASTREABILIDADE
    // ==========================================

    @GetMapping("/admin/auditoria")
    public List<Map<String, Object>> auditoria(
            Principal principal) {

        service.admin(principal);

        return db.queryForList("""
                SELECT

                    -- IDENTIFICAÇÃO DO REGISTRO

                    l.id,

                    l.usuario_id AS usuarioId,

                    -- SNAPSHOT DO RESPONSÁVEL

                    l.usuario_nome_snapshot AS usuarioNome,

                    l.usuario_email_snapshot AS usuarioEmail,

                    l.usuario_perfil_snapshot AS usuarioPerfil,

                    -- AÇÃO EXECUTADA

                    l.acao,

                    l.entidade,

                    l.entidade_id AS entidadeId,

                    CONCAT(
                        l.acao,
                        ' - ',
                        l.entidade,
                        ' #',
                        COALESCE(l.entidade_id, 0)
                    ) AS descricao,

                    -- DETALHES DA OPERAÇÃO

                    l.detalhes,

                    -- INFORMAÇÕES TÉCNICAS

                    l.ip_origem AS ipOrigem,

                    l.metodo_http AS metodoHttp,

                    l.endpoint,

                    l.user_agent AS userAgent,

                    l.origem,

                    -- RESULTADO

                    l.resultado,

                    -- DATA E HORÁRIO

                    l.criado_em AS data

                FROM logs_sistema l

                ORDER BY
                    l.criado_em DESC,
                    l.id DESC

                LIMIT 100
                """);
    }

    // ==========================================
    // PERÍCIA DIGITAL
    // CONSULTA DE EVIDÊNCIAS E RASTREABILIDADE
    // ==========================================

    @GetMapping("/admin/pericia")
    public List<Map<String, Object>> pericia(
            Principal principal,
            @RequestParam(required = false) Long usuarioId,
            @RequestParam(required = false) String acao,
            @RequestParam(required = false) String ip,
            @RequestParam(required = false) String dataInicio,
            @RequestParam(required = false) String dataFim) {

        service.admin(principal);

        if (usuarioId != null && usuarioId <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identificador de usuário inválido"
            );
        }

        LocalDate inicio = converterData(dataInicio);
        LocalDate fim = converterData(dataFim);

        if (inicio != null && fim != null
                && inicio.isAfter(fim)) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A data inicial não pode ser posterior à data final"
            );
        }

        StringBuilder sql = new StringBuilder("""
                SELECT
                    l.id,
                    l.usuario_id AS usuarioId,

                    COALESCE(
                        l.usuario_nome_snapshot,
                        u.nome,
                        'Usuário não identificado'
                    ) AS usuarioNome,

                    COALESCE(
                        l.usuario_email_snapshot,
                        u.email
                    ) AS usuarioEmail,

                    l.usuario_perfil_snapshot AS usuarioPerfil,

                    l.acao,
                    l.entidade,
                    l.entidade_id AS entidadeId,

                    l.detalhes,

                    l.ip_origem AS ipOrigem,
                    l.metodo_http AS metodoHttp,
                    l.endpoint,
                    l.user_agent AS userAgent,
                    l.origem,
                    l.resultado,

                    l.criado_em AS data

                FROM logs_sistema l

                LEFT JOIN usuarios u
                    ON u.id = l.usuario_id

                WHERE 1 = 1
                """);

        List<Object> parametros = new ArrayList<>();

        if (usuarioId != null) {
            sql.append(" AND l.usuario_id = ?");
            parametros.add(usuarioId);
        }

        if (acao != null && !acao.isBlank()) {
            sql.append(" AND UPPER(l.acao) = UPPER(?)");
            parametros.add(acao.trim());
        }

        if (ip != null && !ip.isBlank()) {
            sql.append(" AND l.ip_origem LIKE ?");
            parametros.add("%" + ip.trim() + "%");
        }

        if (inicio != null) {
            sql.append(" AND l.criado_em >= ?");
            parametros.add(Date.valueOf(inicio));
        }

        if (fim != null) {
            sql.append(
                    " AND l.criado_em < DATE_ADD(?, INTERVAL 1 DAY)"
            );
            parametros.add(Date.valueOf(fim));
        }

        sql.append("""
                ORDER BY
                    l.criado_em DESC,
                    l.id DESC
                LIMIT 200
                """);

        return db.queryForList(
                sql.toString(),
                parametros.toArray()
        );
    }

    // ==========================================
    // ALERTAS DE SEGURANÇA
    // CONTAS + DENÚNCIAS + MODERAÇÃO
    // ==========================================

    @GetMapping("/admin/alertas")
    public List<Map<String, Object>> alertas(
            Principal principal) {

        service.admin(principal);

        return db.queryForList("""
                SELECT *
                FROM (

                    -- CONTAS BLOQUEADAS

                    SELECT
                        u.id,
                        'CONTA' AS tipo,

                        CONCAT(
                            'Conta bloqueada: ',
                            u.email
                        ) AS descricao,

                        'ALTA' AS severidade,
                        u.atualizado_em AS data,
                        u.status AS status,
                        u.id AS entidadeId

                    FROM usuarios u

                    WHERE u.status = 'BLOQUEADO'

                    UNION ALL

                    -- DENÚNCIAS REGISTRADAS

                    SELECT
                        d.id,
                        'DENUNCIA' AS tipo,

                        CONCAT(
                            'Denúncia #',
                            d.id,
                            ' - ',
                            COALESCE(
                                d.motivo,
                                'Motivo não informado'
                            ),
                            ' - Produto: ',
                            COALESCE(
                                p.nome,
                                'Não encontrado'
                            )
                        ) AS descricao,

                        CASE
                            WHEN UPPER(d.status) = 'PENDENTE'
                                THEN 'ALTA'
                            ELSE 'MEDIA'
                        END AS severidade,

                        d.data_denuncia AS data,
                        d.status AS status,
                        d.produto_id AS entidadeId

                    FROM denuncias d

                    LEFT JOIN produtos p
                        ON p.id = d.produto_id

                    UNION ALL

                    -- ANÚNCIOS FORA DO STATUS ATIVO

                    SELECT
                        p.id,
                        'MODERACAO' AS tipo,

                        CONCAT(
                            'Anúncio: ',
                            p.nome,
                            ' - Situação: ',
                            p.status_moderacao
                        ) AS descricao,

                        'ALTA' AS severidade,
                        p.atualizado_em AS data,
                        p.status_moderacao AS status,
                        p.id AS entidadeId

                    FROM produtos p

                    WHERE UPPER(p.status_moderacao) <> 'ATIVO'

                ) AS alertas_sistema

                ORDER BY
                    data DESC,
                    id DESC

                LIMIT 100
                """);
    }

    // ==========================================
    // MONITORAMENTO DO SISTEMA
    // ==========================================

    @GetMapping("/admin/monitoramento")
    public Map<String, Object> monitoramento(
            Principal principal) {

        service.admin(principal);

        Map<String, Object> dados = new LinkedHashMap<>();

        dados.put(
                "usuariosAtivos",
                db.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM usuarios
                        WHERE status = 'ATIVO'
                        """,
                        Integer.class
                )
        );

        dados.put(
                "anunciosAtivos",
                db.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM produtos
                        WHERE estoque > 0
                        """,
                        Integer.class
                )
        );

        dados.put(
                "acoesSuspeitas",
                db.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM usuarios
                        WHERE status = 'BLOQUEADO'
                        """,
                        Integer.class
                )
        );

        dados.put(
                "totalAlertas",
                contarTotalAlertas()
        );

        dados.put(
                "totalNegociacoes",
                db.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM pedidos
                        WHERE status = 'CONFIRMADO'
                        """,
                        Integer.class
                )
        );

        dados.put(
                "atividades",
                db.queryForList("""
                        SELECT
                            CONCAT(
                                acao,
                                ' - ',
                                entidade
                            ) AS descricao,
                            criado_em AS data
                        FROM logs_sistema
                        ORDER BY id DESC
                        LIMIT 10
                        """)
        );

        return dados;
    }

    // ==========================================
    // DASHBOARD ADMINISTRATIVO
    // ==========================================

    @GetMapping("/admin/dashboard")
    public Map<String, Object> dashboard(
            Principal principal) {

        service.admin(principal);

        Map<String, Object> dados = new LinkedHashMap<>();

        dados.put(
                "usuariosAtivos",
                db.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM usuarios
                        WHERE status = 'ATIVO'
                        """,
                        Integer.class
                )
        );

        dados.put(
                "totalAlertas",
                contarTotalAlertas()
        );

        dados.put(
                "nivelSeguranca",
                "Monitorado"
        );

        dados.put(
                "totalAuditorias",
                db.queryForObject(
                        "SELECT COUNT(*) FROM logs_sistema",
                        Integer.class
                )
        );

        dados.put(
                "totalLoginsFalhos",
                db.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM logs_sistema
                        WHERE acao = 'LOGIN_FALHA'
                        """,
                        Integer.class
                )
        );

        dados.put(
                "status",
                Map.of(
                        "sistemaOperacional", "Operacional",
                        "bancoDados", "Conectado",
                        "monitoramento", "Ativo"
                )
        );

        dados.put(
                "atividades",
                db.queryForList("""
                        SELECT
                            CONCAT(
                                acao,
                                ' - ',
                                entidade
                            ) AS descricao,
                            criado_em AS data
                        FROM logs_sistema
                        ORDER BY id DESC
                        LIMIT 10
                        """)
        );

        return dados;
    }

    // ==========================================
    // CONTAGEM CENTRALIZADA DE ALERTAS
    // ==========================================

    private Integer contarTotalAlertas() {

        return db.queryForObject(
                """
                SELECT

                    (
                        SELECT COUNT(*)
                        FROM usuarios
                        WHERE status = 'BLOQUEADO'
                    )

                    +

                    (
                        SELECT COUNT(*)
                        FROM denuncias
                    )

                    +

                    (
                        SELECT COUNT(*)
                        FROM produtos
                        WHERE UPPER(status_moderacao) <> 'ATIVO'
                    )

                """,
                Integer.class
        );
    }

    // ==========================================
    // CONSULTAR PREFERÊNCIAS
    // ==========================================

    @GetMapping("/configuracoes")
    public Map<String, Object> preferencias(
            Principal principal) {

        Long usuarioId = service.usuario(principal).getId();

        List<Map<String, Object>> registros = db.queryForList(
                """
                SELECT
                    notificacoes,
                    alertas_seguranca AS alertasSeguranca,
                    alertas_fraude AS alertasFraude
                FROM preferencias_usuario
                WHERE usuario_id = ?
                """,
                usuarioId
        );

        if (registros.isEmpty()) {
            return Map.of(
                    "notificacoes", true,
                    "alertasSeguranca", true,
                    "alertasFraude", true
            );
        }

        return registros.get(0);
    }

    // ==========================================
    // SALVAR PREFERÊNCIAS
    // ==========================================

    @PutMapping("/configuracoes")
    @Transactional
    public Map<String, Object> salvarPreferencias(
            Principal principal,
            @Valid @RequestBody PreferenciasRequest request) {

        Long usuarioId = service.usuario(principal).getId();

        db.update(
                """
                INSERT INTO preferencias_usuario (
                    usuario_id,
                    notificacoes,
                    alertas_seguranca,
                    alertas_fraude
                )
                VALUES (?, ?, ?, ?)

                ON DUPLICATE KEY UPDATE
                    notificacoes = VALUES(notificacoes),
                    alertas_seguranca = VALUES(alertas_seguranca),
                    alertas_fraude = VALUES(alertas_fraude)
                """,
                usuarioId,
                request.notificacoes(),
                request.alertasSeguranca(),
                request.alertasFraude()
        );

        return preferencias(principal);
    }

    // ==========================================
    // CONVERSÃO E VALIDAÇÃO DE DATAS
    // ==========================================

    private LocalDate converterData(String valor) {

        if (valor == null || valor.isBlank()) {
            return null;
        }

        try {

            return LocalDate.parse(valor.trim());

        } catch (DateTimeParseException ex) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Data inválida. Utilize o formato AAAA-MM-DD."
            );
        }
    }

    // ==========================================
    // VERIFICAR EXISTÊNCIA DO USUÁRIO
    // ==========================================

    private void verificarUsuarioExiste(Long id) {

        Boolean existe = db.queryForObject(
                """
                SELECT EXISTS(
                    SELECT 1
                    FROM usuarios
                    WHERE id = ?
                )
                """,
                Boolean.class,
                id
        );

        if (!Boolean.TRUE.equals(existe)) {

            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Usuário não encontrado"
            );
        }
    }

    // ==========================================
    // VALIDAR IDENTIFICADOR
    // ==========================================

    private void validarId(Long id) {

        if (id == null || id <= 0) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identificador de usuário inválido"
            );
        }
    }
}
