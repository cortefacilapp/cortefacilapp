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
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { 
  DollarSign, 
  RefreshCw,
  TrendingUp,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface WithdrawRequest {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  cycle_start: string;
  cycle_end: string;
  requested_at: string;
  paid_at: string | null;
  rejection_reason: string | null;
}

interface FinancialSummary {
  total_earnings: number;
  available_balance: number;
  pending_amount: number;
  paid_amount: number;
}

export function SalonFinancial() {
  const { user } = useAuth();
  const [withdraws, setWithdraws] = useState<WithdrawRequest[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({
    total_earnings: 0,
    available_balance: 0,
    pending_amount: 0,
    paid_amount: 0
  });
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [salonId, setSalonId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Get salon id
      const { data: salon, error: salonError } = await supabase
        .from('salons')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (salonError) throw salonError;
      setSalonId(salon.id);

      // 2. Fetch financial summary using RPC
      const { data: summaryData, error: summaryError } = await supabase
        .rpc('get_salon_financial_summary', { p_salon_id: salon.id });

      if (summaryError) throw summaryError;
      
      if (summaryData && summaryData.length > 0) {
        setSummary(summaryData[0]);
      }

      // 3. Fetch withdraw requests
      const { data: withdrawData, error: withdrawError } = await supabase
        .from('withdraw_requests')
        .select('*')
        .eq('salon_id', salon.id)
        .order('requested_at', { ascending: false });

      if (withdrawError) throw withdrawError;
      setWithdraws(withdrawData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error("Erro ao carregar dados financeiros");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestWithdraw = async () => {
    if (!salonId) return;
    
    setIsSubmitting(true);
    try {
      // Calculate cycle dates (previous 30 days)
      const today = new Date();
      const cycleEnd = new Date(today);
      const cycleStart = new Date(today);
      cycleStart.setDate(today.getDate() - 30);

      const { error } = await supabase
        .from('withdraw_requests')
        .insert({
          salon_id: salonId,
          amount: summary.available_balance,
          cycle_start: cycleStart.toISOString().split('T')[0],
          cycle_end: cycleEnd.toISOString().split('T')[0],
          status: 'pending'
        });

      if (error) throw error;

      toast.success("Solicitação de saque enviada com sucesso!");
      setIsDialogOpen(false);
      fetchData(); // Refresh data

    } catch (error: any) {
      console.error('Error requesting withdraw:', error);
      toast.error(error.message || "Erro ao solicitar saque");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentDay = new Date().getDate();
  const isWithdrawEnabled = currentDay >= 10 && summary.available_balance > 0 && summary.pending_amount === 0;
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500 hover:bg-green-600 gap-1"><CheckCircle2 className="w-3 h-3" /> Pago</Badge>;
      case 'approved':
        return <Badge className="bg-blue-500 hover:bg-blue-600 gap-1"><CheckCircle2 className="w-3 h-3" /> Aprovado</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600 gap-1"><Clock className="w-3 h-3" /> Em Análise</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Recusado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Meu Financeiro</h1>
          <p className="text-muted-foreground">Gerencie seus ganhos e solicitações de saque</p>
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={fetchData} 
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Acumulado
            </CardTitle>
            <DollarSign className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.total_earnings)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Desde o início
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Disponível para Saque
            </CardTitle>
            <DollarSign className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.available_balance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Liberado após dia 10
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Análise
            </CardTitle>
            <Clock className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.pending_amount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Aguardando aprovação
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pago
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.paid_amount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Transferido para sua conta
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Withdraw Action Section */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle>Solicitação de Saque</CardTitle>
        </CardHeader>
        <CardContent>
          {currentDay < 10 ? (
            <Alert className="bg-blue-50 text-blue-800 border-blue-200 mb-4">
              <Clock className="h-4 w-4" />
              <AlertTitle>Aguarde o dia 10</AlertTitle>
              <AlertDescription>
                Os saques são liberados a partir do dia 10 de cada mês, referentes ao ciclo anterior.
              </AlertDescription>
            </Alert>
          ) : summary.pending_amount > 0 ? (
            <Alert className="bg-yellow-50 text-yellow-800 border-yellow-200 mb-4">
              <Clock className="h-4 w-4" />
              <AlertTitle>Solicitação em andamento</AlertTitle>
              <AlertDescription>
                Você já possui um saque em análise. Aguarde a conclusão para solicitar novamente.
              </AlertDescription>
            </Alert>
          ) : summary.available_balance <= 0 ? (
            <Alert className="bg-gray-50 text-gray-800 border-gray-200 mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Saldo Indisponível</AlertTitle>
              <AlertDescription>
                Você não possui saldo disponível para saque no momento.
              </AlertDescription>
            </Alert>
          ) : null}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                size="lg" 
                className="w-full md:w-auto" 
                disabled={!isWithdrawEnabled}
              >
                Solicitar Saque de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.available_balance)}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmar Solicitação de Saque</DialogTitle>
                <DialogDescription>
                  Você está prestes a solicitar o saque do seu saldo disponível.
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4 space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-muted-foreground">Valor a sacar:</span>
                  <span className="text-xl font-bold text-green-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.available_balance)}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• O valor entrará em análise pela administração.</p>
                  <p>• O pagamento será realizado na conta bancária cadastrada.</p>
                  <p>• Após confirmar, o valor sairá do seu saldo disponível.</p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button onClick={handleRequestWithdraw} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    "Confirmar Solicitação"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Histórico de Solicitações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Solicitação</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Pagamento</TableHead>
                  <TableHead>Obs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : withdraws.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Nenhuma solicitação encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  withdraws.map((withdraw) => (
                    <TableRow key={withdraw.id}>
                      <TableCell>
                        {format(new Date(withdraw.requested_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(withdraw.cycle_start), "dd/MM", { locale: ptBR })} até {format(new Date(withdraw.cycle_end), "dd/MM", { locale: ptBR })}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(withdraw.amount)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(withdraw.status)}
                      </TableCell>
                      <TableCell>
                        {withdraw.paid_at ? format(new Date(withdraw.paid_at), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                      </TableCell>
                      <TableCell>
                        {withdraw.rejection_reason && (
                          <span className="text-red-500 text-xs" title={withdraw.rejection_reason}>
                            Motivo: {withdraw.rejection_reason}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
