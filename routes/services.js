// =====================================================
// ROTAS PARA SERVIÇOS
// =====================================================

const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

// =====================================================
// GET - Listar todos os serviços
// =====================================================
router.get('/', async (req, res) => {
    try {
        const { category, status = 'ativo' } = req.query;
        
        let queryText = `
            SELECT 
                id, name, description, category, duration_minutes, 
                price, status, created_at, updated_at
            FROM services
        `;
        let queryParams = [];
        let conditions = [];
        
        // Filtros
        if (status && status !== 'all') {
            conditions.push(`status = $${queryParams.length + 1}`);
            queryParams.push(status);
        }
        
        if (category) {
            conditions.push(`category = $${queryParams.length + 1}`);
            queryParams.push(category);
        }
        
        if (conditions.length > 0) {
            queryText += ` WHERE ${conditions.join(' AND ')}`;
        }
        
        queryText += ` ORDER BY name ASC`;
        
        const result = await query(queryText, queryParams);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar serviços:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
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
        
        // Tentar inserção mais simples primeiro
        const result = await query(
            `INSERT INTO services 
             (name, category, price, duration_minutes, description, status)
             VALUES ($1, $2, $3, $4, $5, $6)
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
// GET - Categorias disponíveis
// =====================================================
router.get('/meta/categories', async (req, res) => {
    try {
        const result = await query(`
            SELECT unnest(enum_range(NULL::service_category_enum)) as category
        `);
        
        res.json(result.rows.map(row => row.category));
    } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;
