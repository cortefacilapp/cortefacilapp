import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const OwnerDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [salon, setSalon] = useState<any | null>(null);
  const [validations, setValidations] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) {
        setLoading(false);
        return;
      }
      const { data: s } = await supabase.from("salons").select("id,name,status").eq("owner_id", uid).maybeSingle();
      setSalon(s || null);
      if (s?.id) {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const { data: v } = await supabase
          .from("validations")
          .select("amount, validated_at")
          .eq("salon_id", s.id)
          .gte("validated_at", start.toISOString())
          .lte("validated_at", end.toISOString());
        setValidations(v || []);
        const { data: p } = await supabase
          .from("payouts")
          .select("amount, status, paid_at")
          .eq("salon_id", s.id)
          .order("paid_at", { ascending: false });
        setPayouts(p || []);
      }
      setLoading(false);
    };
    load();
  }, []);

  const totals = useMemo(() => {
    const monthValidations = validations.reduce((acc, v) => acc + Number(v.amount || 0), 0);
    const platformShare = monthValidations * 0.2;
    const salonShare = monthValidations * 0.8;
    const pendingPayouts = payouts.filter((p) => p.status === "pending").reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const paidPayouts = payouts.filter((p) => p.status === "paid").reduce((acc, p) => acc + Number(p.amount || 0), 0);
    return { monthValidations, platformShare, salonShare, pendingPayouts, paidPayouts };
  }, [validations, payouts]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Salão</CardTitle>
          <CardDescription>{salon?.status || "--"}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-bold">{salon?.name || "--"}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Total de validações (mês)</CardTitle>
          <CardDescription>Bruto acumulado</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">R$ {(totals.monthValidations / 100).toFixed(2)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Seu saldo (80%)</CardTitle>
          <CardDescription>Após taxa da plataforma</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">R$ {(totals.salonShare / 100).toFixed(2)}</p>
        </CardContent>
      </Card>
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>Repasses</CardTitle>
          <CardDescription>Recebidos e pendentes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded border p-3">
              <div className="text-sm text-muted-foreground">Pendentes</div>
              <div className="text-2xl font-bold">R$ {(totals.pendingPayouts / 100).toFixed(2)}</div>
            </div>
            <div className="rounded border p-3">
              <div className="text-sm text-muted-foreground">Recebidos</div>
              <div className="text-2xl font-bold">R$ {(totals.paidPayouts / 100).toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerDashboardPage;

