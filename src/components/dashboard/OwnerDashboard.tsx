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
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
        const { data } = await supabase
          .from("payouts")
          .select("amount,status,period_start,period_end")
          .eq("salon_id", salon.id)
          .gte("period_start", start)
          .lte("period_end", end);
        const total = (data || []).reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);
        if (total === 0) {
          const { count } = await supabase
            .from("codes")
            .select("id", { count: "exact" })
            .eq("used_by_salon_id", salon.id)
            .gte("used_at", start)
            .lte("used_at", end)
            .or("status.eq.used,used.eq.true");
          if (Number(count || 0) > 0) {
            await supabase.rpc("run_monthly_payouts");
            const { data: after } = await supabase
              .from("payouts")
              .select("amount,status,period_start,period_end")
              .eq("salon_id", salon.id)
              .gte("period_start", start)
              .lte("period_end", end);
            const newTotal = (after || []).reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);
            setMonthTotal(newTotal);
            return;
          }
        }
        setMonthTotal(total);
      } catch (_) {
        setMonthTotal(0);
      }
    };
    loadMonthPayout();
  }, [user.id]);

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
