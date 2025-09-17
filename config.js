// Configuração do Sistema Estética Fabiane
export const config = {
    // Configuração da API
    api: {
        // URL da API (será a URL do Render após deploy)
        baseUrl: 'http://localhost:3000/api', // Para desenvolvimento local
        // baseUrl: 'https://estetica-fabiane-api.onrender.com/api', // Para produção (descomente após deploy)
        timeout: 30000
    },
    
    // Configurações da aplicação
    app: {
        name: 'Estética Fabiane Procópio',
        version: '2.0.0',
        description: 'Sistema de Gestão para Estética Facial e Corporal'
    },
    
    // Configurações de desenvolvimento
    development: {
        // Se true, usa localStorage como fallback quando API não estiver disponível
        useLocalStorageFallback: true,
        // Se true, mostra logs detalhados no console
        enableDebugLogs: true
    }
};
