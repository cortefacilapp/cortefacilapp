import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Invoices = () => {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) { setLoading(false); return; }
      const { data: sub } = await supabase
        .from("user_subscriptions")
        .select("id, plan_id, status, current_period_end")
        .eq("user_id", uid)
        .order("updated_at", { ascending: false })
        .maybeSingle();
      setSubscription(sub || null);
      const { data: pays } = await supabase
        .from("payments")
        .select("id, amount, currency, status, created_at, provider, provider_payment_id")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      setPayments(pays || []);
      setLoading(false);
    };
    load();
  }, []);

  const payNow = async () => {
    if (!subscription?.plan_id) { toast.error("Assine um plano primeiro"); return; }
    try {
      const { data, error } = await supabase.functions.invoke("user-create-checkout", { body: { plan_id: subscription.plan_id } });
      if (error) throw error;
      const init = data?.init_point;
      if (!init) throw new Error("Falha ao iniciar checkout");
      window.location.href = init;
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar pagamento");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed inset-x-0 top-0 z-50 border-b bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))]">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="text-xl font-bold">Faturas</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="text-primary border-primary" onClick={() => navigate("/dashboard")}>Dashboard</Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 pt-20">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Assinatura</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {subscription ? `Status: ${subscription.status}` : "Nenhuma assinatura"}
              </div>
              <Button onClick={payNow}>Pagar Mensalidade</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Faturas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {payments.map((p) => (
                <div key={p.id} className="rounded border p-3 text-sm">
                  <div className="font-medium">{p.provider?.toUpperCase()} • {p.provider_payment_id || "--"}</div>
                  <div>Valor: R$ {(Number(p.amount) / 100).toFixed(2)} {p.currency}</div>
                  <div>Status: {p.status}</div>
                  <div>Data: {new Date(p.created_at).toLocaleString()}</div>
                </div>
              ))}
              {!payments.length && (
                <div className="text-sm text-muted-foreground">Nenhuma fatura registrada</div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Invoices;
