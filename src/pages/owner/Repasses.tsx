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

