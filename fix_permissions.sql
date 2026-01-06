-- ==========================================
-- SCRIPT DE CORREÇÃO DE PERMISSÕES (RLS)
-- ==========================================
-- Este script garante que usuários autenticados (incluindo admins) 
-- possam visualizar todos os dados necessários no painel.

-- 1. Habilitar RLS (caso não esteja)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas antigas restritivas (opcional, mas recomendado para evitar conflitos)
-- (Nota: O comando DROP POLICY IF EXISTS remove políticas se elas tiverem esses nomes exatos.
--  Se suas políticas tiverem nomes diferentes, elas permanecerão, mas a nova política 'permissive' deve sobrepor.)

DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- 3. Criar políticas permissivas de LEITURA (SELECT) para usuários autenticados
-- Isso permite que o painel Admin leia todos os registros.

-- Tabela subscriptions
CREATE POLICY "Allow read access for authenticated users"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (true);

-- Tabela profiles
CREATE POLICY "Allow read access for authenticated users"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Tabela plans (geralmente pública, mas garantindo)
CREATE POLICY "Allow read access for authenticated users"
ON public.plans
FOR SELECT
TO authenticated
USING (true);

-- Tabela salons (geralmente pública, mas garantindo)
CREATE POLICY "Allow read access for authenticated users"
ON public.salons
FOR SELECT
TO authenticated
USING (true);

-- Tabela user_roles (importante para identificar admins/assinantes)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access for authenticated users"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

-- 4. Confirmar que políticas foram aplicadas
SELECT tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE tablename IN ('subscriptions', 'profiles', 'plans', 'salons', 'user_roles');
