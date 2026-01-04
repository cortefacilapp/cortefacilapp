-- Add missing columns to payments table
DO $$ 
BEGIN 
  -- Add plan_id if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'plan_id') THEN 
    ALTER TABLE public.payments ADD COLUMN plan_id uuid references public.plans(id); 
  END IF; 

  -- Add transaction_id if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'transaction_id') THEN 
    ALTER TABLE public.payments ADD COLUMN transaction_id text; 
  END IF;

  -- Add payment_method if it doesn't exist (just to be safe)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'payment_method') THEN 
    ALTER TABLE public.payments ADD COLUMN payment_method text; 
  END IF;
END $$;
