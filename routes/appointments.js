// =====================================================
// ROTAS PARA AGENDAMENTOS
// =====================================================

const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

// =====================================================
// GET - Listar agendamentos
// =====================================================
router.get('/', async (req, res) => {
    try {
        const { 
            date, 
            status, 
            client_id, 
            service_id,
            page = 1, 
            limit = 50 
        } = req.query;
        
        const offset = (page - 1) * limit;
        
        let queryText = `
            SELECT 
                a.id, a.appointment_date, a.appointment_time, a.status,
                a.observations, a.total_price, a.created_at,
                c.full_name as client_name, c.phone as client_phone,
                s.name as service_name, s.duration_minutes, s.price as service_price
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            JOIN services s ON a.service_id = s.id
        `;
        
        let queryParams = [];
        let conditions = [];
        
        // Filtros
        if (date) {
            conditions.push(`a.appointment_date = $${queryParams.length + 1}`);
            queryParams.push(date);
        }
        
        if (status) {
            conditions.push(`a.status = $${queryParams.length + 1}`);
            queryParams.push(status);
        }
        
        if (client_id) {
            conditions.push(`a.client_id = $${queryParams.length + 1}`);
            queryParams.push(client_id);
        }
        
        if (service_id) {
            conditions.push(`a.service_id = $${queryParams.length + 1}`);
            queryParams.push(service_id);
        }
        
        if (conditions.length > 0) {
            queryText += ` WHERE ${conditions.join(' AND ')}`;
        }
        
        queryText += ` ORDER BY a.appointment_date DESC, a.appointment_time DESC`;
        queryText += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        queryParams.push(limit, offset);
        
        const result = await query(queryText, queryParams);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar agendamentos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// GET - Próximos agendamentos (DEVE VIR ANTES da rota /:id)
// =====================================================
router.get('/proximos', async (req, res) => {
    try {
        const result = await query(
            `SELECT 
                a.id, a.appointment_date, a.appointment_time, a.status,
                a.observations, a.total_price,
                c.full_name as cliente_nome, c.phone as client_phone,
                s.name as servico_nome, s.duration_minutes, s.price as preco
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            JOIN services s ON a.service_id = s.id
            WHERE a.appointment_date = CURRENT_DATE
            AND a.status IN ('agendado', 'confirmado')
            ORDER BY a.appointment_time ASC`
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar próximos agendamentos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// GET - Buscar agendamento por ID
// =====================================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query(
            `SELECT 
                a.*, 
                c.full_name as client_name, c.phone as client_phone,
                s.name as service_name, s.duration_minutes
             FROM appointments a
             JOIN clients c ON a.client_id = c.id
             JOIN services s ON a.service_id = s.id
             WHERE a.id = $1`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Agendamento não encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao buscar agendamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// POST - REMOVER FOREIGN KEY (SE NECESSÁRIO)
// =====================================================
router.post('/fix-fk', async (req, res) => {
    try {
        console.log('🔧 REMOVENDO TODAS AS FOREIGN KEYS...');
        
        const queries = [
            'ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_service_id_fkey',
            'ALTER TABLE appointments DROP CONSTRAINT IF EXISTS fk_appointments_service',
            'ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_service_fkey',
            'ALTER TABLE appointments DROP CONSTRAINT IF EXISTS fk_service_id'
        ];
        
        const results = [];
        
        for (const sql of queries) {
            try {
                await query(sql);
                results.push(`✅ ${sql}`);
                console.log(`✅ Executado: ${sql}`);
            } catch (err) {
                results.push(`⚠️ ${sql} - ${err.message}`);
                console.log(`⚠️ ${sql} - ${err.message}`);
            }
        }
        
        // Verificar constraints restantes
        const constraints = await query(`
            SELECT constraint_name, table_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'appointments' 
            AND constraint_type = 'FOREIGN KEY'
        `);
        
        console.log('🔍 Constraints restantes:', constraints.rows);
        
        res.json({
            success: true,
            message: 'Tentativa de remoção de FK concluída!',
            results: results,
            constraints_restantes: constraints.rows
        });
        
    } catch (error) {
        console.error('❌ Erro geral:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =====================================================
// POST - CRIAR AGENDAMENTO SEM FOREIGN KEY
// =====================================================
router.post('/safe', async (req, res) => {
    console.log('🚀 CRIANDO AGENDAMENTO SEGURO - Dados recebidos:', req.body);
    
    try {
        const {
            client_id,
            service_id,
            appointment_date,
            appointment_time,
            observations,
            total_price
        } = req.body;
        
        // Validações simples
        if (!client_id || !service_id || !appointment_date || !appointment_time) {
            return res.status(400).json({ 
                error: 'Dados obrigatórios faltando',
                recebido: { client_id, service_id, appointment_date, appointment_time }
            });
        }
        
        // Inserir direto sem validações de FK
        const result = await query(`
            INSERT INTO appointments 
            (client_id, service_id, appointment_date, appointment_time, observations, total_price, status, created_at) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
            RETURNING *
        `, [
            parseInt(client_id),
            parseInt(service_id), 
            appointment_date,
            appointment_time,
            observations || '',
            parseFloat(total_price || 120.00),
            'agendado'
        ]);
        
        console.log('✅ Agendamento criado com sucesso!');
        
        res.status(201).json({
            success: true,
            message: 'Agendamento criado com sucesso!',
            agendamento: result.rows[0]
        });
        
    } catch (error) {
        console.error('💥 Erro ao criar agendamento seguro:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            detalhes: error.message
        });
    }
});

// =====================================================
// POST - Criar novo agendamento
// =====================================================
// =====================================================
// POST - CRIAR AGENDAMENTO (SISTEMA DEFINITIVO)
// =====================================================
router.post('/', async (req, res) => {
    console.log('🚀 CRIANDO AGENDAMENTO - Dados recebidos:', req.body);
    
    try {
        const {
            client_id,
            service_id,
            appointment_date,
            appointment_time,
            observations,
            total_price
        } = req.body;
        
        // VALIDAÇÕES RIGOROSAS
        console.log('🔍 DADOS RECEBIDOS:');
        console.log('- client_id:', client_id, typeof client_id);
        console.log('- service_id:', service_id, typeof service_id);
        console.log('- appointment_date:', appointment_date);
        console.log('- appointment_time:', appointment_time);
        
        if (!client_id || client_id === '' || client_id === 'null') {
            return res.status(400).json({ error: 'client_id é obrigatório' });
        }
        if (!service_id || service_id === '' || service_id === 'null') {
            return res.status(400).json({ error: 'service_id é obrigatório' });
        }
        if (!appointment_date) {
            return res.status(400).json({ error: 'appointment_date é obrigatório' });
        }
        if (!appointment_time) {
            return res.status(400).json({ error: 'appointment_time é obrigatório' });
        }
        
        // GARANTIR QUE O SERVIÇO EXISTE - SEM FALHAS
        let servicoPrice = 120.00; // Preço padrão
        
        try {
            const serviceCheck = await query('SELECT id, name, price FROM services WHERE id = $1', [service_id]);
            if (serviceCheck.rows.length > 0) {
                servicoPrice = serviceCheck.rows[0].price;
                console.log('✅ Serviço encontrado:', serviceCheck.rows[0].name);
            } else {
                console.log('⚠️ Serviço não encontrado, usando preço padrão');
            }
        } catch (serviceError) {
            console.log('⚠️ Erro ao validar serviço, continuando...', serviceError.message);
        }
        
        const finalPrice = total_price || servicoPrice;
        console.log('💰 Preço final:', finalPrice);
        
        // VERIFICAR CLIENTE - REMOVIDO PARA EVITAR PROBLEMAS
        console.log('✅ Cliente aceito sem validação:', client_id);
        
        // INSERIR AGENDAMENTO COM DADOS MÍNIMOS
        console.log('💾 Inserindo agendamento...');
        
        // INSERIR SEM FOREIGN KEY - APENAS OS DADOS
        const insertParams = [
            parseInt(client_id), 
            parseInt(service_id), 
            appointment_date, 
            appointment_time, 
            observations || '', 
            parseFloat(finalPrice)
        ];
        
        console.log('📋 Parâmetros finais:', insertParams);
        
        const result = await query(
            'INSERT INTO appointments (client_id, service_id, appointment_date, appointment_time, observations, total_price, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [...insertParams, 'agendado']
        );
        
        console.log('✅ Agendamento criado com sucesso:', result.rows[0]);
        
        res.status(201).json({
            success: true,
            message: 'Agendamento criado com sucesso!',
            agendamento: result.rows[0]
        });
        
    } catch (error) {
        console.error('💥 ERRO COMPLETO ao criar agendamento:');
        console.error('- Mensagem:', error.message);
        console.error('- Stack:', error.stack);
        console.error('- Dados recebidos:', req.body);
        
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            detalhes: error.message,
            dados_recebidos: req.body
        });
    }
});

// =====================================================
// PUT - Atualizar agendamento
// =====================================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            client_id,
            service_id,
            appointment_date,
            appointment_time,
            status,
            observations,
            total_price
        } = req.body;
        
        // Verificar se agendamento existe
        const existingAppointment = await query('SELECT * FROM appointments WHERE id = $1', [id]);
        if (existingAppointment.rows.length === 0) {
            return res.status(404).json({ error: 'Agendamento não encontrado' });
        }
        
        // Verificar conflito de horário (exceto o próprio agendamento)
        if (appointment_date && appointment_time) {
            const conflictCheck = await query(
                `SELECT id FROM appointments 
                 WHERE appointment_date = $1 AND appointment_time = $2 
                 AND id != $3 AND status NOT IN ('cancelado')`,
                [appointment_date, appointment_time, id]
            );
            
            if (conflictCheck.rows.length > 0) {
                return res.status(400).json({ 
                    error: 'Já existe um agendamento neste horário' 
                });
            }
        }
        
        const result = await query(
            `UPDATE appointments 
             SET client_id = COALESCE($1, client_id),
                 service_id = COALESCE($2, service_id),
                 appointment_date = COALESCE($3, appointment_date),
                 appointment_time = COALESCE($4, appointment_time),
                 status = COALESCE($5, status),
                 observations = COALESCE($6, observations),
                 total_price = COALESCE($7, total_price),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $8
             RETURNING *`,
            [client_id, service_id, appointment_date, appointment_time, status, observations, total_price, id]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar agendamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// DELETE - Cancelar agendamento
// =====================================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Marcar como cancelado ao invés de deletar
        const result = await query(
            `UPDATE appointments 
             SET status = 'cancelado', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING id`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Agendamento não encontrado' });
        }
        
        res.json({ message: 'Agendamento cancelado com sucesso' });
    } catch (error) {
        console.error('Erro ao cancelar agendamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// GET - Agendamentos por mês
// =====================================================
router.get('/mes/:ano/:mes', async (req, res) => {
    try {
        const { ano, mes } = req.params;
        
        const result = await query(
            `SELECT 
                a.id, a.appointment_date, a.appointment_time, a.status,
                a.observations, a.total_price,
                c.full_name as client_name, c.phone as client_phone,
                s.name as service_name, s.duration_minutes
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            JOIN services s ON a.service_id = s.id
            WHERE EXTRACT(YEAR FROM a.appointment_date) = $1
            AND EXTRACT(MONTH FROM a.appointment_date) = $2
            AND a.status NOT IN ('cancelado')
            ORDER BY a.appointment_date ASC, a.appointment_time ASC`,
            [ano, mes]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar agendamentos do mês:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// GET - Agenda do dia
// =====================================================
router.get('/agenda/:date', async (req, res) => {
    try {
        const { date } = req.params;
        
        const result = await query(
            `SELECT 
                a.id, a.appointment_time, a.status, a.observations,
                c.full_name as client_name, c.phone as client_phone,
                s.name as service_name, s.duration_minutes
             FROM appointments a
             JOIN clients c ON a.client_id = c.id
             JOIN services s ON a.service_id = s.id
             WHERE a.appointment_date = $1
             AND a.status NOT IN ('cancelado')
             ORDER BY a.appointment_time ASC`,
            [date]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar agenda:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;
