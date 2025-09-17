-- =====================================================
-- BANCO DE DADOS ESTÉTICA FABIANE PROCÓPIO
-- Sistema de Gestão Completo para Estética Facial/Corporal
-- =====================================================

-- Limpar tabelas existentes (se houver)
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS clients CASCADE;

-- Limpar tipos ENUM existentes (se houver)
DROP TYPE IF EXISTS service_category_enum CASCADE;
DROP TYPE IF EXISTS service_status_enum CASCADE;
DROP TYPE IF EXISTS appointment_status_enum CASCADE;
DROP TYPE IF EXISTS product_category_enum CASCADE;
DROP TYPE IF EXISTS gender_enum CASCADE;

-- =====================================================
-- CRIAÇÃO DOS TIPOS ENUM
-- =====================================================

-- Categorias de Serviços
CREATE TYPE service_category_enum AS ENUM (
    'facial',
    'corporal',
    'estetica_avancada',
    'pos_operatorio',
    'relaxamento'
);

-- Status dos Serviços
CREATE TYPE service_status_enum AS ENUM (
    'ativo',
    'inativo'
);

-- Status dos Agendamentos
CREATE TYPE appointment_status_enum AS ENUM (
    'agendado',
    'confirmado',
    'realizado',
    'cancelado',
    'nao_compareceu'
);

-- Categorias de Produtos
CREATE TYPE product_category_enum AS ENUM (
    'facial',
    'corporal',
    'cosmeticos',
    'equipamentos',
    'higiene',
    'outros'
);

-- Gênero dos Clientes
CREATE TYPE gender_enum AS ENUM (
    'feminino',
    'masculino',
    'nao_informado'
);

-- =====================================================
-- TABELA: CLIENTES
-- =====================================================
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) NOT NULL,
    birth_date DATE,
    gender gender_enum DEFAULT 'nao_informado',
    address TEXT,
    observations TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para otimização
CREATE INDEX idx_clients_name ON clients(full_name);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_phone ON clients(phone);

-- =====================================================
-- TABELA: SERVIÇOS
-- =====================================================
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category service_category_enum NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    price DECIMAL(10,2) NOT NULL,
    status service_status_enum DEFAULT 'ativo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para otimização
CREATE INDEX idx_services_name ON services(name);
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_status ON services(status);

-- =====================================================
-- TABELA: PRODUTOS
-- =====================================================
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category product_category_enum NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    cost_price DECIMAL(10,2),
    stock_quantity INTEGER DEFAULT 0,
    min_stock_alert INTEGER DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para otimização
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_stock ON products(stock_quantity);

-- =====================================================
-- TABELA: AGENDAMENTOS
-- =====================================================
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status appointment_status_enum DEFAULT 'agendado',
    observations TEXT,
    total_price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para otimização
CREATE INDEX idx_appointments_client ON appointments(client_id);
CREATE INDEX idx_appointments_service ON appointments(service_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);

-- Índice composto para evitar agendamentos duplicados
CREATE UNIQUE INDEX idx_appointments_unique ON appointments(appointment_date, appointment_time, service_id);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT AUTOMÁTICO
-- =====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para cada tabela
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DADOS INICIAIS - SERVIÇOS DA ESTÉTICA FABIANE
-- =====================================================

INSERT INTO services (name, description, category, duration_minutes, price) VALUES
('Método Joana Medrado 2.0', 'Método exclusivo de rejuvenescimento facial', 'estetica_avancada', 90, 250.00),
('Estética Cosmetológica', 'Tratamento facial completo com cosméticos profissionais', 'facial', 60, 120.00),
('Flaciall', 'Técnica de harmonização facial para combate à flacidez', 'estetica_avancada', 90, 200.00),
('P.O 360 JM/Kinésio', 'Pós-operatório com técnicas de drenagem linfática', 'pos_operatorio', 60, 150.00),
('Limpeza de Pele', 'Limpeza profunda com extração de cravos e impurezas', 'facial', 60, 100.00),
('Drenagem Linfática', 'Massagem para redução de inchaço e retenção de líquidos', 'corporal', 60, 120.00),
('Massagem Relax', 'Massagem relaxante para alívio do estresse e tensões', 'relaxamento', 60, 100.00);

-- =====================================================
-- DADOS INICIAIS - PRODUTOS EXEMPLO
-- =====================================================

INSERT INTO products (name, description, category, unit_price, cost_price, stock_quantity, min_stock_alert) VALUES
('Creme Hidratante Facial', 'Hidratante para todos os tipos de pele', 'facial', 89.90, 45.00, 15, 5),
('Protetor Solar FPS 60', 'Proteção UVA/UVB para uso diário', 'facial', 129.90, 65.00, 20, 10),
('Sérum Vitamina C', 'Sérum antioxidante para tratamento facial', 'cosmeticos', 149.90, 75.00, 12, 5),
('Óleo Corporal Hidratante', 'Óleo nutritivo para hidratação corporal', 'corporal', 79.90, 40.00, 18, 8),
('Máscara de Argila', 'Máscara purificante para peles oleosas', 'facial', 45.00, 22.50, 25, 10);

-- =====================================================
-- DADOS INICIAIS - CLIENTES EXEMPLO
-- =====================================================

INSERT INTO clients (full_name, email, phone, birth_date, gender, address, observations) VALUES
('Ana Paula Silva', 'ana.paula@email.com', '(11) 99999-1111', '1985-03-15', 'feminino', 'Rua das Flores, 123 - Centro', 'Pele sensível, evitar produtos com álcool'),
('Carlos Eduardo Santos', 'carlos.eduardo@email.com', '(11) 98888-2222', '1990-07-22', 'masculino', 'Av. Paulista, 1000 - Bela Vista', 'Faz tratamento para acne'),
('Maria José Oliveira', 'maria.jose@email.com', '(11) 97777-3333', '1978-12-10', 'feminino', 'Rua da Paz, 456 - Jardins', 'Cliente VIP, preferência por horários da manhã');

-- =====================================================
-- VIEWS ÚTEIS PARA RELATÓRIOS
-- =====================================================

-- View para agendamentos com informações completas
CREATE VIEW appointments_full AS
SELECT 
    a.id,
    a.appointment_date,
    a.appointment_time,
    a.status,
    a.observations,
    a.total_price,
    c.full_name as client_name,
    c.phone as client_phone,
    s.name as service_name,
    s.duration_minutes,
    s.price as service_price,
    a.created_at
FROM appointments a
JOIN clients c ON a.client_id = c.id
JOIN services s ON a.service_id = s.id;

-- View para produtos com status de estoque
CREATE VIEW products_stock_status AS
SELECT 
    id,
    name,
    category,
    unit_price,
    stock_quantity,
    min_stock_alert,
    CASE 
        WHEN stock_quantity <= 0 THEN 'sem_estoque'
        WHEN stock_quantity <= min_stock_alert THEN 'estoque_baixo'
        ELSE 'estoque_ok'
    END as stock_status,
    (unit_price * stock_quantity) as stock_value
FROM products;

-- =====================================================
-- COMENTÁRIOS DAS TABELAS
-- =====================================================

COMMENT ON TABLE clients IS 'Cadastro de clientes da estética';
COMMENT ON TABLE services IS 'Catálogo de serviços oferecidos';
COMMENT ON TABLE products IS 'Controle de produtos e estoque';
COMMENT ON TABLE appointments IS 'Agendamentos de serviços';

-- =====================================================
-- FINALIZAÇÃO
-- =====================================================

-- Verificar se tudo foi criado corretamente
SELECT 'Banco de dados da Estética Fabiane criado com sucesso!' as status;

-- Mostrar estatísticas iniciais
SELECT 
    (SELECT COUNT(*) FROM clients) as total_clients,
    (SELECT COUNT(*) FROM services) as total_services,
    (SELECT COUNT(*) FROM products) as total_products,
    (SELECT COUNT(*) FROM appointments) as total_appointments;
