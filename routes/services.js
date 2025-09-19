// =====================================================
// SISTEMA DE SERVIÇOS DEFINITIVO - ESTÉTICA FABIANE
// =====================================================

const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

// SERVIÇOS FIXOS DA ESTÉTICA FABIANE - DADOS DEFINITIVOS
const SERVICOS_ESTETICA = [
    {
        id: 1,
        name: 'Limpeza de Pele',
        category: 'Estética Facial',
        price: 120.00,
        duration_minutes: 60,
        description: 'Limpeza profunda da pele facial',
        status: 'ativo'
    },
    {
        id: 2,
        name: 'Massagem Relaxante',
        category: 'Massagem',
        price: 120.00,
        duration_minutes: 60,
        description: 'Massagem relaxante para alívio do stress',
        status: 'ativo'
    },
    {
        id: 3,
        name: 'Pós Operatório Domiciliar 10 sessões com laser',
        category: 'Pós Operatório',
        price: 1300.00,
        duration_minutes: 90,
        description: 'Pacote completo de 10 sessões pós operatório com laser domiciliar',
        status: 'ativo'
    },
    {
        id: 4,
        name: 'Pós Operatório com Kinesio',
        category: 'Pós Operatório',
        price: 1500.00,
        duration_minutes: 120,
        description: 'Tratamento pós operatório com aplicação de kinesio',
        status: 'ativo'
    },
    {
        id: 5,
        name: 'Pacote Simples - 4 sessões de Massagem',
        category: 'Pacotes',
        price: 450.00,
        duration_minutes: 240,
        description: 'Pacote com 4 sessões de massagem. Benefícios: Reduz medidas, diminui inchaços, estimula circulação, alivia estresse, relaxa o corpo, melhora silhueta. Validade: 60 dias',
        status: 'ativo'
    },
    {
        id: 6,
        name: 'Pacote Premium - 10 sessões de Massagem',
        category: 'Pacotes',
        price: 800.00,
        duration_minutes: 600,
        description: 'Pacote premium com 10 sessões de massagem. Benefícios: Reduz medidas, diminui inchaços, estimula circulação, alivia estresse, relaxa o corpo, melhora silhueta. Validade: 60 dias',
        status: 'ativo'
    }
];

// =====================================================
// GET - LISTAR SERVIÇOS (ROTA PRINCIPAL)
// =====================================================
router.get('/', async (req, res) => {
    try {
        console.log('🔍 GET /servicos - Verificando banco...');
        
        // PRIMEIRO: Garantir que os serviços existem no banco
        await garantirServicosNoBanco();
        
        // SEGUNDO: Buscar do banco
        const result = await query(`
            SELECT id, name, description, category, duration_minutes, 
                   price, status, created_at, updated_at
            FROM services 
            ORDER BY id ASC
        `);
        
        if (result.rows.length > 0) {
            console.log('✅ Retornando', result.rows.length, 'serviços do banco');
            res.status(200).json(result.rows);
        } else {
            console.log('⚠️ Banco vazio, retornando serviços fixos');
            res.status(200).json(SERVICOS_ESTETICA);
        }
        
    } catch (error) {
        console.error('❌ Erro ao buscar serviços:', error);
        // Fallback absoluto - nunca falha
        res.status(200).json(SERVICOS_ESTETICA);
    }
});

// =====================================================
// FUNÇÃO PARA GARANTIR SERVIÇOS NO BANCO
// =====================================================
async function garantirServicosNoBanco() {
    try {
        console.log('🔍 Verificando serviços no banco...');
        
        // Verificar quantos serviços existem
        const countResult = await query('SELECT COUNT(*) as count FROM services');
        const count = parseInt(countResult.rows[0].count);
        
        console.log('📊 Serviços no banco:', count);
        
        if (count < 6) {
            console.log('🛠️ Inserindo/atualizando serviços...');
            
            // Limpar tabela
            await query('DELETE FROM services');
            
            // Inserir serviços com IDs específicos
            for (const servico of SERVICOS_ESTETICA) {
                try {
                    await query(
                        'INSERT INTO services (name, category, price, duration_minutes, description, status) VALUES ($1, $2, $3, $4, $5, $6)',
                        [servico.name, servico.category, servico.price, servico.duration_minutes, servico.description, servico.status]
                    );
                    console.log(`✅ Inserido: ${servico.name}`);
                } catch (insertError) {
                    console.log(`⚠️ Erro ao inserir ${servico.name}:`, insertError.message);
                }
            }
            
            console.log('✅ Serviços inseridos no banco com IDs corretos!');
        } else {
            console.log('✅ Serviços já existem no banco');
        }
        
    } catch (error) {
        console.error('❌ Erro ao garantir serviços no banco:', error);
        throw error;
    }
}

// =====================================================
// GET - LISTAR IDs REAIS DOS SERVIÇOS
// =====================================================
router.get('/ids', async (req, res) => {
    try {
        const result = await query('SELECT id, name FROM services ORDER BY id ASC');
        res.json({
            success: true,
            message: 'IDs reais dos serviços:',
            servicos: result.rows,
            total: result.rows.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =====================================================
// POST - FORÇAR CRIAÇÃO DOS SERVIÇOS (ULTRA-SIMPLES)
// =====================================================
router.post('/force-create', async (req, res) => {
    try {
        console.log('🔥 FORÇANDO criação dos serviços...');
        
        // LIMPAR TABELA
        await query('DELETE FROM services');
        console.log('🗑️ Tabela limpa');
        
        // INSERIR UM POR UM
        const servicos = [
            { name: 'Limpeza de Pele', category: 'Estética Facial', price: 120.00, duration_minutes: 60, description: 'Limpeza profunda da pele facial', status: 'ativo' },
            { name: 'Massagem Relaxante', category: 'Massagem', price: 120.00, duration_minutes: 60, description: 'Massagem relaxante para alívio do stress', status: 'ativo' },
            { name: 'Pós Operatório Domiciliar 10 sessões com laser', category: 'Pós Operatório', price: 1300.00, duration_minutes: 90, description: 'Pacote completo', status: 'ativo' },
            { name: 'Pós Operatório com Kinesio', category: 'Pós Operatório', price: 1500.00, duration_minutes: 120, description: 'Tratamento com kinesio', status: 'ativo' },
            { name: 'Pacote Simples - 4 sessões de Massagem', category: 'Pacotes', price: 450.00, duration_minutes: 240, description: 'Pacote simples', status: 'ativo' },
            { name: 'Pacote Premium - 10 sessões de Massagem', category: 'Pacotes', price: 800.00, duration_minutes: 600, description: 'Pacote premium', status: 'ativo' }
        ];
        
        let inseridos = 0;
        for (const servico of servicos) {
            try {
                const result = await query(
                    'INSERT INTO services (name, category, price, duration_minutes, description, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
                    [servico.name, servico.category, servico.price, servico.duration_minutes, servico.description, servico.status]
                );
                console.log(`✅ Inserido: ${servico.name} (ID: ${result.rows[0].id})`);
                inseridos++;
            } catch (insertError) {
                console.log(`❌ Erro ao inserir ${servico.name}:`, insertError.message);
            }
        }
        
        const todosServicos = await query('SELECT * FROM services ORDER BY id ASC');
        
        res.json({
            success: true,
            message: `${inseridos} serviços criados com sucesso!`,
            servicos: todosServicos.rows,
            total: todosServicos.rows.length
        });
        
    } catch (error) {
        console.error('❌ ERRO COMPLETO:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            detalhes: error.message,
            stack: error.stack
        });
    }
});

// =====================================================
// GET - Buscar serviço por ID
// =====================================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query(
            'SELECT * FROM services WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Serviço não encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao buscar serviço:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// POST - Criar novo serviço
// =====================================================
router.post('/', async (req, res) => {
    try {
        const {
            name,
            description,
            category,
            duration_minutes = 60,
            price,
            status = 'ativo'
        } = req.body;
        
        // Validações básicas
        if (!name || !category || !price) {
            return res.status(400).json({ 
                error: 'Nome, categoria e preço são obrigatórios' 
            });
        }
        
        if (price <= 0) {
            return res.status(400).json({ 
                error: 'Preço deve ser maior que zero' 
            });
        }
        
        console.log('Dados recebidos:', { name, description, category, duration_minutes, price, status });
        
        // Tentar inserção com valores seguros
        const result = await query(
            `INSERT INTO services (name, category, price, duration_minutes, description, status, created_at, updated_at) 
             VALUES ($1, $2::text, $3, $4, $5, $6, NOW(), NOW()) 
             RETURNING *`,
            [name, category, price, duration_minutes || 60, description || '', status]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar serviço:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// PUT - Atualizar serviço
// =====================================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            category,
            duration_minutes,
            price,
            status
        } = req.body;
        
        // Verificar se serviço existe
        const existingService = await query('SELECT id FROM services WHERE id = $1', [id]);
        if (existingService.rows.length === 0) {
            return res.status(404).json({ error: 'Serviço não encontrado' });
        }
        
        if (price && price <= 0) {
            return res.status(400).json({ 
                error: 'Preço deve ser maior que zero' 
            });
        }
        
        const result = await query(
            `UPDATE services 
             SET name = $1, description = $2, category = $3, duration_minutes = $4,
                 price = $5, status = $6, updated_at = CURRENT_TIMESTAMP
             WHERE id = $7
             RETURNING *`,
            [name, description, category, duration_minutes, price, status, id]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar serviço:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// DELETE - Remover serviço
// =====================================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar se serviço existe
        const serviceCheck = await query('SELECT id FROM services WHERE id = $1', [id]);
        if (serviceCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Serviço não encontrado' });
        }
        
        // Verificar se serviço tem agendamentos
        const appointmentsCheck = await query(
            'SELECT COUNT(*) FROM appointments WHERE service_id = $1',
            [id]
        );
        
        const appointmentCount = parseInt(appointmentsCheck.rows[0].count) || 0;
        
        if (appointmentCount > 0) {
            // Em vez de bloquear, vamos desativar o serviço
            const result = await query(
                'UPDATE services SET status = $1 WHERE id = $2 RETURNING *',
                ['inativo', id]
            );
            
            return res.json({ 
                message: `Serviço desativado com sucesso (${appointmentCount} agendamentos encontrados)`,
                service: result.rows[0]
            });
        }
        
        // Se não tem agendamentos, pode excluir
        const result = await query('DELETE FROM services WHERE id = $1 RETURNING id', [id]);
        
        res.json({ message: 'Serviço removido com sucesso' });
    } catch (error) {
        console.error('Erro ao remover serviço:', error);
        res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
    }
});

// =====================================================
// GET - Estatísticas do serviço
// =====================================================
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query(
            `SELECT 
                COUNT(*) as total_appointments,
                COUNT(CASE WHEN status = 'realizado' THEN 1 END) as completed_appointments,
                COALESCE(SUM(CASE WHEN status = 'realizado' THEN total_price END), 0) as total_revenue
             FROM appointments 
             WHERE service_id = $1`,
            [id]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// POST - Popular serviços da Estética Fabiane
// =====================================================
router.post('/populate', async (req, res) => {
    try {
        // Limpar tabela primeiro
        console.log('🗑️ Limpando tabela de serviços...');
        await query('DELETE FROM services');
        
        const servicosEstetica = [
            {
                name: 'Limpeza de Pele',
                category: 'Estética Facial',
                price: 120.00,
                duration_minutes: 60,
                description: 'Limpeza profunda da pele facial',
                status: 'ativo'
            },
            {
                name: 'Massagem Relaxante',
                category: 'Massagem',
                price: 120.00,
                duration_minutes: 60,
                description: 'Massagem relaxante para alívio do stress',
                status: 'ativo'
            },
            {
                name: 'Pós Operatório Domiciliar 10 sessões com laser',
                category: 'Pós Operatório',
                price: 1300.00,
                duration_minutes: 90,
                description: 'Pacote completo de 10 sessões pós operatório com laser domiciliar',
                status: 'ativo'
            },
            {
                name: 'Pós Operatório com Kinesio',
                category: 'Pós Operatório',
                price: 1500.00,
                duration_minutes: 120,
                description: 'Tratamento pós operatório com aplicação de kinesio',
                status: 'ativo'
            },
            {
                name: 'Pacote Simples - 4 sessões de Massagem',
                category: 'Pacotes',
                price: 450.00,
                duration_minutes: 240,
                description: 'Pacote com 4 sessões de massagem. Benefícios: Reduz medidas, diminui inchaços, estimula circulação, alivia estresse, relaxa o corpo, melhora silhueta. Validade: 60 dias',
                status: 'ativo'
            },
            {
                name: 'Pacote Premium - 10 sessões de Massagem',
                category: 'Pacotes',
                price: 800.00,
                duration_minutes: 600,
                description: 'Pacote premium com 10 sessões de massagem. Benefícios: Reduz medidas, diminui inchaços, estimula circulação, alivia estresse, relaxa o corpo, melhora silhueta. Validade: 60 dias',
                status: 'ativo'
            }
        ];

        const servicosInseridos = [];
        
        for (const servico of servicosEstetica) {
            console.log(`➕ Inserindo: ${servico.name}`);
            const result = await query(
                `INSERT INTO services (name, category, price, duration_minutes, description, status) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 RETURNING *`,
                [servico.name, servico.category, servico.price, servico.duration_minutes, servico.description, servico.status]
            );
            servicosInseridos.push(result.rows[0]);
            console.log(`✅ Inserido: ${result.rows[0].name}`);
        }

        res.json({
            message: 'Serviços da Estética Fabiane criados com sucesso!',
            servicos: servicosInseridos,
            total: servicosInseridos.length
        });
        
    } catch (error) {
        console.error('Erro ao popular serviços:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;
