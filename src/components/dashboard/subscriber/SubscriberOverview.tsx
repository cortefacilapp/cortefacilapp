import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Scissors, CreditCard, Calendar, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Subscription {
  id: string;
  current_credits: number;
  status: string;
  end_date: string;
  plan: {
    name: string;
    price: number;
    credits_per_month: number;
  };
  salon: {
    name: string;
  };
}

export function SubscriberOverview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSubscription();
    }
  }, [user]);

  const fetchSubscription = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plan:plans(*),
          salon:salons(name)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', error);
      }

      setSubscription(data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return <div className="text-center py-10">Carregando...</div>;
  }

  if (!subscription) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold mb-4">Bem-vindo!</h2>
        <p className="text-muted-foreground mb-6">Você ainda não possui uma assinatura ativa.</p>
        <Button onClick={() => navigate("/planos")}>Ver Planos</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl mb-2">OLÁ, BEM-VINDO!</h1>
        <p className="text-muted-foreground">
          Visão geral da sua assinatura e créditos.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Créditos Disponíveis
            </CardTitle>
            <Scissors className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-5xl text-gold-gradient">
                {subscription.current_credits}
              </span>
              <span className="text-muted-foreground">
                / {subscription.plan.credits_per_month}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Plano Atual
            </CardTitle>
            <CreditCard className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl">{subscription.plan.name}</div>
            <p className="text-muted-foreground">
              R$ {subscription.plan.price.toFixed(2)}/mês
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Validade
            </CardTitle>
            <Calendar className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl">
              {formatDate(subscription.end_date)}
            </div>
            <p className="text-muted-foreground">
              {subscription.salon.name}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button size="lg" className="w-full md:w-auto" onClick={() => navigate("/dashboard/codigo")}>
          Gerar Código de Corte <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
