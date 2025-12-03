import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SolicitacoesSaque = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("withdraw_requests")
      .select("id, salon_id, owner_id, amount, status, pix_key, created_at, approved_at, paid_at, rejected_at")
      .order("created_at", { ascending: false });
    setItems(data || []);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Solicitações de Saque</CardTitle>
        <CardDescription>Gerencie pedidos dos salões</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && <div className="text-sm text-muted-foreground">Carregando...</div>}
        {!loading && !items.length && <div className="text-sm text-muted-foreground">Nenhuma solicitação</div>}
        {!!items.length && (
          <div className="grid gap-3">
            {items.map((it) => (
              <div key={it.id} className="rounded border p-3 grid gap-2 md:grid-cols-5 items-center">
                <div className="md:col-span-2">
                  <div className="text-sm">ID: {it.id}</div>
                  <div className="text-sm text-muted-foreground">PIX: {it.pix_key}</div>
                </div>
                <div>
                  <div className="text-sm">Valor</div>
                  <div className="text-xl font-bold">R$ {Number(it.amount || 0).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm">Status</div>
                  <div className="text-sm font-medium">{String(it.status)}</div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => act(it.id, "approve")} disabled={it.status !== "requested"}>Aprovar</Button>
                  <Button variant="outline" onClick={() => act(it.id, "reject")} disabled={it.status !== "requested"}>Rejeitar</Button>
                  <Button className="bg-primary" onClick={() => act(it.id, "paid")} disabled={it.status !== "approved"}>Marcar como Pago</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SolicitacoesSaque;
