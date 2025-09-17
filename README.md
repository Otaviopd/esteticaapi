# API Estética Fabiane Procópio

API REST para o sistema de gestão da Estética Fabiane Procópio, desenvolvida em Node.js com PostgreSQL.

## 🚀 Funcionalidades

- **Gestão de Clientes**: CRUD completo com histórico de agendamentos
- **Catálogo de Serviços**: Gerenciamento de serviços oferecidos
- **Sistema de Agendamentos**: Controle completo da agenda
- **Controle de Produtos**: Gestão de estoque e produtos
- **Relatórios**: Dashboard e relatórios detalhados
- **Segurança**: Rate limiting, CORS, Helmet

## 📋 Pré-requisitos

- Node.js 18+
- PostgreSQL
- npm ou yarn

## 🛠️ Instalação Local

1. **Clone o repositório**
```bash
git clone <seu-repositorio>
cd api
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

4. **Execute o script do banco de dados**
```bash
# Execute o arquivo database_schema.sql no seu PostgreSQL
```

5. **Inicie o servidor**
```bash
npm start
# ou para desenvolvimento:
npm run dev
```

## 🌐 Deploy no Render

### 1. Criar Banco PostgreSQL no Render

1. Acesse [render.com](https://render.com)
2. Clique em "New" → "PostgreSQL"
3. Configure:
   - **Name**: `estetica-fabiane-db`
   - **Database**: `estetica_fabiane`
   - **User**: `estetica_user`
   - **Region**: escolha a mais próxima
4. Clique em "Create Database"
5. **Copie a External Database URL** (será usada depois)

### 2. Executar Script do Banco

1. No dashboard do PostgreSQL no Render, clique em "Connect"
2. Use o comando PSQL ou acesse via interface web
3. Execute todo o conteúdo do arquivo `database_schema.sql`

### 3. Deploy da API

1. No Render, clique em "New" → "Web Service"
2. Conecte seu repositório GitHub
3. Configure:
   - **Name**: `estetica-fabiane-api`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Root Directory**: `api` (se a API estiver em subpasta)

### 4. Variáveis de Ambiente

No Render, adicione estas variáveis de ambiente:

```
NODE_ENV=production
DATABASE_URL=<sua_external_database_url_do_render>
FRONTEND_URL=https://seu-frontend-domain.com
```

## 📚 Endpoints da API

### Clientes
- `GET /api/clients` - Listar clientes
- `GET /api/clients/:id` - Buscar cliente
- `POST /api/clients` - Criar cliente
- `PUT /api/clients/:id` - Atualizar cliente
- `DELETE /api/clients/:id` - Remover cliente

### Serviços
- `GET /api/services` - Listar serviços
- `GET /api/services/:id` - Buscar serviço
- `POST /api/services` - Criar serviço
- `PUT /api/services/:id` - Atualizar serviço
- `DELETE /api/services/:id` - Remover serviço

### Agendamentos
- `GET /api/appointments` - Listar agendamentos
- `GET /api/appointments/:id` - Buscar agendamento
- `POST /api/appointments` - Criar agendamento
- `PUT /api/appointments/:id` - Atualizar agendamento
- `DELETE /api/appointments/:id` - Cancelar agendamento

### Produtos
- `GET /api/products` - Listar produtos
- `GET /api/products/:id` - Buscar produto
- `POST /api/products` - Criar produto
- `PUT /api/products/:id` - Atualizar produto
- `DELETE /api/products/:id` - Remover produto

### Relatórios
- `GET /api/reports/dashboard` - Dashboard principal
- `GET /api/reports/revenue` - Relatório de receita
- `GET /api/reports/popular-services` - Serviços populares
- `GET /api/reports/clients` - Relatório de clientes

## 🔧 Estrutura do Projeto

```
api/
├── config/
│   └── database.js          # Configuração do PostgreSQL
├── routes/
│   ├── clients.js          # Rotas de clientes
│   ├── services.js         # Rotas de serviços
│   ├── appointments.js     # Rotas de agendamentos
│   ├── products.js         # Rotas de produtos
│   └── reports.js          # Rotas de relatórios
├── database_schema.sql     # Script do banco de dados
├── server.js              # Servidor principal
├── package.json           # Dependências
└── .env.example          # Exemplo de variáveis de ambiente
```

## 🛡️ Segurança

- **Helmet**: Headers de segurança
- **CORS**: Controle de origem cruzada
- **Rate Limiting**: Limite de requisições
- **Validação**: Validação de dados de entrada
- **SQL Injection**: Proteção com queries parametrizadas

## 📊 Banco de Dados

### Tabelas Principais:
- **clients**: Cadastro de clientes
- **services**: Catálogo de serviços
- **appointments**: Sistema de agendamentos
- **products**: Controle de produtos e estoque

### Recursos Avançados:
- **Triggers**: Atualização automática de timestamps
- **Views**: Consultas otimizadas para relatórios
- **Enums**: Tipos de dados padronizados
- **Índices**: Performance otimizada

## 🚀 Próximos Passos

Após o deploy da API:

1. **Teste todos os endpoints** usando Postman ou similar
2. **Configure o frontend** para usar a URL da API
3. **Implemente autenticação** (se necessário)
4. **Configure backup** do banco de dados
5. **Monitore performance** e logs

## 📞 Suporte

Para dúvidas ou problemas:
- Verifique os logs no dashboard do Render
- Teste a conexão com o banco de dados
- Confirme as variáveis de ambiente

---

**API desenvolvida para Estética Fabiane Procópio** 💅✨
