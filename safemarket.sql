-- SafeMarket - instalacao inicial em banco NOVO (MariaDB/MySQL)
-- Execute o arquivo inteiro no phpMyAdmin (aba SQL).
-- NAO execute este arquivo sobre um banco com tabelas/indices ja criados.
-- NAO inclui usuarios reais, senhas ou dados pessoais.

CREATE DATABASE IF NOT EXISTS safemarket_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE safemarket_db;


-- ==========================================
-- TABELA DE USUARIOS
-- ==========================================

CREATE TABLE IF NOT EXISTS usuarios (
    id BIGINT NOT NULL AUTO_INCREMENT,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,

    atualizado_por BIGINT NULL,

    perfil ENUM('COMPRADOR', 'VENDEDOR', 'ADMIN')
        NOT NULL DEFAULT 'COMPRADOR',

    status ENUM('ATIVO', 'INATIVO', 'BLOQUEADO')
        NOT NULL DEFAULT 'ATIVO',

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT uk_usuarios_email UNIQUE (email),

    CONSTRAINT fk_usuarios_atualizado_por
        FOREIGN KEY (atualizado_por) REFERENCES usuarios(id)
        ON DELETE SET NULL
);


-- ==========================================
--  TABELA DE PRODUTOS
-- ==========================================

CREATE TABLE IF NOT EXISTS produtos (
    id BIGINT NOT NULL AUTO_INCREMENT,
    nome VARCHAR(120) NOT NULL,
    descricao VARCHAR(1000),
    preco DECIMAL(10,2) NOT NULL,
    estoque INT NOT NULL DEFAULT 0,

    criado_por BIGINT NULL,
    atualizado_por BIGINT NULL,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT chk_produtos_preco
        CHECK (preco >= 0),

    CONSTRAINT chk_produtos_estoque
        CHECK (estoque >= 0),

    CONSTRAINT fk_produtos_criado_por
        FOREIGN KEY (criado_por)
        REFERENCES usuarios(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_produtos_atualizado_por
        FOREIGN KEY (atualizado_por)
        REFERENCES usuarios(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_produtos_nome
    ON produtos(nome);


-- ==========================================
--  TABELA DE LOGS DO SISTEMA
-- ==========================================

CREATE TABLE IF NOT EXISTS logs_sistema (
    id BIGINT NOT NULL AUTO_INCREMENT,

    usuario_id BIGINT NULL,

    acao ENUM(
        'LOGIN',
        'LOGOUT',
        'CADASTRAR',
        'ATUALIZAR',
        'EXCLUIR',
        'CONSULTAR',
        'MOVIMENTAR_ESTOQUE'
    ) NOT NULL,

    entidade VARCHAR(50) NOT NULL,
    entidade_id BIGINT NULL,

    detalhes JSON NULL,

    ip_origem VARCHAR(45) NULL,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_logs_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_logs_usuario
    ON logs_sistema(usuario_id);

CREATE INDEX idx_logs_data
    ON logs_sistema(criado_em);

CREATE INDEX idx_logs_entidade
    ON logs_sistema(entidade, entidade_id);


-- ==========================================
--  TABELA DE MOVIMENTACOES DE ESTOQUE
-- ==========================================

CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id BIGINT NOT NULL AUTO_INCREMENT,

    produto_id BIGINT NOT NULL,
    usuario_id BIGINT NULL,

    tipo ENUM('ENTRADA', 'SAIDA', 'AJUSTE')
        NOT NULL,

    variacao INT NOT NULL,

    estoque_anterior INT NOT NULL,
    estoque_posterior INT NOT NULL,

    motivo VARCHAR(255),

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_movimentacao_produto
        FOREIGN KEY (produto_id)
        REFERENCES produtos(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_movimentacao_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE SET NULL,

    CONSTRAINT chk_movimentacao_variacao
        CHECK (
            (tipo = 'ENTRADA' AND variacao > 0)
            OR (tipo = 'SAIDA' AND variacao < 0)
            OR (tipo = 'AJUSTE' AND variacao <> 0)
        ),

    CONSTRAINT chk_movimentacao_estoque_anterior
        CHECK (estoque_anterior >= 0),

    CONSTRAINT chk_movimentacao_estoque_posterior
        CHECK (estoque_posterior >= 0),

    CONSTRAINT chk_movimentacao_consistencia
        CHECK (
            estoque_posterior = estoque_anterior + variacao
        )
);

CREATE INDEX idx_movimentacao_produto
    ON movimentacoes_estoque(produto_id);

CREATE INDEX idx_movimentacao_usuario
    ON movimentacoes_estoque(usuario_id);

CREATE INDEX idx_movimentacao_data
    ON movimentacoes_estoque(criado_em);


-- ==========================================
 -- CONFERENCIA DAS TABELAS
-- ==========================================

SHOW TABLES;

DESCRIBE usuarios;
DESCRIBE produtos;
DESCRIBE logs_sistema;
DESCRIBE movimentacoes_estoque;
