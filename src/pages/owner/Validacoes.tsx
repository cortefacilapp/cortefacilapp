import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const Validacoes = () => {
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
          .from("validations")
          .select("id, code, amount, status, validated_at")
          .eq("salon_id", salon.id)
          .order("validated_at", { ascending: false });
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
          <CardTitle>Histórico de Validações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <div key={it.id} className="rounded border p-3">
                <div className="font-medium">Código {it.code}</div>
                <div className="text-sm text-muted-foreground">Valor: R$ {(Number(it.amount) / 100).toFixed(2)}</div>
                <div className="text-sm">{new Date(it.validated_at).toLocaleString()}</div>
                <Button variant="outline" className="mt-3 w-full" onClick={() => setSelected(it)}>Detalhes</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Validação</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-2">
              <div>Código: {selected.code}</div>
              <div>Valor: R$ {(Number(selected.amount) / 100).toFixed(2)}</div>
              <div>Status: {selected.status}</div>
              <div>Data: {new Date(selected.validated_at).toLocaleString()}</div>
              <Button className="w-full" variant="outline" onClick={() => setSelected(null)}>Fechar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Validacoes;

