-- Executar SOMENTE se a coluna atualizado_por ainda não existir em usuarios.
USE safemarket_db;
ALTER TABLE usuarios ADD COLUMN atualizado_por BIGINT NULL;
ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_atualizado_por FOREIGN KEY (atualizado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
