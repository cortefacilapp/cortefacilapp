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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  Search, 
  RefreshCw, 
  Mail, 
  Phone,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Subscriber {
  id: string;
  user_id: string;
  status: string;
  current_credits: number;
  plan: {
    name: string;
  };
  profile: {
    full_name: string;
    email: string;
    phone: string | null;
  };
  created_at: string;
}

export function SalonSubscribers() {
  const { user } = useAuth();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (user) {
      fetchSubscribers();
    }
  }, [user]);

  const fetchSubscribers = async () => {
    if (!user) return;

    try {
      // 1. Get salon id
      const { data: salon, error: salonError } = await supabase
        .from('salons')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (salonError) throw salonError;

      // 2. Get subscriptions for this salon
      const { data: subs, error: subsError } = await supabase
        .from('subscriptions')
        .select(`
          id,
          user_id,
          status,
          current_credits,
          created_at,
          plan:plans(name)
        `)
        .eq('salon_id', salon.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (subsError) throw subsError;

      // 3. Fetch profiles manually since there might be no direct FK
      const userIds = subs.map(s => s.user_id);
      
      let profilesMap: Record<string, any> = {};
      
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone')
          .in('id', userIds);
          
        if (!profilesError && profiles) {
          profilesMap = profiles.reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      const subscribersWithProfiles = subs.map(sub => ({
        ...sub,
        profile: profilesMap[sub.user_id] || { full_name: 'Usuário', email: '', phone: '' }
      }));

      setSubscribers(subscribersWithProfiles as any || []);
    } catch (error) {
      console.error('Error fetching subscribers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubscribers = subscribers.filter(sub => 
    sub.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Users className="w-8 h-8 text-primary" />
          <h1 className="font-display text-3xl">Meus Assinantes</h1>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle>Lista de Assinantes Ativos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Créditos</TableHead>
                <TableHead>Desde</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscribers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum assinante encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubscribers.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div className="font-medium">{sub.profile?.full_name || 'Sem nome'}</div>
                      <div className="text-sm text-muted-foreground">{sub.profile?.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        {sub.profile?.phone ? (
                          <>
                            <Phone className="w-3 h-3" />
                            {sub.profile.phone}
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-primary/10 border-primary/20">
                        {sub.plan?.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-bold text-lg">{sub.current_credits}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(sub.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
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
