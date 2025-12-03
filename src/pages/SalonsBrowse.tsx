import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Scissors, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SalonsBrowse = () => {
  const [query, setQuery] = useState("");
  const [backTo, setBackTo] = useState<string>("/");
  type SalonItem = { id: string; nome: string; endereco: string; avaliacao: number; imagem?: string | null };
  type SalonRow = { id: string; name?: string | null; city?: string | null; state?: string | null; address?: string | null; status?: string | null; approved_at?: string | null };
  const [dbSalons, setDbSalons] = useState<SalonItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [affiliatedSalonId, setAffiliatedSalonId] = useState<string | null>(null);
  const [affiliating, setAffiliating] = useState<string | null>(null);
  useEffect(() => {
    const decideBack = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData?.user?.id || null;
        if (!uid) { setBackTo("/"); return; }
        setBackTo("/dashboard");
        setUserId(uid);
        const { data: aff } = await supabase
          .from("user_affiliations")
          .select("salon_id")
          .eq("user_id", uid)
          .maybeSingle();
        type AffRow = { salon_id?: string | null };
        const ar = aff as AffRow | null;
        setAffiliatedSalonId(ar?.salon_id || null);
      } catch {
        setBackTo("/");
      }
    };
    decideBack();
  }, []);

  useEffect(() => {
    const loadDbSalons = async () => {
      try {
        const res = await supabase
          .from("salons")
          .select("id,name,city,state,address,status,approved_at")
          .eq("status", "approved")
          .order("approved_at", { ascending: false });
        const rows = (res.data || []) as SalonRow[];
        const mapped: SalonItem[] = rows.map((s) => {
          const addr = [s.address || "", s.city && s.state ? `${s.city}/${s.state}` : s.city || s.state || ""].filter(Boolean).join(" - ");
          return { id: String(s.id), nome: String(s.name || "Salão"), endereco: addr, avaliacao: 4.7, imagem: null };
        });
        setDbSalons(mapped);
      } catch {
        setDbSalons([]);
      }
    };
    loadDbSalons();
  }, []);

  const handleAffiliate = async (salonId: string) => {
    if (!userId) { toast.error("Faça login"); return; }
    if (affiliatedSalonId) { toast.error("Você já está afiliado a um salão"); return; }
    try {
      setAffiliating(salonId);
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from("user_affiliations")
        .insert({ user_id: userId, salon_id: salonId, affiliated_at: nowIso });
      if (error) throw error;
      setAffiliatedSalonId(salonId);
      toast.success("Afiliado com sucesso");
    } catch (err: unknown) {
      const msg = typeof err === "object" && err && "message" in err ? String((err as { message?: unknown }).message) : "Falha ao afiliar";
      toast.error(msg);
    } finally {
      setAffiliating(null);
    }
  };
  const saloesFakes = useMemo(
    () => [
      { id: "1", nome: "Studio Elegance", endereco: "Rua das Flores, 102 - Centro", avaliacao: 4.8, imagem: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438" },
      { id: "2", nome: "Barbearia Rei do Corte", endereco: "Av. Brasil, 920 - Jardim América", avaliacao: 4.9, imagem: "https://images.unsplash.com/photo-1622286348105-9c7202b64d11" },
      { id: "3", nome: "Salon Lux Beauty", endereco: "Rua Aurora, 55 - Alto da Glória", avaliacao: 4.7, imagem: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9" },
      { id: "4", nome: "Prime Barber & Style", endereco: "Av. Independência, 455 - República", avaliacao: 4.6, imagem: "https://images.unsplash.com/photo-1506126613408-eca07ce68773" },
      { id: "5", nome: "Bella Donna Hair", endereco: "Rua Vitória, 210 - Jardim Europa", avaliacao: 4.8, imagem: "https://images.unsplash.com/photo-1519741497674-6111f06e36fd" },
      { id: "6", nome: "Urban Cut Studio", endereco: "Alameda Santos, 88 - Bela Vista", avaliacao: 4.5, imagem: "https://images.unsplash.com/photo-1523374228107-6e44bd2b5246" },
      { id: "7", nome: "Barber King", endereco: "Rua Goiás, 700 - Centro", avaliacao: 4.9, imagem: "https://images.unsplash.com/photo-1591369220450-1c9db7b96c25" },
      { id: "8", nome: "Glow Beauty Lab", endereco: "Av. Paulista, 1234 - Bela Vista", avaliacao: 4.7, imagem: "https://images.unsplash.com/photo-1516979187457-637abb4f9353" },
      { id: "9", nome: "Corte Fino Premium", endereco: "Rua Chile, 19 - Centro Histórico", avaliacao: 4.6, imagem: "https://images.unsplash.com/photo-1519415943484-9fa18778a1a2" },
      { id: "10", nome: "Royal Barber Club", endereco: "Av. Atlântica, 800 - Copacabana", avaliacao: 4.8, imagem: "https://images.unsplash.com/photo-1593702295097-c8c26e1dd7b3" },
      { id: "11", nome: "Studio Mulher", endereco: "Rua Primavera, 320 - Jardim Botânico", avaliacao: 4.7, imagem: "https://images.unsplash.com/photo-1522336572468-57d55b5b1c04" },
      { id: "12", nome: "Barbearia Alpha", endereco: "Rua do Comércio, 45 - Centro", avaliacao: 4.6, imagem: "https://images.unsplash.com/photo-1532712938310-34cb3982ef74" },
      { id: "13", nome: "Lux Hair & Spa", endereco: "Av. Oceânica, 990 - Barra", avaliacao: 4.8, imagem: "https://images.unsplash.com/photo-1503951458645-643d53bfd90f" },
      { id: "14", nome: "Gentlemen’s Barbershop", endereco: "Rua XV de Novembro, 122 - Centro", avaliacao: 4.7, imagem: "https://images.unsplash.com/photo-1593702295087-5b3b4c1d2cbd" },
      { id: "15", nome: "Elegance Hair Studio", endereco: "Av. das Nações, 400 - Centro", avaliacao: 4.6, imagem: "https://images.unsplash.com/photo-1522338218263-9b36cbb4f73b" },
    ],
    []
  );

  const filteredDb = dbSalons.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (s.nome || "").toLowerCase().includes(q) ||
      (s.endereco || "").toLowerCase().includes(q)
    );
  });
  const filteredFake = saloesFakes.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (s.nome || "").toLowerCase().includes(q) ||
      (s.endereco || "").toLowerCase().includes(q)
    );
  });

  const [failed, setFailed] = useState<Record<string, boolean>>({});

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-[#0A1A2F] text-white">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold">Salões Credenciados</h1>
          <p className="mx-auto mt-3 max-w-2xl text-white/80">Conheça os salões parceiros da plataforma. Catálogo demonstrativo para validar a experiência.</p>
          <div className="mx-auto mt-6 max-w-xl">
            <Input placeholder="Buscar por nome ou endereço" value={query} onChange={(e) => setQuery(e.target.value)} className="bg-white text-black" />
          </div>
          <div className="mt-6 flex justify-center">
            <Button asChild variant="outline" className="border-white text-[#1A73E8] hover:bg-white/10">
              <Link to={backTo}>Voltar</Link>
            </Button>
          </div>
        </div>
      </section>
      <main className="container mx-auto px-4 py-12">
        {affiliatedSalonId && (
          (() => {
            const aff = dbSalons.find((x) => x.id === affiliatedSalonId);
            if (!aff) return null;
            return (
              <Card className="mb-8 border-2 ring-2 ring-emerald-400">
                <CardHeader className="bg-emerald-50 rounded-md">
                  <CardTitle className="flex items-center justify-between">
                    <span>Seu salão afiliado</span>
                    <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">Afiliado</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold">{aff.nome}</span>
                    <span className="text-muted-foreground">• {aff.endereco}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })()
        )}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDb.map((s) => (
            <Card key={s.id} className={`overflow-hidden rounded-xl border-2 shadow-sm transition hover:scale-[1.02] hover:shadow-lg ${affiliatedSalonId === s.id ? "border-emerald-500 ring-2 ring-emerald-400" : ""}`}>
              <div className="relative h-40 w-full">
                {s.imagem && !failed[s.id] ? (
                  <img
                    src={`${s.imagem}?auto=format&fit=crop&w=800&q=60`}
                    alt={s.nome}
                    loading="lazy"
                    className="h-full w-full object-cover"
                    onError={() => setFailed((prev) => ({ ...prev, [s.id]: true }))}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0A1A2F] to-[#1A73E8] text-white">
                    <span className="text-lg font-semibold">{s.nome.split(" ")[0]}</span>
                  </div>
                )}
              </div>
              <CardHeader>
                <CardTitle className="text-xl flex items-center justify-between">
                  <span>{s.nome}</span>
                  {affiliatedSalonId === s.id && (
                    <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">Afiliado</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{s.endereco}</span>
                </div>
                <div className="mt-3 flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < Math.round(s.avaliacao) ? "text-yellow-500" : "text-gray-300"}`} fill={i < Math.round(s.avaliacao) ? "currentColor" : "none"} />
                  ))}
                  <span className="ml-2 text-xs text-muted-foreground">{s.avaliacao.toFixed(1)}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#1A73E8]/10 px-3 py-1 text-xs text-[#1A73E8]"><Scissors className="h-3 w-3" />Corte masculino</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#1A73E8]/10 px-3 py-1 text-xs text-[#1A73E8]">Corte feminino</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#1A73E8]/10 px-3 py-1 text-xs text-[#1A73E8]">Barbearia & estética</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700"><Clock className="h-3 w-3" />Aberto agora</span>
                </div>
                <div className="mt-6 flex flex-wrap gap-2 justify-end">
                  {!!userId && !affiliatedSalonId && (
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={affiliating === s.id} onClick={() => handleAffiliate(s.id)}>
                      {affiliating === s.id ? "Afiliação..." : "Afiliar-se"}
                    </Button>
                  )}
                  <Button asChild className="bg-[#1A73E8] hover:bg-[#1668d6] text-white">
                    <Link to="#">Ver Perfil</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredFake.map((s) => (
            <Card key={s.id} className="overflow-hidden rounded-xl border-2 shadow-sm transition hover:scale-[1.02] hover:shadow-lg">
              <div className="relative h-40 w-full">
                {s.imagem && !failed[s.id] ? (
                  <img
                    src={`${s.imagem}?auto=format&fit=crop&w=800&q=60`}
                    alt={s.nome}
                    loading="lazy"
                    className="h-full w-full object-cover"
                    onError={() => setFailed((prev) => ({ ...prev, [s.id]: true }))}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0A1A2F] to-[#1A73E8] text-white">
                    <span className="text-lg font-semibold">{s.nome.split(" ")[0]}</span>
                  </div>
                )}
              </div>
              <CardHeader>
                <CardTitle className="text-xl">{s.nome}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{s.endereco}</span>
                </div>
                <div className="mt-3 flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < Math.round(s.avaliacao) ? "text-yellow-500" : "text-gray-300"}`} fill={i < Math.round(s.avaliacao) ? "currentColor" : "none"} />
                  ))}
                  <span className="ml-2 text-xs text-muted-foreground">{s.avaliacao.toFixed(1)}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#1A73E8]/10 px-3 py-1 text-xs text-[#1A73E8]"><Scissors className="h-3 w-3" />Corte masculino</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#1A73E8]/10 px-3 py-1 text-xs text-[#1A73E8]">Corte feminino</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#1A73E8]/10 px-3 py-1 text-xs text-[#1A73E8]">Barbearia & estética</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700"><Clock className="h-3 w-3" />Aberto agora</span>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button asChild className="bg-[#1A73E8] hover:bg-[#1668d6] text-white">
                    <Link to="#">Ver Perfil</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {!filteredDb.length && !filteredFake.length && (
          <div className="mt-8 text-center text-sm text-muted-foreground">Nenhum salão encontrado</div>
        )}
      </main>
    </div>
  );
};

export default SalonsBrowse;
