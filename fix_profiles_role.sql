-- Script para corrigir erro: column profiles.role does not exist
-- Este script adiciona a coluna 'role' na tabela profiles, que é necessária para o funcionamento do sistema

-- 1. Adicionar coluna 'role' se ela não existir
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN 
    ALTER TABLE public.profiles ADD COLUMN role text DEFAULT 'subscriber'; 
    RAISE NOTICE 'Coluna role adicionada na tabela profiles';
  END IF; 
END $$;

-- 2. Garantir que a constraint de valores válidos exista
DO $$
BEGIN
  -- Tentar remover constraint antiga se existir para recriar
  BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  EXCEPTION
    WHEN OTHERS THEN NULL;
  END;

  -- Adicionar a constraint
  ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'salon_owner', 'subscriber'));
END $$;

-- 3. Atualizar permissões (RLS) para garantir leitura pública dos perfis
-- Isso é necessário para que o admin consiga ler os dados dos usuários
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

-- 4. Instrução de Cache
-- Após executar, vá em Project Settings -> API -> Cache -> Reload schema cache
