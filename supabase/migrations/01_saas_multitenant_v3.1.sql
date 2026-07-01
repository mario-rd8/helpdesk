-- ============================================================
-- HELP DESK SAAS MULTI-TENANT HIERÁRQUICO (B2B2B)
-- Script de Criação Completo — Supabase / PostgreSQL
-- Versão: 3.1 (Migração Multi-Tenant + SaaS Owner)
-- ============================================================
-- INSTRUÇÕES: Copie e cole este script inteiro no SQL Editor
-- do console Supabase e execute de uma vez.
-- ============================================================

-- Garante extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 0. LIMPEZA — Remove tabelas anteriores (se existirem)
-- ============================================================
-- ATENÇÃO: Este bloco apaga TODAS as tabelas e dados antigos.
-- Executar apenas na migração inicial ou reset completo.
-- ============================================================

DROP TABLE IF EXISTS public.manutencoes CASCADE;
DROP TABLE IF EXISTS public.avaliacoes CASCADE;
DROP TABLE IF EXISTS public.chamados CASCADE;
DROP TABLE IF EXISTS public.ativos CASCADE;
DROP TABLE IF EXISTS public.tecnicos CASCADE;
DROP TABLE IF EXISTS public.usuarios CASCADE;
DROP TABLE IF EXISTS public.unidades CASCADE;
DROP TABLE IF EXISTS public.clientes CASCADE;
DROP TABLE IF EXISTS public.provedores_ti CASCADE;
DROP TABLE IF EXISTS public.saas_admins CASCADE;

-- Também limpa tabelas do schema antigo (monocliente)
DROP TRIGGER IF EXISTS trg_chamados_updated_at ON public.chamados;
DROP FUNCTION IF EXISTS public.atualizar_updated_at();

-- ============================================================
-- 1. CRIAÇÃO DAS TABELAS
-- ============================================================

-- 1.0 SaaS Admins (Donos da plataforma — visão global)
CREATE TABLE public.saas_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    senha_hash TEXT NOT NULL,
    nome VARCHAR(150) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.saas_admins IS 'Administradores da plataforma SaaS. Têm visão e controle global sobre todos os provedores de TI.';

-- 1.1 Provedores de TI (Empresas de TI que usam nosso software)
CREATE TABLE public.provedores_ti (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_provedor VARCHAR(150) NOT NULL,
    cnpj VARCHAR(20) UNIQUE,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.provedores_ti IS 'Provedores de TI — Tenants principais do SaaS (B2B2B).';

-- 1.2 Clientes dos Provedores (Empresas atendidas por eles)
CREATE TABLE public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provedor_ti_id UUID REFERENCES public.provedores_ti(id) ON DELETE CASCADE,
    nome_cliente VARCHAR(150) NOT NULL,
    cnpj VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.clientes IS 'Empresas-clientes atendidas pelos provedores de TI.';

-- 1.3 Unidades / Filiais desses Clientes
CREATE TABLE public.unidades (
    id SERIAL PRIMARY KEY,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    nome_unidade VARCHAR(100) NOT NULL,
    tipo VARCHAR(20) CHECK (tipo IN ('holding', 'filial')) NOT NULL,
    tecnico_responsavel_id UUID, -- FK adicionada após criação de tecnicos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.unidades IS 'Unidades organizacionais (holding + filiais) dos clientes.';

-- 1.4 Usuários (Colaboradores das empresas clientes)
CREATE TABLE public.usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    unidade_id INT REFERENCES public.unidades(id) ON DELETE RESTRICT,
    username VARCHAR(50) UNIQUE NOT NULL,
    senha_hash TEXT NOT NULL,
    nome VARCHAR(150) NOT NULL,
    whatsapp VARCHAR(20) UNIQUE,
    nivel_hierarquico VARCHAR(20) CHECK (nivel_hierarquico IN ('colaborador', 'gestor', 'diretor')) DEFAULT 'colaborador',
    gestor_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.usuarios IS 'Usuários do sistema: colaboradores, gestores e diretores das empresas-clientes.';
COMMENT ON COLUMN public.usuarios.gestor_id IS 'Autorreferência para montar árvore hierárquica de equipe.';
COMMENT ON COLUMN public.usuarios.whatsapp IS 'Identificador nativo do WhatsApp para triagem via Evolution API.';
COMMENT ON COLUMN public.usuarios.ativo IS 'Flag para ativar/desativar acesso do colaborador sem removê-lo.';

-- 1.5 Técnicos (Operadores vinculados ao Provedor de TI)
CREATE TABLE public.tecnicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provedor_ti_id UUID REFERENCES public.provedores_ti(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    senha_hash TEXT NOT NULL,
    nome VARCHAR(150) NOT NULL,
    telegram_chat_id VARCHAR(50) UNIQUE,
    perfil VARCHAR(20) CHECK (perfil IN ('tecnico', 'gestor_ti')) DEFAULT 'tecnico',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.tecnicos IS 'Equipe técnica vinculada ao provedor de TI. Recebem alertas via Telegram Bot.';
COMMENT ON COLUMN public.tecnicos.telegram_chat_id IS 'ID do chat do Telegram para notificações do Bot.';

-- Agora adicionamos a FK de tecnico_responsavel_id em unidades (referência cruzada)
ALTER TABLE public.unidades
    ADD CONSTRAINT fk_unidades_tecnico_responsavel
    FOREIGN KEY (tecnico_responsavel_id) REFERENCES public.tecnicos(id) ON DELETE SET NULL;

-- 1.6 Ativos (Equipamentos sob cuidado do usuário)
CREATE TABLE public.ativos (
    id SERIAL PRIMARY KEY,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    codigo_tombamento VARCHAR(50) UNIQUE NOT NULL,
    modelo VARCHAR(100),
    historico TEXT,
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.ativos IS 'Inventário de equipamentos (CMDB). Cada ativo pertence a um cliente e é vinculado ao seu responsável atual.';
COMMENT ON COLUMN public.ativos.historico IS 'Notas técnicas de manutenções anteriores (campo legado, usar tabela manutencoes para novos registros).';

-- 1.7 Chamados (Tickets)
CREATE TABLE public.chamados (
    id SERIAL PRIMARY KEY,
    provedor_ti_id UUID REFERENCES public.provedores_ti(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    unidade_id INT REFERENCES public.unidades(id) ON DELETE RESTRICT,
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE RESTRICT,
    ativo_id INT REFERENCES public.ativos(id) ON DELETE SET NULL,
    tecnico_id UUID REFERENCES public.tecnicos(id) ON DELETE SET NULL,
    descricao TEXT NOT NULL,
    status VARCHAR(20) CHECK (status IN ('Novo', 'Em Atendimento', 'Pendente', 'Resolvido')) DEFAULT 'Novo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.chamados IS 'Registros de chamados técnicos — Core do sistema de Help Desk Multi-Tenant.';

-- 1.8 Avaliações de Chamados (Feedback estilo Uber)
CREATE TABLE public.avaliacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chamado_id INT UNIQUE REFERENCES public.chamados(id) ON DELETE CASCADE,
    tecnico_id UUID REFERENCES public.tecnicos(id) ON DELETE CASCADE,
    provedor_ti_id UUID REFERENCES public.provedores_ti(id) ON DELETE CASCADE,
    nota INT NOT NULL CHECK (nota BETWEEN 1 AND 5),
    comentario TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.avaliacoes IS 'Avaliações de satisfação dos chamados (1 a 5 estrelas + comentário). Uma por chamado.';

-- 1.9 Manutenções (Histórico técnico dos ativos)
CREATE TABLE public.manutencoes (
    id SERIAL PRIMARY KEY,
    ativo_id INT REFERENCES public.ativos(id) ON DELETE CASCADE,
    tecnico_id UUID REFERENCES public.tecnicos(id) ON DELETE SET NULL,
    descricao TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.manutencoes IS 'Registro histórico de manutenções realizadas em cada ativo.';

-- ============================================================
-- 2. ÍNDICES DE PERFORMANCE
-- ============================================================

-- Filtros de chamados (usados pelas telas e pelo n8n)
CREATE INDEX idx_chamados_provedor ON public.chamados(provedor_ti_id);
CREATE INDEX idx_chamados_cliente ON public.chamados(cliente_id);
CREATE INDEX idx_chamados_status ON public.chamados(status);
CREATE INDEX idx_chamados_unidade ON public.chamados(unidade_id);
CREATE INDEX idx_chamados_tecnico ON public.chamados(tecnico_id);
CREATE INDEX idx_chamados_usuario ON public.chamados(usuario_id);
CREATE INDEX idx_chamados_ativo ON public.chamados(ativo_id);

-- Busca rápida de usuário por WhatsApp (triagem via Evolution API / n8n)
CREATE INDEX idx_usuarios_whatsapp ON public.usuarios(whatsapp);
CREATE INDEX idx_usuarios_cliente ON public.usuarios(cliente_id);

-- Busca rápida de técnico por Telegram (notificações via Bot / n8n)
CREATE INDEX idx_tecnicos_telegram ON public.tecnicos(telegram_chat_id);
CREATE INDEX idx_tecnicos_provedor ON public.tecnicos(provedor_ti_id);

-- Busca de ativos por responsável e por cliente
CREATE INDEX idx_ativos_usuario ON public.ativos(usuario_id);
CREATE INDEX idx_ativos_cliente ON public.ativos(cliente_id);

-- Clientes por provedor
CREATE INDEX idx_clientes_provedor ON public.clientes(provedor_ti_id);

-- Unidades por cliente
CREATE INDEX idx_unidades_cliente ON public.unidades(cliente_id);

-- Manutenções por ativo
CREATE INDEX idx_manutencoes_ativo ON public.manutencoes(ativo_id);

-- Avaliações
CREATE INDEX idx_avaliacoes_chamado ON public.avaliacoes(chamado_id);
CREATE INDEX idx_avaliacoes_tecnico ON public.avaliacoes(tecnico_id);
CREATE INDEX idx_avaliacoes_provedor ON public.avaliacoes(provedor_ti_id);

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

CREATE TRIGGER trg_chamados_updated_at
    BEFORE UPDATE ON public.chamados
    FOR EACH ROW
    EXECUTE FUNCTION public.atualizar_updated_at();

-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS) — Permissivo para MVP
-- ============================================================

-- Chamados
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chamados_select_public" ON public.chamados FOR SELECT USING (true);
CREATE POLICY "chamados_insert_public" ON public.chamados FOR INSERT WITH CHECK (true);
CREATE POLICY "chamados_update_public" ON public.chamados FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "chamados_delete_public" ON public.chamados FOR DELETE USING (true);

-- Provedores
ALTER TABLE public.provedores_ti ENABLE ROW LEVEL SECURITY;
CREATE POLICY "provedores_select_public" ON public.provedores_ti FOR SELECT USING (true);
CREATE POLICY "provedores_insert_public" ON public.provedores_ti FOR INSERT WITH CHECK (true);
CREATE POLICY "provedores_update_public" ON public.provedores_ti FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "provedores_delete_public" ON public.provedores_ti FOR DELETE USING (true);

-- Clientes
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clientes_select_public" ON public.clientes FOR SELECT USING (true);
CREATE POLICY "clientes_insert_public" ON public.clientes FOR INSERT WITH CHECK (true);
CREATE POLICY "clientes_update_public" ON public.clientes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "clientes_delete_public" ON public.clientes FOR DELETE USING (true);

-- Unidades
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "unidades_select_public" ON public.unidades FOR SELECT USING (true);
CREATE POLICY "unidades_insert_public" ON public.unidades FOR INSERT WITH CHECK (true);
CREATE POLICY "unidades_update_public" ON public.unidades FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "unidades_delete_public" ON public.unidades FOR DELETE USING (true);

-- Usuários
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuarios_select_public" ON public.usuarios FOR SELECT USING (true);
CREATE POLICY "usuarios_insert_public" ON public.usuarios FOR INSERT WITH CHECK (true);
CREATE POLICY "usuarios_update_public" ON public.usuarios FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "usuarios_delete_public" ON public.usuarios FOR DELETE USING (true);

-- Técnicos
ALTER TABLE public.tecnicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tecnicos_select_public" ON public.tecnicos FOR SELECT USING (true);
CREATE POLICY "tecnicos_insert_public" ON public.tecnicos FOR INSERT WITH CHECK (true);
CREATE POLICY "tecnicos_update_public" ON public.tecnicos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "tecnicos_delete_public" ON public.tecnicos FOR DELETE USING (true);

-- Ativos
ALTER TABLE public.ativos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ativos_select_public" ON public.ativos FOR SELECT USING (true);
CREATE POLICY "ativos_insert_public" ON public.ativos FOR INSERT WITH CHECK (true);
CREATE POLICY "ativos_update_public" ON public.ativos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "ativos_delete_public" ON public.ativos FOR DELETE USING (true);

-- Avaliações
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "avaliacoes_select_public" ON public.avaliacoes FOR SELECT USING (true);
CREATE POLICY "avaliacoes_insert_public" ON public.avaliacoes FOR INSERT WITH CHECK (true);
CREATE POLICY "avaliacoes_update_public" ON public.avaliacoes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "avaliacoes_delete_public" ON public.avaliacoes FOR DELETE USING (true);

-- Manutenções
ALTER TABLE public.manutencoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manutencoes_select_public" ON public.manutencoes FOR SELECT USING (true);
CREATE POLICY "manutencoes_insert_public" ON public.manutencoes FOR INSERT WITH CHECK (true);
CREATE POLICY "manutencoes_update_public" ON public.manutencoes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "manutencoes_delete_public" ON public.manutencoes FOR DELETE USING (true);

-- SaaS Admins
ALTER TABLE public.saas_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saas_admins_select_public" ON public.saas_admins FOR SELECT USING (true);
CREATE POLICY "saas_admins_insert_public" ON public.saas_admins FOR INSERT WITH CHECK (true);
CREATE POLICY "saas_admins_update_public" ON public.saas_admins FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "saas_admins_delete_public" ON public.saas_admins FOR DELETE USING (true);

-- ============================================================
-- 5. SEED DATA — Dados de Teste Multi-Tenant
-- ============================================================
-- NOTA: Senhas em texto simples para facilitar testes no MVP.
-- Senha padrão para todos: "senha123"
-- ============================================================

-- 5.0 SaaS Admin (Dono da plataforma)
INSERT INTO public.saas_admins (id, username, senha_hash, nome) VALUES
    ('00000000-0000-4000-a000-000000000000', 'admin', 'senha123', 'Administrador SaaS');

-- 5.1 Provedor de TI (Tenant principal)
INSERT INTO public.provedores_ti (id, nome_provedor, cnpj) VALUES
    ('10000000-0000-4000-a000-000000000001', 'Selfware Tecnologia', '12.345.678/0001-90');

-- 5.2 Clientes do Provedor
INSERT INTO public.clientes (id, provedor_ti_id, nome_cliente, cnpj) VALUES
    ('20000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', 'Juntos Educação', '98.765.432/0001-10'),
    ('20000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000001', 'Grupo Innovare', '11.222.333/0001-44');

-- 5.3 Unidades do Cliente "Juntos Educação" (1 holding + 3 filiais)
INSERT INTO public.unidades (id, cliente_id, nome_unidade, tipo) VALUES
    (1, '20000000-0000-4000-a000-000000000001', 'Holding Juntos Educação', 'holding'),
    (2, '20000000-0000-4000-a000-000000000001', 'Filial Centro', 'filial'),
    (3, '20000000-0000-4000-a000-000000000001', 'Filial Zona Norte', 'filial'),
    (4, '20000000-0000-4000-a000-000000000001', 'Filial Zona Sul', 'filial');

-- Unidades do Cliente "Grupo Innovare" (1 holding + 1 filial)
INSERT INTO public.unidades (id, cliente_id, nome_unidade, tipo) VALUES
    (5, '20000000-0000-4000-a000-000000000002', 'Sede Innovare', 'holding'),
    (6, '20000000-0000-4000-a000-000000000002', 'Filial Innovare Sul', 'filial');

-- Reset da sequence para evitar conflito com IDs manuais
SELECT setval('unidades_id_seq', (SELECT MAX(id) FROM unidades));

-- 5.4 Técnicos do Provedor "Selfware"
INSERT INTO public.tecnicos (id, provedor_ti_id, username, senha_hash, nome, telegram_chat_id, perfil) VALUES
    ('30000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', 'carlos.silva', 'senha123', 'Carlos Silva', 'tg_carlos_001', 'tecnico'),
    ('30000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000001', 'ana.rodrigues', 'senha123', 'Ana Rodrigues', 'tg_ana_002', 'tecnico'),
    ('30000000-0000-4000-a000-000000000003', '10000000-0000-4000-a000-000000000001', 'roberto.lima', 'senha123', 'Roberto Lima', 'tg_roberto_003', 'gestor_ti');

-- Atribui técnico responsável a algumas unidades
UPDATE public.unidades SET tecnico_responsavel_id = '30000000-0000-4000-a000-000000000001' WHERE id = 2;
UPDATE public.unidades SET tecnico_responsavel_id = '30000000-0000-4000-a000-000000000002' WHERE id = 3;

-- 5.5 Usuários do Cliente "Juntos Educação"

-- Diretor (sem gestor acima)
INSERT INTO public.usuarios (id, cliente_id, unidade_id, username, senha_hash, nome, whatsapp, nivel_hierarquico, gestor_id) VALUES
    ('40000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001', 1, 'fernanda.costa', 'senha123', 'Fernanda Costa', '5511999000001', 'diretor', NULL);

-- Gestor (gestor_id aponta para o diretor)
INSERT INTO public.usuarios (id, cliente_id, unidade_id, username, senha_hash, nome, whatsapp, nivel_hierarquico, gestor_id) VALUES
    ('40000000-0000-4000-a000-000000000002', '20000000-0000-4000-a000-000000000001', 2, 'joao.pereira', 'senha123', 'João Pereira', '5511999000002', 'gestor', '40000000-0000-4000-a000-000000000001');

-- Colaboradores
INSERT INTO public.usuarios (id, cliente_id, unidade_id, username, senha_hash, nome, whatsapp, nivel_hierarquico, gestor_id) VALUES
    ('40000000-0000-4000-a000-000000000003', '20000000-0000-4000-a000-000000000001', 2, 'maria.santos', 'senha123', 'Maria Santos', '5511999000003', 'colaborador', '40000000-0000-4000-a000-000000000002'),
    ('40000000-0000-4000-a000-000000000004', '20000000-0000-4000-a000-000000000001', 2, 'pedro.alves', 'senha123', 'Pedro Alves', '5511999000004', 'colaborador', '40000000-0000-4000-a000-000000000002'),
    ('40000000-0000-4000-a000-000000000005', '20000000-0000-4000-a000-000000000001', 3, 'lucia.mendes', 'senha123', 'Lúcia Mendes', '5511999000005', 'colaborador', NULL);

-- Usuários do Cliente "Grupo Innovare"
INSERT INTO public.usuarios (id, cliente_id, unidade_id, username, senha_hash, nome, whatsapp, nivel_hierarquico, gestor_id) VALUES
    ('40000000-0000-4000-a000-000000000006', '20000000-0000-4000-a000-000000000002', 5, 'ricardo.souza', 'senha123', 'Ricardo Souza', '5511999000006', 'diretor', NULL),
    ('40000000-0000-4000-a000-000000000007', '20000000-0000-4000-a000-000000000002', 6, 'camila.lima', 'senha123', 'Camila Lima', '5511999000007', 'colaborador', '40000000-0000-4000-a000-000000000006');

-- 5.6 Ativos (Equipamentos)

-- Ativos da "Juntos Educação"
INSERT INTO public.ativos (id, cliente_id, codigo_tombamento, modelo, historico, usuario_id) VALUES
    (1, '20000000-0000-4000-a000-000000000001', 'TOMB-2024-001', 'Dell Latitude 5520', 'Manutenção preventiva em 15/01/2025. Troca de bateria em 10/03/2025.', '40000000-0000-4000-a000-000000000003'),
    (2, '20000000-0000-4000-a000-000000000001', 'TOMB-2024-002', 'Lenovo ThinkPad T14', 'Formatação completa em 20/02/2025. Upgrade de RAM em 05/04/2025.', '40000000-0000-4000-a000-000000000002'),
    (3, '20000000-0000-4000-a000-000000000001', 'TOMB-2024-003', 'HP ProDesk 400 G7', 'Equipamento novo, sem histórico de manutenção.', '40000000-0000-4000-a000-000000000004'),
    (4, '20000000-0000-4000-a000-000000000001', 'TOMB-2024-004', 'Dell OptiPlex 7090', NULL, '40000000-0000-4000-a000-000000000005');

-- Ativos do "Grupo Innovare"
INSERT INTO public.ativos (id, cliente_id, codigo_tombamento, modelo, historico, usuario_id) VALUES
    (5, '20000000-0000-4000-a000-000000000002', 'TOMB-INV-001', 'MacBook Pro 14"', NULL, '40000000-0000-4000-a000-000000000006'),
    (6, '20000000-0000-4000-a000-000000000002', 'TOMB-INV-002', 'iMac 24"', 'Entregue em 01/06/2025.', '40000000-0000-4000-a000-000000000007');

-- Reset da sequence
SELECT setval('ativos_id_seq', (SELECT MAX(id) FROM ativos));

-- 5.7 Chamados (Tickets demonstrativos — um em cada status)

-- Chamados da "Juntos Educação"
INSERT INTO public.chamados (id, provedor_ti_id, cliente_id, unidade_id, usuario_id, ativo_id, tecnico_id, descricao, status) VALUES
    (1, '10000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001', 2, '40000000-0000-4000-a000-000000000003', 1, NULL,
        'Monitor não liga após queda de energia na sala 302. Já tentei trocar o cabo de força sem sucesso.', 'Novo'),
    (2, '10000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001', 2, '40000000-0000-4000-a000-000000000002', 2, '30000000-0000-4000-a000-000000000001',
        'Sistema ERP travando constantemente ao gerar relatórios financeiros. O problema começou após a última atualização.', 'Em Atendimento'),
    (3, '10000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001', 2, '40000000-0000-4000-a000-000000000004', 3, '30000000-0000-4000-a000-000000000001',
        'Teclado com teclas F5 e F8 falhando intermitentemente. Necessário substituição do periférico.', 'Pendente'),
    (4, '10000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001', 2, '40000000-0000-4000-a000-000000000002', 2, '30000000-0000-4000-a000-000000000001',
        'Solicitação de instalação do pacote Adobe Creative Suite para o setor de marketing.', 'Resolvido');

-- Chamado do "Grupo Innovare"
INSERT INTO public.chamados (id, provedor_ti_id, cliente_id, unidade_id, usuario_id, ativo_id, tecnico_id, descricao, status) VALUES
    (5, '10000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000002', 6, '40000000-0000-4000-a000-000000000007', 6, '30000000-0000-4000-a000-000000000002',
        'iMac não conecta na rede Wi-Fi corporativa após atualização do macOS.', 'Em Atendimento');

-- Reset da sequence
SELECT setval('chamados_id_seq', (SELECT MAX(id) FROM chamados));

-- 5.8 Manutenções (Histórico dos ativos)
INSERT INTO public.manutencoes (ativo_id, tecnico_id, descricao) VALUES
    (1, '30000000-0000-4000-a000-000000000001', 'Manutenção preventiva — limpeza interna e troca de pasta térmica.'),
    (1, '30000000-0000-4000-a000-000000000001', 'Troca de bateria por desgaste natural. Peça nova instalada.'),
    (2, '30000000-0000-4000-a000-000000000002', 'Formatação completa e reinstalação do Windows 11 Pro.'),
    (2, '30000000-0000-4000-a000-000000000002', 'Upgrade de RAM: 8GB para 16GB DDR4.');

-- ============================================================
-- FIM DO SCRIPT DE MIGRAÇÃO v3.1
-- ============================================================
-- Resumo: 10 tabelas, 21 índices, 1 trigger, RLS permissivo,
-- seed data com 1 admin SaaS, 1 provedor, 2 clientes,
-- 6 unidades, 7 usuários, 3 técnicos, 6 ativos,
-- 5 chamados, 4 manutenções.
-- ============================================================
