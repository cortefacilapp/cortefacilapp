
-- Create a table for storing bank data (PIX) for salons
CREATE TABLE IF NOT EXISTS public.salon_bank_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID REFERENCES public.profiles(id) NOT NULL,
  pix_key_type VARCHAR(50) NOT NULL, -- 'cpf', 'cnpj', 'email', 'phone', 'random'
  pix_key VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(salon_id)
);

-- Add RLS policies
ALTER TABLE public.salon_bank_data ENABLE ROW LEVEL SECURITY;

-- Allow salon owners to view their own bank data
CREATE POLICY "Salon owners can view their own bank data"
  ON public.salon_bank_data
  FOR SELECT
  USING (auth.uid() = salon_id);

-- Allow salon owners to insert their own bank data
CREATE POLICY "Salon owners can insert their own bank data"
  ON public.salon_bank_data
  FOR INSERT
  WITH CHECK (auth.uid() = salon_id);

-- Allow salon owners to update their own bank data
CREATE POLICY "Salon owners can update their own bank data"
  ON public.salon_bank_data
  FOR UPDATE
  USING (auth.uid() = salon_id);

-- Allow admins to view all bank data
CREATE POLICY "Admins can view all bank data"
  ON public.salon_bank_data
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
