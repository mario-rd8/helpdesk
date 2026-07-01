-- ============================================================
-- Migration 07: Módulo de Tarefas, foto de técnico e resolução de chamados
-- ============================================================

-- 1.1 Adicionar coluna para foto de perfil dos técnicos
ALTER TABLE public.tecnicos ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- 1.2 Adicionar coluna de resolução nos chamados (texto do técnico ao resolver)
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS resolucao TEXT;

-- 1.3 Criar tabela de Tarefas criadas pelos gestores para a equipe
CREATE TABLE IF NOT EXISTS public.tarefas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gestor_id UUID REFERENCES public.tecnicos(id) ON DELETE CASCADE,
    tecnico_id UUID REFERENCES public.tecnicos(id) ON DELETE CASCADE,
    provedor_ti_id UUID REFERENCES public.provedores_ti(id) ON DELETE CASCADE,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT NOT NULL,
    prazo TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) CHECK (status IN ('Pendente', 'Concluida')) DEFAULT 'Pendente',
    is_global BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.4 Criar tabela de comentários/mensagens dentro de cada tarefa (chat interno)
CREATE TABLE IF NOT EXISTS public.tarefa_comentarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tarefa_id UUID REFERENCES public.tarefas(id) ON DELETE CASCADE,
    autor_id UUID REFERENCES public.tecnicos(id) ON DELETE CASCADE,
    autor_nome VARCHAR(150) NOT NULL,
    comentario TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices de busca para tarefas
CREATE INDEX IF NOT EXISTS idx_tarefas_tecnico ON public.tarefas(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_status ON public.tarefas(status);
CREATE INDEX IF NOT EXISTS idx_tarefas_provedor ON public.tarefas(provedor_ti_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_tarefa ON public.tarefa_comentarios(tarefa_id);
