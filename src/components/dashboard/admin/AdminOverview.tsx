import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  Building, 
  CreditCard,
  RefreshCw,
  CheckCircle2,
  XCircle,
  TrendingUp,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Stats {
  totalSubscribers: number;
  totalSalons: number;
  pendingSalons: number;
  activeSubscriptions: number;
  totalRevenue: number;
  platformRevenue: number;
}

interface PendingSalon {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
  };
}

export function AdminOverview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalSubscribers: 0,
    totalSalons: 0,
    pendingSalons: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    platformRevenue: 0,
  });
  const [pendingSalons, setPendingSalons] = useState<PendingSalon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      // Fetch subscriber count using profiles table instead of user_roles
      const { count: subscriberCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'subscriber');

      // Fetch salon counts
      const { count: totalSalonCount } = await supabase
        .from('salons')
        .select('*', { count: 'exact', head: true });

      const { count: pendingSalonCount, data: pendingData } = await supabase
        .from('salons')
        .select('*')
        .eq('is_approved', false);

      // Fetch active subscriptions
      const { count: activeSubCount } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Fetch financial data
      const { data: haircutData } = await supabase
        .from('haircut_history')
        .select('amount_to_salon, amount_to_platform');

      const totalRevenue = haircutData?.reduce(
        (sum, h) => sum + (h.amount_to_salon || 0) + (h.amount_to_platform || 0), 
        0
      ) || 0;

      const platformRevenue = haircutData?.reduce(
        (sum, h) => sum + (h.amount_to_platform || 0), 
        0
      ) || 0;

      setStats({
        totalSubscribers: subscriberCount || 0,
        totalSalons: totalSalonCount || 0,
        pendingSalons: pendingSalonCount || 0,
        activeSubscriptions: activeSubCount || 0,
        totalRevenue,
        platformRevenue,
      });

      setPendingSalons(pendingData || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const approveSalon = async (salonId: string) => {
    try {
      const { error } = await supabase
        .from('salons')
        .update({ is_approved: true })
        .eq('id', salonId);

      if (error) throw error;

      toast.success("Salão aprovado com sucesso!");
      fetchAdminData();
    } catch (err) {
      console.error('Error approving salon:', err);
      toast.error("Erro ao aprovar salão");
    }
  };

  const rejectSalon = async (salonId: string) => {
    try {
      const { error } = await supabase
        .from('salons')
        .update({ is_active: false })
        .eq('id', salonId);

      if (error) throw error;

      toast.success("Salão rejeitado");
      fetchAdminData();
    } catch (err) {
      console.error('Error rejecting salon:', err);
      toast.error("Erro ao rejeitar salão");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-4xl mb-2">PAINEL ADMINISTRATIVO</h1>
        <p className="text-muted-foreground">
          Gerencie toda a plataforma BarberClub
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Assinantes
            </CardTitle>
            <Users className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-4xl text-gold-gradient">
              {stats.totalSubscribers}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Salões Parceiros
            </CardTitle>
            <Building className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-4xl text-gold-gradient">
              {stats.totalSalons}
            </div>
            {stats.pendingSalons > 0 && (
              <p className="text-sm text-yellow-500 mt-1">
                {stats.pendingSalons} pendente(s)
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Assinaturas Ativas
            </CardTitle>
            <CreditCard className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-4xl text-gold-gradient">
              {stats.activeSubscriptions}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receita da Plataforma
            </CardTitle>
            <TrendingUp className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-4xl text-gold-gradient">
              R$ {stats.platformRevenue.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Total: R$ {stats.totalRevenue.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Salons */}
      {pendingSalons.length > 0 && (
        <Card className="bg-gradient-card border-yellow-500/30">
          <CardHeader>
            <CardTitle className="font-display text-2xl flex items-center gap-2">
              <Building className="w-6 h-6 text-yellow-500" />
              SALÕES PENDENTES DE APROVAÇÃO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingSalons.map((salon) => (
                <div
                  key={salon.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border"
                >
                  <div>
                    <h4 className="font-bold">{salon.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Cadastrado em {new Date(salon.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => approveSalon(salon.id)}
                      className="text-green-500 border-green-500/50 hover:bg-green-500/10"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Aprovar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => rejectSalon(salon.id)}
                      className="text-destructive border-destructive/50 hover:bg-destructive/10"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Rejeitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-card border-border card-hover cursor-pointer" onClick={() => navigate("/dashboard/saloes")}>
          <CardContent className="pt-6">
            <Building className="w-10 h-10 text-primary mb-4" />
            <h3 className="font-display text-xl mb-2">GERENCIAR SALÕES</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Visualize e gerencie todos os salões credenciados
            </p>
            <Button variant="outline" className="w-full">
              Ver Salões
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border card-hover cursor-pointer" onClick={() => navigate("/dashboard/assinantes")}>
          <CardContent className="pt-6">
            <Users className="w-10 h-10 text-primary mb-4" />
            <h3 className="font-display text-xl mb-2">GERENCIAR ASSINANTES</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Visualize todos os assinantes da plataforma
            </p>
            <Button variant="outline" className="w-full">
              Ver Assinantes
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border card-hover cursor-pointer" onClick={() => navigate("/dashboard/financeiro")}>
          <CardContent className="pt-6">
            <DollarSign className="w-10 h-10 text-primary mb-4" />
            <h3 className="font-display text-xl mb-2">FINANCEIRO</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Gerencie repasses e relatórios financeiros
            </p>
            <Button variant="outline" className="w-full">
              Ver Financeiro
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
