import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const UsuariosAtivos = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await supabase
        .from("profiles")
        .select("id, name, email, role")
        .eq("role", "user")
        .order("name", { ascending: true });
      if (!res.error && res.data) setUsers(res.data);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Usuários Comuns Ativos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {users.map((u) => (
              <div key={u.id} className="rounded border p-3">
                <div className="font-medium">{u.name || u.email}</div>
                <div className="text-sm text-muted-foreground">{u.email}</div>
                <Button variant="outline" className="mt-3 w-full" onClick={() => setSelected(u)}>Detalhes</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.name || selected?.email}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-2">
              <div>ID: {selected.id}</div>
              <div>Email: {selected.email}</div>
              <div>Nome: {selected.name || "--"}</div>
              <div>Perfil: {selected.role}</div>
              <Button className="w-full" variant="outline" onClick={() => setSelected(null)}>Fechar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsuariosAtivos;

