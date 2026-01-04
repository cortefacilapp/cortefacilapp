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
import { CreditCard, Search, RefreshCw, Calendar, Scissors } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Subscription {
  id: string;
  status: string;
  current_credits: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  plan: {
    name: string;
    price: number;
    credits_per_month: number;
  } | null;
  salon: {
    name: string;
  } | null;
  profile: {
    full_name: string;
    email: string;
  } | null;
}

export function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      // Fetch subscriptions with related data (plans and salons)
      // We fetch profiles manually to avoid Foreign Key issues (PGRST200)
      const { data: subsData, error: subsError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plan:plans(name, price, credits_per_month),
          salon:salons(name)
        `)
        .order('created_at', { ascending: false });

      if (subsError) throw subsError;

      // Manually fetch profiles
      const userIds = [...new Set((subsData || []).map(sub => sub.user_id).filter(Boolean))];
      
      let profilesMap: Record<string, any> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
          
        if (!profilesError && profilesData) {
          profilesMap = profilesData.reduce((acc: any, profile: any) => {
            acc[profile.id] = profile;
            return acc;
          }, {});
        }
      }

      // Transform data to match interface
      const transformedData: Subscription[] = (subsData || []).map((sub: any) => ({
        ...sub,
        plan: sub.plan,
        salon: sub.salon,
        profile: profilesMap[sub.user_id] || null
      }));

      setSubscriptions(transformedData);
    } catch (error: any) {
      console.error('Erro ao buscar assinaturas:', error);
      toast.error("Erro ao carregar lista de assinaturas");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">Ativa</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pendente</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => 
    sub.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.salon?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.plan?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <CreditCard className="w-8 h-8 text-primary" />
          <h1 className="font-display text-3xl">Gerenciar Assinaturas</h1>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por assinante, salão ou plano..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchSubscriptions}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas as Assinaturas ({filteredSubscriptions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assinante</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Salão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Créditos</TableHead>
                  <TableHead>Validade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Carregando assinaturas...
                    </TableCell>
                  </TableRow>
                ) : filteredSubscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma assinatura encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div className="font-medium">{sub.profile?.full_name || 'Usuário Desconhecido'}</div>
                        <div className="text-xs text-muted-foreground">{sub.profile?.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{sub.plan?.name || 'Plano Removido'}</div>
                        <div className="text-xs text-muted-foreground">
                          R$ {sub.plan?.price?.toFixed(2)} / mês
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Scissors className="w-3 h-3 text-muted-foreground" />
                          {sub.salon?.name || 'Salão Removido'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(sub.status)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {sub.current_credits} / {sub.plan?.credits_per_month}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {sub.end_date ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(sub.end_date).toLocaleDateString('pt-BR')}
                            </div>
                          ) : '-'}
                        </div>
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
