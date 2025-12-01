import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type UserCommon = { id: string; full_name?: string | null; name?: string | null; email: string; role?: string };
type PlanInfo = { name: string; price: number; credits: number };
type Affiliation = { id: string; name: string };

const UsuariosAtivos = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserCommon[]>([]);
  const [selected, setSelected] = useState<UserCommon | null>(null);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [affiliation, setAffiliation] = useState<Affiliation | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: common } = await supabase.rpc("list_common_users");
      let list: UserCommon[] = Array.isArray(common) ? (common as unknown as UserCommon[]) : [];
      if (!Array.isArray(list) || !list.length) {
        const res = await supabase
          .from("profiles")
          .select("id, name, full_name, email, role")
          .in("role", ["user", "customer"])
          .order("name", { ascending: true });
        list = res.error ? [] : ((res.data || []) as UserCommon[]);
        if (list.length) {
          const ids = list.map((u: any) => u.id).filter(Boolean);
          const { data: contacts } = await supabase.rpc("user_contacts_for_users", { p_ids: ids });
          type Contact = { user_id: string; full_name?: string | null; email?: string | null };
          const nameMap = new Map<string, string>();
          const emailMap = new Map<string, string>();
          (Array.isArray(contacts) ? (contacts as unknown as Contact[]) : []).forEach((n) => {
            if (n && n.user_id) {
              nameMap.set(String(n.user_id), String(n.full_name || ""));
              emailMap.set(String(n.user_id), String(n.email || ""));
            }
          });
          list = list.map((u: UserCommon) => ({
            ...u,
            full_name: nameMap.get(u.id) || u.full_name || u.name || null,
            email: emailMap.get(u.id) || u.email,
          }));
        }
      }
      list.sort((a: UserCommon, b: UserCommon) => String(a.full_name || a.name || a.email).localeCompare(String(b.full_name || b.name || b.email)));
      setUsers(list);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const loadDetails = async () => {
      if (!selected?.id) { setPlanInfo(null); setAffiliation(null); return; }
      // Plano ativo
      const { data: sub } = await supabase
        .from("user_subscriptions")
        .select("plan_id,status,current_period_start,current_period_end")
        .eq("user_id", selected.id)
        .eq("status", "active")
        .order("current_period_end", { ascending: false })
        .maybeSingle();
      type SubRow = { plan_id?: string | null; status?: string | null; current_period_start?: string | null; current_period_end?: string | null };
      const subRow = sub as SubRow | null;
      if (subRow?.plan_id) {
        const { data: p } = await supabase
          .from("plans")
          .select("name,price,monthly_credits,cuts_per_month")
          .eq("id", subRow.plan_id)
          .maybeSingle();
        type PlanRow = { name: string; price: number; monthly_credits?: number | null; cuts_per_month?: number | null };
        const pr = p as PlanRow | null;
        setPlanInfo(pr ? { name: pr.name, price: pr.price, credits: (pr.monthly_credits ?? pr.cuts_per_month ?? 0) as number } : null);
      } else {
        setPlanInfo(null);
      }
      // Afiliação
      const { data: aff } = await supabase
        .from("user_affiliations")
        .select("salon_id")
        .eq("user_id", selected.id)
        .maybeSingle();
      type AffRow = { salon_id?: string | null };
      const affRow = aff as AffRow | null;
      if (affRow?.salon_id) {
        const { data: salon } = await supabase
          .from("salons")
          .select("name")
          .eq("id", affRow.salon_id)
          .maybeSingle();
        type SalonRow = { name?: string | null };
        const sr = salon as SalonRow | null;
        setAffiliation({ id: String(affRow.salon_id), name: String(sr?.name || "Salão") });
      } else {
        setAffiliation(null);
      }
    };
    loadDetails();
  }, [selected?.id]);

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
              <div className="mt-2">
                {planInfo ? (
                  <div className="text-sm inline-flex items-center rounded px-2 py-1 bg-secondary text-secondary-foreground">
                    Plano ativo: {planInfo.name} • R$ {(Number(planInfo.price) / 100).toFixed(2)}/mês • {Number(planInfo.credits || 0)} cortes/mês
                  </div>
                ) : (
                  <div className="text-sm inline-flex items-center rounded px-2 py-1 bg-secondary text-secondary-foreground">Sem plano ativo</div>
                )}
              </div>
              <div className="mt-1 text-sm">
                Salão de afiliação: {affiliation?.name || "--"}
              </div>
              <Button className="w-full" variant="outline" onClick={() => setSelected(null)}>Fechar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsuariosAtivos;
