import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SalonsBrowse = () => {
  const [loading, setLoading] = useState(true);
  const [salons, setSalons] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [affId, setAffId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("salons")
        .select("id,name,address,city,state,phone,status")
        .eq("status", "approved")
        .order("name", { ascending: true });
      if (!error && data) setSalons(data);
      // load current affiliation
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData?.user?.id || null;
        if (uid) {
          const { data: aff } = await supabase
            .from("user_affiliations")
            .select("salon_id")
            .eq("user_id", uid)
            .maybeSingle();
          setAffId(aff?.salon_id || null);
        }
      } catch (_) {}
      setLoading(false);
    };
    load();
  }, []);

  const filtered = salons.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (s.name || "").toLowerCase().includes(q) ||
      (s.city || "").toLowerCase().includes(q) ||
      (s.state || "").toLowerCase().includes(q) ||
      (s.address || "").toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed inset-x-0 top-0 z-50 border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="text-xl font-bold">Salões Credenciados</div>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>Voltar ao Dashboard</Button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 pt-20">
        <div className="mb-6 grid gap-3 md:grid-cols-2">
          <Input placeholder="Buscar por nome, cidade, estado ou endereço" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  {s.name}
                  {affId === s.id && (
                    <span className="text-xs rounded px-2 py-0.5 bg-primary/10 text-primary">Afiliado</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div>{s.address}</div>
                  <div>{s.city}/{s.state}</div>
                  <div>{s.phone || "sem telefone"}</div>
                </div>
                <div className="mt-4">
                  <Button variant="default" className="w-full" onClick={async () => {
                    try {
                      const { data: userData } = await supabase.auth.getUser();
                      const uid = userData?.user?.id;
                      if (!uid) { toast.error("Faça login para afiliar-se"); return; }
                      // Check last affiliation and subscription cycle
                      const { data: current } = await supabase
                        .from("user_affiliations")
                        .select("salon_id, updated_at")
                        .eq("user_id", uid)
                        .maybeSingle();
                      if (current?.salon_id === s.id) {
                        toast.success("Você já está afiliado a este salão");
                        return;
                      }
                        let canChange = true;
                        // regra: só permitir troca no fim do ciclo
                        const { data: sub } = await supabase
                          .from("user_subscriptions")
                          .select("current_period_end,status")
                          .eq("user_id", uid)
                          .order("current_period_end", { ascending: false })
                          .maybeSingle();
                        const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end) : null;
                        if (current?.salon_id && current.salon_id !== s.id) {
                          if (periodEnd && new Date() < periodEnd) {
                            canChange = false;
                          }
                        }
                      if (!canChange) {
                        toast.error("Você só pode trocar uma vez por mês ou no fim do ciclo");
                        return;
                      }
                      try {
                        const { data: res, error } = await supabase
                          .rpc("set_user_affiliation", { p_user: uid, p_salon: s.id });
                        if (error) throw error;
                      } catch (_err) {
                        const { data: existing } = await supabase
                          .from("user_affiliations")
                          .select("user_id")
                          .eq("user_id", uid)
                          .maybeSingle();
                        if (existing?.user_id) {
                          const { error: updErr } = await supabase
                            .from("user_affiliations")
                            .update({ salon_id: s.id, affiliated_at: new Date().toISOString() })
                            .eq("user_id", uid);
                          if (updErr) { toast.error(updErr.message || "Falha ao atualizar afiliação"); return; }
                        } else {
                          const { error: insErr } = await supabase
                            .from("user_affiliations")
                            .insert({ user_id: uid, salon_id: s.id, affiliated_at: new Date().toISOString() });
                          if (insErr) { toast.error(insErr.message || "Falha ao criar afiliação"); return; }
                        }
                      }
                      setAffId(s.id);
                      toast.success(`Afiliado ao salão: ${s.name}`);
                    } catch (e) {
                      toast.error((e as any)?.message || "Erro ao afiliar-se");
                    }
                  }} disabled={affId === s.id}>{affId === s.id ? "Afiliado" : "Afiliar-se a este salão"}</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!filtered.length && (
            <div className="text-sm text-muted-foreground">Nenhum salão encontrado</div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SalonsBrowse;
