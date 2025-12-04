import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Wallet, CalendarDays, CheckCircle, XCircle, ArrowDownCircle } from "lucide-react";

const SolicitacoesSaque = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("withdraw_requests")
      .select("id, salon_id, owner_id, amount, status, pix_key, created_at, approved_at, paid_at, rejected_at")
      .order("created_at", { ascending: false });
    const base = data || [];
    const salonIds = Array.from(new Set(base.map((x: any) => String(x.salon_id)).filter(Boolean)));
    let nameMap: Record<string, string> = {};
    if (salonIds.length) {
      const { data: salons } = await supabase.from("salons").select("id,name").in("id", salonIds);
      (salons || []).forEach((s: any) => { nameMap[String(s.id)] = String(s.name || "Salão"); });
    }
    const enriched = base.map((x: any) => ({ ...x, salonName: nameMap[String(x.salon_id)] || "Salão" }));
    setItems(enriched);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const act = async (id: string, action: "approve" | "reject" | "paid") => {
    const { data, error } = await supabase.rpc("admin_mark_withdraw", { p_request: id, p_action: action });
    if (!error && data?.ok) {
      toast.success("Ação aplicada");
      load();
    } else {
      toast.error(error?.message || String(data?.error || "Falha"));
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      String(it.salonName || "").toLowerCase().includes(q) ||
      String(it.pix_key || "").toLowerCase().includes(q) ||
      String(it.status || "").toLowerCase().includes(q)
    );
  }, [query, items]);

  const totals = useMemo(() => {
    const requested = items.filter((x) => String(x.status).toLowerCase() === "requested");
    const approved = items.filter((x) => String(x.status).toLowerCase() === "approved");
    const paid = items.filter((x) => String(x.status).toLowerCase() === "paid");
    const rejected = items.filter((x) => String(x.status).toLowerCase() === "rejected");
    const sum = (arr: any[]) => arr.reduce((acc, cur) => acc + Number(cur.amount || 0), 0);
    return {
      requestedCount: requested.length,
      approvedCount: approved.length,
      paidCount: paid.length,
      rejectedCount: rejected.length,
      requestedTotal: sum(requested),
      approvedTotal: sum(approved),
      paidTotal: sum(paid),
    };
  }, [items]);

  return (
    <div className="space-y-8">
      <div className="rounded-xl bg-gradient-to-br from-[#0A1A2F] to-[#1A73E8] p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">Solicitações de Saque</div>
            <div className="text-white/80">Gestão de pedidos dos salões</div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm">
              <Wallet className="h-4 w-4" />
              <span>{items.length} solicitações</span>
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
              <CardDescription>Buscar por salão, PIX ou status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input placeholder="Buscar solicitações" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((it) => (
                  <Card key={it.id} className="overflow-hidden border-2 transition hover:scale-[1.01]">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-lg">
                        <span>{it.salonName || "Salão"}</span>
                        <span className="text-primary">R$ {Number(it.amount || 0).toFixed(2)}</span>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(it.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm">PIX: {it.pix_key || "--"}</div>
                      <div className="mt-2 text-xs">
                        {String(it.status).toLowerCase() === "requested" && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 font-medium text-amber-700">
                            Pendente
                          </span>
                        )}
                        {String(it.status).toLowerCase() === "approved" && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 font-medium text-emerald-700">
                            <CheckCircle className="h-3 w-3" /> Aprovado
                          </span>
                        )}
                        {String(it.status).toLowerCase() === "paid" && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-100 px-2 py-1 font-medium text-indigo-700">
                            <ArrowDownCircle className="h-3 w-3" /> Pago
                          </span>
                        )}
                        {String(it.status).toLowerCase() === "rejected" && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 font-medium text-red-700">
                            <XCircle className="h-3 w-3" /> Rejeitado
                          </span>
                        )}
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <Button variant="outline" onClick={() => act(it.id, "approve")} disabled={String(it.status).toLowerCase() !== "requested"}>Aprovar</Button>
                        <Button variant="outline" onClick={() => act(it.id, "reject")} disabled={String(it.status).toLowerCase() !== "requested"}>Rejeitar</Button>
                        <Button onClick={() => act(it.id, "paid")} disabled={String(it.status).toLowerCase() !== "approved"}>Marcar como Pago</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {!filtered.length && (
                  <div className="text-sm text-muted-foreground">Nenhuma solicitação</div>
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
                  <span>Pendentes</span>
                  <span className="font-medium">{totals.requestedCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Aprovadas</span>
                  <span className="font-medium">{totals.approvedCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Pagas</span>
                  <span className="font-medium">{totals.paidCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Rejeitadas</span>
                  <span className="font-medium">{totals.rejectedCount}</span>
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                <div className="rounded-xl border p-4 bg-muted/40 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Total solicitado</div>
                    <div className="text-2xl font-bold">R$ {Number(totals.requestedTotal).toFixed(2)}</div>
                  </div>
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <div className="rounded-xl border p-4 bg-muted/40 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Total aprovado</div>
                    <div className="text-2xl font-bold">R$ {Number(totals.approvedTotal).toFixed(2)}</div>
                  </div>
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <div className="rounded-xl border p-4 bg-muted/40 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Total pago</div>
                    <div className="text-2xl font-bold">R$ {Number(totals.paidTotal).toFixed(2)}</div>
                  </div>
                  <ArrowDownCircle className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SolicitacoesSaque;
