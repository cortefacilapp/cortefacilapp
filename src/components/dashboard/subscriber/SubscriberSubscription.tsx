import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Calendar, CheckCircle, XCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Subscription {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
  current_credits: number;
  plan: {
    name: string;
    price: number;
    description: string;
    credits_per_month: number;
  };
  salon: {
    name: string;
    address: string;
  };
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  payment_method: string;
}

export function SubscriberSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch Subscription
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plan:plans(*),
          salon:salons(name, address)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (subError && subError.code !== 'PGRST116') console.error(subError);
      setSubscription(subData);

      // Fetch Payments
      const { data: payData, error: payError } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (payError) console.error(payError);
      setPayments(payData || []);

    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Pago</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pendente</Badge>;
      default:
        return <Badge variant="destructive">{status}</Badge>;
    }
  };

  if (loading) return <div className="text-center py-10">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <CreditCard className="w-8 h-8 text-primary" />
        <h1 className="font-display text-3xl">Minha Assinatura</h1>
      </div>

      {subscription ? (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="md:col-span-2 bg-gradient-to-r from-card to-muted/50">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl font-display text-primary">{subscription.plan.name}</CardTitle>
                  <CardDescription>Plano Atual</CardDescription>
                </div>
                <Badge className="bg-primary text-primary-foreground">Ativo</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Valor Mensal</p>
                <p className="text-2xl font-bold">R$ {subscription.plan.price.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Créditos Mensais</p>
                <p className="text-2xl font-bold">{subscription.plan.credits_per_month} Cortes</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Próxima Renovação</p>
                <p className="text-2xl font-bold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  {new Date(subscription.end_date).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="md:col-span-3 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-1">Salão Vinculado</p>
                <p className="font-medium text-lg">{subscription.salon?.name || 'Nenhum salão vinculado'}</p>
                <p className="text-sm text-muted-foreground">{subscription.salon?.address || ''}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground mb-4">Você não possui uma assinatura ativa.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                    Nenhum pagamento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {new Date(payment.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>R$ {payment.amount.toFixed(2)}</TableCell>
                    <TableCell className="capitalize">{payment.payment_method}</TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
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
