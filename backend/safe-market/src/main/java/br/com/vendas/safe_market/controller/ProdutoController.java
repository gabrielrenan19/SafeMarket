
package br.com.vendas.safe_market.controller;

import br.com.vendas.safe_market.dto.*;
import br.com.vendas.safe_market.model.*;
import br.com.vendas.safe_market.repository.*;
import br.com.vendas.safe_market.service.OperacoesService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.Principal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/produtos")
public class ProdutoController {

    private final ProdutoRepository produtos;
    private final ProdutoDetalheRepository detalhes;
    private final UsuarioRepository usuarios;
    private final org.springframework.jdbc.core.JdbcTemplate historico;
    private final OperacoesService operacoes;

    public ProdutoController(
            ProdutoRepository produtos,
            ProdutoDetalheRepository detalhes,
            UsuarioRepository usuarios,
            org.springframework.jdbc.core.JdbcTemplate historico,
            OperacoesService operacoes) {

        this.produtos = produtos;
        this.detalhes = detalhes;
        this.usuarios = usuarios;
        this.historico = historico;
        this.operacoes = operacoes;
    }

    // ==========================================
    // RESPOSTA DO PRODUTO
    // ==========================================

    private ProdutoResponse view(Produto p) {

        ProdutoDetalhe d = detalhes.findById(p.id).orElse(null);

        return new ProdutoResponse(
                p.id,
                p.nome,
                p.nome,
                p.descricao,
                p.preco,
                p.estoque,
                d == null ? null : d.categoria,
                d == null ? null : d.localizacao,
                d == null ? null : d.imagemUrl,
                p.criadoEm,
                p.criadoPor
        );
    }

    // ==========================================
    // RESPOSTA ADMINISTRATIVA
    // INCLUI DADOS DE QUEM EXCLUIU
    // ==========================================

    public record ProdutoAdminResponse(
            ProdutoResponse produto,
            String statusModeracao,
            Long criadoPor,
            String emailPublicador,

            Long logExclusaoId,
            LocalDateTime excluidoEm,
            Long excluidoPor,
            String nomeResponsavelExclusao,
            String emailResponsavelExclusao,
            String perfilResponsavelExclusao,
            String ipExclusao,
            String metodoExclusao,
            String endpointExclusao
    ) {}

    // ==========================================
    // CONVERTER VALORES DO LOG
    // ==========================================

    private Long valorLong(Object valor) {

        if (valor instanceof Number numero) {
            return numero.longValue();
        }

        if (valor == null) {
            return null;
        }

        try {
            return Long.valueOf(valor.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String valorString(Object valor) {
        return valor == null ? null : valor.toString();
    }

    private LocalDateTime valorDataHora(Object valor) {

        if (valor instanceof Timestamp timestamp) {
            return timestamp.toLocalDateTime();
        }

        if (valor instanceof LocalDateTime dataHora) {
            return dataHora;
        }

        if (valor instanceof java.sql.Date data) {
            return data.toLocalDate().atStartOfDay();
        }

        if (valor instanceof Date data) {
            return LocalDateTime.ofInstant(
                    data.toInstant(),
                    java.time.ZoneId.systemDefault()
            );
        }

        if (valor != null) {
            try {
                return LocalDateTime.parse(valor.toString());
            } catch (Exception ignored) {
                return null;
            }
        }

        return null;
    }

    // ==========================================
    // MONTAR RESPOSTA ADMINISTRATIVA
    // ==========================================

    private ProdutoAdminResponse montarRespostaAdmin(
            Produto produto,
            String emailPublicador,
            Map<String, Object> exclusao) {

        if (exclusao == null) {
            return new ProdutoAdminResponse(
                    view(produto),
                    produto.statusModeracao,
                    produto.criadoPor,
                    emailPublicador,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null
            );
        }

        return new ProdutoAdminResponse(
                view(produto),
                produto.statusModeracao,
                produto.criadoPor,
                emailPublicador,

                valorLong(exclusao.get("logExclusaoId")),
                valorDataHora(exclusao.get("excluidoEm")),
                valorLong(exclusao.get("excluidoPor")),
                valorString(exclusao.get("nomeResponsavelExclusao")),
                valorString(exclusao.get("emailResponsavelExclusao")),
                valorString(exclusao.get("perfilResponsavelExclusao")),
                valorString(exclusao.get("ipExclusao")),
                valorString(exclusao.get("metodoExclusao")),
                valorString(exclusao.get("endpointExclusao"))
        );
    }

    // ==========================================
    // IDENTIFICAÇÃO DO USUÁRIO
    // ==========================================

    private Usuario current(Principal principal) {

        if (principal == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Usuário não autenticado"
            );
        }

        Usuario usuario = usuarios.findByEmail(principal.getName())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Usuário não encontrado"
                ));

        if (usuario.getStatus() != StatusUsuario.ATIVO) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Conta inativa"
            );
        }

        return usuario;
    }

    // ==========================================
    // VERIFICAR QUEM PODE GERENCIAR ANÚNCIOS
    // QUALQUER USUÁRIO AUTENTICADO E ATIVO
    // PODE PUBLICAR E GERENCIAR SEUS ANÚNCIOS
    // ==========================================

    private void verificarPodeGerenciarAnuncios(Usuario usuario) {

        if (usuario == null
                || usuario.getStatus() != StatusUsuario.ATIVO) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Usuário sem permissão para gerenciar anúncios."
            );
        }
    }

    // ==========================================
    // VERIFICAR ADMINISTRADOR
    // ==========================================

    private void verificarAdministrador(Usuario usuario) {

        if (usuario.getPerfil() != Perfil.ADMIN) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Acesso permitido somente para administradores"
            );
        }
    }

    // ==========================================
    // VERIFICAR PROPRIETÁRIO DO ANÚNCIO
    // ADMIN PODE GERENCIAR TODOS
    // USUÁRIO PODE GERENCIAR SOMENTE OS PRÓPRIOS
    // ==========================================

    private void verificarPermissao(
            Produto produto,
            Usuario usuario) {

        verificarPodeGerenciarAnuncios(usuario);

        boolean administrador =
                usuario.getPerfil() == Perfil.ADMIN;

        boolean proprietario =
                Objects.equals(usuario.getId(), produto.criadoPor);

        if (!administrador && !proprietario) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Você não tem permissão para gerenciar este anúncio."
            );
        }
    }

    // ==========================================
    // SNAPSHOT DO RESPONSÁVEL
    // ==========================================

    private Map<String, Object> snapshotResponsavel(Usuario usuario) {

        Map<String, Object> responsavel = new LinkedHashMap<>();

        responsavel.put("id", usuario.getId());
        responsavel.put("nome", usuario.getNome());
        responsavel.put("email", usuario.getEmail());
        responsavel.put(
                "perfil",
                usuario.getPerfil() == null
                        ? null
                        : usuario.getPerfil().name()
        );

        return responsavel;
    }

    // ==========================================
    // SNAPSHOT COMPLETO DO PRODUTO
    // ==========================================

    private Map<String, Object> snapshotProduto(
            Produto produto,
            ProdutoDetalhe detalhe) {

        Map<String, Object> snapshot = new LinkedHashMap<>();

        snapshot.put("id", produto.id);
        snapshot.put("nome", produto.nome);
        snapshot.put("descricao", produto.descricao);
        snapshot.put("preco", produto.preco);
        snapshot.put("estoque", produto.estoque);
        snapshot.put("status_moderacao", produto.statusModeracao);

        snapshot.put("criado_por", produto.criadoPor);
        snapshot.put("atualizado_por", produto.atualizadoPor);
        snapshot.put("criado_em", produto.criadoEm);

        snapshot.put(
                "categoria",
                detalhe == null ? null : detalhe.categoria
        );

        snapshot.put(
                "localizacao",
                detalhe == null ? null : detalhe.localizacao
        );

        snapshot.put(
                "imagem_url",
                detalhe == null ? null : detalhe.imagemUrl
        );

        return snapshot;
    }

    // ==========================================
    // REGISTRAR AUDITORIA ESTRUTURADA
    // INCLUI NOME DO PRODUTO COMO SNAPSHOT
    // ==========================================

    private void registrarAuditoria(
            Usuario usuario,
            String acao,
            String evento,
            Long entidadeId,
            Map<String, Object> dados,
            HttpServletRequest request) {

        Map<String, Object> registro = new LinkedHashMap<>();

        String nomeProduto = null;

        if (entidadeId != null) {
            nomeProduto = produtos.findById(entidadeId)
                    .map(produto -> produto.nome)
                    .orElse(null);
        }

        registro.put("evento", evento);
        registro.put("nome_produto_snapshot", nomeProduto);
        registro.put("produto_id", entidadeId);
        registro.put("responsavel", snapshotResponsavel(usuario));
        registro.put("dados", dados);

        operacoes.logDetalhado(
                usuario.getId(),
                acao,
                "PRODUTO",
                entidadeId,
                registro,
                request
        );
    }

    // ==========================================
    // REGISTRAR MOVIMENTAÇÃO DE ESTOQUE
    // ==========================================

    private void registrarMovimentacaoEstoque(
            Long produtoId,
            Usuario usuario,
            int estoqueAnterior,
            int estoquePosterior,
            String motivo,
            HttpServletRequest request) {

        int diferenca = estoquePosterior - estoqueAnterior;

        if (diferenca == 0) {
            return;
        }

        String tipo = diferenca > 0
                ? "ENTRADA"
                : "SAIDA";

        int variacao = Math.abs(diferenca);

        historico.update(
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
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                produtoId,
                usuario.getId(),
                tipo,
                variacao,
                estoqueAnterior,
                estoquePosterior,
                motivo
        );

        Map<String, Object> dados = new LinkedHashMap<>();

        dados.put("produto_id", produtoId);
        dados.put("tipo_movimentacao", tipo);
        dados.put("quantidade_movimentada", variacao);
        dados.put("variacao", diferenca);
        dados.put("estoque_anterior", estoqueAnterior);
        dados.put("estoque_posterior", estoquePosterior);
        dados.put("motivo", motivo);

        registrarAuditoria(
                usuario,
                "MOVIMENTAR_ESTOQUE",
                "ESTOQUE_ALTERADO",
                produtoId,
                dados,
                request
        );
    }

    // ==========================================
    // LISTAR PRODUTOS DO MARKETPLACE
    // SOMENTE ANÚNCIOS ATIVOS
    // ==========================================

    @GetMapping
    @Transactional(readOnly = true)
    public List<ProdutoResponse> listar() {

        return produtos
                .findByStatusModeracaoOrderByCriadoEmDesc("ATIVO")
                .stream()
                .map(this::view)
                .toList();
    }

    // ==========================================
    // LISTAR CATEGORIAS DISPONÍVEIS
    // CATEGORIAS UTILIZADAS NOS ANÚNCIOS
    // ==========================================

    @GetMapping("/categorias")
    @Transactional(readOnly = true)
    public List<String> listarCategorias() {

        return detalhes.buscarCategoriasDisponiveis();
    }

    // ==========================================
    // LISTAR MEUS ANÚNCIOS
    // QUALQUER USUÁRIO AUTENTICADO
    // EXCETO ANÚNCIOS EXCLUÍDOS
    // ==========================================

    @GetMapping("/meus-anuncios")
    @Transactional(readOnly = true)
    public List<ProdutoAdminResponse> listarMeusAnuncios(
            Principal principal) {

        Usuario usuario = current(principal);

        List<Produto> meusProdutos =
                produtos
                        .findByCriadoPorAndStatusModeracaoNotOrderByCriadoEmDesc(
                                usuario.getId(),
                                "EXCLUIDO"
                        );

        return meusProdutos.stream()
                .map(produto -> montarRespostaAdmin(
                        produto,
                        usuario.getEmail(),
                        null
                ))
                .toList();
    }

    // ==========================================
    // LISTAR TODOS OS PRODUTOS - ADMIN
    // INCLUSIVE ANÚNCIOS EXCLUÍDOS
    // COM DADOS DA EXCLUSÃO
    // ==========================================

    @GetMapping("/admin")
    @Transactional(readOnly = true)
    public List<ProdutoAdminResponse> listarTodosAdministracao(
            Principal principal) {

        Usuario usuario = current(principal);

        verificarAdministrador(usuario);

        List<Produto> todos = produtos.findAll(
                Sort.by(Sort.Direction.DESC, "criadoEm")
        );

        Set<Long> idsPublicadores = todos.stream()
                .map(p -> p.criadoPor)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, String> emailsPublicadores =
                usuarios.findAllById(idsPublicadores)
                        .stream()
                        .collect(Collectors.toMap(
                                Usuario::getId,
                                Usuario::getEmail
                        ));

        List<Long> idsProdutos = todos.stream()
                .map(p -> p.id)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        Map<Long, Map<String, Object>> exclusoes =
                operacoes.buscarExclusoesProdutos(idsProdutos);

        return todos.stream()
                .map(produto -> {

                    String emailPublicador =
                            produto.criadoPor == null
                                    ? null
                                    : emailsPublicadores.get(produto.criadoPor);

                    Map<String, Object> dadosExclusao =
                            exclusoes.get(produto.id);

                    return montarRespostaAdmin(
                            produto,
                            emailPublicador,
                            dadosExclusao
                    );
                })
                .toList();
    }

    // ==========================================
    // CONSULTAR PRODUTO
    // ==========================================

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ProdutoResponse consultar(
            @PathVariable Long id,
            Principal principal) {

        Produto produto = produtos.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Produto não encontrado"
                ));

        if (!"ATIVO".equals(produto.statusModeracao)) {

            if (principal == null) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Produto não encontrado"
                );
            }

            Usuario usuario = current(principal);

            boolean administrador =
                    usuario.getPerfil() == Perfil.ADMIN;

            boolean proprietario =
                    Objects.equals(usuario.getId(), produto.criadoPor);

            if (!administrador && !proprietario) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Produto não encontrado"
                );
            }
        }

        return view(produto);
    }

    // ==========================================
    // CADASTRAR PRODUTO
    // QUALQUER USUÁRIO AUTENTICADO E ATIVO
    // ==========================================

    @PostMapping
    @Transactional
    public ResponseEntity<ProdutoResponse> criar(
            @Valid @RequestBody ProdutoRequest req,
            Principal principal,
            HttpServletRequest request) {

        Usuario usuario = current(principal);

        if (req.estoque != null && req.estoque < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "O estoque não pode ser negativo."
            );
        }

        Produto produto = new Produto();

        produto.nome = req.titulo.trim();
        produto.descricao = req.descricao;
        produto.preco = req.preco;
        produto.estoque = req.estoque == null ? 1 : req.estoque;

        produto.statusModeracao = "ATIVO";

        produto.criadoPor = usuario.getId();
        produto.atualizadoPor = usuario.getId();

        produto = produtos.saveAndFlush(produto);

        ProdutoDetalhe detalhe = new ProdutoDetalhe();

        detalhe.produtoId = produto.id;
        detalhe.categoria = req.categoria;
        detalhe.localizacao = req.localizacao;

        detalhe = detalhes.save(detalhe);

        if (produto.estoque > 0) {

            registrarMovimentacaoEstoque(
                    produto.id,
                    usuario,
                    0,
                    produto.estoque,
                    "Estoque inicial do produto",
                    request
            );
        }

        Map<String, Object> dados = new LinkedHashMap<>();

        dados.put(
                "produto",
                snapshotProduto(produto, detalhe)
        );

        dados.put("operacao", "CADASTRO_DE_ANUNCIO");

        registrarAuditoria(
                usuario,
                "CADASTRAR",
                "PRODUTO_CADASTRADO",
                produto.id,
                dados,
                request
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(view(produto));
    }

    // ==========================================
    // EDITAR PRODUTO
    // ADMIN OU PROPRIETÁRIO
    // ==========================================

    @PutMapping("/{id}")
    @Transactional
    public ProdutoResponse editar(
            @PathVariable Long id,
            @Valid @RequestBody ProdutoRequest req,
            Principal principal,
            HttpServletRequest request) {

        Usuario usuario = current(principal);

        Produto produto = produtos.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Produto não encontrado"
                ));

        verificarPermissao(produto, usuario);

        if ("EXCLUIDO".equals(produto.statusModeracao)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Não é possível editar um anúncio excluído."
            );
        }

        Integer estoqueBanco = historico.queryForObject(
                "SELECT estoque FROM produtos WHERE id = ? FOR UPDATE",
                Integer.class,
                id
        );

        if (estoqueBanco == null) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Produto não encontrado"
            );
        }

        int estoqueAnterior = estoqueBanco;

        int estoqueNovo = req.estoque != null
                ? req.estoque
                : estoqueAnterior;

        if (estoqueNovo < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "O estoque não pode ser negativo."
            );
        }

        ProdutoDetalhe detalhe = detalhes.findById(id)
                .orElseGet(() -> {
                    ProdutoDetalhe novo = new ProdutoDetalhe();
                    novo.produtoId = id;
                    return novo;
                });

        Map<String, Object> produtoAnterior =
                snapshotProduto(produto, detalhe);

        String motivo = "Não informado";

        produto.nome = req.titulo.trim();
        produto.descricao = req.descricao;
        produto.preco = req.preco;
        produto.estoque = estoqueNovo;
        produto.atualizadoPor = usuario.getId();

        detalhe.categoria = req.categoria;
        detalhe.localizacao = req.localizacao;

        detalhe = detalhes.save(detalhe);

        Produto atualizado = produtos.saveAndFlush(produto);

        Map<String, Object> produtoNovo =
                snapshotProduto(atualizado, detalhe);

        registrarMovimentacaoEstoque(
                atualizado.id,
                usuario,
                estoqueAnterior,
                estoqueNovo,
                "Alteração de estoque pelo formulário de edição do produto",
                request
        );

        Map<String, Object> dados = new LinkedHashMap<>();

        dados.put("produto_anterior", produtoAnterior);
        dados.put("produto_novo", produtoNovo);
        dados.put("motivo", motivo);
        dados.put("campos_alterados", identificarAlteracoes(
                produtoAnterior,
                produtoNovo
        ));

        registrarAuditoria(
                usuario,
                "ATUALIZAR",
                "PRODUTO_ATUALIZADO",
                atualizado.id,
                dados,
                request
        );

        return view(atualizado);
    }

    // ==========================================
    // IDENTIFICAR CAMPOS ALTERADOS
    // ==========================================

    private Map<String, Object> identificarAlteracoes(
            Map<String, Object> anterior,
            Map<String, Object> novo) {

        Map<String, Object> alteracoes = new LinkedHashMap<>();

        for (String campo : anterior.keySet()) {

            Object valorAnterior = anterior.get(campo);
            Object valorNovo = novo.get(campo);

            if (!Objects.equals(valorAnterior, valorNovo)) {

                Map<String, Object> valores = new LinkedHashMap<>();

                valores.put("anterior", valorAnterior);
                valores.put("novo", valorNovo);

                alteracoes.put(campo, valores);
            }
        }

        return alteracoes;
    }

    // ==========================================
    // EXCLUIR PRODUTO - EXCLUSÃO LÓGICA
    // ADMIN OU PROPRIETÁRIO
    // PRESERVA TODOS OS RELACIONAMENTOS
    // ==========================================

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> excluir(
            @PathVariable Long id,
            Principal principal,
            HttpServletRequest request) {

        Usuario usuario = current(principal);

        Produto produto = produtos.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Produto não encontrado"
                ));

        verificarPermissao(produto, usuario);

        if ("EXCLUIDO".equals(produto.statusModeracao)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Este anúncio já foi excluído."
            );
        }

        ProdutoDetalhe detalhe = detalhes.findById(id).orElse(null);

        Map<String, Object> produtoAnterior =
                snapshotProduto(produto, detalhe);

        String statusAnterior = produto.statusModeracao;

        Map<String, Object> dados = new LinkedHashMap<>();

        dados.put("produto", produtoAnterior);
        dados.put("produto_anterior", produtoAnterior);
        dados.put("operacao", "EXCLUSAO_LOGICA_DE_ANUNCIO");
        dados.put("status_anterior", statusAnterior);
        dados.put("status_novo", "EXCLUIDO");

        dados.put(
                "tipo_responsavel",
                usuario.getPerfil() == Perfil.ADMIN
                        ? "ADMINISTRADOR"
                        : "PROPRIETARIO_DO_ANUNCIO"
        );

        produto.statusModeracao = "EXCLUIDO";
        produto.atualizadoPor = usuario.getId();

        produtos.saveAndFlush(produto);

        registrarAuditoria(
                usuario,
                "EXCLUIR",
                "PRODUTO_EXCLUIDO",
                produto.id,
                dados,
                request
        );

        return ResponseEntity.noContent().build();
    }

    // ==========================================
    // IDENTIFICAR FORMATO REAL DA IMAGEM
    // ==========================================

    private String identificarImagem(byte[] bytes) {

        // JPEG
        if (bytes.length >= 3
                && (bytes[0] & 0xFF) == 0xFF
                && (bytes[1] & 0xFF) == 0xD8
                && (bytes[2] & 0xFF) == 0xFF) {

            return "jpg";
        }

        // PNG
        if (bytes.length >= 8
                && (bytes[0] & 0xFF) == 0x89
                && (bytes[1] & 0xFF) == 0x50
                && (bytes[2] & 0xFF) == 0x4E
                && (bytes[3] & 0xFF) == 0x47
                && (bytes[4] & 0xFF) == 0x0D
                && (bytes[5] & 0xFF) == 0x0A
                && (bytes[6] & 0xFF) == 0x1A
                && (bytes[7] & 0xFF) == 0x0A) {

            return "png";
        }

        // WEBP
        if (bytes.length >= 12
                && new String(bytes, 0, 4, StandardCharsets.US_ASCII)
                        .equals("RIFF")
                && new String(bytes, 8, 4, StandardCharsets.US_ASCII)
                        .equals("WEBP")) {

            return "webp";
        }

        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Formato de imagem não suportado. Envie JPG, PNG ou WEBP."
        );
    }

    // ==========================================
    // ENVIAR IMAGEM DO PRODUTO
    // ADMIN OU PROPRIETÁRIO
    // ==========================================

    @PostMapping(
            value = "/{id}/imagem",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    @Transactional
    public ProdutoResponse imagem(
            @PathVariable Long id,
            @RequestParam("imagem") MultipartFile file,
            Principal principal,
            HttpServletRequest request) throws IOException {

        Usuario usuario = current(principal);

        Produto produto = produtos.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Produto não encontrado"
                ));

        verificarPermissao(produto, usuario);

        if ("EXCLUIDO".equals(produto.statusModeracao)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Não é possível alterar a imagem de um anúncio excluído."
            );
        }

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Selecione uma imagem"
            );
        }

        if (file.getSize() > 5 * 1024 * 1024) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A imagem não pode ultrapassar 5 MB"
            );
        }

        byte[] bytes = file.getBytes();

        String extensao = identificarImagem(bytes);

        Path diretorio = Paths.get("uploads")
                .toAbsolutePath()
                .normalize();

        Files.createDirectories(diretorio);

        String nomeArquivo = UUID.randomUUID() + "." + extensao;

        Path destino = diretorio.resolve(nomeArquivo).normalize();

        if (!destino.startsWith(diretorio)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Caminho de imagem inválido"
            );
        }

        Files.write(
                destino,
                bytes,
                StandardOpenOption.CREATE_NEW,
                StandardOpenOption.WRITE
        );

        ProdutoDetalhe detalhe = detalhes.findById(id)
                .orElseGet(() -> {
                    ProdutoDetalhe novo = new ProdutoDetalhe();
                    novo.produtoId = id;
                    return novo;
                });

        String imagemAnterior = detalhe.imagemUrl;
        String imagemNova = "/uploads/" + nomeArquivo;

        detalhe.imagemUrl = imagemNova;

        detalhe = detalhes.save(detalhe);

        Map<String, Object> dados = new LinkedHashMap<>();

        dados.put("imagem_anterior", imagemAnterior);
        dados.put("imagem_nova", imagemNova);
        dados.put("nome_arquivo_novo", nomeArquivo);
        dados.put("tamanho_bytes", file.getSize());
        dados.put("formato", extensao.toUpperCase(Locale.ROOT));
        dados.put("tipo_operacao", imagemAnterior == null
                ? "PRIMEIRO_ENVIO"
                : "SUBSTITUICAO");

        registrarAuditoria(
                usuario,
                "ATUALIZAR",
                "IMAGEM_PRODUTO_ALTERADA",
                produto.id,
                dados,
                request
        );

        return view(produto);
    }
}
