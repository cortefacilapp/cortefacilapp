import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const Validacoes = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [salonId, setSalonId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userCodes, setUserCodes] = useState<any[]>([]);

  const displayNameFor = (u: any) => {
    const s = (u && u.full_name) || "";
    if (typeof s === "string" && s.trim()) return s;
    return "—";
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) { setLoading(false); return; }
      const { data: salon } = await supabase.from("salons").select("id").eq("owner_id", uid).maybeSingle();
      const sid = salon?.id || null;
      setSalonId(sid);
      if (sid) {
        const { data: aff } = await supabase.rpc("affiliates_for_owner", { p_owner: uid });
        const enriched = (aff || []).map((u: any) => ({
          id: u.user_id,
          full_name: u.full_name,
          email: u.email,
          usedCount: Number(u.used_count || 0),
          affiliated_at: u.affiliated_at,
        }));
        setUsers(enriched);
      }
      setLoading(false);
    };
    load();
  }, []);

  const openUserValidations = async (user: any) => {
    if (!salonId) return;
    setSelectedUser(user);
    const { data: codes } = await supabase
      .from("codes")
      .select("id, code, user_id, used_at, status")
      .eq("user_id", user.id)
      .eq("used_by_salon_id", salonId)
      .or("status.eq.used,used.eq.true")
      .order("used_at", { ascending: false });
    const list = codes || [];
    const detailed = [] as any[];
    for (const c of list) {
      const usedAt = c.used_at ? new Date(c.used_at) : null;
      const { data: uSub } = await supabase
        .from("user_subscriptions")
        .select("plan_id,status,current_period_start,current_period_end")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("current_period_end", { ascending: false })
        .maybeSingle();
      let amount = 0;
      if (uSub?.plan_id) {
        if (usedAt) {
          const ps = uSub.current_period_start ? new Date(uSub.current_period_start) : null;
          const pe = uSub.current_period_end ? new Date(uSub.current_period_end) : null;
          if (ps && pe && usedAt >= ps && usedAt <= pe) {
            const { data: plan } = await supabase
              .from("plans")
              .select("price,monthly_credits,cuts_per_month")
              .eq("id", uSub.plan_id)
              .maybeSingle();
            const credits = Number((plan as any)?.monthly_credits ?? (plan as any)?.cuts_per_month ?? 1) || 1;
            const price = Number((plan as any)?.price ?? 0);
        const priceCents = Number(price ?? 0);
        if (priceCents > 0 && credits > 0) amount = Math.round((((priceCents / 100) / credits) * 100)) / 100;
          }
        }
      }
      detailed.push({ ...c, amount });
    }
    setUserCodes(detailed);
  };

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
          <CardTitle>Histórico de Validações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {users.map((u) => (
              <div key={u.id} className="rounded border p-3">
                <div className="font-medium">{displayNameFor(u)}</div>
                <div className="text-sm text-muted-foreground">Validações no mês: {u.usedCount}</div>
                <Button variant="outline" className="mt-3 w-full" onClick={() => openUserValidations(u)}>Ver Validações</Button>
              </div>
            ))}
            {!users.length && (
              <div className="text-sm text-muted-foreground">Nenhum usuário afiliado com validações</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedUser} onOpenChange={() => { setSelectedUser(null); setUserCodes([]); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Validações do Usuário</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-3">
              <div className="text-sm">{displayNameFor(selectedUser)}</div>
              <div className="grid gap-2 md:grid-cols-2">
                {userCodes.map((c) => (
                  <div key={c.id} className="rounded border p-2">
                    <div className="font-mono text-sm">Código {c.code}</div>
                    {Number(c.amount) > 0 && (
                      <div className="text-sm">Valor: R$ {Number(c.amount).toFixed(2)}</div>
                    )}
                    <div className="text-xs text-muted-foreground">{c.used_at ? new Date(c.used_at).toLocaleString() : "--"}</div>
                  </div>
                ))}
                {!userCodes.length && (
                  <div className="text-sm text-muted-foreground">Nenhuma validação encontrada</div>
                )}
              </div>
              <Button className="w-full" variant="outline" onClick={() => { setSelectedUser(null); setUserCodes([]); }}>Fechar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Validacoes;
