DO $$
DECLARE
    v_user_id uuid;
BEGIN
    -- Get user id
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'raimundoborges@gmail.com';

    IF v_user_id IS NOT NULL THEN
        -- Check if salon exists
        IF NOT EXISTS (SELECT 1 FROM public.salons WHERE owner_id = v_user_id) THEN
            INSERT INTO public.salons (owner_id, name, address, phone, is_approved, commission_rate)
            VALUES (v_user_id, 'Salão do Raimundo', 'Endereço Padrão', '00000000000', true, 10.0);
        END IF;
    END IF;
END $$;
