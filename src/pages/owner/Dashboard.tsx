import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const OwnerDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [salon, setSalon] = useState<any | null>(null);
  const [validations, setValidations] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [computedTotals, setComputedTotals] = useState<{ gross: number; platform: number; salon: number }>({ gross: 0, platform: 0, salon: 0 });

  const displayNameFor = (u: any) => {
    const s = (u && u.full_name) || "";
    if (typeof s === "string" && s.trim()) return s;
    return "—";
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) {
        setLoading(false);
        return;
      }
      const { data: s } = await supabase.from("salons").select("id,name,status").eq("owner_id", uid).maybeSingle();
      setSalon(s || null);
      if (s?.id) {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const cycleStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Backfill visit logs para este salão/mês (ignora erro retornado)
        {
          const { error: bfErr } = await supabase.rpc("backfill_visit_logs_for_salon", {
            p_salon: s.id,
            p_start: start.toISOString(),
            p_end: end.toISOString(),
          });
          // opcionalmente logar bfErr
        }

        // Calcular usando visit_logs do mês corrente
        const { data: totalsRow, error: totalsErr } = await supabase.rpc("salon_totals_for_period", {
          p_salon: s.id,
          p_start: start.toISOString(),
          p_end: end.toISOString(),
        });
        if (!totalsErr && totalsRow && Array.isArray(totalsRow) && totalsRow.length) {
          const gross = Number(totalsRow[0]?.amount || 0);
          const platform = Number(totalsRow[0]?.platform_amount || 0);
          const salonAmt = Number(totalsRow[0]?.salon_amount || 0);
          setComputedTotals({ gross, platform, salon: salonAmt });
        } else {
          const { data: logs } = await supabase
            .from("visit_logs")
            .select("amount, salon_amount, platform_amount, created_at, visited_at")
            .eq("salon_id", s.id);
          const l = (logs || []).filter((it: any) => {
            const d = it.created_at ? new Date(it.created_at) : it.visited_at ? new Date(it.visited_at) : null;
            if (!d) return false;
            return d >= start && d <= end;
          });
          if (l.length) {
            const gross = l.reduce((acc: number, it: any) => acc + Number(it.amount || 0), 0);
            const platform = l.reduce((acc: number, it: any) => acc + Number(it.platform_amount || 0), 0);
            const salonAmt = l.reduce((acc: number, it: any) => acc + Number(it.salon_amount || 0), 0);
            setComputedTotals({ gross, platform, salon: salonAmt });
          } else {
            const { data: usedCodes } = await supabase
              .from("codes")
              .select("id, user_id, used_at, used, status")
              .eq("used_by_salon_id", s.id)
              .gte("used_at", start.toISOString())
              .lte("used_at", end.toISOString())
              .or("status.eq.used,used.eq.true");
            const list = usedCodes || [];
            let gross = 0;
            for (const c of list) {
              const usedAt = c.used_at ? new Date(c.used_at) : null;
              const { data: uSub } = await supabase
                .from("user_subscriptions")
                .select("plan_id,status,current_period_start,current_period_end")
                .eq("user_id", c.user_id)
                .eq("status", "active")
                .order("current_period_end", { ascending: false })
                .maybeSingle();
              let planId: string | null = uSub?.plan_id || null;
              if (!planId) {
                const { data: pay } = await supabase
                  .from("payments")
                  .select("amount,status,created_at")
                  .eq("user_id", c.user_id)
                  .in("status", ["approved", "pending"]) as any;
                const within = (pay || []).filter((p: any) => {
                  const d = p.created_at ? new Date(p.created_at) : null;
                  return d && d >= start && d <= end;
                });
            if (within.length) {
              const { data: plans } = await supabase
                .from("plans")
                .select("id,price,monthly_credits,cuts_per_month,active");
              const amt = Number(within[0].amount || 0);
              const byAmount = (plans || []).find((pl: any) => {
                const pc = Number(pl.price || 0);
                return pc === Math.round(amt * 100) || Math.round(pc / 100) === Math.round(amt);
              });
              planId = byAmount?.id || null;
            }
              }
              if (!planId) continue;
              if (usedAt) {
                const ps = uSub.current_period_start ? new Date(uSub.current_period_start) : null;
                const pe = uSub.current_period_end ? new Date(uSub.current_period_end) : null;
                if (ps && pe && (usedAt < ps || usedAt > pe)) {
                  continue;
                }
              }
              const { data: plan } = await supabase
                .from("plans")
                .select("price,monthly_credits,cuts_per_month")
                .eq("id", planId)
                .maybeSingle();
              const credits = Number((plan as any)?.monthly_credits ?? (plan as any)?.cuts_per_month ?? 1) || 1;
              const priceCents = Number((plan as any)?.price ?? 0);
              if (priceCents > 0 && credits > 0) {
                const perVisit = Math.round((((priceCents / 100) / credits) * 100)) / 100;
                gross += perVisit;
              }
            }
            const platform = Math.round(gross * 0.2 * 100) / 100;
            const salonAmt = gross - platform;
            setComputedTotals({ gross, platform, salon: salonAmt });
          }
        }

        const { data: p } = await supabase
          .from("payouts")
          .select("amount, status, paid_at")
          .eq("salon_id", s.id)
          .order("paid_at", { ascending: false });
        setPayouts(p || []);

        const { data: userData } = await supabase.auth.getUser();
        const ownerId = userData?.user?.id || null;
        if (ownerId) {
          const { data: aff } = await supabase.rpc("affiliates_for_owner", { p_owner: ownerId });
          setAffiliates(aff || []);
        } else {
          setAffiliates([]);
        }
      }
      setLoading(false);
    };
    load();
    return () => {};
  }, []);

  useEffect(() => {
    if (!salon?.id) return;
    const channel = supabase
      .channel(`owner-dashboard-${salon.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "visit_logs", filter: `salon_id=eq.${salon.id}` },
        async () => {
          const now = new Date();
          const start = new Date(now.getFullYear(), now.getMonth(), 1);
          const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          const { data: totalsRow } = await supabase.rpc("salon_totals_for_period", {
            p_salon: salon.id,
            p_start: start.toISOString(),
            p_end: end.toISOString(),
          });
          if (totalsRow && Array.isArray(totalsRow) && totalsRow.length) {
            const gross = Number(totalsRow[0]?.amount || 0);
            const platform = Number(totalsRow[0]?.platform_amount || 0);
            const salonAmt = Number(totalsRow[0]?.salon_amount || 0);
            setComputedTotals({ gross, platform, salon: salonAmt });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "codes", filter: `used_by_salon_id=eq.${salon.id}` },
        async () => {
          const now = new Date();
          const start = new Date(now.getFullYear(), now.getMonth(), 1);
          const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          const { data: usedCodes } = await supabase
            .from("codes")
            .select("id, user_id, used_at, used, status")
            .eq("used_by_salon_id", salon.id)
            .gte("used_at", start.toISOString())
            .lte("used_at", end.toISOString())
            .or("status.eq.used,used.eq.true");
          const list = usedCodes || [];
          let gross = 0;
          for (const c of list) {
            const usedAt = c.used_at ? new Date(c.used_at) : null;
            const { data: uSub } = await supabase
              .from("user_subscriptions")
              .select("plan_id,status,current_period_start,current_period_end")
              .eq("user_id", c.user_id)
              .eq("status", "active")
              .order("current_period_end", { ascending: false })
              .maybeSingle();
            let planId: string | null = uSub?.plan_id || null;
            if (!planId) {
              const { data: pay } = await supabase
                .from("payments")
                .select("amount,status,created_at")
                .eq("user_id", c.user_id)
                .in("status", ["approved", "pending"]) as any;
              const within = (pay || []).filter((p: any) => {
                const d = p.created_at ? new Date(p.created_at) : null;
                return d && d >= start && d <= end;
              });
              if (within.length) {
                const { data: plans } = await supabase
                  .from("plans")
                  .select("id,price,monthly_credits,cuts_per_month,active");
                const byAmount = (plans || []).find((pl: any) => Number(pl.price) === Number(within[0].amount));
                planId = byAmount?.id || null;
              }
            }
            if (!planId) continue;
            if (usedAt) {
              const ps = uSub?.current_period_start ? new Date(uSub.current_period_start) : null;
              const pe = uSub?.current_period_end ? new Date(uSub.current_period_end) : null;
              if (ps && pe && (usedAt < ps || usedAt > pe)) {
                continue;
              }
            }
            const { data: plan } = await supabase
              .from("plans")
              .select("price,monthly_credits,cuts_per_month")
              .eq("id", planId)
              .maybeSingle();
            const credits = Number((plan as any)?.monthly_credits ?? (plan as any)?.cuts_per_month ?? 1) || 1;
            const priceCents = Number((plan as any)?.price ?? 0);
            if (priceCents > 0 && credits > 0) {
              const perVisit = Math.round((((priceCents / 100) / credits) * 100)) / 100;
              gross += perVisit;
            }
          }
          const platform = Math.round(gross * 0.2 * 100) / 100;
          const salonAmt = gross - platform;
          setComputedTotals({ gross, platform, salon: salonAmt });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [salon?.id]);

  useEffect(() => {
    const computeFromAffiliates = async () => {
      if (!salon?.id) return;
      if (!affiliates?.length) return;
      if (computedTotals.gross > 0) return;
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      let gross = 0;
      for (const u of affiliates) {
        const usedCount = Number(u.used_count || 0);
        if (!usedCount) continue;
        const { data: uSub } = await supabase
          .from("user_subscriptions")
          .select("plan_id,status,current_period_start,current_period_end")
          .eq("user_id", u.user_id || u.id)
          .eq("status", "active")
          .order("current_period_end", { ascending: false })
          .maybeSingle();
        let planId: string | null = uSub?.plan_id || null;
        if (!planId) {
          const { data: pay } = await supabase
            .from("payments")
            .select("amount,status,created_at")
            .eq("user_id", u.user_id || u.id)
            .in("status", ["approved", "pending"]) as any;
          const within = (pay || []).filter((p: any) => {
            const d = p.created_at ? new Date(p.created_at) : null;
            return d && d >= start && d <= end;
          });
          if (within.length) {
            const { data: plans } = await supabase
              .from("plans")
              .select("id,price,monthly_credits,cuts_per_month,active");
            const amt = Number(within[0].amount || 0);
            const byAmount = (plans || []).find((pl: any) => {
              const pc = Number(pl.price || 0);
              return pc === Math.round(amt * 100) || Math.round(pc / 100) === Math.round(amt);
            });
            planId = byAmount?.id || null;
          }
        }
        if (!planId) continue;
        const { data: plan } = await supabase
          .from("plans")
          .select("price,monthly_credits,cuts_per_month")
          .eq("id", planId)
          .maybeSingle();
        const credits = Number((plan as any)?.monthly_credits ?? (plan as any)?.cuts_per_month ?? 1) || 1;
        const priceCents = Number((plan as any)?.price ?? 0);
        if (priceCents > 0 && credits > 0) {
          const perVisit = Math.round((((priceCents / 100) / credits) * 100)) / 100;
          gross += perVisit * usedCount;
        }
      }
      const platform = Math.round(gross * 0.2 * 100) / 100;
      const salonAmt = gross - platform;
      setComputedTotals({ gross, platform, salon: salonAmt });
    };
    computeFromAffiliates();
  }, [salon?.id, affiliates, computedTotals.gross]);

  const totals = useMemo(() => {
    const monthValidations = computedTotals.gross;
    const platformShare = computedTotals.platform;
    const salonShare = computedTotals.salon;
    const pendingPayouts = payouts.filter((p) => p.status === "pending").reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const paidPayouts = payouts.filter((p) => p.status === "paid").reduce((acc, p) => acc + Number(p.amount || 0), 0);
    return { monthValidations, platformShare, salonShare, pendingPayouts, paidPayouts };
  }, [computedTotals, payouts]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Salão</CardTitle>
          <CardDescription>{salon?.status || "--"}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-bold">{salon?.name || "--"}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Total de validações (mês)</CardTitle>
          <CardDescription>Bruto acumulado</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">R$ {totals.monthValidations.toFixed(2)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Seu saldo (80%)</CardTitle>
          <CardDescription>Após taxa da plataforma</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">R$ {totals.salonShare.toFixed(2)}</p>
        </CardContent>
      </Card>
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>Repasses</CardTitle>
          <CardDescription>Recebidos e pendentes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded border p-3">
              <div className="text-sm text-muted-foreground">Pendentes</div>
              <div className="text-2xl font-bold">R$ {totals.pendingPayouts.toFixed(2)}</div>
            </div>
            <div className="rounded border p-3">
              <div className="text-sm text-muted-foreground">Recebidos</div>
              <div className="text-2xl font-bold">R$ {totals.paidPayouts.toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>Afiliados do salão (ciclo atual)</CardTitle>
          <CardDescription>Usuários comuns afiliados a este salão</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {affiliates.map((u) => (
              <div key={u.user_id || u.id} className="rounded border p-3">
                <div className="font-medium">{displayNameFor(u)}</div>
                <div className="text-sm text-muted-foreground">Afiliado em: {u.affiliated_at ? new Date(u.affiliated_at).toLocaleDateString() : "--"}</div>
                <div className="text-sm">Validações no ciclo atual: {u.used_count}</div>
              </div>
            ))}
            {!affiliates.length && (
              <div className="text-sm text-muted-foreground">Nenhum usuário afiliado</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerDashboardPage;
