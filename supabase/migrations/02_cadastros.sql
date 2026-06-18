-- ============================================================
-- MVP Help Desk Selfware — Migração 02
-- Campos adicionais para Cadastros + Tabela de Manutenções
-- ============================================================
-- INSTRUÇÕES: Execute este script no SQL Editor do Supabase
-- APÓS ter executado o 01_init_schema.sql
-- ============================================================

-- 1. Adicionar campo 'ativo' (ativo/inativo) na tabela usuarios
ALTER TABLE public.usuarios 
    ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.usuarios.ativo IS 'Indica se o colaborador está ativo (true) ou desligado/inativo (false)';

-- 2. Tabela de Manutenções (histórico estruturado dos ativos)
CREATE TABLE IF NOT EXISTS public.manutencoes (
    id SERIAL PRIMARY KEY,
    ativo_id INT NOT NULL REFERENCES public.ativos(id) ON DELETE CASCADE,
    tecnico_id UUID REFERENCES public.tecnicos(id) ON DELETE SET NULL,
    descricao TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.manutencoes IS 'Registro estruturado de manutenções realizadas em cada ativo/equipamento.';

-- Índice para busca rápida de manutenções por ativo
CREATE INDEX IF NOT EXISTS idx_manutencoes_ativo ON public.manutencoes(ativo_id);

-- 3. Migrar dados do campo texto 'historico' para a tabela manutencoes
-- (insere como entrada inicial para ativos que já possuem anotações)
INSERT INTO public.manutencoes (ativo_id, descricao)
SELECT id, historico
FROM public.ativos
WHERE historico IS NOT NULL AND historico != '';

-- ============================================================
-- FIM DA MIGRAÇÃO 02
-- ============================================================
