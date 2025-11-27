import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CheckCircle, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PlansSelect = () => {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("plans")
        .select("id,name,price,interval,monthly_credits,active,features,description")
        .eq("active", true)
        .order("price", { ascending: true });
      if (error) {
        toast.error("Erro ao carregar planos");
      } else {
        const allowed = ["Social", "Popular", "Premium"];
        const order = new Map<string, number>([
          ["Social", 0],
          ["Popular", 1],
          ["Premium", 2],
        ]);
        const filtered = (data || [])
          .filter((p: any) => allowed.includes(p.name))
          .sort((a: any, b: any) => (order.get(a.name) ?? 99) - (order.get(b.name) ?? 99));
        setPlans(filtered);
      }
      setLoading(false);
    };
    load();
  }, []);

  const checkout = async (planId: string) => {
    navigate(`/planos/pagar/${planId}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      try {
        const pid = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID || "";
        if (pid) localStorage.removeItem(`sb-${pid}-auth-token`);
        localStorage.removeItem("sb-qowmhahuuuxugtcgdryl-auth-token");
      } catch (_) {}
      toast.success("Logout realizado com sucesso!");
      navigate("/auth");
    } catch {
      toast.error("Erro ao fazer logout");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div>
      <header className="fixed inset-x-0 top-0 z-50 border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-scissors h-6 w-6 text-primary"><circle cx="6" cy="6" r="3"></circle><path d="M8.12 8.12 12 12"></path><path d="M20 4 8.12 15.88"></path><circle cx="6" cy="18" r="3"></circle><path d="M14.8 14.8 20 20"></path></svg>
            <span className="text-xl font-bold">CorteFácil</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/dashboard")}> 
              <Home className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <Button variant="outline" onClick={handleSignOut} disabled={signingOut}>Sair</Button>
          </div>
        </div>
      </header>
      <div className="container mx-auto px-4 py-8 pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Escolha seu Plano</h1>
          <p className="text-muted-foreground">Assinatura mensal com cortes incluídos</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <Card key={p.id} className={`border-2 ${p.name === "Popular" ? "border-primary" : ""}`}>
              <CardHeader>
                <CardTitle>{p.name}</CardTitle>
                <CardDescription>
                  R$ {(Number(p.price) / 100).toFixed(2)}/{p.interval === "year" ? "ano" : "mês"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">Cortes mensais: {p.monthly_credits}</p>
                  {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                  <div className="space-y-1 pt-2">
                    {(p.features || [
                      `Até ${p.monthly_credits} cortes/mês`,
                      p.name === "Premium" ? "Validação rápida e suporte exclusivo" : p.name === "Profissional" ? "Validação rápida e suporte avançado" : "Validação de códigos no salão",
                      p.name === "Premium" ? "Descontos exclusivos e brinde trimestral" : p.name === "Profissional" ? "Descontos em parceiros" : "Suporte básico",
                    ]).map((f: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                  {p.name === "Popular" && (
                    <div className="text-xs font-semibold text-primary">Destaque</div>
                  )}
                  <Button className="mt-2 w-full" onClick={() => checkout(p.id)}>Assinar</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlansSelect;
