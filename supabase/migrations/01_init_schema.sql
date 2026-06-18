-- ============================================================
-- MVP HELP DESK SELFWARE — JUNTOS EDUCAÇÃO
-- Script de Migração Inicial (Supabase / PostgreSQL)
-- Versão: 2.0
-- ============================================================

-- Garante extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. CRIAÇÃO DAS TABELAS
-- ============================================================

-- Tabela de Unidades Organizacionais (Holding + Filiais)
CREATE TABLE IF NOT EXISTS public.unidades (
    id SERIAL PRIMARY KEY,
    nome_unidade VARCHAR(100) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('holding', 'filial')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.unidades IS 'Unidades organizacionais: 1 holding + 7 filiais';

-- Tabela de Usuários (Colaboradores / Gestores / Diretores)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    senha_hash TEXT NOT NULL,
    nome VARCHAR(150) NOT NULL,
    whatsapp VARCHAR(20) UNIQUE,
    unidade_id INT REFERENCES public.unidades(id) ON DELETE SET NULL,
    nivel_hierarquico VARCHAR(20) NOT NULL DEFAULT 'colaborador'
        CHECK (nivel_hierarquico IN ('colaborador', 'gestor', 'diretor')),
    gestor_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.usuarios IS 'Usuários do sistema: colaboradores, gestores e diretores. Carregados via ERP.';
COMMENT ON COLUMN public.usuarios.gestor_id IS 'Autorreferência para montar árvore hierárquica de equipe';
COMMENT ON COLUMN public.usuarios.whatsapp IS 'Identificador nativo do WhatsApp para triagem via Evolution API';

-- Tabela de Técnicos (Equipe de TI)
CREATE TABLE IF NOT EXISTS public.tecnicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    senha_hash TEXT NOT NULL,
    nome VARCHAR(150) NOT NULL,
    unidade_id INT REFERENCES public.unidades(id) ON DELETE SET NULL,
    telegram_chat_id VARCHAR(50) UNIQUE,
    perfil VARCHAR(20) NOT NULL DEFAULT 'tecnico'
        CHECK (perfil IN ('tecnico', 'gestor_ti')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.tecnicos IS 'Equipe técnica de TI. Recebem alertas via Telegram Bot.';
COMMENT ON COLUMN public.tecnicos.telegram_chat_id IS 'ID do chat do Telegram para notificações do Bot';

-- Tabela de Ativos (Inventário / CMDB)
CREATE TABLE IF NOT EXISTS public.ativos (
    id SERIAL PRIMARY KEY,
    codigo_tombamento VARCHAR(50) UNIQUE NOT NULL,
    modelo VARCHAR(100),
    historico TEXT,
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.ativos IS 'Inventário de equipamentos (CMDB). Cada ativo é vinculado ao seu responsável atual.';
COMMENT ON COLUMN public.ativos.historico IS 'Notas técnicas de manutenções anteriores';

-- Tabela de Chamados (Core do Help Desk)
CREATE TABLE IF NOT EXISTS public.chamados (
    id SERIAL PRIMARY KEY,
    descricao TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Novo'
        CHECK (status IN ('Novo', 'Em Atendimento', 'Pendente', 'Resolvido')),
    unidade_id INT REFERENCES public.unidades(id) ON DELETE SET NULL,
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    ativo_id INT REFERENCES public.ativos(id) ON DELETE SET NULL,
    tecnico_id UUID REFERENCES public.tecnicos(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.chamados IS 'Registros de chamados técnicos. Core do sistema de Help Desk.';

-- ============================================================
-- 2. ÍNDICES DE PERFORMANCE
-- ============================================================

-- Busca rápida de usuário por WhatsApp (triagem via Evolution API / n8n)
CREATE INDEX IF NOT EXISTS idx_usuarios_whatsapp ON public.usuarios(whatsapp);

-- Busca rápida de técnico por Telegram (notificações via Bot / n8n)
CREATE INDEX IF NOT EXISTS idx_tecnicos_telegram ON public.tecnicos(telegram_chat_id);

-- Filtros de chamados (usados pelas telas e pelo n8n)
CREATE INDEX IF NOT EXISTS idx_chamados_status ON public.chamados(status);
CREATE INDEX IF NOT EXISTS idx_chamados_unidade ON public.chamados(unidade_id);
CREATE INDEX IF NOT EXISTS idx_chamados_tecnico ON public.chamados(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_chamados_usuario ON public.chamados(usuario_id);
CREATE INDEX IF NOT EXISTS idx_chamados_ativo ON public.chamados(ativo_id);

-- Busca de ativos por responsável (portal do usuário/gestor)
CREATE INDEX IF NOT EXISTS idx_ativos_usuario ON public.ativos(usuario_id);

-- ============================================================
-- 3. FUNÇÃO + TRIGGER PARA ATUALIZAÇÃO AUTOMÁTICA DE updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.atualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chamados_updated_at ON public.chamados;

CREATE TRIGGER trg_chamados_updated_at
    BEFORE UPDATE ON public.chamados
    FOR EACH ROW
    EXECUTE FUNCTION public.atualizar_updated_at();

-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (permissivas para o MVP, restringir em produção)
CREATE POLICY "chamados_select_public" ON public.chamados
    FOR SELECT USING (true);

CREATE POLICY "chamados_insert_public" ON public.chamados
    FOR INSERT WITH CHECK (true);

CREATE POLICY "chamados_update_public" ON public.chamados
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "chamados_delete_public" ON public.chamados
    FOR DELETE USING (true);

-- ============================================================
-- 5. SEED DATA (Dados de Teste)
-- ============================================================
-- NOTA: As senhas estão em texto simples para facilitar testes no MVP.
-- Em produção, utilizar hashing bcrypt no backend/n8n antes de inserir.
-- Senha padrão para todos: "senha123"
-- ============================================================

-- 5.1 Unidades (1 holding + 7 filiais)
INSERT INTO public.unidades (nome_unidade, tipo) VALUES
    ('Holding Juntos Educação', 'holding'),
    ('Filial Centro', 'filial'),
    ('Filial Zona Norte', 'filial'),
    ('Filial Zona Sul', 'filial'),
    ('Filial Zona Leste', 'filial'),
    ('Filial Zona Oeste', 'filial'),
    ('Filial Litoral', 'filial'),
    ('Filial Interior', 'filial');

-- 5.2 Usuários (ordem: diretor → gestor → colaborador por causa das FKs de gestor_id)

-- Diretor (sem gestor acima)
INSERT INTO public.usuarios (id, username, senha_hash, nome, whatsapp, unidade_id, nivel_hierarquico, gestor_id) VALUES
    ('00000000-0000-4000-a000-000000000001', 'fernanda.costa', 'senha123', 'Fernanda Costa', '5511999000001', 1, 'diretor', NULL);

-- Gestor (gestor_id aponta para o diretor)
INSERT INTO public.usuarios (id, username, senha_hash, nome, whatsapp, unidade_id, nivel_hierarquico, gestor_id) VALUES
    ('00000000-0000-4000-a000-000000000002', 'joao.pereira', 'senha123', 'João Pereira', '5511999000002', 2, 'gestor', '00000000-0000-4000-a000-000000000001');

-- Colaboradores (gestor_id aponta para o gestor da filial)
INSERT INTO public.usuarios (id, username, senha_hash, nome, whatsapp, unidade_id, nivel_hierarquico, gestor_id) VALUES
    ('00000000-0000-4000-a000-000000000003', 'maria.santos', 'senha123', 'Maria Santos', '5511999000003', 2, 'colaborador', '00000000-0000-4000-a000-000000000002'),
    ('00000000-0000-4000-a000-000000000004', 'pedro.alves', 'senha123', 'Pedro Alves', '5511999000004', 2, 'colaborador', '00000000-0000-4000-a000-000000000002'),
    ('00000000-0000-4000-a000-000000000005', 'lucia.mendes', 'senha123', 'Lúcia Mendes', '5511999000005', 3, 'colaborador', NULL);

-- 5.3 Técnicos
INSERT INTO public.tecnicos (id, username, senha_hash, nome, unidade_id, telegram_chat_id, perfil) VALUES
    ('00000000-0000-4000-a000-000000000101', 'carlos.silva', 'senha123', 'Carlos Silva', 2, 'tg_carlos_001', 'tecnico'),
    ('00000000-0000-4000-a000-000000000102', 'ana.rodrigues', 'senha123', 'Ana Rodrigues', 3, 'tg_ana_002', 'tecnico'),
    ('00000000-0000-4000-a000-000000000103', 'roberto.lima', 'senha123', 'Roberto Lima', 1, 'tg_roberto_003', 'gestor_ti');

-- 5.4 Ativos (equipamentos)
INSERT INTO public.ativos (codigo_tombamento, modelo, historico, usuario_id) VALUES
    ('TOMB-2024-001', 'Dell Latitude 5520', 'Manutenção preventiva em 15/01/2025. Troca de bateria em 10/03/2025.', '00000000-0000-4000-a000-000000000003'),
    ('TOMB-2024-002', 'Lenovo ThinkPad T14', 'Formatação completa em 20/02/2025. Upgrade de RAM (8GB → 16GB) em 05/04/2025.', '00000000-0000-4000-a000-000000000002'),
    ('TOMB-2024-003', 'HP ProDesk 400 G7', 'Equipamento novo, sem histórico de manutenção.', '00000000-0000-4000-a000-000000000004'),
    ('TOMB-2024-004', 'Dell OptiPlex 7090', NULL, '00000000-0000-4000-a000-000000000005');

-- 5.5 Chamados (um em cada status para demonstrar o Kanban)
INSERT INTO public.chamados (descricao, status, unidade_id, usuario_id, ativo_id, tecnico_id) VALUES
    ('Monitor não liga após queda de energia na sala 302. Já tentei trocar o cabo de força sem sucesso.', 'Novo', 2, '00000000-0000-4000-a000-000000000003', 1, NULL),
    ('Sistema ERP travando constantemente ao gerar relatórios financeiros. O problema começou após a última atualização.', 'Em Atendimento', 2, '00000000-0000-4000-a000-000000000002', 2, '00000000-0000-4000-a000-000000000101'),
    ('Teclado com teclas F5 e F8 falhando intermitentemente. Necessário substituição do periférico.', 'Pendente', 2, '00000000-0000-4000-a000-000000000004', 3, '00000000-0000-4000-a000-000000000101'),
    ('Solicitação de instalação do pacote Adobe Creative Suite para o setor de marketing.', 'Resolvido', 2, '00000000-0000-4000-a000-000000000002', 2, '00000000-0000-4000-a000-000000000101');

-- ============================================================
-- FIM DO SCRIPT DE MIGRAÇÃO
-- ============================================================
