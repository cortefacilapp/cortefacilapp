-- 1. Ensure salons table has necessary columns
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS state text;

-- 2. Ensure RLS policy for insert exists on salons
DROP POLICY IF EXISTS "Anyone can create salon" ON public.salons;
CREATE POLICY "Anyone can create salon" ON public.salons
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- 3. Ensure RLS policy for select/update on salons
DROP POLICY IF EXISTS "Salons are viewable by everyone" ON public.salons;
CREATE POLICY "Salons are viewable by everyone" ON public.salons for select using (true);

DROP POLICY IF EXISTS "Users can update own salon" ON public.salons;
CREATE POLICY "Users can update own salon" ON public.salons for update using (auth.uid() = owner_id);

-- 4. Create/Update the trigger function to populate profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'subscriber');
  
  -- Ensure consistency with code
  IF v_role = 'salon' THEN
     v_role := 'salon_owner';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Usuário'),
    v_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
  
  RETURN NEW;
END;
$$;

-- 5. Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
