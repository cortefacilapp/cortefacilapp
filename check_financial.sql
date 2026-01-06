-- ==========================================
-- SCRIPT DE DIAGNÓSTICO FINANCEIRO
-- ==========================================

-- 1. Contar pagamentos por status
SELECT status, COUNT(*), SUM(amount) 
FROM public.payments 
GROUP BY status;

-- 2. Listar últimos 10 pagamentos para inspeção
SELECT id, user_id, amount, status, created_at 
FROM public.payments 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Verificar permissões atuais (apenas informativo, não altera nada)
SELECT * FROM pg_policies WHERE tablename = 'payments';
