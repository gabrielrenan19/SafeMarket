USE safemarket_db;
-- Complemento sem modificar a tabela produtos existente.
CREATE TABLE IF NOT EXISTS produto_detalhes (
 produto_id BIGINT NOT NULL PRIMARY KEY,
 categoria VARCHAR(80) NULL,
 localizacao VARCHAR(160) NULL,
 imagem_url VARCHAR(500) NULL,
 CONSTRAINT fk_produto_detalhes_produto FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
);
