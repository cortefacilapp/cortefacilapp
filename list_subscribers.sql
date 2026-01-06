-- Listar todos os usuários com papel 'subscriber' e seus status de assinatura
SELECT 
    p.full_name as "Nome", 
    p.email as "Email", 
    p.cpf as "CPF",
    COALESCE(s.status::text, 'Sem assinatura') as "Status Assinatura",
    pl.name as "Plano",
    CASE 
        WHEN s.end_date < now() THEN 'Vencida'
        WHEN s.status = 'active' THEN 'Ativa'
        ELSE 'Inativa'
    END as "Situação"
FROM profiles p
JOIN user_roles ur ON p.id = ur.user_id
LEFT JOIN subscriptions s ON p.id = s.user_id
LEFT JOIN plans pl ON s.plan_id = pl.id
WHERE ur.role = 'subscriber'
ORDER BY p.full_name;
