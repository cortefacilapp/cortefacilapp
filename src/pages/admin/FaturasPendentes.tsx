import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  provider: string | null;
  provider_payment_id: string | null;
  plan_id?: string | null;
  subscription_id?: string | null;
  profile?: { id: string; name?: string | null; email: string; role?: string | null } | null;
  plan?: { id: string; name: string; price: number; interval?: string | null; monthly_credits?: number | null } | null;
};

type PaymentRow = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  provider: string | null;
  provider_payment_id: string | null;
};

type PlanInfo = { id: string; name: string; price: number; interval: string | null; monthly_credits: number | null };

const FaturasPendentes = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: plansList } = await supabase
        .from("plans")
        .select("id,name,price,interval,monthly_credits")
        .eq("active", true);
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) { toast.error("Erro ao carregar faturas pendentes"); setLoading(false); return; }
      const base = (data || []) as PaymentRow[];
      const enriched: Row[] = await Promise.all(
        base.map(async (p) => {
          const [{ data: profile }, { data: sub }] = await Promise.all([
            supabase.from("profiles").select("id,name,email,role").eq("id", p.user_id).maybeSingle(),
            supabase
              .from("user_subscriptions")
              .select("id,plan_id,status,created_at")
              .eq("user_id", p.user_id)
              .order("created_at", { ascending: false })
              .maybeSingle(),
          ]);
          let plan: { id: string; name: string; price: number; interval?: string | null; monthly_credits?: number | null } | null = null;
          if (sub?.plan_id) {
            const { data: planData } = await supabase
              .from("plans")
              .select("id,name,price,interval,monthly_credits")
              .eq("id", sub.plan_id)
              .maybeSingle();
            plan = planData || null;
          } else {
            const matched = (plansList || []).find((pl: any) => Number(pl.price) === Number(p.amount));
            plan = matched || null;
          }
          return { ...p, profile: profile || null, plan: plan || null, plan_id: sub?.plan_id || (plan as any)?.id || null, subscription_id: sub?.id || null } as Row;
        })
      );
      const onlyCommon = enriched.filter((r) => {
        const role = (r.profile?.role as string) || "customer";
        return role !== "admin" && role !== "salon_owner";
      });
      setRows(onlyCommon);
      setLoading(false);
    };
    load();
  }, []);

  // Removido seletor de planos: aprovação usa plano já vinculado ao pagamento/assinatura

  const approve = async (r: Row) => {
    const planId = r.plan?.id || null;
    if (!r.subscription_id && !planId) { toast.error("Fatura sem plano vinculado"); return; }
    setApprovingId(r.id);
    try {
      const { error } = await supabase.functions.invoke("approve-user-subscription", {
        body: r.subscription_id ? { subscription_id: r.subscription_id } : { user_id: r.user_id, plan_id: planId },
      });
      if (error) throw error;
      toast.success("Plano aprovado");
      setRows((prev) => prev.filter((x) => x.id !== r.id));
    } catch (e: any) {
      try {
        const now = new Date();
        const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        let subId = r.subscription_id || null;
        if (!subId) {
          const { data: created, error: createErr } = await supabase
            .from("user_subscriptions")
            .insert({ user_id: r.user_id, plan_id: planId, status: "active", current_period_start: now.toISOString(), current_period_end: end.toISOString() })
            .select("id")
            .maybeSingle();
          if (createErr) throw createErr;
          subId = created?.id || null;
        } else {
          const { error: updErr } = await supabase
            .from("user_subscriptions")
            .update({ status: "active", current_period_start: now.toISOString(), current_period_end: end.toISOString() })
            .eq("id", subId);
          if (updErr) throw updErr;
        }
        const gross = Number(r.amount) || 0;
        const platform_amount = Math.round(gross * 0.2);
        const salon_amount = gross - platform_amount;
        const { error: payErr } = await supabase
          .from("payments")
          .update({ status: "approved", platform_amount, salon_amount })
          .eq("id", r.id);
        if (payErr) throw payErr;
        toast.success("Plano aprovado (fallback)");
        setRows((prev) => prev.filter((x) => x.id !== r.id));
      } catch (err2: any) {
        toast.error(err2?.message || e?.message || "Erro ao aprovar");
      }
    } finally {
      setApprovingId(null);
    }
  };

  const filtered = rows.filter((r) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (r.profile?.email || "").toLowerCase().includes(q) ||
      (r.plan?.name || "").toLowerCase().includes(q) ||
      (r.provider_payment_id || "").toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Faturas Pendentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por email, plano ou código" />
            </div>
            <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((r) => (
                <div key={r.id} className="rounded border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{r.plan?.name || (r.provider?.toUpperCase() || "Pagamento")} • R$ {(Number(r.amount) / 100).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                  </div>
                  <div className="mt-1">Usuário: {r.profile?.name || "--"}</div>
                  <div className="text-xs text-muted-foreground">Email: {r.profile?.email || r.user_id}</div>
                  <div className="mt-1">Comprovante: {r.provider_payment_id || "--"}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {r.plan?.name
                      ? (() => {
                          const price = (Number(r.plan!.price) / 100).toFixed(2);
                          const intervalLabel = r.plan!.interval === "year" ? "ano" : "mês";
                          const credits = r.plan!.monthly_credits ? `${r.plan!.monthly_credits} cortes/mês` : "";
                          return `Plano: ${r.plan!.name} • R$ ${price}/${intervalLabel}${credits ? " • " + credits : ""}`;
                        })()
                      : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                    <Button onClick={() => approve(r)} disabled={approvingId === r.id}>
                      <CheckCircle className="mr-2 h-4 w-4" /> Aprovar
                    </Button>
                    <Button variant="outline" className="text-primary border-primary" disabled>
                      Pendente
                    </Button>
                  </div>
                </div>
              ))}
              {!filtered.length && (
                <div className="text-sm text-muted-foreground">Nenhuma fatura pendente</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FaturasPendentes;
