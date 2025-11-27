import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const SaloesAtivos = () => {
  const [loading, setLoading] = useState(true);
  const [salons, setSalons] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await supabase.from("salons").select("id, name, city, state, address, owner_id, approved_at, phone").eq("status", "approved");
      if (!res.error && res.data) setSalons(res.data);
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
          <CardTitle>Salões Ativos</CardTitle>
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
              <div>{selected.city}/{selected.state} - {selected.phone || "sem telefone"}</div>
              <div>Ativo desde: {selected.approved_at ? new Date(selected.approved_at).toLocaleDateString() : "--"}</div>
              <Button className="w-full" variant="outline" onClick={() => setSelected(null)}>Fechar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SaloesAtivos;

