import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Scissors } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const params = new URLSearchParams(location.search);
  const tabParam = params.get("tab");
  const isSalon = params.get("salao") === "1";
  const initialTab = tabParam === "signup" ? "signup" : isSalon ? "signup" : "signin";
  const [tab, setTab] = useState(initialTab);
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [address, setAddress] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const toIsoDate = (s: string) => {
    const digitsOnly = s.replace(/\D/g, "");
    if (digitsOnly.length === 8) {
      const dd = digitsOnly.slice(0, 2);
      const mm = digitsOnly.slice(2, 4);
      const yyyy = digitsOnly.slice(4, 8);
      return `${yyyy}-${mm}-${dd}`;
    }
    const parts = s.trim().split(/[\/\-]/);
    if (parts.length !== 3) return null;
    const [d, m, y] = parts;
    if (!d || !m || !y) return null;
    const dd = String(d).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    const yyyy = String(y);
    return `${yyyy}-${mm}-${dd}`;
  };
  const formatBirthdate = (s: string) => {
    const digits = s.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };
  const formatPhone = (s: string) => {
    const d = s.replace(/\D/g, "").slice(0, 11);
    if (!d) return "";
    if (d.length < 3) return `(${d}`;
    const dd = d.slice(0, 2);
    const n = d.slice(2);
    if (n.length <= 4) return `(${dd}) ${n}`;
    if (d.length === 11) return `(${dd}) ${n.slice(0, 5)}-${n.slice(5)}`;
    return `(${dd}) ${n.slice(0, 4)}-${n.slice(4)}`;
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate(isSalon ? "/signup/salao" : "/dashboard");
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setResetOpen(true);
        return;
      }
      if (session) {
        navigate(isSalon ? "/signup/salao" : "/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, isSalon]);

  

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (password !== passwordConfirm) {
        toast.error("As senhas não conferem");
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${isSalon ? "/signup/salao" : "/dashboard"}`,
          data: {
            full_name: fullName || undefined,
            cpf: cpf || undefined,
            address: address || undefined,
            birthdate: toIsoDate(birthdate) || undefined,
            phone: whatsapp || undefined,
          },
        },
      });

      if (error) {
        const msg = String((error as any)?.message || "").toLowerCase();
        if (msg.includes("already registered")) {
        } else {
          throw error;
        }
      }

      let { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInErr && (signInErr as any)?.message?.toLowerCase().includes("confirm")) {
        setSuccessOpen(true);
        setTab("signin");
        setTimeout(() => {
          try { setSuccessOpen(false); } catch (_) {}
          navigate("/auth");
        }, 1500);
      }
      if (!signInErr && signInData?.user) {
        const { error: upErr } = await supabase
          .from("profiles")
          .upsert(
            {
              id: signInData.user.id,
              email,
              full_name: fullName || signInData.user.user_metadata?.full_name || signInData.user.user_metadata?.name || "",
              phone: whatsapp || null,
            },
            { onConflict: "id" },
          );
        if (upErr) {
          toast.error(upErr.message || "Falha ao salvar perfil");
        }
        if (isSalon) {
          toast.success("Conta criada com sucesso!");
          navigate("/signup/salao");
        } else {
          setSuccessOpen(true);
          setTab("signin");
          setTimeout(() => {
            try { setSuccessOpen(false); } catch (_) {}
            navigate("/auth");
          }, 1500);
        }
      } else {
        setSuccessOpen(true);
        setTab("signin");
        setTimeout(() => {
          try { setSuccessOpen(false); } catch (_) {}
          navigate("/auth");
        }, 1500);
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let { data: siData, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error && (error as any)?.message?.toLowerCase().includes("confirm")) {
        toast.error("Email não confirmado. Use a aba Cadastrar para finalizar o cadastro.");
        return;
      }

      if (error) throw error;

      if (siData?.user) {
        const meta = siData.user.user_metadata || {};
        await supabase
          .from("profiles")
          .upsert(
            {
              id: siData.user.id,
              email: siData.user.email || email.trim(),
              full_name: String(meta.full_name || meta.name || ""),
              phone: String(meta.phone || "") || null,
            },
            { onConflict: "id" },
          );
      }

      toast.success("Login realizado com sucesso!");
      navigate(isSalon ? "/signup/salao" : "/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async () => {
    if (!email.trim()) {
      toast.error("Informe seu email para recuperar a senha");
      return;
    }
    try {
      setResetLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      toast.success("Verifique seu email para redefinir a senha");
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar recuperação");
    } finally {
      setResetLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter ao menos 6 caracteres");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      toast.error("As senhas não conferem");
      return;
    }
    try {
      setResetLoading(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Senha atualizada! Faça login novamente");
      setResetOpen(false);
      setNewPassword("");
      setNewPasswordConfirm("");
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar senha");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary">
            <Scissors className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">CorteFácil</CardTitle>
          <CardDescription>Acesse sua conta ou crie uma nova</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Senha</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
                <Button type="button" variant="link" className="w-full" onClick={handleResetRequest} disabled={resetLoading}>
                  {resetLoading ? "Enviando..." : "Esqueci minha senha"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                {!isSalon && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Nome completo</Label>
                      <Input id="signup-name" type="text" placeholder="Seu nome" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-cpf">CPF</Label>
                      <Input id="signup-cpf" type="text" placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-address">Endereço</Label>
                      <Input id="signup-address" type="text" placeholder="Rua, número, bairro, cidade/UF" value={address} onChange={(e) => setAddress(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-whatsapp">WhatsApp</Label>
                      <Input
                        id="signup-whatsapp"
                        type="text"
                        placeholder="(99) 99999-9999"
                        inputMode="numeric"
                        pattern="^\(\d{2}\)\s?\d{4,5}\-\d{4}$"
                        maxLength={15}
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-birth">Data de nascimento (dia/mes/ano)</Label>
                      <Input id="signup-birth" type="text" placeholder="dd/mm/aaaa" value={birthdate} onChange={(e) => setBirthdate(formatBirthdate(e.target.value))} required pattern="^\d{2}[\/\-]\d{2}[\/\-]\d{4}$" />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password-confirm">Confirmar senha</Label>
                  <Input
                    id="signup-password-confirm"
                    type="password"
                    placeholder="••••••••"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
                  {loading ? "Criando conta..." : isSalon ? "Cadastrar Salão" : "Criar Conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password-confirm">Confirmar nova senha</Label>
              <Input id="new-password-confirm" type="password" value={newPasswordConfirm} onChange={(e) => setNewPasswordConfirm(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={resetLoading}>{resetLoading ? "Atualizando..." : "Atualizar senha"}</Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conta criada com sucesso</DialogTitle>
          </DialogHeader>
          <div className="text-sm">Redirecionando para a página de login...</div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
