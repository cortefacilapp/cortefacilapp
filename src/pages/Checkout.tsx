import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Copy, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";

export default function Checkout() {
  const { planId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<any>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!user) {
      toast.error("Você precisa estar logado para assinar.");
      navigate("/login");
      return;
    }
    fetchPlan();
  }, [user, planId]);

  // Poll for payment status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (paymentData && paymentData.status === 'pending') {
      interval = setInterval(checkPaymentStatus, 5000);
    }
    return () => clearInterval(interval);
  }, [paymentData]);

  const fetchPlan = async () => {
    try {
      // First try to find by ID (UUID)
      let { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('id', planId)
        .single();

      // If not found by ID, try to find by name (for backward compatibility/seeding)
      if (!data) {
        // Fallback: Check if we passed a plan name or if we need to seed
        // For now, let's assume planId is a UUID. If not found, show error.
        console.error("Plan not found");
      }

      if (error) throw error;
      setPlan(data);
    } catch (error) {
      console.error("Error fetching plan:", error);
      toast.error("Plano não encontrado.");
      navigate("/planos");
    } finally {
      setLoading(false);
    }
  };

  const createPayment = async () => {
    setProcessing(true);
    try {
      // Use local proxy path to avoid CORS issues
      const response = await fetch("/api/mp/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_MERCADO_PAGO_ACCESS_TOKEN || "APP_USR-975584341823172-071915-00f48f8c37f8a370020c33087c915415-1141410279"}`,
          "X-Idempotency-Key": `${user?.id}_${plan.id}_${Date.now()}`
        },
        body: JSON.stringify({
          transaction_amount: Number(plan.price),
          description: `Assinatura ${plan.name} - Corte Fácil`,
          payment_method_id: "pix",
          payer: {
            email: user?.email,
            first_name: user?.user_metadata?.full_name?.split(" ")[0] || "Cliente",
            last_name: user?.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "CorteFácil"
          },
          external_reference: `${user?.id}_${plan.id}_${Date.now()}`
        })
      });

      const data = await response.json();
      
      if (data.status === "pending" || data.status === "created") {
        setPaymentData({
          id: data.id,
          status: data.status,
          qr_code: data.point_of_interaction.transaction_data.qr_code,
          qr_code_base64: data.point_of_interaction.transaction_data.qr_code_base64,
          ticket_url: data.point_of_interaction.transaction_data.ticket_url
        });
        toast.success("PIX gerado com sucesso!");
      } else {
        toast.error("Erro ao gerar pagamento: " + (data.message || "Tente novamente."));
      }
    } catch (error) {
      console.error("Error creating payment:", error);
      toast.error("Erro ao conectar com Mercado Pago.");
    } finally {
      setProcessing(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!paymentData?.id) return;
    setVerifying(true);

    try {
      // Use local proxy path to avoid CORS issues
      const response = await fetch(`/api/mp/v1/payments/${paymentData.id}`, {
        headers: {
          "Authorization": `Bearer ${import.meta.env.VITE_MERCADO_PAGO_ACCESS_TOKEN || "APP_USR-975584341823172-071915-00f48f8c37f8a370020c33087c915415-1141410279"}`
        }
      });
      const data = await response.json();

      if (data.status === "approved") {
        setPaymentData(prev => ({ ...prev, status: "approved" }));
        await activateSubscription(data);
      }
    } catch (error) {
      console.error("Error checking status:", error);
    } finally {
      setVerifying(false);
    }
  };

  const activateSubscription = async (paymentInfo: any) => {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (plan.duration_days || 30));

      // 1. Create or Update Subscription
      let subId;
      
      // Check if user already has a subscription (active or not)
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (existingSub) {
        // Update existing subscription
        const { data: updatedSub, error: updateError } = await supabase
          .from('subscriptions')
          .update({
            plan_id: plan.id,
            status: 'active',
            current_credits: plan.credits_per_month,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSub.id)
          .select()
          .single();

        if (updateError) throw updateError;
        subId = updatedSub.id;
      } else {
        // Create new subscription
        const { data: newSub, error: insertError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: user?.id,
            plan_id: plan.id,
            status: 'active',
            current_credits: plan.credits_per_month,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString()
          })
          .select()
          .single();

        if (insertError) throw insertError;
        subId = newSub.id;
      }

      // 2. Record Payment
      const { error: payError } = await supabase
        .from('payments')
        .insert({
          user_id: user?.id,
          subscription_id: subId,
          plan_id: plan.id,
          amount: paymentInfo.transaction_amount,
          status: 'completed',
          payment_method: 'pix',
          transaction_id: paymentInfo.id.toString()
        });

      if (payError) {
        // Log error but don't fail the whole process since subscription is active
        console.error("Error recording payment:", payError);
      }

      toast.success("Assinatura ativada com sucesso!");
      
      // Force redirect to dashboard
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);
      
    } catch (error) {
      console.error("Error activating subscription:", error);
      toast.error("Erro ao ativar assinatura. Entre em contato com o suporte.");
    }
  };

  const copyPixCode = () => {
    if (paymentData?.qr_code) {
      navigator.clipboard.writeText(paymentData.qr_code);
      toast.success("Código PIX copiado!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!plan) return null;

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-4">
             <Button variant="ghost" size="sm" onClick={() => navigate("/planos")}>
               <ArrowLeft className="w-4 h-4 mr-2" />
               Voltar
             </Button>
          </div>
          <CardTitle className="text-2xl font-display">Checkout</CardTitle>
          <CardDescription>Finalize sua assinatura do plano {plan.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-between items-center p-4 bg-secondary/20 rounded-lg">
            <div>
              <p className="font-semibold text-lg">{plan.name}</p>
              <p className="text-sm text-muted-foreground">{plan.credits_per_month} cortes / mês</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-xl text-primary">R$ {plan.price.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Mensal</p>
            </div>
          </div>

          {!paymentData ? (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground">
                <p>Ao continuar, você concorda com os termos de serviço e a cobrança recorrente.</p>
              </div>
              <Button 
                className="w-full h-12 text-lg font-semibold" 
                onClick={createPayment}
                disabled={processing}
              >
                {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Pagar com PIX"}
              </Button>
            </div>
          ) : paymentData.status === 'approved' ? (
             <div className="text-center space-y-4 py-6">
               <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                 <CheckCircle2 className="w-8 h-8" />
               </div>
               <h3 className="text-xl font-bold text-green-700">Pagamento Aprovado!</h3>
               <p className="text-muted-foreground">Sua assinatura já está ativa.</p>
               <Button className="w-full" onClick={() => navigate("/dashboard")}>
                 Ir para Dashboard
               </Button>
             </div>
          ) : (
            <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Escaneie o QR Code</h3>
                <p className="text-sm text-muted-foreground">Abra o app do seu banco e pague via PIX</p>
              </div>
              
              <div className="flex justify-center p-4 bg-white rounded-lg shadow-sm border mx-auto w-fit">
                <QRCodeSVG value={paymentData.qr_code} size={200} />
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Ou copie e cole o código abaixo:</p>
                <div className="flex gap-2">
                  <Button variant="outline" className="w-full font-mono text-xs truncate justify-start" onClick={copyPixCode}>
                    {paymentData.qr_code.substring(0, 20)}...
                  </Button>
                  <Button variant="secondary" size="icon" onClick={copyPixCode}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                {verifying && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Aguardando pagamento...</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
