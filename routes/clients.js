// =====================================================
// ROTAS PARA CLIENTES
// =====================================================

const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

// =====================================================
// GET - Listar todos os clientes
// =====================================================
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 50, search = '' } = req.query;
        const offset = (page - 1) * limit;
        
        let queryText = `
            SELECT 
                id, full_name, email, phone, birth_date, 
                gender, address, observations, created_at, updated_at
            FROM clients
        `;
        let queryParams = [];
        
        // Filtro de busca
        if (search) {
            queryText += ` WHERE full_name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1`;
            queryParams.push(`%${search}%`);
        }
        
        queryText += ` ORDER BY full_name ASC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        queryParams.push(limit, offset);
        
        const result = await query(queryText, queryParams);
        
        // Contar total para paginação
        let countQuery = 'SELECT COUNT(*) FROM clients';
        let countParams = [];
        
        if (search) {
            countQuery += ' WHERE full_name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1';
            countParams.push(`%${search}%`);
        }
        
        const countResult = await query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);
        
        res.json({
            data: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// GET - Buscar cliente por ID
// =====================================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query(
            'SELECT * FROM clients WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao buscar cliente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// POST - Criar novo cliente
// =====================================================
router.post('/', async (req, res) => {
    try {
        const {
            full_name,
            email,
            phone,
            birth_date,
            gender = 'nao_informado',
            address,
            observations
        } = req.body;
        
        // Validações básicas
        if (!full_name || !phone) {
            return res.status(400).json({ 
                error: 'Nome completo e telefone são obrigatórios' 
            });
        }
        
        const result = await query(
            `INSERT INTO clients 
             (full_name, email, phone, birth_date, gender, address, observations)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [full_name, email, phone, birth_date, gender, address, observations]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar cliente:', error);
        
        // Tratamento de erro de email duplicado
        if (error.code === '23505' && error.constraint === 'clients_email_key') {
            return res.status(400).json({ error: 'Email já cadastrado' });
        }
        
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// PUT - Atualizar cliente
// =====================================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            full_name,
            email,
            phone,
            birth_date,
            gender,
            address,
            observations
        } = req.body;
        
        // Verificar se cliente existe
        const existingClient = await query('SELECT id FROM clients WHERE id = $1', [id]);
        if (existingClient.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        
        const result = await query(
            `UPDATE clients 
             SET full_name = $1, email = $2, phone = $3, birth_date = $4,
                 gender = $5, address = $6, observations = $7, updated_at = CURRENT_TIMESTAMP
             WHERE id = $8
             RETURNING *`,
            [full_name, email, phone, birth_date, gender, address, observations, id]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        
        if (error.code === '23505' && error.constraint === 'clients_email_key') {
            return res.status(400).json({ error: 'Email já cadastrado' });
        }
        
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// DELETE - Remover cliente
// =====================================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar se cliente existe
        const clientCheck = await query('SELECT id FROM clients WHERE id = $1', [id]);
        if (clientCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        
        // Verificar se cliente tem agendamentos
        const appointmentsCheck = await query(
            'SELECT COUNT(*) FROM appointments WHERE client_id = $1',
            [id]
        );
        
        const appointmentCount = parseInt(appointmentsCheck.rows[0].count) || 0;
        
        if (appointmentCount > 0) {
            // Não pode excluir cliente com agendamentos
            return res.status(400).json({ 
                error: 'Cliente possui agendamentos e não pode ser excluído',
                message: 'Cliente possui agendamentos e não pode ser excluído'
            });
        }
        
        // Se não tem agendamentos, pode excluir
        const result = await query('DELETE FROM clients WHERE id = $1 RETURNING id', [id]);
        
        res.json({ message: 'Cliente removido com sucesso' });
    } catch (error) {
        console.error('Erro ao remover cliente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// GET - Histórico de agendamentos do cliente
// =====================================================
router.get('/:id/appointments', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query(
            `SELECT 
                a.id, a.appointment_date, a.appointment_time, a.status,
                a.observations, a.total_price, a.created_at,
                s.name as service_name, s.duration_minutes
             FROM appointments a
             JOIN services s ON a.service_id = s.id
             WHERE a.client_id = $1
             ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
            [id]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;
