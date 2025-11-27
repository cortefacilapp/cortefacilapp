import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ValidarCodigo = () => {
  const [code, setCode] = useState("");
  const [salonId, setSalonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const loadSalon = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) return;
      const { data } = await supabase.from("salons").select("id").eq("owner_id", uid).maybeSingle();
      const sid = data?.id || null;
      setSalonId(sid);
      if (sid) {
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("status")
          .eq("salon_id", sid)
          .order("created_at", { ascending: false })
          .maybeSingle();
        setBlocked(!sub || sub.status !== "active");
      }
    };
    loadSalon();
  }, []);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salonId) {
      toast.error("Nenhum salão vinculado ao seu usuário");
      return;
    }
    if (!code || code.length < 4) {
      toast.error("Informe um código válido");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("consume-code", { body: { code: code.toUpperCase() } });
      if (error) throw error;
      if (data?.ok) {
        toast.success("Código validado e consumido");
        setCode("");
      } else {
        throw new Error(data?.error || "Falha ao validar código");
      }
    } catch (err: any) {
      toast.error(err.message || "Falha ao validar código");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-primary">
      <CardHeader>
        <CardTitle>Validar Código do Cliente</CardTitle>
        <CardDescription>Digite o código fornecido pelo cliente</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleValidate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Código</Label>
            <Input id="code" placeholder="Digite o código aqui" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={12} required />
          </div>
          <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>{loading ? "Validando..." : "Validar Código"}</Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ValidarCodigo;
