// =====================================================
// CONFIGURAÇÃO DO BANCO DE DADOS POSTGRESQL
// =====================================================

const { Pool } = require('pg');

// Configuração do pool de conexões
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20, // máximo de conexões no pool
    idleTimeoutMillis: 30000, // tempo limite para conexões inativas
    connectionTimeoutMillis: 2000, // tempo limite para conectar
});

// Evento de conexão
pool.on('connect', () => {
    console.log('✅ Conectado ao PostgreSQL');
});

// Evento de erro
pool.on('error', (err) => {
    console.error('❌ Erro no PostgreSQL:', err);
    process.exit(-1);
});

// Função para executar queries
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        
        // Log apenas em desenvolvimento
        if (process.env.NODE_ENV !== 'production') {
            console.log('📊 Query executada:', { text, duration, rows: res.rowCount });
        }
        
        return res;
    } catch (error) {
        console.error('❌ Erro na query:', { text, error: error.message });
        throw error;
    }
};

// Função para transações
const transaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Função para testar conexão
const testConnection = async () => {
    try {
        const result = await query('SELECT NOW() as current_time');
        console.log('🔗 Conexão testada com sucesso:', result.rows[0].current_time);
        return true;
    } catch (error) {
        console.error('❌ Falha ao testar conexão:', error.message);
        return false;
    }
};

module.exports = {
    pool,
    query,
    transaction,
    testConnection
};
