-- Script para tornar raimundoborges@gmail.com dono de salão
-- Execute este script no SQL Editor do Supabase

DO $$
BEGIN
    -- 1. Atualizar a role na tabela profiles (estrutura nova)
    UPDATE public.profiles
    SET role = 'salon_owner'
    WHERE email = 'raimundoborges@gmail.com';

    IF FOUND THEN
        RAISE NOTICE 'Usuário raimundoborges@gmail.com atualizado para salon_owner na tabela profiles.';
    ELSE
        RAISE NOTICE 'Usuário raimundoborges@gmail.com não encontrado na tabela profiles.';
    END IF;

    -- 2. Atualizar na tabela user_roles (caso ainda exista e seja usada)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        UPDATE public.user_roles
        SET role = 'salon_owner'
        WHERE user_id IN (SELECT id FROM public.profiles WHERE email = 'raimundoborges@gmail.com');
    END IF;

END $$;
