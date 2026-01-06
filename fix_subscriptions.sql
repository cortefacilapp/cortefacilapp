-- ==========================================
-- SCRIPT DE CORREÇÃO E CRIAÇÃO DE ASSINATURAS
-- ==========================================

-- 1. Garantir que o plano 'Profissional' existe
INSERT INTO public.plans (name, price, credits_per_month, description)
SELECT 'Profissional', 89.90, 4, 'Plano profissional mensal'
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE name = 'Profissional');

-- 2. Garantir que existe pelo menos um salão
DO $$
DECLARE
    v_first_user uuid;
BEGIN
    SELECT id INTO v_first_user FROM auth.users LIMIT 1;
    
    IF v_first_user IS NOT NULL THEN
        INSERT INTO public.salons (name, owner_id)
        SELECT 'Salão Principal', v_first_user
        WHERE NOT EXISTS (SELECT 1 FROM public.salons LIMIT 1);
    END IF;
END $$;

-- 3. Criar ou corrigir assinatura para 'borgesdiniz@icloud.com'
DO $$
DECLARE
    v_user_id uuid;
    v_plan_id uuid;
    v_salon_id uuid;
BEGIN
    -- Buscar IDs necessários
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'borgesdiniz@icloud.com';
    SELECT id INTO v_plan_id FROM public.plans WHERE name = 'Profissional' LIMIT 1;
    SELECT id INTO v_salon_id FROM public.salons LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        -- Inserir se não existir
        IF NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = v_user_id) THEN
            INSERT INTO public.subscriptions (
                user_id, 
                plan_id, 
                salon_id, 
                status, 
                current_credits, 
                start_date, 
                end_date
            ) VALUES (
                v_user_id,
                v_plan_id,
                v_salon_id,
                'active',
                4,
                now(),
                now() + interval '30 days'
            );
            RAISE NOTICE 'Assinatura criada para borgesdiniz@icloud.com';
        ELSE
            -- Atualizar para 'active' se estiver cancelada ou nula, só para garantir
            UPDATE public.subscriptions 
            SET status = 'active', end_date = now() + interval '30 days'
            WHERE user_id = v_user_id AND (status != 'active' OR end_date < now());
            
            RAISE NOTICE 'Assinatura verificada/atualizada para borgesdiniz@icloud.com';
        END IF;
        
        -- Garantir role de subscriber
        IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND role = 'subscriber') THEN
             INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'subscriber');
        END IF;
        
    ELSE
        RAISE NOTICE 'ALERTA: Usuário borgesdiniz@icloud.com não encontrado no banco de dados (auth.users). Verifique se o e-mail está correto.';
    END IF;
END $$;

-- 4. Criar assinaturas para QUALQUER usuário com pagamento 'completed' que esteja sem assinatura
DO $$
DECLARE
    r RECORD;
    v_plan_id uuid;
    v_salon_id uuid;
BEGIN
    SELECT id INTO v_plan_id FROM public.plans WHERE name = 'Profissional' LIMIT 1;
    SELECT id INTO v_salon_id FROM public.salons LIMIT 1;

    FOR r IN 
        SELECT DISTINCT p.user_id 
        FROM public.payments p
        WHERE p.status = 'completed' 
        AND NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = p.user_id)
    LOOP
        IF v_plan_id IS NOT NULL AND v_salon_id IS NOT NULL THEN
            INSERT INTO public.subscriptions (user_id, plan_id, salon_id, status, current_credits, start_date, end_date)
            VALUES (r.user_id, v_plan_id, v_salon_id, 'active', 4, now(), now() + interval '30 days');
            
            -- Garantir role
            INSERT INTO public.user_roles (user_id, role)
            SELECT r.user_id, 'subscriber'
            WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = r.user_id AND role = 'subscriber');
            
            RAISE NOTICE 'Assinatura recuperada para user_id % via histórico de pagamentos', r.user_id;
        END IF;
    END LOOP;
END $$;

-- 5. Retornar lista final de todas as assinaturas para conferência visual
SELECT 
    p.full_name as "Nome", 
    p.email as "Email", 
    s.status as "Status",
    pl.name as "Plano",
    s.current_credits as "Créditos",
    to_char(s.end_date, 'DD/MM/YYYY') as "Vencimento"
FROM subscriptions s
JOIN profiles p ON s.user_id = p.id
LEFT JOIN plans pl ON s.plan_id = pl.id
ORDER BY s.created_at DESC;
