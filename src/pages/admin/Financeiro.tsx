import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, DollarSign, TrendingUp, Store, PieChart as PieIcon, BarChart2 } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, BarChart, Bar } from "recharts";

const Financeiro = () => {
  const [loading, setLoading] = useState(true);
  type PaymentRow = { amount: number; platform_amount: number; salon_amount: number; status: string; created_at: string };
  type SalonRow = { id: string; name: string; status: string };
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [salons, setSalons] = useState<SalonRow[]>([]);

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
    const activeSalons = salons.filter((s) => s.status === "approved").length;
    return { total, platformShare, salonShare, activeSalons };
  }, [payments, salons]);

  const formatBRL = (v: number) => {
    const reais = (Number(v) || 0) / 100;
    try { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(reais); }
    catch { return `R$ ${reais.toFixed(2).replace('.', ',')}`; }
  };
  const daysOfMonth = useMemo(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Array.from({ length: lastDay }, (_, i) => i + 1);
  }, []);
  const dailyData = useMemo(() => {
    const map = new Map<number, { day: number; total: number }>();
    for (const d of daysOfMonth) map.set(d, { day: d, total: 0 });
    for (const p of payments) {
      const dt = new Date(p.created_at);
      const day = dt.getDate();
      const item = map.get(day);
      if (item) item.total += Number(p.amount) || 0;
    }
    return Array.from(map.values());
  }, [payments, daysOfMonth]);
  const shareData = useMemo(() => {
    return [
      { name: "Plataforma", value: totals.platformShare },
      { name: "Salões", value: totals.salonShare },
    ];
  }, [totals.platformShare, totals.salonShare]);
  const COLORS = ["#1A73E8", "#10B981"];

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl bg-gradient-to-br from-[#0A1A2F] to-[#1A73E8] p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">Painel Financeiro</div>
            <div className="text-white/80">Resumo do mês atual</div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-2">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary">
              <Store className="h-5 w-5 text-primary-foreground" />
            </div>
            <CardTitle>Salões Ativos</CardTitle>
            <CardDescription>Com status aprovado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{totals.activeSalons}</div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-secondary">
              <DollarSign className="h-5 w-5 text-secondary-foreground" />
            </div>
            <CardTitle>Receita Total</CardTitle>
            <CardDescription>Bruto acumulado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{formatBRL(totals.total)}</div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-accent">
              <PieIcon className="h-5 w-5 text-accent-foreground" />
            </div>
            <CardTitle>Parte da Plataforma</CardTitle>
            <CardDescription>Percentual sobre o total</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{formatBRL(totals.platformShare)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-2">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary">
              <BarChart2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <CardTitle>Receita diária</CardTitle>
            <CardDescription>Mês corrente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData} margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => {
                    const reais = (Number(v) || 0) / 100;
                    try { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(reais); }
                    catch { return `R$ ${Math.round(reais).toString()}`; }
                  }} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => formatBRL(Number(v))} labelFormatter={(l) => `Dia ${l}`} />
                  <Line type="monotone" dataKey="total" stroke="#1A73E8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-accent">
              <PieIcon className="h-5 w-5 text-accent-foreground" />
            </div>
            <CardTitle>Divisão de receita</CardTitle>
            <CardDescription>Plataforma vs Salões</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={shareData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                    {shareData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(v) => formatBRL(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2">
        <CardHeader>
          <CardTitle>Pagamentos do mês</CardTitle>
          <CardDescription>Últimos registros aprovados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {payments.slice().reverse().slice(0, 9).map((p, idx) => (
              <div key={`${p.created_at}-${idx}`} className="rounded border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{formatBRL(Number(p.amount))}</div>
                  <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Plataforma: {formatBRL(Number(p.platform_amount))}</div>
                <div className="text-xs text-muted-foreground">Salões: {formatBRL(Number(p.salon_amount))}</div>
              </div>
            ))}
            {!payments.length && <div className="text-sm text-muted-foreground">Sem pagamentos aprovados no período</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Financeiro;
