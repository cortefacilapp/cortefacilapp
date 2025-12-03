import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Home } from "lucide-react";

type PaymentRow = { id: string; amount: number; currency: string; status: string; created_at: string; provider: string | null; provider_payment_id: string | null };
type SubscriptionRow = { id: string; plan_id: string | null; status: string; current_period_end: string | null };
type PlanRow = { name: string; price: number; interval: string | null; monthly_credits: number | null };

const Invoices = () => {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [planName, setPlanName] = useState<string | null>(null);
  const [planPriceCents, setPlanPriceCents] = useState<number | null>(null);
  const [planInterval, setPlanInterval] = useState<string | null>(null);
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
        .in("status", ["active", "approved", "trialing"]) 
        .order("current_period_end", { ascending: false })
        .maybeSingle();
      const subRow = (sub as SubscriptionRow | null) || null;
      setSubscription(subRow);
      if (subRow?.plan_id) {
        const { data: plan } = await supabase
          .from("plans")
          .select("name,price,interval,monthly_credits")
          .eq("id", subRow.plan_id)
          .maybeSingle();
        const pr = (plan as PlanRow | null);
        setPlanName(pr?.name || null);
        setPlanPriceCents(typeof pr?.price === "number" ? pr?.price : null);
        setPlanInterval(pr?.interval || null);
      } else {
        setPlanName(null);
        setPlanPriceCents(null);
        setPlanInterval(null);
      }
      const { data: pays } = await supabase
        .from("payments")
        .select("id, amount, currency, status, created_at, provider, provider_payment_id")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(3);
      setPayments(((pays || []) as PaymentRow[]));
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const subRealtime = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) return;
      const ch = supabase
        .channel(`user-subscriptions-invoices-${uid}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "user_subscriptions", filter: `user_id=eq.${uid}` },
          (payload) => {
            const next = (payload.new as SubscriptionRow) || null;
            if (next) {
              setSubscription(next);
              if (next.plan_id) {
                supabase
                  .from("plans")
                  .select("name,price,interval,monthly_credits")
                  .eq("id", next.plan_id)
                  .maybeSingle()
                  .then(({ data }) => {
                    const pr = (data as PlanRow | null);
                    setPlanName(pr?.name || null);
                    setPlanPriceCents(typeof pr?.price === "number" ? pr?.price : null);
                    setPlanInterval(pr?.interval || null);
                  });
              } else {
                setPlanName(null);
                setPlanPriceCents(null);
                setPlanInterval(null);
              }
            }
          },
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "user_subscriptions", filter: `user_id=eq.${uid}` },
          (payload) => {
            const next = (payload.new as SubscriptionRow) || null;
            if (next) {
              setSubscription(next);
              if (next.plan_id) {
                supabase
                  .from("plans")
                  .select("name,price,interval,monthly_credits")
                  .eq("id", next.plan_id)
                  .maybeSingle()
                  .then(({ data }) => {
                    const pr = (data as PlanRow | null);
                    setPlanName(pr?.name || null);
                    setPlanPriceCents(typeof pr?.price === "number" ? pr?.price : null);
                    setPlanInterval(pr?.interval || null);
                  });
              } else {
                setPlanName(null);
                setPlanPriceCents(null);
                setPlanInterval(null);
              }
            }
          },
        )
        .subscribe();
      return () => {
        supabase.removeChannel(ch);
      };
    };
    subRealtime();
  }, []);

  const payNow = async () => {
    if (!subscription?.plan_id) { toast.error("Assine um plano primeiro"); return; }
    try {
      const { data, error } = await supabase.functions.invoke("user-create-checkout", { body: { plan_id: subscription.plan_id } });
      if (error) throw error;
      const init = data?.init_point;
      if (!init) throw new Error("Falha ao iniciar checkout");
      window.location.href = init;
    } catch (err: unknown) {
      const msg = typeof err === "object" && err && "message" in err ? String((err as { message?: unknown }).message) : "Erro ao iniciar pagamento";
      toast.error(msg);
    }
  };

  const sendWhatsapp = (p: PaymentRow) => {
    try {
      const amount = Number(p.amount) / 100;
      const id = p.provider_payment_id || "";
      const label = p.provider?.toLowerCase() === "pix" ? "Chave PIX" : "ID";
      const text = encodeURIComponent(
        `Olá! Envio comprovante do pagamento no valor R$ ${amount.toFixed(2)}. ${label}: ${id}`
      );
      window.location.href = `https://wa.me/5561982152648?text=${text}`;
    } catch (e) {
      toast.error("Erro ao abrir WhatsApp");
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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background">
      <header className="fixed inset-x-0 top-0 z-50 border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="text-xl font-bold">Faturas</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <Home className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Faturas e Pagamentos</h1>
          <p className="text-muted-foreground">Acompanhe sua assinatura e histórico de pagamentos</p>
        </div>

        <Card className="mb-6 border-2 hover:shadow-lg transition-shadow">
          <CardHeader className="bg-primary/5 rounded-md">
            <CardTitle>Assinatura</CardTitle>
            {planName && (
              <CardDescription>
                {(() => {
                  const intervalLabel = planInterval === "year" ? "ano" : "mês";
                  if (typeof planPriceCents === "number") {
                    try {
                      const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((Number(planPriceCents) || 0) / 100);
                      return `Plano: ${planName} • Valor: ${brl}/${intervalLabel}`;
                    } catch {
                      const v = (Number(planPriceCents) || 0) / 100;
                      return `Plano: ${planName} • Valor: R$ ${v.toFixed(2).replace('.', ',')}/${intervalLabel}`;
                    }
                  }
                  return `Plano: ${planName}`;
                })()}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {subscription ? (
                  <>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                        ["approved", "active", "trialing"].includes(subscription.status)
                          ? "bg-green-100 text-green-700"
                          : subscription.status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {subscription.status === "active" ? "Assinatura ativa" : subscription.status}
                    </span>
                    {subscription.current_period_end && (
                      <span className="text-xs">Vence: {new Date(subscription.current_period_end).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
                    )}
                  </>
                ) : (
                  <span>Nenhuma assinatura</span>
                )}
              </div>
              <Button onClick={payNow}>Pagar Mensalidade</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-shadow">
          <CardHeader className="bg-primary/5 rounded-md">
            <CardTitle>Histórico de Faturas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {payments.map((p) => (
                <div key={p.id} className="rounded-md border-2 bg-card p-4 text-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{p.provider?.toUpperCase()}</div>
                    <div className="text-xs text-muted-foreground">{p.provider_payment_id || "--"}</div>
                  </div>
                  <div className="mt-2">
                    {(() => {
                      try {
                        const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((Number(p.amount) || 0) / 100);
                        return <div className="font-semibold">{brl} <span className="text-xs text-muted-foreground">{p.currency}</span></div>;
                      } catch {
                        const v = (Number(p.amount) || 0) / 100;
                        return <div className="font-semibold">R$ {v.toFixed(2).replace('.', ',')} <span className="text-xs text-muted-foreground">{p.currency}</span></div>;
                      }
                    })()}
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                        ["approved", "active"].includes(p.status)
                          ? "bg-green-100 text-green-700"
                          : p.status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : p.status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {p.status}
                    </span>
                    <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
                  </div>
                  <Button variant="outline" className="mt-3 w-full" onClick={() => sendWhatsapp(p)}>Enviar comprovante via WhatsApp</Button>
                </div>
              ))}
              {!payments.length && (
                <div className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">Nenhuma fatura registrada</div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Invoices;
