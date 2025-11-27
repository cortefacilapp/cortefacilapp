import { useEffect, useState } from "react";
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
  const [plan, setPlan] = useState<any | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  useEffect(() => {
    const loadName = async () => {
      const { data } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
      setDisplayName(data?.name || user.user_metadata?.name || "");
    };
    loadName();
  }, [user.id]);

  useEffect(() => {
    const loadPlan = async () => {
      const { data: sub } = await supabase
        .from("user_subscriptions")
        .select("plan_id,status,current_period_start,current_period_end,updated_at")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .maybeSingle();
      if (sub?.plan_id) {
        const { data: p } = await supabase
          .from("plans")
          .select("name,price,interval,monthly_credits")
          .eq("id", sub.plan_id)
          .maybeSingle();
        if (p) {
          setPlan({ ...p, status: sub.status });
          const { data: uc } = await supabase
            .from("user_credits")
            .select("remaining")
            .eq("user_id", user.id)
            .eq("plan_id", sub.plan_id)
            .eq("period_start", sub.current_period_start)
            .maybeSingle();
          if (uc?.remaining !== undefined && uc?.remaining !== null) setCredits(Number(uc.remaining));
          else if (p.monthly_credits !== undefined && p.monthly_credits !== null) setCredits(Number(p.monthly_credits));
        }
      }
    };
    loadPlan();
  }, [user.id]);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      toast.success("Logout realizado com sucesso!");
      navigate("/");
    } catch (error: any) {
      toast.error("Erro ao fazer logout");
    } finally {
      setLoading(false);
    }
  };

  const generateCode = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-code", { body: {} });
      if (!error && data?.code) {
        setGeneratedCode(String(data.code));
        setCodeModalOpen(true);
        return;
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
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Subscription Card */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Meu Plano</CardTitle>
              <CardDescription>Plano Popular - R$ 79,99/mês</CardDescription>
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
              <Button className="w-full bg-gradient-primary" onClick={generateCode}>
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
            <p className="text-sm text-muted-foreground">
              Nenhuma visita registrada ainda
            </p>
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
