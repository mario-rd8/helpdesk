-- ============================================================
-- MVP Help Desk Selfware — Migração 04
-- Vínculo de Unidades com Técnicos Responsáveis
-- ============================================================
-- INSTRUÇÕES: Execute este script no SQL Editor do Supabase
-- APÓS ter executado 01, 02 e 03
-- ============================================================

-- 1. Adicionar coluna tecnico_id na tabela unidades
ALTER TABLE public.unidades
    ADD COLUMN IF NOT EXISTS tecnico_responsavel_id UUID REFERENCES public.tecnicos(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.unidades.tecnico_responsavel_id IS 'Técnico de TI responsável diretamente por atender/gerenciar esta unidade';

-- 2. Índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_unidades_tecnico ON public.unidades(tecnico_responsavel_id);

-- 3. Vincular dados de teste (Seeds)
-- Vincula Carlos Silva (tecnico) à Filial Centro (id: 2)
UPDATE public.unidades 
SET tecnico_responsavel_id = '00000000-0000-4000-a000-000000000101' 
WHERE id = 2;

-- Vincula Ana Rodrigues (tecnico) à Filial Zona Norte (id: 3)
UPDATE public.unidades 
SET tecnico_responsavel_id = '00000000-0000-4000-a000-000000000102' 
WHERE id = 3;

-- Vincula Roberto Lima (gestor_ti) à Holding Juntos Educação (id: 1)
UPDATE public.unidades 
SET tecnico_responsavel_id = '00000000-0000-4000-a000-000000000103' 
WHERE id = 1;
