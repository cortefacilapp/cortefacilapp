import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SalonsBrowse = () => {
  const [loading, setLoading] = useState(true);
  const [salons, setSalons] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("salons")
        .select("id,name,address,city,state,phone,status")
        .eq("status", "approved")
        .order("name", { ascending: true });
      if (!error && data) setSalons(data);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = salons.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (s.name || "").toLowerCase().includes(q) ||
      (s.city || "").toLowerCase().includes(q) ||
      (s.state || "").toLowerCase().includes(q) ||
      (s.address || "").toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed inset-x-0 top-0 z-50 border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="text-xl font-bold">Salões Credenciados</div>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>Voltar ao Dashboard</Button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 pt-20">
        <div className="mb-6 grid gap-3 md:grid-cols-2">
          <Input placeholder="Buscar por nome, cidade, estado ou endereço" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <CardTitle className="text-xl">{s.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div>{s.address}</div>
                  <div>{s.city}/{s.state}</div>
                  <div>{s.phone || "sem telefone"}</div>
                </div>
              </CardContent>
            </Card>
          ))}
          {!filtered.length && (
            <div className="text-sm text-muted-foreground">Nenhum salão encontrado</div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SalonsBrowse;

