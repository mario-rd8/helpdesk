# 🏢 Juntos Educação — MVP Help Desk Selfware

Sistema de Help Desk soberano desenvolvido sob a filosofia **Selfware**: infraestrutura 100% auto-hospedada, automações eficientes via n8n e zero dependência de licenças SaaS.

---

## 🏗️ Stack Tecnológica

| Camada | Tecnologia | Função |
|---|---|---|
| **Banco de Dados** | Supabase (PostgreSQL + RLS) | Persistência, segurança por linha |
| **Orquestração** | n8n (self-hosted) | Automação de workflows e triagem |
| **WhatsApp** | Evolution API | Recebimento de chamados dos colaboradores |
| **Telegram** | Bot API | Alertas e consulta rápida para técnicos |
| **Frontend** | HTML5 + Tailwind CSS + Vanilla JS | SPA com integração direta ao Supabase |
| **Hospedagem** | Coolify (Hostinger VPS) | Deploy soberano de todos os serviços |

---

## 📂 Estrutura do Projeto

```
helpdesk/
├── README.md                         # Este arquivo
├── .env.example                      # Variáveis de ambiente (template)
├── supabase/
│   └── migrations/
│       └── 01_init_schema.sql        # Schema do banco + seed data
├── n8n/
│   └── .gitkeep                      # Backups de workflows (futuro)
└── frontend/
    ├── index.html                    # Entry point da SPA
    ├── css/
    │   └── style.css                 # Design system Evaflow
    └── js/
        ├── supabase-config.js        # Client Supabase
        ├── auth.js                   # Tela A: Login
        ├── router.js                 # Roteamento hash-based
        ├── kanban.js                 # Tela B: Kanban Técnico
        ├── portal.js                 # Tela C: Portal Usuário/Gestor
        └── dashboard.js             # Tela D: Dashboard Admin
```

---

## 🚀 Quick Start

### 1. Banco de Dados
1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Abra o **SQL Editor**
3. Cole e execute o conteúdo de `supabase/migrations/01_init_schema.sql`
4. Copie a **URL** e a **anon key** do projeto (Settings → API)

### 2. Frontend
1. Copie `.env.example` para `.env` e preencha as credenciais
2. Abra `frontend/js/supabase-config.js` e insira a URL e a anon key
3. Abra `frontend/index.html` no navegador (ou sirva com Live Server)

### 3. Credenciais de Teste (Seed Data)
| Tipo | Username | Senha | Perfil |
|---|---|---|---|
| Técnico | `carlos.silva` | `senha123` | tecnico |
| Técnico | `ana.rodrigues` | `senha123` | tecnico |
| Gestor TI | `roberto.lima` | `senha123` | gestor_ti |
| Colaborador | `maria.santos` | `senha123` | colaborador |
| Gestor | `joao.pereira` | `senha123` | gestor |
| Diretor | `fernanda.costa` | `senha123` | diretor |

---

## 🔄 Ecossistema de Comunicação

```
Colaborador (WhatsApp) → Evolution API → n8n → Supabase (INSERT chamado)
                                          ↓
                              Telegram Bot → Técnico (Alerta)
                                          ↓
                              Painel Web → Técnico (Gerencia fila)
                                          ↓
                              Gestor → Dashboard (Monitora KPIs)
```

---

## 📋 Licença

Projeto proprietário — **Juntos Educação / Evaflow**
