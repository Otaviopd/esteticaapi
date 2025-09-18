// =====================================================
// ROTAS PARA DASHBOARD
// =====================================================

const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

// =====================================================
// GET - Estatísticas do dashboard
// =====================================================
router.get('/stats', async (req, res) => {
    try {
        const [clientes, agendamentosHoje, servicosRealizados, receita] = await Promise.all([
            query('SELECT COUNT(*) as total FROM clients'),
            query(`SELECT COUNT(*) as total FROM appointments 
                   WHERE appointment_date = CURRENT_DATE 
                   AND status IN ('agendado', 'confirmado')`),
            query(`SELECT COUNT(*) as total FROM appointments 
                   WHERE status = 'concluido'`),
            query(`SELECT COALESCE(SUM(total_price), 0) as total FROM appointments 
                   WHERE EXTRACT(MONTH FROM appointment_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                   AND EXTRACT(YEAR FROM appointment_date) = EXTRACT(YEAR FROM CURRENT_DATE)
                   AND status = 'concluido'`)
        ]);
        
        res.json({
            totalClientes: parseInt(clientes.rows[0].total),
            agendamentosHoje: parseInt(agendamentosHoje.rows[0].total),
            receitaMes: parseFloat(receita.rows[0].total),
            servicosRealizados: parseInt(servicosRealizados.rows[0].total)
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;
