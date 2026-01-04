import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { 
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

interface Salon {
  id: string;
  name: string;
  is_approved: boolean;
  commission_rate: number;
}

export function SalonValidate() {
  const { user } = useAuth();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [validating, setValidating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSalonData();
    }
  }, [user]);

  const fetchSalonData = async () => {
    if (!user) return;

    try {
      const { data: salonData, error: salonError } = await supabase
        .from('salons')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (salonError) {
        console.error('Salon error:', salonError);
        return;
      }

      setSalon(salonData);
    } catch (err) {
      console.error('Error fetching salon data:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateCode = async () => {
    if (!codeInput || codeInput.length !== 5) {
      toast.error("Código deve ter 5 dígitos");
      return;
    }

    if (!salon) {
      toast.error("Salão não encontrado");
      return;
    }

    setValidating(true);

    try {
      // Find the code
      const { data: codeData, error: codeError } = await supabase
        .from('haircut_codes')
        .select(`
          *,
          subscription:subscriptions(
            *,
            plan:plans(price, credits_per_month)
          )
        `)
        .eq('code', codeInput)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (codeError || !codeData) {
        toast.error("Código inválido ou expirado");
        return;
      }

      // Check if subscription is for this salon
      if (codeData.subscription.salon_id !== salon.id) {
        toast.error("Este código não é válido para este salão");
        return;
      }

      // Check if subscription has credits
      if (codeData.subscription.current_credits <= 0) {
        toast.error("Cliente sem créditos disponíveis");
        return;
      }

      // Calculate amounts
      const planPrice = codeData.subscription.plan.price;
      const creditsPerMonth = codeData.subscription.plan.credits_per_month;
      const pricePerHaircut = planPrice / creditsPerMonth;
      const amountToSalon = pricePerHaircut * (salon.commission_rate / 100);
      const amountToPlatform = pricePerHaircut - amountToSalon;

      // Mark code as used
      await supabase
        .from('haircut_codes')
        .update({ is_used: true })
        .eq('id', codeData.id);

      // Decrement credits
      await supabase
        .from('subscriptions')
        .update({ 
          current_credits: codeData.subscription.current_credits - 1 
        })
        .eq('id', codeData.subscription_id);

      // Create haircut history record
      await supabase
        .from('haircut_history')
        .insert({
          subscription_id: codeData.subscription_id,
          salon_id: salon.id,
          validated_by: user?.id,
          code_used: codeInput,
          amount_to_salon: amountToSalon,
          amount_to_platform: amountToPlatform,
        });

      toast.success("Corte validado com sucesso!");
      setCodeInput("");
    } catch (err) {
      console.error('Validation error:', err);
      toast.error("Erro ao validar código");
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h1 className="font-display text-3xl mb-4">SALÃO NÃO ENCONTRADO</h1>
        <p className="text-muted-foreground">
          Entre em contato com o suporte se você acredita que isso é um erro.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="font-display text-4xl mb-2">VALIDAR CORTE</h1>
      </div>

      <Card className="bg-gradient-card border-primary/30 glow-gold-sm">
        <CardHeader>
          <CardTitle className="font-display text-2xl">INSERIR CÓDIGO</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-md mx-auto">
            <p className="text-muted-foreground mb-6 text-center">
              Digite o código de 5 dígitos apresentado pelo cliente
            </p>
            <div className="flex gap-4">
              <Input
                type="text"
                placeholder="00000"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 5))}
                className="h-14 text-center text-2xl font-mono tracking-[0.5em] bg-background/50"
                maxLength={5}
              />
              <Button
                variant="hero"
                size="lg"
                onClick={validateCode}
                disabled={validating || codeInput.length !== 5 || !salon.is_approved}
                className="px-8"
              >
                {validating ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </Button>
            </div>
            {!salon.is_approved && (
              <p className="text-sm text-yellow-500 mt-4 text-center">
                Seu salão precisa ser aprovado antes de validar cortes
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
