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
import { Users, Search, RefreshCw, Mail, Phone, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: string;
}

export function AdminSubscribers() {
  const [subscribers, setSubscribers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      // 1. Fetch user IDs with 'subscriber' role from user_roles table
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'subscriber');

      if (rolesError) throw rolesError;

      if (!userRoles || userRoles.length === 0) {
        setSubscribers([]);
        setLoading(false);
        return;
      }

      const userIds = userRoles.map(ur => ur.user_id);

      // 2. Fetch profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      setSubscribers(profiles || []);
    } catch (error: any) {
      console.error('Erro ao buscar assinantes:', error);
      toast.error("Erro ao carregar lista de assinantes");
    } finally {
      setLoading(false);
    }
  };

  const filteredSubscribers = subscribers.filter(sub => 
    sub.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.cpf?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Users className="w-8 h-8 text-primary" />
          <h1 className="font-display text-3xl">Gerenciar Assinantes</h1>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchSubscribers}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Assinantes ({filteredSubscribers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assinante</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      Carregando assinantes...
                    </TableCell>
                  </TableRow>
                ) : filteredSubscribers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhum assinante encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubscribers.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div className="font-medium">{sub.full_name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {sub.email}
                          </div>
                          {sub.phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              {sub.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {sub.cpf || <span className="text-muted-foreground text-xs italic">Não informado</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {new Date(sub.created_at).toLocaleDateString('pt-BR')}
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
