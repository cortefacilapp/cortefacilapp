import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const SaloesPendentes = () => {
  const [loading, setLoading] = useState(true);
  const [salons, setSalons] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [reason, setReason] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await supabase.from("salons").select("id, name, city, state, address, owner_id, created_at, doc, description").eq("status", "pending");
    if (!res.error && res.data) setSalons(res.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (id: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("salons")
      .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: userData?.user?.id || null })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao aprovar");
      return;
    }
    toast.success("Salão aprovado");
    setSelected(null);
    load();
  };

  const reject = async (id: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("salons")
      .update({ status: "rejected", rejected_at: new Date().toISOString(), rejected_by: userData?.user?.id || null, rejection_reason: reason || null })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao reprovar");
      return;
    }
    toast.success("Salão reprovado");
    setSelected(null);
    setReason("");
    load();
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
          <CardTitle>Salões Pendentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {salons.map((s) => (
              <div key={s.id} className="rounded border p-3">
                <div className="font-medium">{s.name}</div>
                <div className="text-sm text-muted-foreground">{s.city}/{s.state}</div>
                <Button variant="outline" className="mt-3 w-full" onClick={() => setSelected(s)}>Detalhes</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-2">
              <div>{selected.address}</div>
              <div>{selected.city}/{selected.state}</div>
              <div>Documento: {selected.doc || "--"}</div>
              <div>Cadastrado em: {new Date(selected.created_at).toLocaleString()}</div>
              <div>{selected.description || ""}</div>
              <div className="space-y-1 pt-2">
                <div className="text-sm text-muted-foreground">Motivo da reprovação (opcional)</div>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-20 w-full rounded-md border border-input bg-background p-2 text-sm"
                  placeholder="Explique o motivo"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <Button variant="outline" onClick={() => setSelected(null)}>Fechar</Button>
                <Button variant="destructive" onClick={() => reject(selected.id)}>Reprovar</Button>
                <Button onClick={() => approve(selected.id)}>Aprovar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SaloesPendentes;
