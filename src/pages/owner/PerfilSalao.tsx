import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const PerfilSalao = () => {
  const [loading, setLoading] = useState(true);
  const [salon, setSalon] = useState<any | null>(null);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) { setLoading(false); return; }
      const { data } = await supabase.from("salons").select("*").eq("owner_id", uid).maybeSingle();
      setSalon(data || null);
      setForm(data || {});
      setLoading(false);
    };
    load();
  }, []);

  const update = async () => {
    if (!salon?.id) return;
    const { error } = await supabase.from("salons").update({
      name: form.name,
      doc: form.doc,
      state: form.state,
      city: form.city,
      cep: form.cep,
      street: form.street,
      number: form.number,
      address: form.address,
      phone: form.phone,
      trade_name: form.trade_name,
      opening_hours: form.opening_hours,
    }).eq("id", salon.id);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Perfil atualizado");
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil do Salão</CardTitle>
      </CardHeader>
      <CardContent>
        {!salon && <div className="text-sm text-muted-foreground">Nenhum salão cadastrado</div>}
        {salon && (
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { key: "name", label: "Nome" },
              { key: "trade_name", label: "Nome fantasia" },
              { key: "doc", label: "CNPJ/CPF" },
              { key: "phone", label: "Telefone" },
              { key: "opening_hours", label: "Horário" },
              { key: "state", label: "Estado" },
              { key: "city", label: "Cidade" },
              { key: "cep", label: "CEP" },
              { key: "street", label: "Rua" },
              { key: "number", label: "Número" },
              { key: "address", label: "Endereço completo" },
            ].map((f) => (
              <div key={f.key} className="space-y-2 md:col-span-1">
                <Label htmlFor={f.key}>{f.label}</Label>
                <Input id={f.key} value={form[f.key] || ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              </div>
            ))}
            <div className="md:col-span-2">
              <Button className="mt-2" onClick={update}>Salvar</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PerfilSalao;

