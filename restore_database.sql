-- RECOVERY SCRIPT

-- 1. Drop accidental objects with CASCADE to handle dependencies
-- Using CASCADE here ensures policies depending on this function are dropped too
DROP FUNCTION IF EXISTS public.get_auth_user_company_id() CASCADE;

-- Drop tables (CASCADE will remove their specific policies and keys)
DROP TABLE IF EXISTS public.time_entries CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;

-- 2. Drop the "wrong" profiles table (and any cascading dependencies like RLS policies)
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 3. Drop salon_bank_data explicitly to avoid policy conflicts and ensure clean state
DROP TABLE IF EXISTS public.salon_bank_data CASCADE;

-- 4. Recreate the CORRECT profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  cpf TEXT,
  birth_date DATE,
  phone TEXT,
  cep TEXT,
  address TEXT,
  role TEXT DEFAULT 'subscriber' CHECK (role IN ('admin', 'salon_owner', 'subscriber')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Backfill profiles from auth.users with DATA SANITIZATION
-- This fixes the "check constraint" error by correcting 'salon' -> 'salon_owner'
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', 'Usuário'),
  CASE 
    WHEN (raw_user_meta_data->>'role')::text = 'salon' THEN 'salon_owner'
    WHEN (raw_user_meta_data->>'role')::text IN ('admin', 'salon_owner', 'subscriber') THEN (raw_user_meta_data->>'role')::text
    ELSE 'subscriber' -- Default fallback for safety
  END
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 6. Re-enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 7. Recreate RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

-- 8. Recreate Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Recreate salon_bank_data table
CREATE TABLE public.salon_bank_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID REFERENCES public.profiles(id) NOT NULL,
  pix_key_type VARCHAR(50) NOT NULL,
  pix_key VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(salon_id)
);

-- 10. Re-enable RLS on salon_bank_data
ALTER TABLE public.salon_bank_data ENABLE ROW LEVEL SECURITY;

-- 11. Recreate RLS Policies for salon_bank_data
CREATE POLICY "Salon owners can view their own bank data"
  ON public.salon_bank_data
  FOR SELECT
  USING (auth.uid() = salon_id);

CREATE POLICY "Salon owners can insert their own bank data"
  ON public.salon_bank_data
  FOR INSERT
  WITH CHECK (auth.uid() = salon_id);

CREATE POLICY "Salon owners can update their own bank data"
  ON public.salon_bank_data
  FOR UPDATE
  USING (auth.uid() = salon_id);

CREATE POLICY "Admins can view all bank data"
  ON public.salon_bank_data
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 12. Restore Foreign Keys on other tables (that were dropped by CASCADE)
DO $$
BEGIN
    -- Restore salons -> profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'salons_owner_id_fkey') THEN
        ALTER TABLE public.salons ADD CONSTRAINT salons_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id);
    END IF;

    -- Restore subscriptions -> profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'subscriptions_user_id_fkey') THEN
        ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);
    END IF;

    -- Restore payments -> profiles
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'payments_user_id_fkey') THEN
            ALTER TABLE public.payments ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);
        END IF;
    END IF;
END $$;
