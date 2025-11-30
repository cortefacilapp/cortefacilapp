import { useEffect, useMemo, useState } from "react";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Scissors, CheckCircle, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface OwnerDashboardProps {
  user: User;
}

const OwnerDashboard = ({ user }: OwnerDashboardProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [monthTotal, setMonthTotal] = useState<number>(0);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      try {
        const pid = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID || "";
        if (pid) localStorage.removeItem(`sb-${pid}-auth-token`);
        localStorage.removeItem("sb-qowmhahuuuxugtcgdryl-auth-token");
      } catch (_) {}
      toast.success("Logout realizado com sucesso!");
      navigate("/auth");
    } catch (error: any) {
      toast.error("Erro ao fazer logout");
    } finally {
      setLoading(false);
    }
  };

  const handleConsumeCode = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.info("Funcionalidade em desenvolvimento");
  };

  useEffect(() => {
    const loadMonthPayout = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData?.user?.id;
        if (!uid) return;
        const { data: salon } = await supabase.from("salons").select("id").eq("owner_id", uid).maybeSingle();
        if (!salon?.id) return;
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // Backfill visit_logs do mês
        await supabase
          .rpc("backfill_visit_logs_for_salon", { p_salon: salon.id, p_start: startDate.toISOString(), p_end: endDate.toISOString() })
          .catch(() => {});

        // Primeiro: somar visit_logs via RPC segura
        const { data: totalsRow } = await supabase.rpc("salon_totals_for_period", {
          p_salon: salon.id,
          p_start: startDate.toISOString(),
          p_end: endDate.toISOString(),
        });
        if (totalsRow && Array.isArray(totalsRow) && totalsRow.length) {
          const gross = Number(totalsRow[0]?.amount || 0);
          setMonthTotal(Math.round(gross * 100));
          return;
        }

        // Segundo: somar visit_logs direto
        const { data: logs } = await supabase
          .from("visit_logs")
          .select("amount, created_at, visited_at")
          .eq("salon_id", salon.id);
        const l = (logs || []).filter((it: any) => {
          const d = it.created_at ? new Date(it.created_at) : it.visited_at ? new Date(it.visited_at) : null;
          return d && d >= startDate && d <= endDate;
        });
        if (l.length) {
          const gross = l.reduce((acc: number, it: any) => acc + Number(it.amount || 0), 0);
          setMonthTotal(Math.round(gross * 100));
          return;
        }

        // Terceiro: calcular pelos códigos usados + planos (preço em centavos)
        const { data: usedCodes } = await supabase
          .from("codes")
          .select("id, user_id, used_at, used, status")
          .eq("used_by_salon_id", salon.id)
          .gte("used_at", startDate.toISOString())
          .lte("used_at", endDate.toISOString())
          .or("status.eq.used,used.eq.true");
        const list = usedCodes || [];
        let grossDec = 0;
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
              return d && d >= startDate && d <= endDate;
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
            grossDec += perVisit;
          }
        }
        setMonthTotal(Math.round(grossDec * 100));
      } catch (_) {
        setMonthTotal(0);
      }
    };
    loadMonthPayout();
  }, [user.id]);

  useEffect(() => {
    const subRealtime = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) return;
      const { data: salon } = await supabase.from("salons").select("id").eq("owner_id", uid).maybeSingle();
      if (!salon?.id) return;
      const channel = supabase
        .channel(`owner-realtime-${salon.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "visit_logs", filter: `salon_id=eq.${salon.id}` }, () => {
          // trigger reload
          setMonthTotal((v) => v);
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "codes", filter: `used_by_salon_id=eq.${salon.id}` }, () => {
          setMonthTotal((v) => v);
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    };
    subRealtime();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Scissors className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">CorteFácil - Painel do Salão</span>
          </div>
          <Button variant="outline" onClick={handleSignOut} disabled={loading}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Painel do Salão</h1>
          <p className="text-muted-foreground">Gerencie códigos e visualize relatórios</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Validate Code Card */}
          <Card className="border-2 border-primary lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Validar Código do Cliente
              </CardTitle>
              <CardDescription>Digite o código fornecido pelo cliente</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleConsumeCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Código</Label>
                  <Input
                    id="code"
                    placeholder="Digite o código aqui"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-gradient-primary">
                  Validar e Consumir
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Earnings Card */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Repasses
              </CardTitle>
              <CardDescription>Seus ganhos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-primary">R$ {(monthTotal / 100).toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">este mês</p>
                <Button className="mt-4 w-full" variant="outline">
                  Ver Detalhes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Validations */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Códigos Validados Recentemente</CardTitle>
            <CardDescription>Histórico de validações</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Nenhum código validado ainda
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default OwnerDashboard;
