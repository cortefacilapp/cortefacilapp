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
import { supabase } from "@/integrations/supabase/client";
import { Building, CheckCircle2, XCircle, Search, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Salon {
  id: string;
  name: string;
  cnpj: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  is_approved: boolean;
  is_active: boolean;
  created_at: string;
}

export function AdminSalons() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSalons();
  }, []);

  const fetchSalons = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('salons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSalons(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar salões:', error);
      toast.error("Erro ao carregar lista de salões");
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (salon: Salon) => {
    try {
      const newStatus = !salon.is_active;
      const { error } = await supabase
        .from('salons')
        .update({ is_active: newStatus })
        .eq('id', salon.id);

      if (error) throw error;

      toast.success(`Salão ${newStatus ? 'ativado' : 'desativado'} com sucesso`);
      fetchSalons();
    } catch (error) {
      toast.error("Erro ao atualizar status do salão");
    }
  };

  const toggleApproval = async (salon: Salon) => {
    try {
      const newApproval = !salon.is_approved;
      const { error } = await supabase
        .from('salons')
        .update({ is_approved: newApproval })
        .eq('id', salon.id);

      if (error) throw error;

      toast.success(`Salão ${newApproval ? 'aprovado' : 'desaprovado'} com sucesso`);
      fetchSalons();
    } catch (error) {
      toast.error("Erro ao atualizar aprovação do salão");
    }
  };

  const filteredSalons = salons.filter(salon => 
    salon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    salon.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    salon.cnpj?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Building className="w-8 h-8 text-primary" />
          <h1 className="font-display text-3xl">Gerenciar Salões</h1>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, cidade ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchSalons}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Salões ({filteredSalons.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ / Contato</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aprovação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Carregando salões...
                    </TableCell>
                  </TableRow>
                ) : filteredSalons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum salão encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSalons.map((salon) => (
                    <TableRow key={salon.id}>
                      <TableCell className="font-medium">
                        {salon.name}
                        <div className="text-xs text-muted-foreground">
                          Cadastrado em {new Date(salon.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{salon.cnpj || '-'}</div>
                        <div className="text-xs text-muted-foreground">{salon.phone || '-'}</div>
                      </TableCell>
                      <TableCell>
                        {salon.city && salon.state ? `${salon.city}/${salon.state}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={salon.is_active ? "default" : "destructive"}>
                          {salon.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={salon.is_approved ? "secondary" : "outline"} className={salon.is_approved ? "bg-green-100 text-green-800 hover:bg-green-200" : "text-yellow-600 border-yellow-600"}>
                          {salon.is_approved ? "Aprovado" : "Pendente"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleApproval(salon)}
                            title={salon.is_approved ? "Revogar aprovação" : "Aprovar"}
                          >
                            {salon.is_approved ? (
                              <XCircle className="h-4 w-4 text-orange-500" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleStatus(salon)}
                            title={salon.is_active ? "Desativar" : "Ativar"}
                          >
                            {salon.is_active ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-blue-500" />
                            )}
                          </Button>
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
