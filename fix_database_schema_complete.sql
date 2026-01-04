-- Script completo para corrigir estrutura do banco de dados e relacionamentos
-- Execute este script no SQL Editor do Supabase para garantir que todas as tabelas e colunas existam

-- 1. Garantir colunas na tabela PAYMENTS
DO $$ 
BEGIN 
  -- Adicionar plan_id se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'plan_id') THEN 
    ALTER TABLE public.payments ADD COLUMN plan_id uuid references public.plans(id); 
  END IF; 

  -- Adicionar transaction_id se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'transaction_id') THEN 
    ALTER TABLE public.payments ADD COLUMN transaction_id text; 
  END IF;

  -- Adicionar payment_method se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'payment_method') THEN 
    ALTER TABLE public.payments ADD COLUMN payment_method text; 
  END IF;
END $$;

-- 2. Garantir Foreign Keys (Relacionamentos) explícitos
-- Isso ajuda o PostgREST a encontrar os relacionamentos corretamente

DO $$
BEGIN
    -- FK: payments -> profiles
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'payments_user_id_fkey' AND table_name = 'payments'
    ) THEN
        ALTER TABLE public.payments 
        ADD CONSTRAINT payments_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id);
    END IF;

    -- FK: payments -> plans
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'payments_plan_id_fkey' AND table_name = 'payments'
    ) THEN
        ALTER TABLE public.payments 
        ADD CONSTRAINT payments_plan_id_fkey 
        FOREIGN KEY (plan_id) REFERENCES public.plans(id);
    END IF;

    -- FK: subscriptions -> profiles
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'subscriptions_user_id_fkey' AND table_name = 'subscriptions'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD CONSTRAINT subscriptions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id);
    END IF;
END $$;

-- 3. Atualizar Políticas de Segurança (RLS) para Donos de Salão
-- Garante que donos de salão possam ler e atualizar dados relevantes

-- Permitir que donos de salão vejam assinaturas vinculadas aos seus salões
drop policy if exists "Salon owners can view subscriptions for their salons" on public.subscriptions;
create policy "Salon owners can view subscriptions for their salons" on public.subscriptions for select using (
  exists (
    select 1 from public.salons s 
    where s.id = subscriptions.salon_id 
    and s.owner_id = auth.uid()
  )
);

-- Permitir que donos de salão ATUALIZEM CRÉDITOS (Consumo)
drop policy if exists "Salon owners can update credits" on public.subscriptions;
create policy "Salon owners can update credits" on public.subscriptions for update using (
  exists (
    select 1 from public.salons s 
    where s.id = subscriptions.salon_id 
    and s.owner_id = auth.uid()
  )
);

-- Permitir que donos de salão vejam códigos vinculados aos seus salões
drop policy if exists "Salon owners can view codes for their salons" on public.haircut_codes;
create policy "Salon owners can view codes for their salons" on public.haircut_codes for select using (
  exists (
    select 1 from public.subscriptions sub 
    join public.salons s on sub.salon_id = s.id 
    where sub.id = haircut_codes.subscription_id 
    and s.owner_id = auth.uid()
  )
);

-- Permitir que donos de salão insiram histórico de cortes (Validação)
drop policy if exists "Salon owners can insert history" on public.haircut_history;
create policy "Salon owners can insert history" on public.haircut_history for insert with check (
  exists (
    select 1 from public.salons s 
    where s.id = haircut_history.salon_id 
    and s.owner_id = auth.uid()
  )
);

-- 4. Recarregar o Schema Cache (Instrução)
-- Após rodar este script, vá em: Project Settings -> API -> Cache -> Reload schema cache
