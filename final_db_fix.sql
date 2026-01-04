-- Script Completo para Correção de Banco de Dados (Consolidado)
-- Execute este script no SQL Editor do Supabase para corrigir todos os erros identificados
-- Inclui: colunas faltantes em payments, role em profiles, foreign keys e políticas de segurança

BEGIN;

--------------------------------------------------------------------------------
-- 1. CORREÇÃO DA TABELA PROFILES (Erro: column profiles.role does not exist)
--------------------------------------------------------------------------------

DO $$ 
BEGIN 
  -- Adicionar coluna 'role' se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN 
    ALTER TABLE public.profiles ADD COLUMN role text DEFAULT 'subscriber'; 
  END IF; 
END $$;

-- Garantir constraint de valores válidos para roles
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'salon_owner', 'subscriber'));
END $$;

-- Garantir que perfis sejam visíveis publicamente (necessário para admin e relacionamentos)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);


--------------------------------------------------------------------------------
-- 2. CORREÇÃO DA TABELA PAYMENTS (Erro: PGRST200 e colunas faltantes)
--------------------------------------------------------------------------------

DO $$ 
BEGIN 
  -- Adicionar plan_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'plan_id') THEN 
    ALTER TABLE public.payments ADD COLUMN plan_id uuid references public.plans(id); 
  END IF; 

  -- Adicionar transaction_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'transaction_id') THEN 
    ALTER TABLE public.payments ADD COLUMN transaction_id text; 
  END IF;

  -- Adicionar payment_method
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'payment_method') THEN 
    ALTER TABLE public.payments ADD COLUMN payment_method text; 
  END IF;
END $$;

-- Garantir Foreign Keys explícitas para evitar erros de relacionamento no PostgREST
DO $$
BEGIN
    -- FK: payments -> profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'payments_user_id_fkey' AND table_name = 'payments') THEN
        ALTER TABLE public.payments ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);
    END IF;

    -- FK: payments -> plans
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'payments_plan_id_fkey' AND table_name = 'payments') THEN
        ALTER TABLE public.payments ADD CONSTRAINT payments_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);
    END IF;

    -- FK: subscriptions -> profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'subscriptions_user_id_fkey' AND table_name = 'subscriptions') THEN
        ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);
    END IF;
END $$;


--------------------------------------------------------------------------------
-- 3. POLÍTICAS DE SEGURANÇA (RLS) PARA DONOS DE SALÃO
--------------------------------------------------------------------------------

-- Ver assinaturas vinculadas ao salão
DROP POLICY IF EXISTS "Salon owners can view subscriptions for their salons" ON public.subscriptions;
CREATE POLICY "Salon owners can view subscriptions for their salons" ON public.subscriptions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.salons s 
    WHERE s.id = subscriptions.salon_id 
    AND s.owner_id = auth.uid()
  )
);

-- Atualizar créditos (Consumir corte)
DROP POLICY IF EXISTS "Salon owners can update credits" ON public.subscriptions;
CREATE POLICY "Salon owners can update credits" ON public.subscriptions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.salons s 
    WHERE s.id = subscriptions.salon_id 
    AND s.owner_id = auth.uid()
  )
);

-- Ver códigos do salão
DROP POLICY IF EXISTS "Salon owners can view codes for their salons" ON public.haircut_codes;
CREATE POLICY "Salon owners can view codes for their salons" ON public.haircut_codes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.subscriptions sub 
    JOIN public.salons s ON sub.salon_id = s.id 
    WHERE sub.id = haircut_codes.subscription_id 
    AND s.owner_id = auth.uid()
  )
);

-- Inserir histórico (Validar corte)
DROP POLICY IF EXISTS "Salon owners can insert history" ON public.haircut_history;
CREATE POLICY "Salon owners can insert history" ON public.haircut_history FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.salons s 
    WHERE s.id = haircut_history.salon_id 
    AND s.owner_id = auth.uid()
  )
);

COMMIT;

-- FIM DO SCRIPT
-- IMPORTANTE: Vá em Project Settings -> API -> Cache -> Reload schema cache após executar
