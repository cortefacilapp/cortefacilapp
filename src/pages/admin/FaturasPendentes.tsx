import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CreditCard, Mail, CalendarDays, Receipt, DollarSign, BadgeCheck, XCircle } from "lucide-react";
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
  profile?: { id: string; full_name?: string | null; name?: string | null; email: string; role?: string | null } | null;
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

const toCents = (v: unknown) => {
  const s = String(v ?? "0").replace(/,/g, ".");
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const hasDot = s.includes(".");
  const fractionalNonZero = hasDot && !/\.0+$/.test(s);
  return fractionalNonZero ? Math.round(n * 100) : Math.round(n);
};

const normalizeCents = (c: number) => {
  let x = Math.round(Number(c) || 0);
  for (let i = 0; i < 3; i++) { if (x >= 100000) x = Math.round(x / 100); }
  return x;
};

const priceCentsFor = (r: Row) => {
  const base = Math.round(Number(r.amount) || 0);
  if (base > 0) return normalizeCents(base);
  const planRaw = r.plan?.price ? toCents(r.plan!.price) : 0;
  return normalizeCents(planRaw);
};

const formatBRLFromCents = (cents: number) => {
  const num = (Math.round(Number(cents) || 0) / 100);
  try { return `${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num)} BRL`; } catch { return `R$ ${num.toFixed(2)} BRL`; }
};

const FaturasPendentes = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const approve = async (r: Row) => {
    if (approvingId) return;
    setApprovingId(r.id);
    try {
      const body: Record<string, unknown> = { user_id: r.user_id, payment_id: r.id };
      if (r.subscription_id) body.subscription_id = r.subscription_id;
      if (r.plan_id) body.plan_id = r.plan_id;
      try {
        const { data, error } = await supabase.functions.invoke("approve-user-subscription", { body });
        if (error || !(data && (data as any).ok)) {
          throw new Error(error?.message || "falha_edge_function");
        }
      } catch {
        // Fallback local: ativa assinatura e aprova último pagamento pendente
        const now = new Date();
        const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        if (r.subscription_id) {
          await supabase
            .from("user_subscriptions")
            .update({ status: "active", current_period_start: now.toISOString(), current_period_end: end.toISOString() })
            .eq("id", r.subscription_id);
        } else if (r.plan_id) {
          // tenta localizar assinatura existente por usuário+plano, senão cria
          const { data: sub } = await supabase
            .from("user_subscriptions")
            .select("id")
            .eq("user_id", r.user_id)
            .eq("plan_id", r.plan_id)
            .order("created_at", { ascending: false })
            .maybeSingle();
          if (sub?.id) {
            await supabase
              .from("user_subscriptions")
              .update({ status: "active", current_period_start: now.toISOString(), current_period_end: end.toISOString() })
              .eq("id", sub.id);
          } else {
            await supabase
              .from("user_subscriptions")
              .insert({ user_id: r.user_id, plan_id: r.plan_id, status: "active", current_period_start: now.toISOString(), current_period_end: end.toISOString() });
          }
        }
        // Aprova a fatura específica clicada
        const gross = priceCentsFor(r);
        const platform_amount = Math.round(gross * 0.2);
        const salon_amount = gross - platform_amount;
        await supabase
          .from("payments")
          .update({ status: "approved", platform_amount, salon_amount })
          .eq("id", r.id);
      }
      toast.success("Fatura aprovada");
      setRows((prev) => prev.filter((x) => x.id !== r.id));
    } catch (e: any) {
      toast.error(e?.message || "Erro ao aprovar");
    } finally {
      setApprovingId(null);
    }
  };

  const reject = async (r: Row) => {
    if (rejectingId) return;
    setRejectingId(r.id);
    try {
      const { error } = await supabase
        .from("payments")
        .update({ status: "rejected", provider_payment_id: r.provider_payment_id || "rejected_admin" })
        .eq("id", r.id);
      if (error) {
        toast.error(error.message || "Erro ao reprovar");
        return;
      }
      toast.success("Fatura reprovada");
      setRows((prev) => prev.filter((x) => x.id !== r.id));
    } catch (e: any) {
      toast.error(e?.message || "Erro ao reprovar");
    } finally {
      setRejectingId(null);
    }
  };

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
          const [{ data: profile }, { data: subs }] = await Promise.all([
            supabase.from("profiles").select("id,full_name,name,email,role").eq("id", p.user_id).maybeSingle(),
            supabase
              .from("user_subscriptions")
              .select("id,plan_id,status,created_at")
              .eq("user_id", p.user_id)
              .order("created_at", { ascending: false }),
          ]);
          const byId = new Map<string, any>();
          (plansList || []).forEach((pl: any) => byId.set(String(pl.id), pl));
          const byAmount = (plansList || []).find((pl: any) => {
            const pc = toCents(pl.price);
            const amt = Math.round(Number(p.amount || 0));
            return pc === amt;
          }) || null;
          // Try to find subscription whose plan price matches payment amount
          let chosenSub: any = null;
          if (Array.isArray(subs)) {
            for (const s of subs) {
              const pl = byId.get(String(s.plan_id));
              const pc = pl ? toCents(pl.price) : 0;
              const amt = Math.round(Number(p.amount || 0));
              if (pl && pc === amt) { chosenSub = s; break; }
            }
            if (!chosenSub && subs.length) chosenSub = subs[0];
          }
          let plan: { id: string; name: string; price: number; interval?: string | null; monthly_credits?: number | null } | null = null;
          if (chosenSub?.plan_id) {
            const pl = byId.get(String(chosenSub.plan_id));
            plan = pl || null;
          }
          // Prefer plan resolved by payment amount to garantir exibição correta
          if (!plan) plan = byAmount as any;
          else if (byAmount && Number((plan as any).price) !== Number(p.amount)) plan = byAmount as any;
          return { ...p, profile: profile || null, plan: plan || null, plan_id: chosenSub?.plan_id || (plan as any)?.id || null, subscription_id: chosenSub?.id || null } as Row;
        })
      );
      const onlyCommon = enriched.filter((r) => {
        const role = (r.profile?.role as string) || "customer";
        return role !== "admin" && role !== "salon_owner";
      });
      const ids = onlyCommon.map((r) => r.user_id).filter(Boolean);
      let out = onlyCommon;
      if (ids.length) {
        const { data: contacts } = await supabase.rpc("user_contacts_for_users", { p_ids: ids });
        const nameMap = new Map<string, string>();
        const emailMap = new Map<string, string>();
        (contacts || []).forEach((n: any) => {
          if (n && n.user_id) {
            nameMap.set(String(n.user_id), String(n.full_name || ""));
            emailMap.set(String(n.user_id), String(n.email || ""));
          }
        });
        out = onlyCommon.map((r) => {
          const dn = nameMap.get(r.user_id);
          const em = emailMap.get(r.user_id);
          const prof = r.profile || { id: r.user_id, email: r.user_id };
          return { ...r, profile: { ...prof, full_name: dn || prof.full_name || prof.name || null, email: em || prof.email } } as Row;
        });
      }
      setRows(out);
      setLoading(false);
    };
    load();
  }, []);

  // Removido seletor de planos: aprovação usa plano já vinculado ao pagamento/assinatura

  // Aprovação manual removida: pagamentos comuns não exigem ação do admin

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      (r.profile?.email || "").toLowerCase().includes(q) ||
      (r.plan?.name || "").toLowerCase().includes(q) ||
      (r.provider_payment_id || "").toLowerCase().includes(q)
    );
  }, [query, rows]);

  const pendingCount = rows.length;
  const pendingTotal = useMemo(() => rows.reduce((acc, r) => {
    const base = Number(r.amount || 0);
    if (base > 0) return acc + base;
    const planPrice = r.plan?.price ? Number(r.plan!.price) : 0;
    return acc + (planPrice > 0 ? planPrice : 0);
  }, 0), [rows]);
  const providersDistinct = useMemo(() => new Set(rows.map((r) => String(r.provider || "").toLowerCase()).filter(Boolean)).size, [rows]);

  return (
    <div className="space-y-8">
      <div className="rounded-xl bg-gradient-to-br from-[#0A1A2F] to-[#1A73E8] p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">Faturas Pendentes</div>
            <div className="text-white/80">Análise e aprovação de pagamentos</div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm">
              <Receipt className="h-4 w-4" />
              <span>{pendingCount} pendentes</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2 border-2">
            <CardHeader>
              <CardTitle>Lista</CardTitle>
              <CardDescription>Buscar por email, plano ou comprovante</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por email, plano ou código" />
              </div>
              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((r) => (
                  <Card key={r.id} className="overflow-hidden border-2 transition hover:scale-[1.01]">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-lg">
                        <span className="inline-flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          {r.plan?.name || (r.provider?.toUpperCase() || "Pagamento")}
                        </span>
                        <span className="text-primary">{formatBRLFromCents(priceCentsFor(r)).replace(/\s*BRL$/, "")}</span>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(r.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{r.profile?.email || r.user_id}</span>
                      </div>
                      <div className="mt-1 text-sm">Usuário: {r.profile?.full_name || r.profile?.name || "--"}</div>
                      <div className="mt-1 text-sm">Comprovante: {r.provider_payment_id || "--"}</div>
                      {r.plan?.name ? (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {(() => {
                            const price = formatBRLFromCents(priceCentsFor(r)).replace(/\s*BRL$/, "");
                            const intervalLabel = r.plan!.interval === "year" ? "ano" : "mês";
                            const credits = r.plan!.monthly_credits ? `${r.plan!.monthly_credits} cortes/mês` : "";
                            return `Plano: ${r.plan!.name} • ${price}/${intervalLabel}${credits ? " • " + credits : ""}`;
                          })()}
                        </div>
                      ) : null}
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button onClick={() => approve(r)} disabled={approvingId === r.id}>
                          <BadgeCheck className="mr-2 h-4 w-4" /> Aprovar
                        </Button>
                        <Button variant="destructive" onClick={() => reject(r)} disabled={rejectingId === r.id}>
                          <XCircle className="mr-2 h-4 w-4" /> Reprovar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {!filtered.length && (
                  <div className="text-sm text-muted-foreground">Nenhuma fatura pendente</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
              <CardDescription>Métricas rápidas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Total pendentes</span>
                  <span className="font-medium">{pendingCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Valor total</span>
                  <span className="font-medium">{(() => {
                    const totalCents = rows.reduce((acc, r) => acc + priceCentsFor(r), 0);
                    const num = totalCents / 100;
                    try { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num); } catch { return `R$ ${num.toFixed(2)}`; }
                  })()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Provedores distintos</span>
                  <span className="font-medium">{providersDistinct}</span>
                </div>
              </div>
              <div className="mt-4 rounded-xl border p-4 bg-muted/40 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Estimativa repasse salões</div>
                  <div className="text-2xl font-bold">{(() => {
                    const totalCents = rows.reduce((acc, r) => acc + priceCentsFor(r), 0);
                    const salonCents = Math.round(totalCents * 0.8);
                    const num = salonCents / 100;
                    try { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num); } catch { return `R$ ${num.toFixed(2)}`; }
                  })()}</div>
                </div>
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FaturasPendentes;
