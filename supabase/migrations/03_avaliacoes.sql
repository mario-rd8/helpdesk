-- ============================================================
-- MVP Help Desk Selfware — Migração 03
-- Sistema de Avaliação por Estrelas (1-5)
-- ============================================================
-- INSTRUÇÕES: Execute no SQL Editor do Supabase
-- APÓS ter executado 01 e 02
-- ============================================================

-- 1. Tabela de Avaliações
CREATE TABLE IF NOT EXISTS public.avaliacoes (
    id SERIAL PRIMARY KEY,
    chamado_id INT NOT NULL UNIQUE REFERENCES public.chamados(id) ON DELETE CASCADE,
    nota INT NOT NULL CHECK (nota >= 1 AND nota <= 5),
    unidade_id INT REFERENCES public.unidades(id) ON DELETE SET NULL,
    tecnico_id UUID REFERENCES public.tecnicos(id) ON DELETE SET NULL,
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.avaliacoes IS 'Avaliações de satisfação (1-5 estrelas) vinculadas a chamados resolvidos.';
COMMENT ON COLUMN public.avaliacoes.nota IS 'Nota de 1 a 5 estrelas dada pelo usuário ao atendimento';

-- 2. Índices para consultas rápidas no dashboard
CREATE INDEX IF NOT EXISTS idx_avaliacoes_unidade ON public.avaliacoes(unidade_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_tecnico ON public.avaliacoes(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_chamado ON public.avaliacoes(chamado_id);

-- ============================================================
-- FIM DA MIGRAÇÃO 03
-- ============================================================
