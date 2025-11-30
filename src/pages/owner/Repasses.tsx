import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const Repasses = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) { setLoading(false); return; }
      const { data: salon } = await supabase.from("salons").select("id").eq("owner_id", uid).maybeSingle();
      if (salon?.id) {
        const { data } = await supabase
          .from("payouts")
          .select("id, amount, status, paid_at, period_start, period_end")
          .eq("salon_id", salon.id)
          .order("paid_at", { ascending: false });
        setItems(data || []);
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
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <div key={it.id} className="rounded border p-3">
                <div className="font-medium">R$ {(Number(it.amount) / 100).toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">{it.status}</div>
                <div className="text-sm">Período: {it.period_start || "--"} até {it.period_end || "--"}</div>
                <Button variant="outline" className="mt-3 w-full" onClick={() => setSelected(it)}>Detalhes</Button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={exportCsv} disabled={exporting}>Exportar Relatório (CSV)</Button>
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
