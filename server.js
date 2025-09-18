// =====================================================
// API ESTÉTICA FABIANE PROCÓPIO
// Sistema de Gestão Completo
// =====================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const clientsRoutes = require('./routes/clients');
const servicesRoutes = require('./routes/services');
const productsRoutes = require('./routes/products');
const appointmentsRoutes = require('./routes/appointments');
const reportsRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// MIDDLEWARES DE SEGURANÇA
// =====================================================

// Helmet para segurança
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por IP
    message: {
        error: 'Muitas requisições. Tente novamente em 15 minutos.'
    }
});
app.use(limiter);

// CORS - Configuração específica para desenvolvimento
const allowedOrigins = [
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'http://127.0.0.1:3000',
    'http://localhost:3000',
    'https://estetica-fabiane.netlify.app' // Para produção futura
];

// CORS mais permissivo para desenvolvimento
app.use(cors({
    origin: '*', // Permite todas as origens
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: false,
    optionsSuccessStatus: 200
}));

// Middleware adicional para OPTIONS
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(200);
});

// Parse JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// =====================================================
// ROTAS
// =====================================================

// Rota de saúde
app.get('/', (req, res) => {
    res.json({
        message: 'API Estética Fabiane Procópio',
        version: '1.0.0',
        status: 'online',
        timestamp: new Date().toISOString()
    });
});

// Rotas da API
app.use('/api/clientes', clientsRoutes);
app.use('/api/servicos', servicesRoutes);
app.use('/api/produtos', productsRoutes);
app.use('/api/agendamentos', appointmentsRoutes);
app.use('/api/relatorios', reportsRoutes);
app.use('/api/dashboard', require('./routes/dashboard'));

// =====================================================
// MIDDLEWARE DE ERRO
// =====================================================

app.use((err, req, res, next) => {
    console.error('Erro:', err);
    
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Erro interno do servidor' 
            : err.message,
        timestamp: new Date().toISOString()
    });
});

// Rota não encontrada
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Rota não encontrada',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});

// =====================================================
// INICIALIZAÇÃO DO SERVIDOR
// =====================================================

app.listen(PORT, () => {
    console.log(`🚀 API Estética Fabiane rodando na porta ${PORT}`);
    console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log(`⏰ Iniciado em: ${new Date().toISOString()}`);
});

module.exports = app;
