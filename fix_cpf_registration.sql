-- Atualiza a função handle_new_user para salvar o CPF e Data de Nascimento no cadastro
-- Execute este script no SQL Editor do Supabase

-- 1. Garantir que as colunas existem na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date date;

-- 2. Atualizar a função handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
  v_cpf text;
  v_birth_date date;
BEGIN
  -- Extrai os dados do metadata do usuário (enviados pelo frontend)
  v_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'subscriber');
  v_cpf := NEW.raw_user_meta_data ->> 'cpf';
  
  -- Tenta converter birth_date, se falhar ou for null, fica null
  BEGIN
    v_birth_date := (NEW.raw_user_meta_data ->> 'birth_date')::date;
  EXCEPTION WHEN OTHERS THEN
    v_birth_date := NULL;
  END;
  
  -- Garante consistência com o código (mapeia 'salon' para 'salon_owner')
  IF v_role = 'salon' THEN
     v_role := 'salon_owner';
  END IF;

  -- Insere ou atualiza o perfil do usuário
  INSERT INTO public.profiles (id, email, full_name, role, cpf, birth_date)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Usuário'),
    v_role,
    v_cpf,
    v_birth_date
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    -- Só atualiza CPF e Data se os novos valores não forem nulos
    cpf = COALESCE(EXCLUDED.cpf, public.profiles.cpf),
    birth_date = COALESCE(EXCLUDED.birth_date, public.profiles.birth_date);
  
  RETURN NEW;
END;
$$;

-- 3. Recriar o trigger para garantir que ele use a função atualizada
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
