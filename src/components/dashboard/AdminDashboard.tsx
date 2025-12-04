import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Scissors, Store, Users, DollarSign, Home, Loader2, MapPin, BadgeCheck } from "lucide-react";
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
  type SalonActiveRow = { id: string; name: string; city: string; state: string; address: string; phone?: string | null; approved_at?: string | null };
  type SalonPendingRow = { id: string; name: string; city: string; state: string; address: string; owner_id: string; created_at: string };
  type PaymentRow = { platform_amount: number; status: string | null; created_at: string };
  const [activeSalons, setActiveSalons] = useState<SalonActiveRow[]>([]);
  const [pendingSalons, setPendingSalons] = useState<SalonPendingRow[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const loadCounts = async () => {
      const { count } = await supabase
        .from("salons")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (typeof count === "number") setPendingCount(count);
      const { data: pend } = await supabase
        .from("salons")
        .select("id,name,city,state,address,owner_id,created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      setPendingSalons(pend || []);
      const { count: act } = await supabase
        .from("salons")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved");
      if (typeof act === "number") setActiveCount(act);
      const { data: userCountRpc } = await supabase.rpc("count_common_users");
      if (Array.isArray(userCountRpc) && userCountRpc.length === 1 && typeof userCountRpc[0] === "number") {
        setUsersCount(Number(userCountRpc[0]));
      } else if (typeof userCountRpc === "number") {
        setUsersCount(Number(userCountRpc));
      } else {
        const { count: users } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .in("role", ["user", "customer"]);
        if (typeof users === "number") setUsersCount(users);
      }
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
      const sum = (data || []).reduce((acc: number, p: PaymentRow) => acc + (Number(p.platform_amount) || 0), 0);
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
        const sum = (data || []).reduce((acc: number, p: PaymentRow) => acc + (Number(p.platform_amount) || 0), 0);
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
      await supabase.auth.signOut({ scope: "local" });
      const pid = String((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_PROJECT_ID || "");
      if (pid) localStorage.removeItem(`sb-${pid}-auth-token`);
      localStorage.removeItem("sb-qowmhahuuuxugtcgdryl-auth-token");
      toast.success("Logout realizado com sucesso!");
      navigate("/auth");
    } catch (error: unknown) {
      const msg = typeof error === "object" && error && "message" in error ? String((error as { message?: unknown }).message) : "";
      if (msg.toLowerCase().includes("abort") || msg.toLowerCase().includes("aborted")) {
        navigate("/auth");
      } else {
        toast.error("Erro ao fazer logout");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-xl bg-gradient-to-br from-[#0A1A2F] to-[#1A73E8] p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">Painel Administrativo</div>
            <div className="text-white/80">Visão geral e ações rápidas</div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm">
              <Store className="h-4 w-4" />
              <span>{pendingCount} pendentes</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm">
              <Users className="h-4 w-4" />
              <span>{usersCount} usuários</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm">
              <BadgeCheck className="h-4 w-4" />
              <span>{activeCount} salões ativos</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-2">
          <CardHeader>
            <CardTitle>Atalhos e Contagens</CardTitle>
            <CardDescription>Navegação rápida e visão geral</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="overflow-hidden border-2 transition hover:scale-[1.01]">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2"><Store className="h-4 w-4" /> Pendentes</span>
                    <span className="text-primary">{pendingCount}</span>
                  </CardTitle>
                  <CardDescription>Aguardando aprovação</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" onClick={() => navigate("/admin/pendentes")}>Ver Solicitações</Button>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-2 transition hover:scale-[1.01]">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2"><Users className="h-4 w-4" /> Usuários</span>
                    <span className="text-primary">{usersCount}</span>
                  </CardTitle>
                  <CardDescription>Total de clientes</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" onClick={() => navigate("/admin/usuarios")}>Ver Detalhes</Button>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-2 transition hover:scale-[1.01]">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2"><Store className="h-4 w-4" /> Ativos</span>
                    <span className="text-primary">{activeCount}</span>
                  </CardTitle>
                  <CardDescription>Salões aprovados</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" onClick={() => setActiveOpen(true)}>Ver Salões</Button>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-2 transition hover:scale-[1.01] lg:col-span-3">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Receita da Plataforma</CardTitle>
                  <CardDescription>20% dos repasses • este mês</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">R$ {(platformRevenue / 100).toFixed(2)}</div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle>Salões Pendentes</CardTitle>
            <CardDescription>Novos cadastros</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Input placeholder="Buscar por nome ou cidade" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            {pendingSalons.length ? (
              <div className="grid gap-3">
                {pendingSalons
                  .filter((s) => {
                    const q = query.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      String(s.name || "").toLowerCase().includes(q) ||
                      String(s.city || "").toLowerCase().includes(q) ||
                      String(s.state || "").toLowerCase().includes(q)
                    );
                  })
                  .slice(0, 6)
                  .map((s) => (
                    <Card key={s.id} className="overflow-hidden border-2">
                      <CardHeader>
                        <CardTitle className="text-lg">{String(s.name || "Salão")}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" /> {String(s.city || "")}/{String(s.state || "")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button variant="outline" className="w-full" onClick={() => navigate("/admin/pendentes")}>Ver detalhes</Button>
                      </CardContent>
                    </Card>
                  ))}
                <Button variant="outline" className="w-full" onClick={() => navigate("/admin/pendentes")}>Ver todas</Button>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Nenhum salão pendente de aprovação</div>
            )}
          </CardContent>
        </Card>
      </div>

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
