-- ============================================================
-- 06_add_contracts_and_branches.sql
-- ============================================================
-- Executar no SQL Editor do Supabase para atualizar a modelagem.

-- 1.1 Adicionar dados de contato, vencimento e contrato na tabela 'clientes'
ALTER TABLE public.clientes 
    ADD COLUMN IF NOT EXISTS responsavel_nome VARCHAR(150),
    ADD COLUMN IF NOT EXISTS responsavel_telefone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS responsavel_email VARCHAR(150),
    ADD COLUMN IF NOT EXISTS data_vencimento_contrato DATE,
    ADD COLUMN IF NOT EXISTS contrato_pdf_url TEXT;

-- 1.2 Adicionar campos de endereço e telefone na tabela 'unidades' (filiais)
ALTER TABLE public.unidades 
    ADD COLUMN IF NOT EXISTS endereco TEXT,
    ADD COLUMN IF NOT EXISTS telefone VARCHAR(20);

-- 1.3 Adicionar campos de técnico a um cliente e filial padrão (controle operacional)
ALTER TABLE public.tecnicos
    ADD COLUMN IF NOT EXISTS cliente_padrao_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS filial_padrao_id INTEGER REFERENCES public.unidades(id) ON DELETE SET NULL;
