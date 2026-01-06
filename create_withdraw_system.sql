-- 1. Criar Enum para status de saque
CREATE TYPE public.withdraw_status AS ENUM ('pending', 'approved', 'paid', 'rejected');

-- 2. Criar tabela de solicitações de saque
CREATE TABLE IF NOT EXISTS public.withdraw_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  cycle_start DATE NOT NULL,
  cycle_end DATE NOT NULL,
  status withdraw_status DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  admin_id UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  
  -- Constraints de validação
  CONSTRAINT valid_dates CHECK (cycle_end > cycle_start)
);

-- 3. Habilitar RLS
ALTER TABLE public.withdraw_requests ENABLE ROW LEVEL SECURITY;

-- 4. Policies de Segurança

-- Donos de salão podem ver suas próprias solicitações
CREATE POLICY "Salon owners can view own withdraw requests" ON public.withdraw_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.salons s 
      WHERE s.id = withdraw_requests.salon_id 
      AND s.owner_id = auth.uid()
    )
  );

-- Donos de salão podem criar solicitações (validação adicional via trigger/function)
CREATE POLICY "Salon owners can create withdraw requests" ON public.withdraw_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.salons s 
      WHERE s.id = salon_id 
      AND s.owner_id = auth.uid()
    )
  );

-- Admins podem ver todas as solicitações
CREATE POLICY "Admins can view all withdraw requests" ON public.withdraw_requests
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin')
  );

-- Admins podem atualizar solicitações (aprovar, pagar, rejeitar)
CREATE POLICY "Admins can update withdraw requests" ON public.withdraw_requests
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin')
  );

-- 5. Função para calcular saldo do salão
CREATE OR REPLACE FUNCTION public.get_salon_balance(p_salon_id UUID)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_earnings DECIMAL(10,2);
  v_total_withdraws DECIMAL(10,2);
BEGIN
  -- Calcular total ganho com cortes
  SELECT COALESCE(SUM(amount_to_salon), 0)
  INTO v_total_earnings
  FROM public.haircut_history
  WHERE salon_id = p_salon_id;

  -- Calcular total de saques (pendentes, aprovados ou pagos)
  -- Saques rejeitados não contam como débito
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_withdraws
  FROM public.withdraw_requests
  WHERE salon_id = p_salon_id
  AND status IN ('pending', 'approved', 'paid');

  RETURN v_total_earnings - v_total_withdraws;
END;
$$;

-- 6. Trigger para validar regras de saque na INSERÇÃO
CREATE OR REPLACE FUNCTION public.validate_withdraw_request()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_balance DECIMAL(10,2);
  v_pending_count INTEGER;
  v_day_of_month INTEGER;
BEGIN
  -- Regra: Apenas a partir do dia 10
  v_day_of_month := EXTRACT(DAY FROM CURRENT_DATE);
  IF v_day_of_month < 10 THEN
    RAISE EXCEPTION 'Saques só podem ser solicitados a partir do dia 10.';
  END IF;

  -- Regra: Apenas um saque pendente por vez
  SELECT COUNT(*)
  INTO v_pending_count
  FROM public.withdraw_requests
  WHERE salon_id = NEW.salon_id
  AND status = 'pending';

  IF v_pending_count > 0 THEN
    RAISE EXCEPTION 'Já existe uma solicitação de saque pendente para este salão.';
  END IF;

  -- Regra: Saldo suficiente
  v_balance := public.get_salon_balance(NEW.salon_id);
  
  -- Como o novo registro ainda não foi inserido, o saldo atual deve cobrir o valor solicitado
  IF v_balance < NEW.amount THEN
    RAISE EXCEPTION 'Saldo insuficiente. Disponível: %, Solicitado: %', v_balance, NEW.amount;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER check_withdraw_rules
  BEFORE INSERT ON public.withdraw_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_withdraw_request();

-- 7. Função auxiliar para pegar resumo financeiro
CREATE OR REPLACE FUNCTION public.get_salon_financial_summary(p_salon_id UUID)
RETURNS TABLE (
  total_earnings DECIMAL(10,2),
  available_balance DECIMAL(10,2),
  pending_amount DECIMAL(10,2),
  paid_amount DECIMAL(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Total ganho (histórico completo)
  SELECT COALESCE(SUM(amount_to_salon), 0)
  INTO total_earnings
  FROM public.haircut_history
  WHERE salon_id = p_salon_id;

  -- Saques pendentes
  SELECT COALESCE(SUM(amount), 0)
  INTO pending_amount
  FROM public.withdraw_requests
  WHERE salon_id = p_salon_id
  AND status = 'pending';

  -- Saques pagos
  SELECT COALESCE(SUM(amount), 0)
  INTO paid_amount
  FROM public.withdraw_requests
  WHERE salon_id = p_salon_id
  AND status = 'paid';
  
  -- Saldo disponível = Total Ganho - (Pendentes + Aprovados + Pagos)
  -- Note que aprovados também deduzem do saldo disponível pois já estão comprometidos
  available_balance := public.get_salon_balance(p_salon_id);

  RETURN NEXT;
END;
$$;
