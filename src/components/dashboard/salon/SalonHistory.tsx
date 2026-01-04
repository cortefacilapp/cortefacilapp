import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { 
  History, 
  RefreshCw,
  Calendar,
  DollarSign
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HaircutRecord {
  id: string;
  created_at: string;
  amount_to_salon: number;
  subscription: {
    profile: {
      full_name: string;
    };
    plan: {
      name: string;
    };
  };
}

export function SalonHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<HaircutRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    if (!user) return;

    try {
      // 1. Get salon id
      const { data: salon, error: salonError } = await supabase
        .from('salons')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (salonError) throw salonError;

      // 2. Fetch history
      const { data, error } = await supabase
        .from('haircut_history')
        .select(`
          id,
          created_at,
          amount_to_salon,
          subscription:subscriptions(
            profile:profiles(full_name),
            plan:plans(name)
          )
        `)
        .eq('salon_id', salon.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setHistory(data as any || []);
    } catch (error) {
      console.error('Error fetching history:', error);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <History className="w-8 h-8 text-primary" />
        <h1 className="font-display text-3xl">Histórico de Cortes</h1>
      </div>

      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle>Últimos Cortes Realizados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead className="text-right">Valor Recebido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum corte registrado
                  </TableCell>
                </TableRow>
              ) : (
                history.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {format(new Date(record.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {record.subscription?.profile?.full_name || 'Desconhecido'}
                    </TableCell>
                    <TableCell>
                      {record.subscription?.plan?.name}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-500">
                      R$ {record.amount_to_salon.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
