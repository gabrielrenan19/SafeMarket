-- Execute uma vez no MySQL/MariaDB com o banco safemarket_db já criado.
USE safemarket_db;
CREATE TABLE IF NOT EXISTS pedidos (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 usuario_id BIGINT NOT NULL,
 total DECIMAL(12,2) NOT NULL,
 status ENUM('CONFIRMADO','CANCELADO') NOT NULL DEFAULT 'CONFIRMADO',
 criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_pedido_usuario FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
);
CREATE TABLE IF NOT EXISTS itens_pedido (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 pedido_id BIGINT NOT NULL,
 produto_id BIGINT NOT NULL,
 quantidade INT NOT NULL,
 preco_unitario DECIMAL(10,2) NOT NULL,
 CONSTRAINT fk_item_pedido FOREIGN KEY(pedido_id) REFERENCES pedidos(id),
 CONSTRAINT fk_item_produto FOREIGN KEY(produto_id) REFERENCES produtos(id)
);
CREATE TABLE IF NOT EXISTS carrinho_itens (
 usuario_id BIGINT NOT NULL,
 produto_id BIGINT NOT NULL,
 quantidade INT NOT NULL,
 PRIMARY KEY(usuario_id,produto_id),
 CONSTRAINT fk_carrinho_usuario FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
 CONSTRAINT fk_carrinho_produto FOREIGN KEY(produto_id) REFERENCES produtos(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS preferencias_usuario (
 usuario_id BIGINT NOT NULL PRIMARY KEY,
 notificacoes BOOLEAN NOT NULL DEFAULT TRUE,
 alertas_seguranca BOOLEAN NOT NULL DEFAULT TRUE,
 alertas_fraude BOOLEAN NOT NULL DEFAULT TRUE,
 CONSTRAINT fk_preferencias_usuario FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
