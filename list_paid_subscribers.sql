-- Listar todos os assinantes que realizaram pagamentos
SELECT 
    p.full_name as "Nome",
    p.email as "Email",
    pl.name as "Plano",
    pay.amount as "Valor Pago",
    pay.payment_method as "Método",
    pay.status as "Status Pagamento",
    pay.created_at as "Data Pagamento"
FROM payments pay
JOIN profiles p ON pay.user_id = p.id
LEFT JOIN subscriptions s ON pay.subscription_id = s.id
LEFT JOIN plans pl ON s.plan_id = pl.id
WHERE pay.status IN ('paid', 'approved', 'completed')
ORDER BY pay.created_at DESC;
