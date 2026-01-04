import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Scissors, CreditCard, Calendar, RefreshCw, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface Subscription {
  id: string;
  current_credits: number;
  status: string;
  start_date: string;
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

interface HaircutCode {
  id: string;
  code: string;
  expires_at: string;
  is_used: boolean;
}

export function SubscriberDashboard() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [currentCode, setCurrentCode] = useState<HaircutCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copied, setCopied] = useState(false);

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

      // Fetch active code
      if (data) {
        const { data: codeData } = await supabase
          .from('haircut_codes')
          .select('*')
          .eq('subscription_id', data.id)
          .eq('is_used', false)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        setCurrentCode(codeData);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateCode = async () => {
    if (!subscription) return;

    if (subscription.current_credits <= 0) {
      toast.error("Você não tem créditos disponíveis");
      return;
    }

    setGeneratingCode(true);

    try {
      // Generate a random 5-digit code
      const code = Math.floor(10000 + Math.random() * 90000).toString();
      
      // Set expiration to 30 minutes from now
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30);

      const { data, error } = await supabase
        .from('haircut_codes')
        .insert({
          subscription_id: subscription.id,
          code,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentCode(data);
      toast.success("Código gerado com sucesso!");
    } catch (err) {
      console.error('Error generating code:', err);
      toast.error("Erro ao gerar código");
    } finally {
      setGeneratingCode(false);
    }
  };

  const copyCode = () => {
    if (!currentCode) return;
    navigator.clipboard.writeText(currentCode.code);
    setCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);
    return minutes > 0 ? `${minutes} min` : "Expirado";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto mb-6 flex items-center justify-center">
          <CreditCard className="w-10 h-10 text-primary" />
        </div>
        <h1 className="font-display text-4xl mb-4">VOCÊ AINDA NÃO TEM UMA ASSINATURA</h1>
        <p className="text-muted-foreground mb-8">
          Escolha um plano e comece a aproveitar cortes de cabelo premium todos os meses.
        </p>
        <Button variant="hero" size="lg" asChild>
          <Link to="/planos">Ver Planos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-4xl mb-2">OLÁS, BEM-VINDO!</h1>
        <p className="text-muted-foreground">
          Gerencie sua assinatura e gere códigos para seus cortes
        </p>
      </div>

      {/* Stats Cards */}
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

      {/* Code Generation Section */}
      <Card className="bg-gradient-card border-primary/30 glow-gold-sm">
        <CardHeader>
          <CardTitle className="font-display text-2xl">CÓDIGO PARA CORTE</CardTitle>
        </CardHeader>
        <CardContent>
          {currentCode ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">
                Apresente este código na barbearia
              </p>
              <div className="inline-flex items-center gap-4 bg-background/50 rounded-2xl px-8 py-6 mb-4">
                <span className="font-display text-6xl tracking-[0.3em] text-gold-gradient">
                  {currentCode.code}
                </span>
                <button
                  onClick={copyCode}
                  className="p-3 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  {copied ? (
                    <Check className="w-6 h-6 text-primary" />
                  ) : (
                    <Copy className="w-6 h-6 text-primary" />
                  )}
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                Expira em: {getTimeRemaining(currentCode.expires_at)}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={generateCode}
                disabled={generatingCode}
              >
                {generatingCode ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Gerar Novo Código
              </Button>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-6">
                Você tem {subscription.current_credits} créditos disponíveis. 
                Gere um código para apresentar na barbearia.
              </p>
              <Button
                variant="hero"
                size="lg"
                onClick={generateCode}
                disabled={generatingCode || subscription.current_credits <= 0}
              >
                {generatingCode ? (
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Scissors className="w-5 h-5 mr-2" />
                )}
                Gerar Código
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
