import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Scissors, 
  Users, 
  DollarSign, 
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from "lucide-react";

interface Salon {
  id: string;
  name: string;
  is_approved: boolean;
  commission_rate: number;
}

interface Stats {
  totalSubscribers: number;
  totalHaircuts: number;
  pendingPayout: number;
}

export function SalonOverview() {
  const { user } = useAuth();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalSubscribers: 0,
    totalHaircuts: 0,
    pendingPayout: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSalonData();
    }
  }, [user]);

  const fetchSalonData = async () => {
    if (!user) return;

    try {
      // Fetch salon info
      const { data: salonData, error: salonError } = await supabase
        .from('salons')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (salonError) {
        console.error('Salon error:', salonError);
        return;
      }

      setSalon(salonData);

      // Fetch stats
      const { count: subscriberCount } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('salon_id', salonData.id)
        .eq('status', 'active');

      const { count: haircutCount } = await supabase
        .from('haircut_history')
        .select('*', { count: 'exact', head: true })
        .eq('salon_id', salonData.id);

      const { data: payoutData } = await supabase
        .from('haircut_history')
        .select('amount_to_salon')
        .eq('salon_id', salonData.id);

      const totalEarnings = payoutData?.reduce((sum, h) => sum + (h.amount_to_salon || 0), 0) || 0;

      setStats({
        totalSubscribers: subscriberCount || 0,
        totalHaircuts: haircutCount || 0,
        pendingPayout: totalEarnings,
      });
    } catch (err) {
      console.error('Error fetching salon data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h1 className="font-display text-3xl mb-4">SALÃO NÃO ENCONTRADO</h1>
        <p className="text-muted-foreground">
          Entre em contato com o suporte se você acredita que isso é um erro.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl mb-2">{salon.name.toUpperCase()}</h1>
          <div className="flex items-center gap-2">
            {salon.is_approved ? (
              <span className="inline-flex items-center gap-1 text-sm text-green-500">
                <CheckCircle2 className="w-4 h-4" />
                Aprovado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm text-yellow-500">
                <AlertCircle className="w-4 h-4" />
                Aguardando aprovação
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Assinantes Ativos
            </CardTitle>
            <Users className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-5xl text-gold-gradient">
              {stats.totalSubscribers}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cortes Realizados
            </CardTitle>
            <Scissors className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-5xl text-gold-gradient">
              {stats.totalHaircuts}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total a Receber
            </CardTitle>
            <DollarSign className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-5xl text-gold-gradient">
              R$ {stats.pendingPayout.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
