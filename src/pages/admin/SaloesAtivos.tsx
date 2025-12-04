import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, Phone, CalendarDays, Store } from "lucide-react";

const SaloesAtivos = () => {
  const [loading, setLoading] = useState(true);
  type SalonRow = { id: string; name: string; city: string; state: string; address: string; owner_id: string; approved_at?: string | null; phone?: string | null; photo_url?: string | null };
  const [salons, setSalons] = useState<SalonRow[]>([]);
  const [selected, setSelected] = useState<SalonRow | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await supabase.from("salons").select("id, name, city, state, address, owner_id, approved_at, phone, photo_url").eq("status", "approved");
      if (!res.error && res.data) setSalons(res.data);
      setLoading(false);
    };
    load();
  }, []);

  

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return salons;
    return salons.filter((s) =>
      (s.name || "").toLowerCase().includes(q) ||
      (s.city || "").toLowerCase().includes(q) ||
      (s.state || "").toLowerCase().includes(q) ||
      (s.address || "").toLowerCase().includes(q)
    );
  }, [query, salons]);

  const activeCount = salons.length;

  return (
    <div className="space-y-8">
      <div className="rounded-xl bg-gradient-to-br from-[#0A1A2F] to-[#1A73E8] p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">Salões Ativos</div>
            <div className="text-white/80">Gerencie os salões aprovados na plataforma</div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm">
              <Store className="h-4 w-4" />
              <span>{activeCount} ativos</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2 border-2">
              <CardHeader>
                <CardTitle>Catálogo</CardTitle>
                <CardDescription>Busca por nome, cidade, estado ou endereço</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Input placeholder="Buscar salões" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((s) => (
                    <Card key={s.id} className="overflow-hidden border-2 transition hover:scale-[1.01]">
                      <div className="relative h-32 w-full">
                        {s.photo_url ? (
                          <img src={s.photo_url} alt={s.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0A1A2F] to-[#1A73E8] text-white">
                            <span className="text-lg font-semibold">{s.name.split(" ")[0]}</span>
                          </div>
                        )}
                      </div>
                      <CardHeader>
                        <CardTitle className="text-lg">{s.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{s.city}/{s.state}</span>
                        </div>
                        <div className="mt-1 text-sm">{s.address}</div>
                        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{s.phone || "sem telefone"}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <CalendarDays className="h-3 w-3" />
                          <span>Aprovado em {s.approved_at ? new Date(s.approved_at).toLocaleDateString("pt-BR") : "--"}</span>
                        </div>
                        <Button variant="outline" className="mt-3 w-full" onClick={() => setSelected(s)}>Detalhes</Button>
                      </CardContent>
                    </Card>
                  ))}
                  {!filtered.length && (
                    <div className="text-sm text-muted-foreground">Nenhum salão encontrado</div>
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
                    <span>Salões ativos</span>
                    <span className="font-medium">{activeCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Cidades distintas</span>
                    <span className="font-medium">{new Set(filtered.map((s) => s.city)).size}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Estados distintos</span>
                    <span className="font-medium">{new Set(filtered.map((s) => s.state)).size}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{selected?.name}</DialogTitle>
              </DialogHeader>
              {selected && (
                <div className="space-y-2">
                  <div>{selected.address}</div>
                  <div>{selected.city}/{selected.state} - {selected.phone || "sem telefone"}</div>
                  <div>Ativo desde: {selected.approved_at ? new Date(selected.approved_at).toLocaleDateString() : "--"}</div>
                  <Button className="w-full" variant="outline" onClick={() => setSelected(null)}>Fechar</Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default SaloesAtivos;
