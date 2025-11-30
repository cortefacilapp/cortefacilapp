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
      const { data: common } = await supabase.rpc("list_common_users");
      let list = (common as any[]) || [];
      if (!Array.isArray(list) || !list.length) {
        const res = await supabase
          .from("profiles")
          .select("id, name, full_name, email, role")
          .in("role", ["user", "customer"])
          .order("name", { ascending: true });
        list = res.error ? [] : (res.data || []);
        if (list.length) {
          const ids = list.map((u: any) => u.id).filter(Boolean);
          const { data: contacts } = await supabase.rpc("user_contacts_for_users", { p_ids: ids });
          const nameMap = new Map<string, string>();
          const emailMap = new Map<string, string>();
          (contacts || []).forEach((n: any) => {
            if (n && n.user_id) {
              nameMap.set(String(n.user_id), String(n.full_name || ""));
              emailMap.set(String(n.user_id), String(n.email || ""));
            }
          });
          list = list.map((u: any) => ({
            ...u,
            full_name: nameMap.get(u.id) || u.full_name || u.name || null,
            email: emailMap.get(u.id) || u.email,
          }));
        }
      }
      list.sort((a: any, b: any) => String(a.full_name || a.name || a.email).localeCompare(String(b.full_name || b.name || b.email)));
      setUsers(list);
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
                <div className="font-medium">{u.full_name || u.name || u.email}</div>
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
            <DialogTitle>{selected?.full_name || selected?.name || selected?.email}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-2">
              <div>ID: {selected.id}</div>
              <div>Email: {selected.email}</div>
              <div>Nome: {selected.full_name || selected.name || "--"}</div>
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
