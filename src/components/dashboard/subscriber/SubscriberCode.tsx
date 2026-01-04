import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Copy, Check, Scissors } from "lucide-react";
import { toast } from "sonner";

interface Subscription {
  id: string;
  current_credits: number;
}

interface HaircutCode {
  id: string;
  code: string;
  expires_at: string;
  is_used: boolean;
}

export function SubscriberCode() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [currentCode, setCurrentCode] = useState<HaircutCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('id, current_credits')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (subError && subError.code !== 'PGRST116') throw subError;
      setSubscription(subData);

      if (subData) {
        const { data: codeData } = await supabase
          .from('haircut_codes')
          .select('*')
          .eq('subscription_id', subData.id)
          .eq('is_used', false)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        setCurrentCode(codeData);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
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
      const code = Math.floor(10000 + Math.random() * 90000).toString();
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

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);
    return minutes > 0 ? `${minutes} min` : "Expirado";
  };

  if (loading) return <div className="text-center py-10">Carregando...</div>;

  if (!subscription) {
    return <div className="text-center py-10">Você precisa de uma assinatura ativa para gerar códigos.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Scissors className="w-8 h-8 text-primary" />
        <h1 className="font-display text-3xl">Gerar Código</h1>
      </div>

      <Card className="bg-gradient-card border-primary/30 glow-gold-sm max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="font-display text-2xl text-center">CÓDIGO PARA CORTE</CardTitle>
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
