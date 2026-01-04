-- Enum para roles de usuário
CREATE TYPE public.app_role AS ENUM ('admin', 'subscriber', 'salon');

-- Enum para status de assinatura
CREATE TYPE public.subscription_status AS ENUM ('active', 'inactive', 'cancelled', 'pending');

-- Tabela de perfis de usuários
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  cpf TEXT,
  birth_date DATE,
  phone TEXT,
  cep TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de roles de usuários (separada por segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'subscriber',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Tabela de salões/barbearias
CREATE TABLE public.salons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cnpj TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  is_approved BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  commission_rate DECIMAL(5,2) DEFAULT 80.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de planos de assinatura
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  credits_per_month INTEGER NOT NULL,
  duration_days INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserir planos padrão
INSERT INTO public.plans (name, description, price, credits_per_month) VALUES
  ('Básico', '2 cortes por mês', 59.99, 2),
  ('Popular', '3 cortes por mês', 79.99, 3),
  ('Premium', '4 cortes por mês', 159.99, 4);

-- Tabela de assinaturas
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  salon_id UUID NOT NULL REFERENCES public.salons(id),
  status subscription_status DEFAULT 'pending',
  current_credits INTEGER DEFAULT 0,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de pagamentos
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.subscriptions(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_method TEXT DEFAULT 'pix',
  external_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de códigos de corte (temporários)
CREATE TABLE public.haircut_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  is_used BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de histórico de cortes
CREATE TABLE public.haircut_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id),
  salon_id UUID NOT NULL REFERENCES public.salons(id),
  validated_by UUID REFERENCES auth.users(id),
  code_used TEXT,
  amount_to_salon DECIMAL(10,2),
  amount_to_platform DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de repasses aos salões
CREATE TABLE public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id),
  amount DECIMAL(10,2) NOT NULL,
  haircuts_count INTEGER DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Logs financeiros gerais
CREATE TABLE public.financial_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haircut_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haircut_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_logs ENABLE ROW LEVEL SECURITY;

-- Função para verificar role do usuário
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função para obter role do usuário
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Trigger para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Usuário')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'subscriber'));
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_salons_updated_at
  BEFORE UPDATE ON public.salons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Profiles: usuários veem próprio perfil, admin vê todos
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- User Roles: admin pode ver todas as roles
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Planos são públicos para leitura
CREATE POLICY "Plans are viewable by everyone" ON public.plans
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage plans" ON public.plans
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Salões: donos veem próprio salão, admin vê todos, assinantes veem salões aprovados
CREATE POLICY "Salon owners can view own salon" ON public.salons
  FOR SELECT USING (
    owner_id = auth.uid() OR 
    public.has_role(auth.uid(), 'admin') OR
    (is_approved = true AND is_active = true)
  );

CREATE POLICY "Salon owners can update own salon" ON public.salons
  FOR UPDATE USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can create salon" ON public.salons
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Assinaturas: usuário vê própria, dono do salão vê do seu salão, admin vê todas
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (
    user_id = auth.uid() OR 
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM public.salons WHERE id = salon_id AND owner_id = auth.uid())
  );

CREATE POLICY "Users can create own subscriptions" ON public.subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Subscription updates" ON public.subscriptions
  FOR UPDATE USING (
    user_id = auth.uid() OR 
    public.has_role(auth.uid(), 'admin')
  );

-- Pagamentos
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create payments" ON public.payments
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Códigos de corte: assinante vê próprios, dono do salão pode validar
CREATE POLICY "Haircut codes select" ON public.haircut_codes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.subscriptions WHERE id = subscription_id AND user_id = auth.uid()) OR
    public.has_role(auth.uid(), 'salon') OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Subscribers can create codes" ON public.haircut_codes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.subscriptions WHERE id = subscription_id AND user_id = auth.uid())
  );

CREATE POLICY "Salon can update codes" ON public.haircut_codes
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'salon') OR
    public.has_role(auth.uid(), 'admin')
  );

-- Histórico de cortes
CREATE POLICY "View haircut history" ON public.haircut_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.subscriptions WHERE id = subscription_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.salons WHERE id = salon_id AND owner_id = auth.uid()) OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Salon can insert haircut history" ON public.haircut_history
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.salons WHERE id = salon_id AND owner_id = auth.uid()) OR
    public.has_role(auth.uid(), 'admin')
  );

-- Repasses: dono do salão vê próprios, admin vê todos
CREATE POLICY "Salon owners view own payouts" ON public.payouts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.salons WHERE id = salon_id AND owner_id = auth.uid()) OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admin manages payouts" ON public.payouts
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Logs financeiros: apenas admin
CREATE POLICY "Admin views financial logs" ON public.financial_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System inserts financial logs" ON public.financial_logs
  FOR INSERT WITH CHECK (true);