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
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  DollarSign, 
  Calendar,
  Building2,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WithdrawRequest {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  cycle_start: string;
  cycle_end: string;
  requested_at: string;
  approved_at: string | null;
  paid_at: string | null;
  rejection_reason: string | null;
  salon: {
    id: string;
    name: string;
    owner_id: string;
    phone: string | null;
  };
  bank_data?: {
    pix_key_type: string;
    pix_key: string;
  } | null;
}

export function AdminWithdrawals() {
  const [requests, setRequests] = useState<WithdrawRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawRequest | null>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('withdraw_requests')
        .select(`
          *,
          salon:salons(id, name, owner_id, phone)
        `)
        .order('requested_at', { ascending: false });

      if (error) throw error;

      // Fetch bank data for each salon owner
      const requestsWithBankData = await Promise.all(data.map(async (req) => {
        const { data: bankData } = await supabase
          .from('salon_bank_data')
          .select('*')
          .eq('salon_id', req.salon.owner_id) // salon_bank_data uses owner_id as salon_id
          .single();
        
        return {
          ...req,
          bank_data: bankData
        };
      }));

      setRequests(requestsWithBankData);
    } catch (error) {
      console.error('Error fetching withdraw requests:', error);
      toast.error("Erro ao carregar solicitações");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: WithdrawRequest) => {
    setProcessingId(request.id);
    try {
      const { error } = await supabase
        .from('withdraw_requests')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          admin_id: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', request.id);

      if (error) throw error;

      toast.success("Solicitação aprovada com sucesso!");
      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error("Erro ao aprovar solicitação");
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkAsPaid = async (request: WithdrawRequest) => {
    setProcessingId(request.id);
    try {
      const { error } = await supabase
        .from('withdraw_requests')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (error) throw error;

      toast.success("Solicitação marcada como paga!");
      fetchRequests();
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast.error("Erro ao marcar como pago");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) return;

    setProcessingId(selectedRequest.id);
    try {
      const { error } = await supabase
        .from('withdraw_requests')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          admin_id: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast.success("Solicitação rejeitada.");
      setIsRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error("Erro ao rejeitar solicitação");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500 hover:bg-green-600 gap-1"><CheckCircle2 className="w-3 h-3" /> Pago</Badge>;
      case 'approved':
        return <Badge className="bg-blue-500 hover:bg-blue-600 gap-1"><CheckCircle2 className="w-3 h-3" /> Aprovado (Aguardando Pagamento)</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600 gap-1"><Clock className="w-3 h-3" /> Pendente</Badge>;
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
          <h1 className="font-display text-3xl">Solicitações de Saque</h1>
          <p className="text-muted-foreground">Gerencie os pagamentos aos parceiros</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Solicitações</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Salão / Parceiro</TableHead>
                <TableHead>Ciclo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Dados Bancários (PIX)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma solicitação encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{request.salon?.name || 'Salão Desconhecido'}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Solicitado em {format(new Date(request.requested_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        {format(new Date(request.cycle_start), "dd/MM", { locale: ptBR })} à {format(new Date(request.cycle_end), "dd/MM", { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      R$ {request.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {request.bank_data ? (
                        <div className="text-sm">
                          <span className="font-semibold uppercase">{request.bank_data.pix_key_type}:</span> {request.bank_data.pix_key}
                        </div>
                      ) : (
                        <span className="text-sm text-yellow-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Não cadastrado
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(request.status)}
                      {request.status === 'rejected' && request.rejection_reason && (
                        <div className="text-xs text-red-500 mt-1 max-w-[200px] truncate" title={request.rejection_reason}>
                          Motivo: {request.rejection_reason}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {request.status === 'pending' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleApprove(request)}
                              disabled={processingId === request.id}
                            >
                              Aprovar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => {
                                setSelectedRequest(request);
                                setIsRejectDialogOpen(true);
                              }}
                              disabled={processingId === request.id}
                            >
                              Recusar
                            </Button>
                          </>
                        )}
                        {request.status === 'approved' && (
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleMarkAsPaid(request)}
                            disabled={processingId === request.id}
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            Marcar Pago
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar Solicitação</DialogTitle>
            <DialogDescription>
              Por favor, informe o motivo da recusa para o parceiro.
            </DialogDescription>
          </DialogHeader>
          <Textarea 
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Ex: Dados bancários incorretos, inconsistência nos valores..."
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Cancelar</Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectionReason.trim() || !!processingId}
            >
              Confirmar Recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
