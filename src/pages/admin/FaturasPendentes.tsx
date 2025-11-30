import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
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
            const pc = Number(pl.price || 0);
            const amt = Number(p.amount || 0);
            return pc === Math.round(amt * 100) || Math.round(pc / 100) === Math.round(amt);
          }) || null;
          // Try to find subscription whose plan price matches payment amount
          let chosenSub: any = null;
          if (Array.isArray(subs)) {
            for (const s of subs) {
              const pl = byId.get(String(s.plan_id));
              if (pl && Number(pl.price) === Number(p.amount)) { chosenSub = s; break; }
            }
            // fallback to latest if none matched
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
                    <div className="text-xs text-muted-foreground">{
                      new Date(r.created_at).toLocaleString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                      })
                    }</div>
                  </div>
                  <div className="mt-1">Usuário: {r.profile?.full_name || r.profile?.name || "--"}</div>
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
                  <div className="mt-2 text-xs text-muted-foreground">Aprovação não necessária. Processamento automático após pagamento.</div>
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
