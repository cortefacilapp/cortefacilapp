-- Script para tornar mayconreis2030@gmail.com administrador
-- Execute este script no SQL Editor do Supabase

DO $$
BEGIN
    -- 1. Atualizar a role na tabela profiles (estrutura nova)
    UPDATE public.profiles
    SET role = 'admin'
    WHERE email = 'mayconreis2030@gmail.com';

    IF FOUND THEN
        RAISE NOTICE 'Usuário mayconreis2030@gmail.com atualizado para admin na tabela profiles.';
    ELSE
        RAISE NOTICE 'Usuário mayconreis2030@gmail.com não encontrado na tabela profiles.';
    END IF;

    -- 2. Atualizar na tabela user_roles (estrutura antiga, se ainda for usada em algum lugar)
    -- Apenas por precaução, caso ainda exista a tabela
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        UPDATE public.user_roles
        SET role = 'admin'
        WHERE user_id IN (SELECT id FROM public.profiles WHERE email = 'mayconreis2030@gmail.com');
        
        RAISE NOTICE 'Tentativa de atualização na tabela user_roles realizada.';
    END IF;

END $$;
