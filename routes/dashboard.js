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
        // Queries mais simples e seguras
        const clientes = await query('SELECT COUNT(*) as total FROM clients');
        const agendamentos = await query('SELECT COUNT(*) as total FROM appointments');
        
        res.json({
            totalClientes: parseInt(clientes.rows[0].total) || 0,
            agendamentosHoje: 0, // Será calculado depois
            receitaMes: 0, // Será calculado depois  
            servicosRealizados: parseInt(agendamentos.rows[0].total) || 0
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;
