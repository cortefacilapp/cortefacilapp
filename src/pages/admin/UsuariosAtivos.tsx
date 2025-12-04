import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, Mail, IdCard, BadgeCheck } from "lucide-react";

type UserCommon = { id: string; full_name?: string | null; name?: string | null; email: string; role?: string };
type PlanInfo = { name: string; price: number; credits: number };
type Affiliation = { id: string; name: string };

const UsuariosAtivos = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserCommon[]>([]);
  const [selected, setSelected] = useState<UserCommon | null>(null);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [affiliation, setAffiliation] = useState<Affiliation | null>(null);
  const [query, setQuery] = useState("");
  const [activeSubs, setActiveSubs] = useState<Set<string>>(new Set());
  const [affiliationsMap, setAffiliationsMap] = useState<Map<string, string>>(new Map());

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
      try {
        const ids = list.map((u) => u.id).filter(Boolean);
        if (ids.length) {
          const { data: subs } = await supabase
            .from("user_subscriptions")
            .select("user_id,status,current_period_start,current_period_end")
            .in("user_id", ids);
          const now = new Date();
          const ok = new Set<string>();
          (subs || []).forEach((s: any) => {
            const ps = s?.current_period_start ? new Date(String(s.current_period_start)) : null;
            const pe = s?.current_period_end ? new Date(String(s.current_period_end)) : null;
            const st = String(s?.status || "").toLowerCase();
            if (ps && pe && now >= ps && now <= pe && ["active", "approved", "trialing"].includes(st)) {
              ok.add(String(s.user_id));
            }
          });
          setActiveSubs(ok);
          const { data: affs } = await supabase
            .from("user_affiliations")
            .select("user_id,salon_id")
            .in("user_id", ids);
          const map = new Map<string, string>();
          const uniqueSalonIds = Array.from(new Set((affs || []).map((a: any) => String(a.salon_id)).filter(Boolean)));
          let salonNames: Record<string, string> = {};
          if (uniqueSalonIds.length) {
            const { data: salons } = await supabase.from("salons").select("id,name").in("id", uniqueSalonIds);
            (salons || []).forEach((s: any) => { salonNames[String(s.id)] = String(s.name || "Salão"); });
          }
          (affs || []).forEach((a: any) => {
            const sid = String(a.salon_id || "");
            if (sid) map.set(String(a.user_id), salonNames[sid] || "Salão");
          });
          setAffiliationsMap(map);
        }
      } catch {
        setActiveSubs(new Set());
        setAffiliationsMap(new Map());
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const loadDetails = async () => {
      if (!selected?.id) { setPlanInfo(null); setAffiliation(null); return; }
      // Plano ativo com fallback por período e status
      const { data: subActive } = await supabase
        .from("user_subscriptions")
        .select("plan_id,status,current_period_start,current_period_end")
        .eq("user_id", selected.id)
        .eq("status", "active")
        .order("current_period_end", { ascending: false })
        .maybeSingle();
      type SubRow = { plan_id?: string | null; status?: string | null; current_period_start?: string | null; current_period_end?: string | null };
      let subRow = subActive as SubRow | null;
      if (!subRow) {
        const { data: subsAll } = await supabase
          .from("user_subscriptions")
          .select("plan_id,status,current_period_start,current_period_end")
          .eq("user_id", selected.id)
          .order("current_period_end", { ascending: false })
          .limit(5);
        const now = new Date();
        const pick = (subsAll || []).find((s: any) => {
          const ps = s?.current_period_start ? new Date(String(s.current_period_start)) : null;
          const pe = s?.current_period_end ? new Date(String(s.current_period_end)) : null;
          const st = String(s?.status || "").toLowerCase();
          return ps && pe && now >= ps && now <= pe && ["active","approved","trialing"].includes(st);
        }) || (subsAll && subsAll.length ? subsAll[0] : null);
        subRow = (pick as SubRow | null) || null;
      }
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      (u.full_name || u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q)
    );
  }, [query, users]);

  const totalUsers = users.length;
  const totalWithPlan = Array.from(activeSubs).length;
  const totalAffiliations = Array.from(affiliationsMap.keys()).length;

  return (
    <div className="space-y-8">
      <div className="rounded-xl bg-gradient-to-br from-[#0A1A2F] to-[#1A73E8] p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">Usuários Comuns Ativos</div>
            <div className="text-white/80">Visão geral e gestão</div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm">
              <Users className="h-4 w-4" />
              <span>{totalUsers} usuários</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2 border-2">
            <CardHeader>
              <CardTitle>Lista</CardTitle>
              <CardDescription>Buscar por nome ou email</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input placeholder="Buscar usuários" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((u) => (
                  <Card key={u.id} className="overflow-hidden border-2 transition hover:scale-[1.01]">
                    <CardHeader>
                      <CardTitle className="text-lg">{u.full_name || u.name || u.email}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{u.email}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <IdCard className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{u.role || "user"}</span>
                        {activeSubs.has(u.id) && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                            <BadgeCheck className="h-3 w-3" /> Plano ativo
                          </span>
                        )}
                        {affiliationsMap.has(u.id) && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">
                            Afiliado: {affiliationsMap.get(u.id)}
                          </span>
                        )}
                      </div>
                      <Button variant="outline" className="mt-3 w-full" onClick={() => setSelected(u)}>Detalhes</Button>
                    </CardContent>
                  </Card>
                ))}
                {!filtered.length && (
                  <div className="text-sm text-muted-foreground">Nenhum usuário encontrado</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
              <CardDescription>Métricas rápidas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Total de usuários</span>
                  <span className="font-medium">{totalUsers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Com plano ativo</span>
                  <span className="font-medium">{totalWithPlan}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Afiliados a salões</span>
                  <span className="font-medium">{totalAffiliations}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
