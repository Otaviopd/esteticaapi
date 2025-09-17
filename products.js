// =====================================================
// ROTAS PARA PRODUTOS
// =====================================================

const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

// =====================================================
// GET - Listar todos os produtos
// =====================================================
router.get('/', async (req, res) => {
    try {
        const { category, low_stock = false } = req.query;
        
        let queryText = `
            SELECT 
                id, name, description, category, unit_price, cost_price,
                stock_quantity, min_stock_alert, created_at, updated_at,
                CASE 
                    WHEN stock_quantity <= 0 THEN 'sem_estoque'
                    WHEN stock_quantity <= min_stock_alert THEN 'estoque_baixo'
                    ELSE 'estoque_ok'
                END as stock_status
            FROM products
        `;
        let queryParams = [];
        let conditions = [];
        
        // Filtros
        if (category) {
            conditions.push(`category = $${queryParams.length + 1}`);
            queryParams.push(category);
        }
        
        if (low_stock === 'true') {
            conditions.push(`stock_quantity <= min_stock_alert`);
        }
        
        if (conditions.length > 0) {
            queryText += ` WHERE ${conditions.join(' AND ')}`;
        }
        
        queryText += ` ORDER BY name ASC`;
        
        const result = await query(queryText, queryParams);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// GET - Buscar produto por ID
// =====================================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query(
            `SELECT *,
                CASE 
                    WHEN stock_quantity <= 0 THEN 'sem_estoque'
                    WHEN stock_quantity <= min_stock_alert THEN 'estoque_baixo'
                    ELSE 'estoque_ok'
                END as stock_status
             FROM products WHERE id = $1`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao buscar produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// POST - Criar novo produto
// =====================================================
router.post('/', async (req, res) => {
    try {
        const {
            name,
            description,
            category,
            unit_price,
            cost_price,
            stock_quantity = 0,
            min_stock_alert = 5
        } = req.body;
        
        // Validações básicas
        if (!name || !category || !unit_price) {
            return res.status(400).json({ 
                error: 'Nome, categoria e preço unitário são obrigatórios' 
            });
        }
        
        if (unit_price <= 0) {
            return res.status(400).json({ 
                error: 'Preço unitário deve ser maior que zero' 
            });
        }
        
        const result = await query(
            `INSERT INTO products 
             (name, description, category, unit_price, cost_price, stock_quantity, min_stock_alert)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [name, description, category, unit_price, cost_price, stock_quantity, min_stock_alert]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// PUT - Atualizar produto
// =====================================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            category,
            unit_price,
            cost_price,
            stock_quantity,
            min_stock_alert
        } = req.body;
        
        // Verificar se produto existe
        const existingProduct = await query('SELECT id FROM products WHERE id = $1', [id]);
        if (existingProduct.rows.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        
        if (unit_price && unit_price <= 0) {
            return res.status(400).json({ 
                error: 'Preço unitário deve ser maior que zero' 
            });
        }
        
        const result = await query(
            `UPDATE products 
             SET name = COALESCE($1, name),
                 description = COALESCE($2, description),
                 category = COALESCE($3, category),
                 unit_price = COALESCE($4, unit_price),
                 cost_price = COALESCE($5, cost_price),
                 stock_quantity = COALESCE($6, stock_quantity),
                 min_stock_alert = COALESCE($7, min_stock_alert),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $8
             RETURNING *`,
            [name, description, category, unit_price, cost_price, stock_quantity, min_stock_alert, id]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// DELETE - Remover produto
// =====================================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        
        res.json({ message: 'Produto removido com sucesso' });
    } catch (error) {
        console.error('Erro ao remover produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// PUT - Atualizar estoque
// =====================================================
router.put('/:id/stock', async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, operation = 'set' } = req.body; // 'set', 'add', 'subtract'
        
        if (typeof quantity !== 'number') {
            return res.status(400).json({ error: 'Quantidade deve ser um número' });
        }
        
        let queryText;
        let queryParams;
        
        switch (operation) {
            case 'add':
                queryText = `UPDATE products 
                           SET stock_quantity = stock_quantity + $1, updated_at = CURRENT_TIMESTAMP
                           WHERE id = $2 RETURNING *`;
                queryParams = [quantity, id];
                break;
            case 'subtract':
                queryText = `UPDATE products 
                           SET stock_quantity = GREATEST(stock_quantity - $1, 0), updated_at = CURRENT_TIMESTAMP
                           WHERE id = $2 RETURNING *`;
                queryParams = [quantity, id];
                break;
            default: // 'set'
                queryText = `UPDATE products 
                           SET stock_quantity = $1, updated_at = CURRENT_TIMESTAMP
                           WHERE id = $2 RETURNING *`;
                queryParams = [quantity, id];
        }
        
        const result = await query(queryText, queryParams);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar estoque:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// GET - Produtos com estoque baixo
// =====================================================
router.get('/alerts/low-stock', async (req, res) => {
    try {
        const result = await query(
            `SELECT 
                id, name, category, stock_quantity, min_stock_alert,
                (min_stock_alert - stock_quantity) as deficit
             FROM products 
             WHERE stock_quantity <= min_stock_alert
             ORDER BY (min_stock_alert - stock_quantity) DESC`
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar produtos com estoque baixo:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// GET - Categorias disponíveis
// =====================================================
router.get('/meta/categories', async (req, res) => {
    try {
        const result = await query(`
            SELECT unnest(enum_range(NULL::product_category_enum)) as category
        `);
        
        res.json(result.rows.map(row => row.category));
    } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;
