import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Wallet, CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const OwnerDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [salon, setSalon] = useState<any | null>(null);
  const [validations, setValidations] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [computedTotals, setComputedTotals] = useState<{ gross: number; platform: number; salon: number }>({ gross: 0, platform: 0, salon: 0 });
  const [validationsCount, setValidationsCount] = useState<number>(0);
  const [pixKey, setPixKey] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [availableWithdraw, setAvailableWithdraw] = useState<number>(0);
  const brToNumber = (s: string) => {
    const t = String(s || "").replace(/\./g, "").replace(/,/g, ".");
    return Number(t);
  };
  const formatDateBR = (d: Date | null) => (d ? new Intl.DateTimeFormat("pt-BR").format(d) : "");
  const formatBRLInput = (s: string) => {
    const digits = String(s || "").replace(/\D/g, "");
    const len = digits.length;
    if (!len) return "";
    let intPart = digits.slice(0, Math.max(len - 2, 0));
    const decPart = digits.slice(Math.max(len - 2, 0));
    // remove zeros à esquerda mantendo pelo menos um zero quando vazio
    intPart = (intPart || "").replace(/^0+(?!$)/, "");
    if (!intPart) intPart = "0";
    // agrupar milhares da direita para a esquerda
    const intFmt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${intFmt},${decPart.padStart(2, "0")}`;
  };
  const withdrawAmtNum = useMemo(() => brToNumber(withdrawAmount), [withdrawAmount]);

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

        // Contagem de validações (visit_logs) no ciclo
        {
          const { count: vcount } = await supabase
            .from("visit_logs")
            .select("id", { count: "exact" })
            .eq("salon_id", s.id)
            .gte("created_at", start.toISOString())
            .lte("created_at", end.toISOString());
          setValidationsCount(Number(vcount || 0));
        }

        const { data: p } = await supabase
          .from("payouts")
          .select("amount, status, paid_at")
          .eq("salon_id", s.id)
          .order("paid_at", { ascending: false });
        setPayouts(p || []);
        {
          const now2 = new Date();
          const cs = new Date(now2.getFullYear(), now2.getMonth(), 1);
          const ce = new Date(now2.getFullYear(), now2.getMonth() + 1, 0, 23, 59, 59);
          const avail = (p || [])
            .filter((it: any) => {
              const st = String(it.status || "").toLowerCase();
              const ps = it.period_start ? new Date(it.period_start) : null;
              const pe = it.period_end ? new Date(it.period_end) : null;
              return st === "pending" && ps && pe && ps >= cs && pe <= ce;
            })
            .reduce((acc: number, it: any) => acc + Number(it.amount || 0), 0);
          setAvailableWithdraw(avail);
        }

        const { data: userData } = await supabase.auth.getUser();
        const ownerId = userData?.user?.id || null;
        if (ownerId) {
          const { data: aff } = await supabase.rpc("affiliates_for_owner", { p_owner: ownerId });
          if (aff && Array.isArray(aff) && aff.length) {
            setAffiliates(aff);
          } else {
            const startCycle = new Date(now.getFullYear(), now.getMonth(), 1);
            const endCycle = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            const { data: ua } = await supabase
              .from("user_affiliations")
              .select("user_id, affiliated_at")
              .eq("salon_id", s.id);
            const base = ua || [];
            const ids = base.map((r: any) => r.user_id).filter(Boolean);
            let contacts: any[] = [];
            if (ids.length) {
              const { data: c } = await supabase.rpc("user_contacts_for_users", { p_ids: ids });
              contacts = c || [];
            }
            const nameById = new Map<string, string>();
            const emailById = new Map<string, string>();
            contacts.forEach((n: any) => {
              if (n && n.user_id) {
                nameById.set(String(n.user_id), String(n.full_name || ""));
                emailById.set(String(n.user_id), String(n.email || ""));
              }
            });
          const detailed = [] as any[];
          for (const r of base) {
            const uid = r.user_id;
            const { count } = await supabase
              .from("codes")
              .select("id", { count: "exact" })
              .eq("user_id", uid)
              .eq("used_by_salon_id", s.id)
              .gte("used_at", startCycle.toISOString())
              .lte("used_at", endCycle.toISOString())
              .or("status.eq.used,used.eq.true");
            let planName = "";
            let planId: string | null = null;
            const { data: subs } = await supabase
              .from("user_subscriptions")
              .select("plan_id,status,current_period_start,current_period_end")
              .eq("user_id", uid)
              .order("current_period_end", { ascending: false })
              .limit(3);
            const nowD = new Date();
            const pick = (subs || []).find((r: any) => {
              const ps = r?.current_period_start ? new Date(String(r.current_period_start)) : null;
              const pe = r?.current_period_end ? new Date(String(r.current_period_end)) : null;
              const st = String(r?.status || "").toLowerCase();
              return ps && pe && nowD >= ps && nowD <= pe && ["active","approved","trialing"].includes(st);
            }) || (subs && subs.length ? subs[0] : null);
            planId = pick?.plan_id || null;
            if (!planId) {
              const { data: pays } = await supabase
                .from("payments")
                .select("amount,status,created_at")
                .eq("user_id", uid)
                .eq("status", "approved");
              const within = (pays || []).filter((p: any) => {
                const d = p?.created_at ? new Date(String(p.created_at)) : null;
                return d && d >= startCycle && d <= endCycle;
              });
              if (within.length) {
                const amt = Number(within[0].amount || 0);
                const { data: plans } = await supabase
                  .from("plans")
                  .select("id,name,price,active")
                  .eq("active", true);
                const byAmount = (plans || []).find((pl: any) => {
                  const pc = Number(pl.price || 0);
                  return pc === Math.round(amt) || Math.round(pc / 100) === Math.round(amt);
                });
                planId = byAmount?.id || null;
                planName = byAmount?.name || "";
              }
            }
            if (planId && !planName) {
              const { data: pinfo } = await supabase
                .from("plans")
                .select("name")
                .eq("id", planId)
                .maybeSingle();
              planName = String((pinfo as any)?.name || "");
            }
            detailed.push({
              user_id: uid,
              affiliated_at: r.affiliated_at,
              used_count: Number(count || 0),
              full_name: nameById.get(uid) || "",
              email: emailById.get(uid) || "",
              plan_name: planName || "",
            });
          }
          setAffiliates(detailed);
          }
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
          const { count: vcount } = await supabase
            .from("visit_logs")
            .select("id", { count: "exact" })
            .eq("salon_id", salon.id)
            .gte("created_at", start.toISOString())
            .lte("created_at", end.toISOString());
          setValidationsCount(Number(vcount || 0));
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
      {
        const usedTotal = affiliates.reduce((acc: number, it: any) => acc + Number(it.used_count || 0), 0);
        if (usedTotal > 0) setValidationsCount(usedTotal);
      }

      // Fallback adicional: nenhum código usado, mas assinaturas ativas no ciclo
      if (gross <= 0) {
        let subsGross = 0;
        for (const u of affiliates) {
          const uid = u.user_id || u.id;
          // Tenta assinatura ativa
          const { data: uSub } = await supabase
            .from("user_subscriptions")
            .select("plan_id,status,current_period_start,current_period_end")
            .eq("user_id", uid)
            .order("current_period_end", { ascending: false })
            .limit(3);
          let planId: string | null = null;
          const nowD = new Date();
          const pick = (uSub || []).find((r: any) => {
            const ps = r?.current_period_start ? new Date(String(r.current_period_start)) : null;
            const pe = r?.current_period_end ? new Date(String(r.current_period_end)) : null;
            const st = String(r?.status || "").toLowerCase();
            return ps && pe && nowD >= ps && nowD <= pe && ["active","approved","trialing"].includes(st);
          }) || (uSub && uSub.length ? uSub[0] : null);
          planId = pick?.plan_id || null;
          if (!planId) {
            // Tenta mapear pelo pagamento aprovado dentro do ciclo
            const { data: pays } = await supabase
              .from("payments")
              .select("amount,status,created_at")
              .eq("user_id", uid)
              .eq("status", "approved");
            const within = (pays || []).filter((p: any) => {
              const d = p?.created_at ? new Date(String(p.created_at)) : null;
              return d && d >= start && d <= end;
            });
            if (within.length) {
              const amt = Number(within[0].amount || 0);
              const { data: planList } = await supabase
                .from("plans")
                .select("id,price,active")
                .eq("active", true);
              const byAmount = (planList || []).find((pl: any) => Number(pl.price || 0) === amt);
              planId = byAmount?.id || null;
            }
          }
          if (!planId) continue;
          const { data: plan } = await supabase
            .from("plans")
            .select("price")
            .eq("id", planId)
            .maybeSingle();
          const priceCents = Number((plan as any)?.price ?? 0);
          const priceBr = Math.round((priceCents / 100) * 100) / 100;
          subsGross += priceBr;
        }
        if (subsGross > 0) {
          const platform2 = Math.round(subsGross * 0.2 * 100) / 100;
          const salon2 = subsGross - platform2;
          setComputedTotals({ gross: subsGross, platform: platform2, salon: salon2 });
        }
      }
    };
    computeFromAffiliates();
  }, [salon?.id, affiliates, computedTotals.gross]);

  const totals = useMemo(() => {
    const monthValidations = computedTotals.gross;
    const platformShare = computedTotals.platform;
    const salonShare = computedTotals.salon;
    const now = new Date();
    const cs = new Date(now.getFullYear(), now.getMonth(), 1);
    const ce = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const pendingPayouts = payouts
      .filter((p) => {
        const st = String(p.status || "").toLowerCase();
        const ps = (p as any).period_start ? new Date((p as any).period_start) : null;
        const pe = (p as any).period_end ? new Date((p as any).period_end) : null;
        return st === "pending" && ps && pe && ps >= cs && pe <= ce;
      })
      .reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const paidPayouts = payouts.filter((p) => p.status === "paid").reduce((acc, p) => acc + Number(p.amount || 0), 0);
    return { monthValidations, platformShare, salonShare, pendingPayouts, paidPayouts };
  }, [computedTotals, payouts]);

  const withdrawWindow = useMemo(() => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    const active = now >= start;
    return { start, end, active };
  }, []);

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
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{validationsCount} validações aceitas</p>
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
          <div className="grid gap-4 md:grid-cols-3 mb-4">
            <div className="rounded-xl border p-4 bg-muted/40 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Disponível</div>
                <div className="text-2xl font-bold">R$ {availableWithdraw.toFixed(2)}</div>
              </div>
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div className="rounded-xl border p-4 bg-muted/40 flex items-center justify-between md:col-span-2">
              <div>
                <div className="text-xs text-muted-foreground">Janela de saque</div>
                <div className="text-sm font-medium flex items-center gap-2"><CalendarDays className="h-4 w-4" />{formatDateBR(withdrawWindow.start)} — {formatDateBR(withdrawWindow.end)}</div>
              </div>
              <span className={withdrawWindow.active ? "inline-flex items-center rounded px-2 py-1 bg-green-100 text-green-700" : "inline-flex items-center rounded px-2 py-1 bg-amber-100 text-amber-700"}>{withdrawWindow.active ? "Ativa" : "Em breve"}</span>
            </div>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            <div className="md:col-span-2">
              <Input placeholder="PIX (CPF/CNPJ) vinculado ao salão" value={pixKey} onChange={(e) => setPixKey(e.target.value)} />
            </div>
            <div className="md:col-span-1">
              <div className="text-xs text-muted-foreground mb-1">Digite o valor do saque em reais (BRL)</div>
              <Input placeholder="Valor do saque (BRL)" type="text" value={withdrawAmount} onChange={(e) => setWithdrawAmount(formatBRLInput(e.target.value))} />
            </div>
            <div className="md:col-span-3 text-sm text-muted-foreground">Disponível para saque: R$ {availableWithdraw.toFixed(2)}</div>
            <div className="md:col-span-1">
              <Button className="w-full" disabled={requesting || !salon?.id || availableWithdraw <= 0 || !pixKey.trim() || withdrawAmtNum <= 0 || withdrawAmtNum > availableWithdraw} onClick={async () => {
                if (!salon?.id) return;
                setRequesting(true);
                const { data, error } = await supabase.rpc("request_withdraw_for_salon", { p_salon: salon.id, p_pix_key: pixKey.trim(), p_amount: withdrawAmtNum });
                if (!error && data?.ok) {
                  toast.success("Solicitação enviada ao admin");
                  setPixKey("");
                  setWithdrawAmount("");
                } else {
                  toast.error(error?.message || String(data?.error || "Falha ao solicitar"));
                }
                setRequesting(false);
              }}>Solicitar Saque</Button>
            </div>
            <div className="md:col-span-3 text-xs text-muted-foreground">Saque disponível somente na última semana de cada mês.</div>
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
                  <div className="text-sm">Plano: {u.plan_name || "--"}</div>
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
