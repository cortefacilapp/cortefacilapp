import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const DAYS = [
  { key: "seg", label: "Seg" },
  { key: "ter", label: "Ter" },
  { key: "qua", label: "Qua" },
  { key: "qui", label: "Qui" },
  { key: "sex", label: "Sex" },
  { key: "sab", label: "Sáb" },
  { key: "dom", label: "Dom" },
];

const SalonSignup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [doc, setDoc] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [daysOpen, setDaysOpen] = useState<string[]>([]);
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");

  

  const toggleDay = (key: string, checked: boolean) => {
    setDaysOpen((prev) => {
      if (checked) return [...prev, key];
      return prev.filter((d) => d !== key);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let ownerId: string | null = null;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!email || !password || password !== passwordConfirm) {
          throw new Error("As senhas não conferem");
        }
        const { error: signUpErr } = await supabase.auth.signUp({ email, password });
        if (signUpErr) throw signUpErr;
        const { error: signInErr, data: signInData } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
        ownerId = signInData.user?.id || null;
      } else {
        ownerId = session.user.id;
      }

      if (!ownerId) throw new Error("Não foi possível obter o usuário do salão");

      await supabase
        .from("profiles")
        .upsert({ id: ownerId, email, name: ownerName, role: "salon_owner" });

      const { error } = await supabase.from("salons").insert({
        owner_id: ownerId,
        name: tradeName || ownerName || "Salão",
        status: "pending",
        state,
        city,
        postal_code: cep || null,
        address: `${street}, ${number} - ${city}/${state} - CEP ${cep}`,
      });

      if (error) throw error;
      toast.success("Cadastro enviado!");
      setSuccessOpen(true);
    } catch (err: unknown) {
      const msg = typeof err === "object" && err && "message" in err ? String((err as { message?: unknown }).message) : "Erro ao cadastrar salão";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-2xl shadow-elevated">
        <CardHeader>
          <CardTitle>Cadastro de Salão</CardTitle>
          <CardDescription>Preencha os dados para credenciar seu salão</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3 rounded-md border p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email do responsável</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passwordConfirm">Confirmar senha</Label>
                  <Input id="passwordConfirm" type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} required minLength={6} />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Após enviar, sua conta será criada e o acesso só será liberado após aprovação da plataforma.
                O prazo médio de aprovação é de 24h.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ownerName">Nome completo (Dono do salão)</Label>
                <Input id="ownerName" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc">CNPJ/CPF</Label>
                <Input id="doc" value={doc} onChange={(e) => setDoc(e.target.value)} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="tradeName">Nome fantasia</Label>
                <Input id="tradeName" value={tradeName} onChange={(e) => setTradeName(e.target.value)} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="openingHours">Horário de funcionamento</Label>
                <Input id="openingHours" placeholder="Ex.: Seg-Sex 09:00–19:00; Sáb 09:00–14:00" value={openingHours} onChange={(e) => setOpeningHours(e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Dias de funcionamento</Label>
                <div className="flex flex-wrap gap-3">
                  {DAYS.map((d) => (
                    <label key={d.key} className="inline-flex items-center gap-2">
                      <Checkbox checked={daysOpen.includes(d.key)} onCheckedChange={(c) => toggleDay(d.key, Boolean(c))} />
                      <span>{d.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input id="state" value={state} onChange={(e) => setState(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input id="cep" value={cep} onChange={(e) => setCep(e.target.value)} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="street">Rua</Label>
                <Input id="street" value={street} onChange={(e) => setStreet(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="number">Número</Label>
                <Input id="number" value={number} onChange={(e) => setNumber(e.target.value)} required />
              </div>
            </div>

            <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
              {loading ? "Enviando..." : "Enviar para aprovação"}
            </Button>
          </form>
          <Dialog open={successOpen} onOpenChange={(open) => {
            setSuccessOpen(open);
            if (!open) {
              (async () => {
                try {
                  await supabase.auth.signOut();
                  const env = (import.meta as unknown as { env?: Record<string, string> }).env || {};
                  const pid = String(env.VITE_SUPABASE_PROJECT_ID || "");
                  if (pid) localStorage.removeItem(`sb-${pid}-auth-token`);
                  localStorage.removeItem("sb-qowmhahuuuxugtcgdryl-auth-token");
                } finally {
                  navigate("/auth");
                }
              })();
            }
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Salão criado com sucesso</DialogTitle>
                <DialogDescription>
                  Seu cadastro foi enviado. Aguarde até 24 horas para revisão e aprovação do salão.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-2">
                <Button className="w-full" onClick={() => setSuccessOpen(false)}>Entendi</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalonSignup;
