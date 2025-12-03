import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Wallet, CalendarDays, ArrowDownCircle } from "lucide-react";

const Repasses = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [withdraws, setWithdraws] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [exporting, setExporting] = useState(false);
  const [salonId, setSalonId] = useState<string | null>(null);
  const formatDateBR = (d: Date | null) => (d ? new Intl.DateTimeFormat("pt-BR").format(d) : "");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) { setLoading(false); return; }
      const { data: salon } = await supabase.from("salons").select("id,name").eq("owner_id", uid).maybeSingle();
      if (salon?.id) {
        setSalonId(salon.id);
        const { data } = await supabase
          .from("payouts")
          .select("id, amount, status, paid_at, period_start, period_end")
          .eq("salon_id", salon.id)
          .order("paid_at", { ascending: false });
        setItems(data || []);
        const { data: wr } = await supabase
          .from("withdraw_requests")
          .select("id, amount, status, pix_key, created_at, approved_at, paid_at, rejected_at")
          .eq("salon_id", salon.id)
          .order("created_at", { ascending: false });
        setWithdraws(wr || []);
      }
      setLoading(false);
    };
    load();
  }, []);

  const exportCsv = () => {
    try {
      setExporting(true);
      const rows = [
        ["id", "status", "amount_cents", "period_start", "period_end", "paid_at"],
        ...items.map((it) => [
          String(it.id || ""),
          String(it.status || ""),
          String(Number(it.amount || 0)),
          String(it.period_start || ""),
          String(it.period_end || ""),
          String(it.paid_at || ""),
        ]),
      ];
      const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "repasses.csv";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
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
          <CardTitle>Repasses do Salão</CardTitle>
          <CardDescription>Visão geral dos ciclos e pagamentos</CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            const now = new Date();
            const cs = new Date(now.getFullYear(), now.getMonth(), 1);
            const ce = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            const pending = (items || []).filter((p) => {
              const st = String(p.status || "").toLowerCase();
              const ps = (p as any).period_start ? new Date((p as any).period_start) : null;
              const pe = (p as any).period_end ? new Date((p as any).period_end) : null;
              return st === "pending" && ps && pe && ps >= cs && pe <= ce;
            }).reduce((acc, p) => acc + Number((p as any).amount || 0), 0);
            const paid = (items || []).filter((p) => String(p.status || "").toLowerCase() === "paid").reduce((acc, p) => acc + Number((p as any).amount || 0), 0);
            return (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border p-4 bg-muted/40 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Disponível no ciclo</div>
                    <div className="text-2xl font-bold">R$ {pending.toFixed(2)}</div>
                  </div>
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <div className="rounded-xl border p-4 bg-muted/40 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Recebidos</div>
                    <div className="text-2xl font-bold">R$ {paid.toFixed(2)}</div>
                  </div>
                  <ArrowDownCircle className="h-6 w-6 text-primary" />
                </div>
                <div className="rounded-xl border p-4 bg-muted/40 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Ciclo</div>
                    <div className="text-sm font-medium flex items-center gap-2"><CalendarDays className="h-4 w-4" />{formatDateBR(cs)} — {formatDateBR(ce)}</div>
                  </div>
                  <span className="inline-flex items-center rounded px-2 py-1 bg-primary/10 text-primary">Mensal</span>
                </div>
              </div>
            );
          })()}

          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <div key={it.id} className="rounded border p-3">
                <div className="font-medium">R$ {(Number(it.amount) / 100).toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">{String(it.status)}</div>
                <div className="text-sm">Período: {it.period_start ? formatDateBR(new Date(it.period_start)) : "--"} até {it.period_end ? formatDateBR(new Date(it.period_end)) : "--"}</div>
                <Button variant="outline" className="mt-3 w-full" onClick={() => setSelected(it)}>Detalhes</Button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={exportCsv} disabled={exporting}>Exportar Relatório (CSV)</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Solicitações de Saque</CardTitle>
          <CardDescription>Pedidos enviados com PIX do salão</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {withdraws.map((w) => (
              <div key={w.id} className="rounded border p-3">
                <div className="font-medium">R$ {Number(w.amount || 0).toFixed(2)}</div>
                <div className="text-sm">PIX: {w.pix_key}</div>
                <div className="text-sm text-muted-foreground">Status: {String(w.status)}</div>
                <div className="text-xs text-muted-foreground">Criado: {w.created_at ? new Date(w.created_at).toLocaleString() : "--"}</div>
                {!!w.approved_at && <div className="text-xs text-muted-foreground">Aprovado: {new Date(w.approved_at).toLocaleString()}</div>}
                {!!w.paid_at && <div className="text-xs text-muted-foreground">Pago: {new Date(w.paid_at).toLocaleString()}</div>}
                {!!w.rejected_at && <div className="text-xs text-muted-foreground">Rejeitado: {new Date(w.rejected_at).toLocaleString()}</div>}
              </div>
            ))}
            {!withdraws.length && (
              <div className="text-sm text-muted-foreground">Nenhuma solicitação de saque</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Repasse</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-2">
              <div>Valor: R$ {(Number(selected.amount) / 100).toFixed(2)}</div>
              <div>Status: {selected.status}</div>
              <div>Pago em: {selected.paid_at ? new Date(selected.paid_at).toLocaleString() : "--"}</div>
              <div>Período: {selected.period_start || "--"} até {selected.period_end || "--"}</div>
              <Button className="w-full" variant="outline" onClick={() => setSelected(null)}>Fechar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Repasses;
