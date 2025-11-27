import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const Financeiro = () => {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [salons, setSalons] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const payoutsRes = await supabase
        .from("payments")
        .select("amount, platform_amount, salon_amount, status, created_at")
        .eq("status", "approved")
        .gte("created_at", start)
        .lte("created_at", end);
      const salonsRes = await supabase.from("salons").select("id, name, status");
      if (!payoutsRes.error && payoutsRes.data) setPayments(payoutsRes.data);
      if (!salonsRes.error && salonsRes.data) setSalons(salonsRes.data);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("financeiro-payments")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "payments" }, () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
        supabase
          .from("payments")
          .select("amount, platform_amount, salon_amount, status, created_at")
          .eq("status", "approved")
          .gte("created_at", start)
          .lte("created_at", end)
          .then((res) => {
            if (!res.error && res.data) setPayments(res.data);
          });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const totals = useMemo(() => {
    let total = 0;
    let platformShare = 0;
    let salonShare = 0;
    for (const p of payments) {
      total += Number(p.amount) || 0;
      platformShare += Number(p.platform_amount) || 0;
      salonShare += Number(p.salon_amount) || 0;
    }
    const ranking: { id: string; amt: number; name: string }[] = [];
    const activeSalons = salons.filter((s) => s.status === "approved").length;
    return { total, platformShare, salonShare, ranking, activeSalons };
  }, [payments, salons]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Salões Ativos</CardTitle>
          <CardDescription>Com status aprovado</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{totals.activeSalons}</p>
        </CardContent>
      </Card>
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Receita Total</CardTitle>
          <CardDescription>Bruto acumulado</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">R$ {(totals.total / 100).toFixed(2)}</p>
        </CardContent>
      </Card>
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Plataforma</CardTitle>
          <CardDescription>20% do total</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">R$ {(totals.platformShare / 100).toFixed(2)}</p>
        </CardContent>
      </Card>

      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>Salões com mais lucros</CardTitle>
          <CardDescription>Top 5 por receita</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {totals.ranking.length === 0 && (
              <p className="text-muted-foreground">Sem dados</p>
            )}
            {totals.ranking.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded border p-3">
                <span className="font-medium">{r.name}</span>
                <span>R$ {(r.amt / 100).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Financeiro;
