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
import { History, Calendar } from "lucide-react";

interface HaircutHistory {
  id: string;
  created_at: string;
  code_used: string;
  salon: {
    name: string;
  };
}

export function SubscriberHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<HaircutHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    if (!user) return;

    try {
      // First get the subscription ID(s) for the user
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id);

      if (!subs || subs.length === 0) {
        setLoading(false);
        return;
      }

      const subIds = subs.map(s => s.id);

      const { data, error } = await supabase
        .from('haircut_history')
        .select(`
          *,
          salon:salons(name)
        `)
        .in('subscription_id', subIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <History className="w-8 h-8 text-primary" />
        <h1 className="font-display text-3xl">Histórico de Cortes</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meus Cortes Realizados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Salão</TableHead>
                <TableHead>Código Usado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">Carregando...</TableCell>
                </TableRow>
              ) : history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    Nenhum corte realizado ainda.
                  </TableCell>
                </TableRow>
              ) : (
                history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {new Date(item.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{item.salon?.name}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{item.code_used || '-'}</TableCell>
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
