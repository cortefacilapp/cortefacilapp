import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BadgeCheck, Scissors } from "lucide-react";
import { toast } from "sonner";

type Plan = { id: string; name: string; price: number; monthly_credits: number | null; interval: string | null; active: boolean };

const PlanosAdmin = () => {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<Plan | null>(null);
  const [editPrice, setEditPrice] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState<string>("Social");
  const [newPrice, setNewPrice] = useState<string>("59,99");
  const [newCredits, setNewCredits] = useState<number>(2);
  const allowed = useMemo(() => new Set(["Social", "Popular", "Premium"]), []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("plans")
        .select("id,name,price,monthly_credits,interval,active")
        .order("price", { ascending: true });
      if (error) {
        toast.error("Erro ao carregar planos");
      } else {
        const fetched = (data || []) as Plan[];
        const list = fetched.filter((p) => allowed.has(p.name));
        setPlans(list);
      }
      setLoading(false);
    };
    load();
  }, [allowed]);

  const formatBRLFromCents = (cents: number) => {
    try {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((Number(cents) || 0) / 100);
    } catch {
      const v = (Number(cents) || 0) / 100;
      return `R$ ${v.toFixed(2).replace('.', ',')}`;
    }
  };

  const parseBRLToCents = (value: string) => {
    const normalized = String(value)
      .replace(/\s+/g, "")
      .replace(/R\$/g, "")
      .replace(/\./g, "")
      .replace(/,/g, ".");
    const num = Number(normalized || "0");
    return Math.round(num * 100);
  };

  // Atualiza string formatada quando abrimos o modal
  useEffect(() => {
    if (selected) {
      const priceNum = Number(selected.price || 0);
      setEditPrice(priceNum > 0 ? formatBRLFromCents(priceNum) : "");
    } else {
      setEditPrice("");
    }
  }, [selected]);

  const savePlan = async (p: Plan) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("plans")
        .update({ price: p.price, monthly_credits: p.monthly_credits, interval: p.interval, active: p.active })
        .eq("id", p.id);
      if (error) throw error;
      toast.success("Plano atualizado");
      setSelected(null);
      const { data } = await supabase
        .from("plans")
        .select("id,name,price,monthly_credits,interval,active")
        .order("price", { ascending: true });
      const fetched = (data || []) as Plan[];
      setPlans(fetched.filter((x) => allowed.has(x.name)));
    } catch (e: unknown) {
      const msg = typeof e === "object" && e && "message" in e ? String((e as { message?: unknown }).message) : "Falha ao salvar";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (p: Plan) => {
    const next = { ...p, active: !p.active };
    await savePlan(next);
  };

  return (
    <div className="space-y-8">
      <div className="rounded-xl bg-gradient-to-br from-[#0A1A2F] to-[#1A73E8] p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">Planos</div>
            <div className="text-white/80">Gerencie os planos disponíveis na plataforma</div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm">
              <BadgeCheck className="h-4 w-4" />
              <span>{plans.filter((p) => p.active).length} ativos</span>
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
              <CardTitle>Catálogo</CardTitle>
              <CardDescription>Social, Popular e Premium</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end mb-4">
                <Button onClick={() => setCreateOpen(true)}>Adicionar plano</Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {plans.map((p) => (
                  <Card key={p.id} className={`overflow-hidden border-2 transition hover:scale-[1.01] ${p.active ? "border-primary" : ""}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{p.name}</span>
                        {p.active ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                            <BadgeCheck className="h-3 w-3" /> Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                            Inativo
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription>
                        R$ {(Number(p.price) / 100).toFixed(2)} / mês
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Scissors className="h-4 w-4" />
                        <span>{Number(p.monthly_credits || 0)} cortes/mês</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button variant="outline" onClick={() => setSelected(p)}>Editar</Button>
                        <div className="flex items-center justify-end">
                          <Switch
                            checked={p.active}
                            onCheckedChange={(checked) => savePlan({ ...p, active: checked })}
                            aria-label="Ativar plano"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {!plans.length && (
                  <div className="text-sm text-muted-foreground">Nenhum plano encontrado</div>
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
                  <span>Total de planos</span>
                  <span className="font-medium">{plans.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Ativos</span>
                  <span className="font-medium">{plans.filter((p) => p.active).length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Soma cortes/mês</span>
                  <span className="font-medium">{plans.reduce((acc, cur) => acc + Number(cur.monthly_credits || 0), 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar plano</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-sm text-muted-foreground">Preço (R$)</div>
                  <Input value={editPrice} onChange={(e) => {
                    const raw = e.target.value;
                    const digits = raw.replace(/\D/g, "");
                    if (!digits) {
                      setEditPrice("");
                      setSelected({ ...selected, price: 0 });
                      return;
                    }
                    const cents = Number.parseInt(digits, 10);
                    setSelected({ ...selected, price: cents });
                    setEditPrice(formatBRLFromCents(cents));
                  }} />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Cortes/mês</div>
                  <Input type="number" value={Number(selected.monthly_credits ?? 0)} onChange={(e) => setSelected({ ...selected, monthly_credits: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="w-full" onClick={() => setSelected(null)}>Cancelar</Button>
                <Button className="w-full" onClick={() => savePlan(selected)}>Salvar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo plano</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">Nome</div>
              <select className="w-full h-10 rounded border px-2" value={newName} onChange={(e) => setNewName(e.target.value)}>
                <option value="Social">Social</option>
                <option value="Popular">Popular</option>
                <option value="Premium">Premium</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-sm text-muted-foreground">Preço (R$)</div>
                <Input value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Cortes/mês</div>
                <Input type="number" value={newCredits} onChange={(e) => setNewCredits(Number(e.target.value))} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="w-full" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button className="w-full" onClick={async () => {
                try {
                  const priceVal = Number(String(newPrice).replace(',', '.'));
                  const priceCents = Math.round(priceVal * 100);
                  const { error } = await supabase
                    .from('plans')
                    .upsert({ name: newName, price: priceCents, monthly_credits: newCredits, interval: 'month', active: true }, { onConflict: 'name' });
                  if (error) throw error;
                  toast.success('Plano criado/atualizado');
                  setCreateOpen(false);
                  const { data } = await supabase
                    .from('plans')
                    .select('id,name,price,monthly_credits,interval,active')
                    .order('price', { ascending: true });
                  const fetched = (data || []) as Plan[];
                  setPlans(fetched.filter((x) => allowed.has(x.name)));
                } catch (e: unknown) {
                  const msg = typeof e === "object" && e && "message" in e ? String((e as { message?: unknown }).message) : 'Falha ao criar';
                  toast.error(msg);
                }
              }}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlanosAdmin;
