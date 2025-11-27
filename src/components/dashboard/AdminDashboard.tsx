import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Scissors, Store, Users, DollarSign, Home, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AdminDashboardProps {
  user: User;
}

const AdminDashboard = ({ user }: AdminDashboardProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [usersCount, setUsersCount] = useState<number>(0);
  const [platformRevenue, setPlatformRevenue] = useState<number>(0);
  const [activeOpen, setActiveOpen] = useState(false);
  const [activeSalons, setActiveSalons] = useState<any[]>([]);

  useEffect(() => {
    const loadCounts = async () => {
      const { count } = await supabase
        .from("salons")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (typeof count === "number") setPendingCount(count);
      const { count: act } = await supabase
        .from("salons")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved");
      if (typeof act === "number") setActiveCount(act);
      const { count: users } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "user");
      if (typeof users === "number") setUsersCount(users);
    };
    loadCounts();
  }, []);

  useEffect(() => {
    const loadPlatformRevenue = async () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const { data } = await supabase
        .from("payments")
        .select("platform_amount,status,created_at")
        .eq("status", "approved")
        .gte("created_at", start)
        .lte("created_at", end);
      const sum = (data || []).reduce((acc: number, p: any) => acc + (Number(p.platform_amount) || 0), 0);
      setPlatformRevenue(sum);
    };
    loadPlatformRevenue();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("admin-dashboard-payments")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "payments" }, async () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
        const { data } = await supabase
          .from("payments")
          .select("platform_amount,status,created_at")
          .eq("status", "approved")
          .gte("created_at", start)
          .lte("created_at", end);
        const sum = (data || []).reduce((acc: number, p: any) => acc + (Number(p.platform_amount) || 0), 0);
        setPlatformRevenue(sum);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const loadActive = async () => {
      if (!activeOpen) return;
      const res = await supabase
        .from("salons")
        .select("id,name,city,state,address,phone,approved_at")
        .eq("status", "approved")
        .order("approved_at", { ascending: false });
      if (!res.error && res.data) setActiveSalons(res.data);
    };
    loadActive();
  }, [activeOpen]);

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

  return (
    <div>
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Painel Administrativo</h1>
        <p className="text-muted-foreground">Gerencie a plataforma</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Salões Pendentes
            </CardTitle>
            <CardDescription>Aguardando aprovação</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-primary">{pendingCount}</p>
              <Button className="mt-4 w-full" variant="outline" onClick={() => navigate("/admin/pendentes")}>
                Ver Solicitações
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuários Ativos
            </CardTitle>
            <CardDescription>Total de clientes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-secondary">{usersCount}</p>
              <Button className="mt-4 w-full" variant="outline" onClick={() => navigate("/admin/usuarios")}>
                Ver Detalhes
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Salões Ativos
            </CardTitle>
            <CardDescription>Aprovados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">{activeCount}</p>
              <Button className="mt-4 w-full" variant="outline" onClick={() => setActiveOpen(true)}>
                Ver Salões
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Receita da Plataforma
            </CardTitle>
            <CardDescription>20% dos repasses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-accent">R$ {(platformRevenue / 100).toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">este mês</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Salões Aguardando Aprovação</CardTitle>
          <CardDescription>Novos cadastros de salões</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum salão pendente de aprovação
          </p>
        </CardContent>
      </Card>

      <Dialog open={activeOpen} onOpenChange={setActiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salões Ativos</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!activeSalons?.length && (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando ou nenhum ativo
              </div>
            )}
            {activeSalons.map((s) => (
              <div key={s.id} className="rounded border p-3">
                <div className="font-medium">{s.name}</div>
                <div className="text-sm text-muted-foreground">{s.city}/{s.state}</div>
                <div className="text-sm">{s.address}</div>
                <div className="text-sm">{s.phone || "sem telefone"}</div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
