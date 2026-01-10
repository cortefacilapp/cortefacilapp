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
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, ArrowUpCircle, ArrowDownCircle, RefreshCw, Calendar, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Payment {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  paid_at: string | null;
  created_at: string;
  profile: {
    full_name: string;
    email: string;
  } | null;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  period_start: string;
  period_end: string;
  paid_at: string | null;
  created_at: string;
  salon: {
    name: string;
  } | null;
}

export function AdminFinancial() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch incoming payments (subscriptions) - Manual join to avoid PGRST200
      const { data: paymentsRaw, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Manually fetch profiles
      const userIds = Array.from(new Set(paymentsRaw.map(p => p.user_id).filter(Boolean)));
      let profilesMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
          
        if (!profilesError && profiles) {
          profilesMap = profiles.reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      const paymentsData = paymentsRaw.map(payment => ({
        ...payment,
        profile: profilesMap[payment.user_id] || { full_name: 'Usuário Desconhecido', email: 'N/A' }
      }));

      // 2. Fetch outgoing payouts (salons)
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('payouts')
        .select(`
          *,
          salon:salons(name)
        `)
        .order('created_at', { ascending: false });

      if (payoutsError) throw payoutsError;

      setPayments(paymentsData || []);
      setPayouts(payoutsData || []);

    } catch (error: any) {
      console.error('Erro ao buscar dados financeiros:', error);
      toast.error("Erro ao carregar dados financeiros");
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const totalIncome = payments
    .filter(p => p.status === 'paid' || p.status === 'completed' || p.status === 'approved')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const totalPayouts = payouts
    .filter(p => p.status === 'paid' || p.status === 'completed' || p.status === 'approved')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);
    
  const pendingPayouts = payouts
    .filter(p => p.status === 'pending')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const netRevenue = totalIncome * 0.20; // 20% platform share (80% goes to salons)

  const getStatusBadge = (status: string, type: 'income' | 'outcome') => {
    const isSuccess = status === 'paid' || status === 'completed' || status === 'approved';
    const isPending = status === 'pending' || status === 'processing';
    
    if (isSuccess) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">Confirmado</Badge>;
    }
    if (isPending) {
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pendente</Badge>;
    }
    return <Badge variant="destructive">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <DollarSign className="w-8 h-8 text-primary" />
          <h1 className="font-display text-3xl">Financeiro</h1>
        </div>
        
        <Button variant="outline" size="sm" onClick={fetchFinancialData}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 p-3 rounded-full">
                <ArrowUpCircle className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Entradas Totais</span>
            </div>
            <div className="text-3xl font-bold text-green-700">
              R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pagamentos de assinaturas recebidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <ArrowDownCircle className="w-6 h-6 text-red-600" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Saídas / Repasses</span>
            </div>
            <div className="text-3xl font-bold text-red-700">
              R$ {totalPayouts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              R$ {pendingPayouts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pendentes de pagamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Receita Líquida</span>
            </div>
            <div className="text-3xl font-bold text-blue-700">
              R$ {netRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Lucro da plataforma após repasses
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="income" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="income">Entradas (Assinaturas)</TabsTrigger>
          <TabsTrigger value="outcome">Saídas (Repasses)</TabsTrigger>
        </TabsList>
        
        {/* Income Tab */}
        <TabsContent value="income" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Recebimentos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell>
                    </TableRow>
                  ) : payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum pagamento registrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="font-medium">{payment.profile?.full_name || 'Desconhecido'}</div>
                          <div className="text-xs text-muted-foreground">{payment.profile?.email}</div>
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          + R$ {Number(payment.amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="capitalize">
                          {payment.payment_method}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(payment.status, 'income')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {new Date(payment.created_at).toLocaleDateString('pt-BR')}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outcome Tab */}
        <TabsContent value="outcome" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Repasses aos Salões</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Salão</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Pagamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell>
                    </TableRow>
                  ) : payouts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum repasse registrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    payouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell>
                          <div className="font-medium">{payout.salon?.name || 'Salão Removido'}</div>
                        </TableCell>
                        <TableCell className="font-medium text-red-600">
                          - R$ {Number(payout.amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(payout.period_start).toLocaleDateString('pt-BR')} até {new Date(payout.period_end).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(payout.status, 'outcome')}
                        </TableCell>
                        <TableCell>
                          {payout.paid_at ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {new Date(payout.paid_at).toLocaleDateString('pt-BR')}
                            </div>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
