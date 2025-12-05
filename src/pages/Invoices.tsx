import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Home } from "lucide-react";

type PaymentRow = { id: string; amount: number; currency: string; status: string; created_at: string; provider: string | null; provider_payment_id: string | null };
type SubscriptionRow = { id: string; plan_id: string | null; status: string; current_period_start?: string | null; current_period_end: string | null };
type PlanRow = { id?: string; name: string; price: number; interval: string | null; monthly_credits: number | null; description?: string | null };

const Invoices = () => {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [paidPayments, setPaidPayments] = useState<PaymentRow[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [planName, setPlanName] = useState<string | null>(null);
  const [planPriceCents, setPlanPriceCents] = useState<number | null>(null);
  const [planInterval, setPlanInterval] = useState<string | null>(null);
  const [planCredits, setPlanCredits] = useState<number | null>(null);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) { setLoading(false); return; }
      let subPlanPriceLocal: number = 0;
      const { data: sub } = await supabase
        .from("user_subscriptions")
        .select("id, plan_id, status, current_period_start, current_period_end")
        .eq("user_id", uid)
        .in("status", ["active", "approved", "trialing", "pending"]) 
        .order("current_period_end", { ascending: false })
        .maybeSingle();
      const subRow = (sub as SubscriptionRow | null) || null;
      setSubscription(subRow);
      if (subRow?.plan_id) {
        const { data: plan } = await supabase
          .from("plans")
          .select("name,price,interval,monthly_credits,description")
          .eq("id", subRow.plan_id)
          .maybeSingle();
        const pr = (plan as PlanRow | null);
        setPlanName(pr?.name || null);
        setPlanPriceCents(toCents((pr as any)?.price));
        setPlanInterval(pr?.interval || null);
        setPlanCredits(typeof pr?.monthly_credits === "number" ? Number(pr?.monthly_credits) : null);
        subPlanPriceLocal = toCents((pr as any)?.price);
      } else {
        setPlanName(null);
        setPlanPriceCents(null);
        setPlanInterval(null);
        setPlanCredits(null);
      }
      const { data: plansActive } = await supabase
        .from("plans")
        .select("id,name,price,interval,monthly_credits,description")
        .eq("active", true);
      setPlans(((plansActive || []) as PlanRow[]));
      const { data: pays } = await supabase
        .from("payments")
        .select("id, amount, currency, status, created_at, provider, provider_payment_id")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(6);
      const list = ((pays || []) as PaymentRow[]);
      const hasPendingPayment = list.some((x) => String(x.status || "").toLowerCase() === "pending");
      const isSubPending = subRow && String(subRow.status || "").toLowerCase() === "pending";
      if (!hasPendingPayment && isSubPending) {
        const cents = subPlanPriceLocal || (typeof planPriceCents === "number" ? Number(planPriceCents) : 0);
        const synthetic: PaymentRow = {
          id: "subscription_pending",
          amount: cents,
          currency: "BRL",
          status: "pending",
          created_at: new Date().toISOString(),
          provider: null,
          provider_payment_id: "subscription_pending",
        };
        setPayments([synthetic, ...list]);
      } else {
        setPayments(list);
      }

      const { data: paysPaid } = await supabase
        .from("payments")
        .select("id, amount, currency, status, created_at, provider, provider_payment_id")
        .eq("user_id", uid)
        .in("status", ["approved"]) 
        .order("created_at", { ascending: false })
        .limit(12);
      setPaidPayments(((paysPaid || []) as PaymentRow[]));
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
                  .select("name,price,interval,monthly_credits,description")
                  .eq("id", next.plan_id)
                  .maybeSingle()
                  .then(({ data }) => {
                    const pr = (data as PlanRow | null);
                    setPlanName(pr?.name || null);
                    setPlanPriceCents(typeof pr?.price === "number" ? pr?.price : null);
                    setPlanInterval(pr?.interval || null);
                    setPlanCredits(typeof pr?.monthly_credits === "number" ? Number(pr?.monthly_credits) : null);
                  });
              } else {
                setPlanName(null);
                setPlanPriceCents(null);
                setPlanInterval(null);
                setPlanCredits(null);
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
                  .select("name,price,interval,monthly_credits,description")
                  .eq("id", next.plan_id)
                  .maybeSingle()
                  .then(({ data }) => {
                    const pr = (data as PlanRow | null);
                    setPlanName(pr?.name || null);
                    setPlanPriceCents(typeof pr?.price === "number" ? pr?.price : null);
                    setPlanInterval(pr?.interval || null);
                    setPlanCredits(typeof pr?.monthly_credits === "number" ? Number(pr?.monthly_credits) : null);
                  });
              } else {
                setPlanName(null);
                setPlanPriceCents(null);
                setPlanInterval(null);
                setPlanCredits(null);
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
      const byId = subscription?.plan_id && Array.isArray(plans) ? plans.find((pl) => String(pl.id) === String(subscription!.plan_id)) : null;
      const priceCents = typeof planPriceCents === "number" ? Number(planPriceCents) : (byId?.price ? Number(byId.price) : 0);
      const amount = Math.round(((priceCents / 100) * 100)) / 100;
      const { data, error } = await supabase.functions.invoke("user-create-checkout", { body: { subscription_id: subscription.id, plan_name: planName || byId?.name || "Assinatura", amount } });
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

  const resolvePlanName = (amountCents: number) => {
    const fallbackPlans: PlanRow[] = [
      { name: "Social", price: 5999, interval: "month", monthly_credits: 2, description: "2 cortes/mês" },
      { name: "Popular", price: 7999, interval: "month", monthly_credits: 3, description: "3 cortes/mês" },
      { name: "Premium", price: 9999, interval: "month", monthly_credits: 4, description: "corte profissional" },
    ];
    if (!Array.isArray(plans) || plans.length === 0) {
      const cents = Math.round(Number(amountCents) || 0);
      const byFallback = fallbackPlans.find((pl) => Math.round(Number(pl.price) || 0) === cents);
      return byFallback?.name || planName || null;
    }
    const cents = Math.round(Number(amountCents) || 0);
    const byExactCents = plans.find((pl) => {
      let c = toCents((pl as any)?.price);
      for (let i = 0; i < 3; i++) { if (c >= 100000) c = Math.round(c / 100); }
      return c === cents;
    });
    if (byExactCents) return byExactCents.name;
    const byReal = plans.find((pl) => toCents((pl as any)?.price) === cents);
    if (byReal?.name) return byReal.name;
    const byFallback = fallbackPlans.find((pl) => Math.round(Number(pl.price) || 0) === cents);
    return byFallback?.name || planName || null;
  };

  const planTitleFor = (amountCents: number) => {
    const cents = Math.round(Number(amountCents) || 0);
    let match: PlanRow | null = null;
    const fallbackPlans: PlanRow[] = [
      { name: "Social", price: 5999, interval: "month", monthly_credits: 2, description: "2 cortes/mês" },
      { name: "Popular", price: 7999, interval: "month", monthly_credits: 3, description: "3 cortes/mês" },
      { name: "Premium", price: 9999, interval: "month", monthly_credits: 4, description: "corte profissional" },
    ];
    if (Array.isArray(plans) && plans.length) {
      if (cents > 0) {
        match = plans.find((pl) => {
          let c = toCents((pl as any)?.price);
          for (let i = 0; i < 3; i++) { if (c >= 100000) c = Math.round(c / 100); }
          return c === cents;
        }) || null;
      }
      if (!match && subscription?.plan_id) {
        match = plans.find((pl) => String(pl.id) === String(subscription.plan_id)) || null;
      }
    }
    if (!match && cents > 0) {
      match = fallbackPlans.find((pl) => Math.round(Number(pl.price) || 0) === cents) || null;
    }
    const name = match?.name || planName || "Plano";
    const intervalLabel = (match?.interval || planInterval) === "year" ? "ano" : "mês";
    const creditsLabel = typeof match?.monthly_credits === "number" ? ` • ${match?.monthly_credits} cortes/mês` : "";
    const descLabel = match?.description ? ` • ${String(match.description)}` : "";
    const note = name === "Social"
      ? " • corte simples degradê"
      : name === "Popular"
      ? " • corte simples + sobrancelhas"
      : name === "Premium"
      ? " • corte profissional + sobrancelha + barba"
      : "";
    return `${name} • ${intervalLabel}${creditsLabel}${descLabel || note}`;
  };

  const effectiveAmountCents = (p: PaymentRow) => {
    const amt = Number(p.amount || 0);
    if (amt > 0) return amt;
    if (typeof planPriceCents === "number") return Number(planPriceCents);
    if (subscription?.plan_id && Array.isArray(plans) && plans.length) {
      const pr = plans.find((x) => String(x.id) === String(subscription.plan_id));
      if (pr) {
        let c = toCents((pr as any)?.price);
        for (let i = 0; i < 3; i++) { if (c >= 100000) c = Math.round(c / 100); }
        return c;
      }
    }
    return 0;
  };

  const isActiveSubscription = (s: SubscriptionRow | null) => {
    if (!s) return false;
    const st = String(s.status || "").toLowerCase();
    if (!["approved", "active", "trialing"].includes(st)) return false;
    const now = new Date();
    const start = s.current_period_start ? new Date(String(s.current_period_start)) : null;
    const end = s.current_period_end ? new Date(String(s.current_period_end)) : null;
    if (start && end) return now >= start && now <= end;
    if (end) return now <= end;
    return false;
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
            <CardDescription>
              {(() => {
                const byId = subscription?.plan_id && Array.isArray(plans) ? plans.find((pl) => String(pl.id) === String(subscription!.plan_id)) : null;
                const headerName = planName || byId?.name || (typeof planPriceCents === "number" ? resolvePlanName(planPriceCents) : null) || "Plano";
                const priceCents = typeof planPriceCents === "number" ? Number(planPriceCents) : (byId?.price ? Number(byId.price) : 0);
                const intervalLabel = (planInterval || byId?.interval) === "year" ? "ano" : "mês";
                if (priceCents > 0) {
                  try {
                    const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((priceCents || 0) / 100);
                    return `Plano: ${headerName} • Valor: ${brl}/${intervalLabel}`;
                  } catch {
                    const v = (priceCents || 0) / 100;
                    return `Plano: ${headerName} • Valor: R$ ${v.toFixed(2).replace('.', ',')}/${intervalLabel}`;
                  }
                }
                return `Plano: ${headerName} • ${intervalLabel}`;
              })()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {subscription ? (
                  <>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                        ["approved", "active", "trialing"].includes(String(subscription.status || "").toLowerCase())
                          ? "bg-green-100 text-green-700"
                          : String(subscription.status || "").toLowerCase() === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {String(subscription.status || "").toLowerCase() === "active" ? "Assinatura ativa" : String(subscription.status || "")}
                    </span>
                    {(() => {
                      const showCredits = isActiveSubscription(subscription) && typeof planCredits === "number" && planCredits > 0;
                      return showCredits ? (
                        <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700">{planCredits} cortes/mês</span>
                      ) : null;
                    })()}
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
              {payments.slice(0, 3).map((p) => (
                <div key={p.id} className="rounded-md border-2 bg-card p-4 text-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{planTitleFor(effectiveAmountCents(p))}</div>
                  </div>
                  <div className="mt-2">
                    {(() => {
                      try {
                        const amt = effectiveAmountCents(p);
                    const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((amt || 0) / 100);
                        return <div className="font-semibold">{brl} <span className="text-xs text-muted-foreground">{p.currency}</span></div>;
                      } catch {
                        const v = (effectiveAmountCents(p) || 0) / 100;
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

        <Card className="mt-6 border-2 hover:shadow-lg transition-shadow">
          <CardHeader className="bg-primary/5 rounded-md">
            <CardTitle>Faturas Pagas</CardTitle>
            <CardDescription>Comprovantes e detalhes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {paidPayments.map((p) => (
                <div key={p.id} className="rounded-md border-2 bg-card p-4 text-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{planTitleFor(effectiveAmountCents(p))}</div>
                  </div>
                  <div className="mt-2">
                    {(() => {
                      try {
                        const amt = effectiveAmountCents(p);
                        const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((amt || 0) / 100);
                        return <div className="font-semibold">{brl} <span className="text-xs text-muted-foreground">{p.currency}</span></div>;
                      } catch {
                        const v = (effectiveAmountCents(p) || 0) / 100;
                        return <div className="font-semibold">R$ {v.toFixed(2).replace('.', ',')} <span className="text-xs text-muted-foreground">{p.currency}</span></div>;
                      }
                    })()}
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-green-100 text-green-700">paga</span>
                    <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
                  </div>
                  <Button variant="outline" className="mt-3 w-full" onClick={() => sendWhatsapp(p)}>Enviar comprovante via WhatsApp</Button>
                </div>
              ))}
              {!paidPayments.length && (
                <div className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">Nenhuma fatura paga ainda</div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Invoices;
  const toCents = (v: unknown) => {
    const s = String(v ?? "0").replace(/,/g, ".");
    const n = Number(s);
    if (!Number.isFinite(n) || n <= 0) return 0;
    const hasDot = s.includes(".");
    const fractionalNonZero = hasDot && !/\.0+$/.test(s);
    return fractionalNonZero ? Math.round(n * 100) : Math.round(n);
  };
