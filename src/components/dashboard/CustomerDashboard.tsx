import { useEffect, useState } from "react";
import { format } from "date-fns";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Scissors, QrCode, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CustomerDashboardProps {
  user: User;
}

const CustomerDashboard = ({ user }: CustomerDashboardProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState<string>(user.user_metadata?.name || "");
  type PlanRow = { name: string; price: number; interval?: string | null; monthly_credits?: number | null; cuts_per_month?: number | null };
  const [plan, setPlan] = useState<(PlanRow & { status?: string | null }) | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [affiliationName, setAffiliationName] = useState<string | null>(null);
  type VisitItem = { salonName: string; visitedAt: string; code?: string };
  const [visits, setVisits] = useState<VisitItem[]>([]);

  useEffect(() => {
    const loadName = async () => {
      try {
        const { data: pr } = await supabase
          .from("profiles")
          .select("full_name,name")
          .eq("id", user.id)
          .maybeSingle();
        const meta = user.user_metadata as { full_name?: string; name?: string } | undefined;
        const name = pr?.full_name || pr?.name || meta?.full_name || meta?.name || "";
        setDisplayName(name || user.email || "");
      } catch (_) {
        const meta = user.user_metadata as { full_name?: string; name?: string } | undefined;
        const name = meta?.full_name || meta?.name || "";
        setDisplayName(name || user.email || "");
      }
    };
    loadName();
  }, [user.id]);

  const loadVisits = async () => {
    const { data: vCodes } = await supabase
      .from("codes")
      .select("used_by_salon_id, used_at, code")
      .eq("user_id", user.id)
      .or("status.eq.used,used.eq.true")
      .order("used_at", { ascending: false })
      .limit(10);

    const { data: vLogs } = await supabase
      .from("visit_logs")
      .select("salon_id, visited_at, code")
      .eq("user_id", user.id)
      .order("visited_at", { ascending: false })
      .limit(10);

    const rowsCodes = vCodes || [];
    const rowsLogs = vLogs || [];
    const salonIds = Array.from(new Set([
      ...rowsCodes.map((r: any) => r.used_by_salon_id).filter(Boolean),
      ...rowsLogs.map((r: any) => r.salon_id).filter(Boolean),
    ]));
    let names: Record<string, string> = {};
    if (salonIds.length) {
      const { data: salons } = await supabase
        .from("salons")
        .select("id,name")
        .in("id", salonIds);
      (salons || []).forEach((s: any) => { names[String(s.id)] = String(s.name || "Salão"); });
    }
    const itemsCodes: VisitItem[] = rowsCodes.map((r: any) => ({
      salonName: names[String(r.used_by_salon_id)] || "Salão",
      visitedAt: String(r.used_at || new Date().toISOString()),
      code: r.code ? String(r.code) : undefined,
    }));
    const itemsLogs: VisitItem[] = rowsLogs.map((r: any) => ({
      salonName: names[String(r.salon_id)] || "Salão",
      visitedAt: String(r.visited_at || new Date().toISOString()),
      code: r.code ? String(r.code) : undefined,
    }));
    const items = [...itemsCodes, ...itemsLogs].sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime());
    setVisits(items.slice(0, 10));
  };

  useEffect(() => {
    loadVisits();
  }, [user.id]);

  useEffect(() => {
    const loadPlan = async () => {
      const { data: sub } = await supabase
        .from("user_subscriptions")
        .select("plan_id,status,current_period_start,current_period_end")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("current_period_end", { ascending: false })
        .maybeSingle();
      type SubRow = { plan_id?: string | null; status?: string | null; current_period_start?: string | null; current_period_end?: string | null };
      const subRow = sub as SubRow | null;
      if (subRow?.plan_id) {
          const { data: p } = await supabase
            .from("plans")
            .select("name,price,interval,monthly_credits,cuts_per_month")
            .eq("id", subRow.plan_id)
            .maybeSingle();
          if (p) {
            const pr = p as PlanRow;
            setPlan({ ...pr, status: subRow.status });
            const totalCredits = pr.monthly_credits ?? pr.cuts_per_month ?? null;
            const { data: uc } = await supabase
              .from("user_credits")
              .select("remaining")
              .eq("user_id", user.id)
              .eq("plan_id", subRow.plan_id)
              .eq("period_start", subRow.current_period_start)
              .maybeSingle();
            if (uc?.remaining !== undefined && uc?.remaining !== null) {
              setCredits(Number(uc.remaining));
            } else if (totalCredits !== null) {
              const { count } = await supabase
                .from("codes")
                .select("id", { count: "exact" })
                .eq("user_id", user.id)
                .gte("used_at", subRow.current_period_start as any)
                .lte("used_at", subRow.current_period_end as any)
                .or("status.eq.used,used.eq.true");
              const usedCount = Number(count ?? 0);
              setCredits(Math.max(0, Number(totalCredits) - usedCount));
            }

          // realtime subscription to credits updates
          const ch = supabase.channel("credits_and_codes_updates")
            .on("postgres_changes", {
              event: "UPDATE",
              schema: "public",
              table: "user_credits",
            }, (payload) => {
              const row = (payload.new as { user_id?: string; plan_id?: string; period_start?: string; remaining?: number | null }) || {};
              if (row.user_id === user.id && row.plan_id === subRow?.plan_id && row.period_start === subRow?.current_period_start) {
                const newRemaining = row.remaining;
                if (newRemaining !== undefined && newRemaining !== null) setCredits(Number(newRemaining));
              }
            })
            .on("postgres_changes", {
              event: "UPDATE",
              schema: "public",
              table: "codes",
            }, async (payload) => {
              const row = (payload.new as { user_id?: string; status?: string | null; used?: boolean | null }) || {};
              if (row.user_id === user.id && (row.status === "used" || row.used === true)) {
                const { data: p2 } = await supabase
                  .from("plans")
                  .select("monthly_credits,cuts_per_month")
                  .eq("id", subRow?.plan_id as string)
                  .maybeSingle();
                const totalCredits = (p2 as { monthly_credits?: number | null; cuts_per_month?: number | null } | null)?.monthly_credits ?? (p2 as { monthly_credits?: number | null; cuts_per_month?: number | null } | null)?.cuts_per_month ?? null;
                if (totalCredits !== null) {
                  const { count } = await supabase
                    .from("codes")
                    .select("id", { count: "exact" })
                    .eq("user_id", user.id)
                    .gte("used_at", subRow?.current_period_start as any)
                    .lte("used_at", subRow?.current_period_end as any)
                    .or("status.eq.used,used.eq.true");
                  const usedCount = Number(count ?? 0);
                  setCredits(Math.max(0, Number(totalCredits) - usedCount));
                }
              }
            })
            .subscribe();

          return () => {
            try { ch.unsubscribe(); } catch (_) {}
          };
        }
      }
    };
    loadPlan();
  }, [user.id]);

  useEffect(() => {
    const loadAffiliation = async () => {
      try {
        const { data: aff } = await supabase
          .from("user_affiliations")
          .select("salon_id")
          .eq("user_id", user.id)
          .maybeSingle();
        const sid = aff?.salon_id || null;
        if (sid) {
          const { data: salon } = await supabase
            .from("salons")
            .select("name")
            .eq("id", sid)
            .maybeSingle();
          setAffiliationName(salon?.name || null);
        } else {
          setAffiliationName(null);
        }
      } catch (_) {
        setAffiliationName(null);
      }
    };
    loadAffiliation();
  }, [user.id]);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut({ scope: "local" });
      try {
        const env = (import.meta as unknown as { env?: Record<string, string> }).env || {};
        const pid = String(env.VITE_SUPABASE_PROJECT_ID || "");
        if (pid) localStorage.removeItem(`sb-${pid}-auth-token`);
        // também remove possível token antigo
        localStorage.removeItem("sb-qowmhahuuuxugtcgdryl-auth-token");
      } catch (_) {}
      toast.success("Logout realizado com sucesso!");
      navigate("/auth");
    } catch (error: any) {
      const msg = String(error?.message || "");
      if (msg.toLowerCase().includes("abort") || msg.toLowerCase().includes("aborted")) {
        navigate("/auth");
      } else {
        toast.error("Erro ao fazer logout");
      }
    } finally {
      setLoading(false);
    }
  };

  const generateCode = async () => {
    try {
      // Bloqueios: precisa ter assinatura ativa no período e fatura aprovada
      const { data: uSub } = await supabase
        .from("user_subscriptions")
        .select("id,status,current_period_start,current_period_end")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("current_period_end", { ascending: false })
        .maybeSingle();
      const now = new Date();
      if (!uSub || !uSub.current_period_start || !uSub.current_period_end) {
        toast.error("Assinatura inativa");
        return;
      }
      const ps = new Date(uSub.current_period_start as any);
      const pe = new Date(uSub.current_period_end as any);
      if (now < ps || now > pe) {
        toast.error("Fora do período da assinatura");
        return;
      }
      const { data: pays } = await supabase
        .from("payments")
        .select("status,created_at")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .gte("created_at", ps.toISOString())
        .lte("created_at", pe.toISOString())
        .limit(1);
      if (!pays || !pays.length) {
        toast.error("Fatura pendente ou cancelada");
        return;
      }
      if (credits !== null && Number(credits) <= 0) {
        toast.error("Sem créditos disponíveis");
        return;
      }
      const env2 = (import.meta as unknown as { env?: Record<string, string> }).env || {};
      const useEdge = String(env2.VITE_USE_EDGE_FUNCTIONS || "false").toLowerCase() === "true";
      if (useEdge) {
        const { data, error } = await supabase.functions
          .invoke("generate-code", { body: {} })
          .catch(() => ({ data: null, error: null }));
        if (data?.code) {
          setGeneratedCode(String(data.code));
          setCodeModalOpen(true);
          return;
        }
        // se função edge não estiver disponível, segue para fallback sem logar erro
      }
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) {
        toast.error("Faça login para gerar código");
        return;
      }
      const nowIso = new Date().toISOString();
      const { data: existing } = await supabase
        .from("codes")
        .select("code,expires_at")
        .eq("user_id", uid)
        .eq("status", "generated")
        .gte("expires_at", nowIso)
        .limit(1);
      if (existing && existing.length && existing[0]?.code) {
        setGeneratedCode(String(existing[0].code));
        setCodeModalOpen(true);
        return;
      }
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const gen = () => {
        let out = "";
        for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
        return out;
      };
      let code = gen();
      for (let i = 0; i < 3; i++) {
        const { data: dup } = await supabase.from("codes").select("id").eq("code", code).limit(1);
        if (!dup || dup.length === 0) break;
        code = gen();
      }
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error: insErr } = await supabase
        .from("codes")
        .insert({ code, user_id: uid, status: "generated", expires_at: expires });
      if (insErr) {
        toast.error(insErr.message || "Erro ao gerar código");
        return;
      }
      await supabase.from("audit_logs").insert({ actor_id: uid, action: "generate_code", payload: { code } });
      setGeneratedCode(String(code));
      setCodeModalOpen(true);
    } catch (err: any) {
      // como fallback já foi tentado acima, informe erro genérico
      toast.error(err?.message || "Erro ao gerar código");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Scissors className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">CorteFácil</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/faturas")}>
              Faturas
            </Button>
            <Button variant="outline" onClick={handleSignOut} disabled={loading}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 pt-20">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold flex items-center gap-3">
            <span>Olá, {displayName || user.email}!</span>
            {credits !== null && (
              <span className="inline-flex items-center rounded px-2 py-1 text-xs bg-primary text-primary-foreground">
                {credits} créditos
              </span>
            )}
          </h1>
          <p className="text-muted-foreground">Gerencie seus cortes e assinatura</p>
          <div className="mt-2 text-sm">
            {plan ? (
              <span className="inline-flex items-center rounded px-2 py-1 bg-secondary text-secondary-foreground">
                Plano ativo: {String(plan?.name || "")} • {(Number(plan?.price || 0) / 100).toFixed(2)}/mês
              </span>
            ) : (
              <span className="inline-flex items-center rounded px-2 py-1 bg-secondary text-secondary-foreground">Sem plano ativo</span>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Subscription Card */}
          <Card className="border-2">
          <CardHeader>
            <CardTitle>Meu Plano</CardTitle>
            <CardDescription>Plano Popular - R$ 79,99/mês</CardDescription>
            {affiliationName && (
              <CardDescription>Afiliado ao salão: {affiliationName}</CardDescription>
            )}
          </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-primary">Meu Plano</p>
                <p className="text-sm text-muted-foreground">
                  {plan
                    ? `${plan.name} - R$ ${(Number(plan.price) / 100).toFixed(2)}/${plan.interval === "year" ? "ano" : "mês"}`
                    : "Nenhum plano ativo"}
                </p>
                <Button className="mt-4 w-full" variant="outline" onClick={() => navigate("/planos")}>
                  Gerenciar Plano
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Generate Code Card */}
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Gerar Código
              </CardTitle>
              <CardDescription>Crie um código para usar no salão</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-gradient-primary" onClick={generateCode} disabled={credits !== null && Number(credits) <= 0}>
                Gerar Novo Código
              </Button>
              <p className="mt-4 text-xs text-muted-foreground">
                O código expira em 24 horas
              </p>
            </CardContent>
          </Card>

          {/* Find Salons Card */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Encontrar Salões
              </CardTitle>
              <CardDescription>Veja salões próximos a você</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" onClick={() => navigate("/saloes")}>
                Ver Salões
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Visits */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Histórico de Visitas</CardTitle>
            <CardDescription>Seus últimos cortes</CardDescription>
          </CardHeader>
          <CardContent>
            {visits.length === 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Nenhuma visita registrada ainda</p>
                {affiliationName && (
                  <div className="rounded border p-3 text-sm flex items-center justify-between">
                    <div className="font-medium">{affiliationName}</div>
                    <div className="text-xs text-muted-foreground">Salão afiliado</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-2">
                {visits.map((v, idx) => (
                  <div key={idx} className="rounded border p-3 text-sm flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="font-medium">{v.salonName}</div>
                      {v.code && <div className="text-xs text-muted-foreground">Código: {v.code}</div>}
                    </div>
                    <div className="text-xs text-right text-muted-foreground">{format(new Date(v.visitedAt), "dd/MM/yyyy HH:mm")}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={codeModalOpen} onOpenChange={setCodeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Código para validação</DialogTitle>
            <DialogDescription>Apresente este código ao dono do salão para validar o corte</DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex flex-col items-center gap-3">
            <div className="rounded border px-4 py-3 text-2xl font-mono tracking-widest">
              {generatedCode || "--"}
            </div>
            <div className="text-xs text-muted-foreground">Expira em 24 horas</div>
            <div className="flex w-full gap-2">
              <Button className="flex-1" onClick={() => { if (generatedCode) navigator.clipboard?.writeText(generatedCode); }}>
                Copiar
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setCodeModalOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerDashboard;
