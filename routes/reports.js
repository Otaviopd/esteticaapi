// =====================================================
// ROTAS PARA RELATÓRIOS E ESTATÍSTICAS
// =====================================================

const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

// =====================================================
// GET - Estatísticas básicas para relatórios
// =====================================================
router.get('/stats', async (req, res) => {
    try {
        // Queries mais simples e seguras
        const clientesResult = await query('SELECT COUNT(*) as count FROM clients');
        const agendamentosResult = await query('SELECT COUNT(*) as count FROM appointments');
        const servicosResult = await query('SELECT COUNT(*) as count FROM services');
        const produtosResult = await query('SELECT COUNT(*) as count FROM products');
        
        res.json({
            total_clientes: parseInt(clientesResult.rows[0].count) || 0,
            total_agendamentos: parseInt(agendamentosResult.rows[0].count) || 0,
            total_servicos: parseInt(servicosResult.rows[0].count) || 0,
            total_produtos: parseInt(produtosResult.rows[0].count) || 0,
            receita_total: 0 // Será calculado depois
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        console.error('Detalhes do erro:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
    }
});

// =====================================================
// GET - Dashboard com estatísticas gerais
// =====================================================
router.get('/dashboard', async (req, res) => {
    try {
        // Estatísticas gerais
        const statsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM clients) as total_clients,
                (SELECT COUNT(*) FROM services WHERE status = 'ativo') as active_services,
                (SELECT COUNT(*) FROM products) as total_products,
                (SELECT COUNT(*) FROM appointments WHERE appointment_date >= CURRENT_DATE) as upcoming_appointments,
                (SELECT COUNT(*) FROM appointments WHERE appointment_date = CURRENT_DATE) as today_appointments,
                (SELECT COALESCE(SUM(total_price), 0) FROM appointments WHERE status = 'realizado' AND appointment_date >= DATE_TRUNC('month', CURRENT_DATE)) as monthly_revenue,
                (SELECT COUNT(*) FROM products WHERE stock_quantity <= min_stock_alert) as low_stock_products
        `;
        
        const statsResult = await query(statsQuery);
        
        // Próximos agendamentos
        const upcomingQuery = `
            SELECT 
                a.id, a.appointment_date, a.appointment_time, a.status,
                c.full_name as client_name, c.phone as client_phone,
                s.name as service_name, s.duration_minutes
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            JOIN services s ON a.service_id = s.id
            WHERE a.appointment_date >= CURRENT_DATE
            AND a.status NOT IN ('cancelado')
            ORDER BY a.appointment_date ASC, a.appointment_time ASC
            LIMIT 10
        `;
        
        const upcomingResult = await query(upcomingQuery);
        
        // Produtos com estoque baixo
        const lowStockQuery = `
            SELECT 
                id, name, category, stock_quantity, min_stock_alert
            FROM products 
            WHERE stock_quantity <= min_stock_alert
            ORDER BY (min_stock_alert - stock_quantity) DESC
            LIMIT 10
        `;
        
        const lowStockResult = await query(lowStockQuery);
        
        res.json({
            stats: statsResult.rows[0],
            upcoming_appointments: upcomingResult.rows,
            low_stock_products: lowStockResult.rows
        });
    } catch (error) {
        console.error('Erro ao buscar dashboard:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// GET - Relatório de receita por período
// =====================================================
router.get('/revenue', async (req, res) => {
    try {
        const { start_date, end_date, group_by = 'day' } = req.query;
        
        if (!start_date || !end_date) {
            return res.status(400).json({ 
                error: 'Data inicial e final são obrigatórias' 
            });
        }
        
        let dateFormat;
        switch (group_by) {
            case 'month':
                dateFormat = 'YYYY-MM';
                break;
            case 'week':
                dateFormat = 'YYYY-WW';
                break;
            default:
                dateFormat = 'YYYY-MM-DD';
        }
        
        const result = await query(
            `SELECT 
                TO_CHAR(appointment_date, $1) as period,
                COUNT(*) as total_appointments,
                COUNT(CASE WHEN status = 'realizado' THEN 1 END) as completed_appointments,
                COALESCE(SUM(CASE WHEN status = 'realizado' THEN total_price END), 0) as total_revenue
             FROM appointments
             WHERE appointment_date BETWEEN $2 AND $3
             GROUP BY TO_CHAR(appointment_date, $1)
             ORDER BY period ASC`,
            [dateFormat, start_date, end_date]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar relatório de receita:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// GET - Relatório de serviços mais populares
// =====================================================
router.get('/popular-services', async (req, res) => {
    try {
        const { start_date, end_date, limit = 10 } = req.query;
        
        let queryText = `
            SELECT 
                s.id, s.name, s.category, s.price,
                COUNT(a.id) as total_bookings,
                COUNT(CASE WHEN a.status = 'realizado' THEN 1 END) as completed_bookings,
                COALESCE(SUM(CASE WHEN a.status = 'realizado' THEN a.total_price END), 0) as total_revenue
            FROM services s
            LEFT JOIN appointments a ON s.id = a.service_id
        `;
        
        let queryParams = [];
        
        if (start_date && end_date) {
            queryText += ` AND a.appointment_date BETWEEN $1 AND $2`;
            queryParams.push(start_date, end_date);
        }
        
        queryText += `
            GROUP BY s.id, s.name, s.category, s.price
            ORDER BY total_bookings DESC, total_revenue DESC
            LIMIT $${queryParams.length + 1}
        `;
        queryParams.push(limit);
        
        const result = await query(queryText, queryParams);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar serviços populares:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// GET - Relatório de clientes
// =====================================================
router.get('/clients', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        let queryText = `
            SELECT 
                c.id, c.full_name, c.email, c.phone, c.created_at,
                COUNT(a.id) as total_appointments,
                COUNT(CASE WHEN a.status = 'realizado' THEN 1 END) as completed_appointments,
                COALESCE(SUM(CASE WHEN a.status = 'realizado' THEN a.total_price END), 0) as total_spent,
                MAX(a.appointment_date) as last_appointment
            FROM clients c
            LEFT JOIN appointments a ON c.id = a.client_id
        `;
        
        let queryParams = [];
        
        if (start_date && end_date) {
            queryText += ` AND a.appointment_date BETWEEN $1 AND $2`;
            queryParams.push(start_date, end_date);
        }
        
        queryText += `
            GROUP BY c.id, c.full_name, c.email, c.phone, c.created_at
            ORDER BY total_spent DESC, total_appointments DESC
        `;
        
        const result = await query(queryText, queryParams);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar relatório de clientes:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// GET - Relatório de cancelamentos
// =====================================================
router.get('/cancellations', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        let queryText = `
            SELECT 
                DATE_TRUNC('day', appointment_date) as date,
                COUNT(*) as total_appointments,
                COUNT(CASE WHEN status = 'cancelado' THEN 1 END) as cancelled_appointments,
                COUNT(CASE WHEN status = 'nao_compareceu' THEN 1 END) as no_show_appointments,
                ROUND(
                    (COUNT(CASE WHEN status IN ('cancelado', 'nao_compareceu') THEN 1 END)::DECIMAL / COUNT(*)) * 100, 
                    2
                ) as cancellation_rate
            FROM appointments
        `;
        
        let queryParams = [];
        
        if (start_date && end_date) {
            queryText += ` WHERE appointment_date BETWEEN $1 AND $2`;
            queryParams.push(start_date, end_date);
        }
        
        queryText += `
            GROUP BY DATE_TRUNC('day', appointment_date)
            ORDER BY date DESC
        `;
        
        const result = await query(queryText, queryParams);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar relatório de cancelamentos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// GET - Relatório de produtos/estoque
// =====================================================
router.get('/inventory', async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                id, name, category, unit_price, cost_price,
                stock_quantity, min_stock_alert,
                (unit_price * stock_quantity) as stock_value,
                CASE 
                    WHEN stock_quantity <= 0 THEN 'Sem Estoque'
                    WHEN stock_quantity <= min_stock_alert THEN 'Estoque Baixo'
                    ELSE 'Estoque OK'
                END as stock_status,
                CASE 
                    WHEN cost_price > 0 THEN ROUND(((unit_price - cost_price) / cost_price) * 100, 2)
                    ELSE 0
                END as profit_margin
            FROM products
            ORDER BY stock_value DESC
        `);
        
        // Resumo do inventário
        const summaryResult = await query(`
            SELECT 
                COUNT(*) as total_products,
                SUM(unit_price * stock_quantity) as total_stock_value,
                COUNT(CASE WHEN stock_quantity <= 0 THEN 1 END) as out_of_stock,
                COUNT(CASE WHEN stock_quantity <= min_stock_alert THEN 1 END) as low_stock
            FROM products
        `);
        
        res.json({
            products: result.rows,
            summary: summaryResult.rows[0]
        });
    } catch (error) {
        console.error('Erro ao buscar relatório de inventário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// GET - Exportar relatório geral (Excel)
// =====================================================
router.get('/geral', async (req, res) => {
    try {
        // Dados básicos para relatório geral
        const clientes = await query('SELECT * FROM clients ORDER BY full_name');
        const agendamentos = await query(`
            SELECT 
                a.*, 
                c.full_name as client_name,
                s.name as service_name
            FROM appointments a
            LEFT JOIN clients c ON a.client_id = c.id
            LEFT JOIN services s ON a.service_id = s.id
            ORDER BY a.appointment_date DESC
        `);
        const servicos = await query('SELECT * FROM services ORDER BY name');
        
        res.json({
            clientes: clientes.rows,
            agendamentos: agendamentos.rows,
            servicos: servicos.rows,
            data_geracao: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erro ao gerar relatório geral:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// GET - Exportar relatório detalhado (Excel)
// =====================================================
router.get('/detalhado', async (req, res) => {
    try {
        // Relatório mais detalhado com estatísticas
        const estatisticas = await query(`
            SELECT 
                (SELECT COUNT(*) FROM clients) as total_clientes,
                (SELECT COUNT(*) FROM appointments) as total_agendamentos,
                (SELECT COUNT(*) FROM services) as total_servicos,
                (SELECT COUNT(*) FROM products) as total_produtos
        `);
        
        const agendamentosPorMes = await query(`
            SELECT 
                EXTRACT(YEAR FROM appointment_date) as ano,
                EXTRACT(MONTH FROM appointment_date) as mes,
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'concluido' THEN 1 END) as concluidos
            FROM appointments
            GROUP BY EXTRACT(YEAR FROM appointment_date), EXTRACT(MONTH FROM appointment_date)
            ORDER BY ano DESC, mes DESC
        `);
        
        const clientesAtivos = await query(`
            SELECT 
                c.full_name,
                c.email,
                c.phone,
                COUNT(a.id) as total_agendamentos,
                MAX(a.appointment_date) as ultimo_agendamento
            FROM clients c
            LEFT JOIN appointments a ON c.id = a.client_id
            GROUP BY c.id, c.full_name, c.email, c.phone
            ORDER BY total_agendamentos DESC
        `);
        
        res.json({
            estatisticas: estatisticas.rows[0],
            agendamentos_por_mes: agendamentosPorMes.rows,
            clientes_ativos: clientesAtivos.rows,
            data_geracao: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erro ao gerar relatório detalhado:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;
