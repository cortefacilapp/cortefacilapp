import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scissors, Mail, Lock, User, Building, Phone, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const salonSchema = z.object({
  salonName: z.string().min(2, "Nome do salão deve ter pelo menos 2 caracteres"),
  ownerName: z.string().min(2, "Nome do responsável deve ter pelo menos 2 caracteres"),
  cnpj: z.string().optional(),
  phone: z.string().min(10, "Telefone inválido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export default function SalonRegister() {
  const [formData, setFormData] = useState({
    salonName: "",
    ownerName: "",
    cnpj: "",
    phone: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const validateForm = () => {
    setErrors({});
    try {
      salonSchema.parse(formData);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Create user with salon role
      const { error: signUpError } = await signUp(
        formData.email,
        formData.password,
        formData.ownerName,
        'salon_owner'
      );

      if (signUpError) {
        if (signUpError.message.includes("User already registered")) {
          toast.error("Este email já está cadastrado");
        } else {
          toast.error(signUpError.message);
        }
        return;
      }

      // Wait for the user session to be established
      const { data: { user: newUser } } = await supabase.auth.getUser();

      if (newUser) {
        // Create the salon record
        const { error: salonError } = await supabase
          .from('salons')
          .insert({
            owner_id: newUser.id,
            name: formData.salonName,
            cnpj: formData.cnpj || null,
            phone: formData.phone,
          });

        if (salonError) {
          console.error('Salon creation error:', salonError);
          toast.error("Erro ao criar barbearia. Tente novamente.");
          return;
        }
      }

      toast.success("Barbearia cadastrada com sucesso! Aguarde aprovação.");
      navigate("/dashboard");
    } catch (err) {
      console.error('Registration error:', err);
      toast.error("Ocorreu um erro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 py-12">
        <div className="w-full max-w-md mx-auto">
          {/* Back Link */}
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao início
          </Link>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-lg bg-gradient-gold flex items-center justify-center">
              <Scissors className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-2xl">BARBERCLUB</span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-4xl mb-2">CADASTRE SUA BARBEARIA</h1>
            <p className="text-muted-foreground">
              Comece a receber clientes assinantes todo mês
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="salonName">Nome da Barbearia</Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="salonName"
                  name="salonName"
                  type="text"
                  placeholder="Nome do seu estabelecimento"
                  value={formData.salonName}
                  onChange={handleChange}
                  className="pl-10 h-12 bg-card border-border"
                />
              </div>
              {errors.salonName && (
                <p className="text-sm text-destructive">{errors.salonName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerName">Nome do Responsável</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="ownerName"
                  name="ownerName"
                  type="text"
                  placeholder="Seu nome completo"
                  value={formData.ownerName}
                  onChange={handleChange}
                  className="pl-10 h-12 bg-card border-border"
                />
              </div>
              {errors.ownerName && (
                <p className="text-sm text-destructive">{errors.ownerName}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cnpj">CPF/CNPJ (opcional)</Label>
                <Input
                  id="cnpj"
                  name="cnpj"
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={formData.cnpj}
                  onChange={handleChange}
                  className="h-12 bg-card border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={handleChange}
                    className="pl-10 h-12 bg-card border-border"
                  />
                </div>
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="contato@suabarbearia.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10 h-12 bg-card border-border"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10 h-12 bg-card border-border"
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <Button 
              type="submit" 
              variant="hero" 
              size="lg" 
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                "Cadastrar Barbearia"
              )}
            </Button>
          </form>

          {/* Login Link */}
          <div className="mt-8 text-center">
            <p className="text-muted-foreground">
              Já tem uma conta?{" "}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Decorative */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-background" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-32 rounded-full bg-gradient-gold mx-auto mb-8 flex items-center justify-center animate-pulse-gold">
              <Building className="w-16 h-16 text-primary-foreground" />
            </div>
            <h2 className="font-display text-5xl mb-4">
              SEJA UM
              <br />
              <span className="text-gold-gradient">PARCEIRO</span>
            </h2>
            <p className="text-muted-foreground max-w-xs mx-auto">
              Receba 80% do valor de cada corte e aumente sua receita mensal
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
