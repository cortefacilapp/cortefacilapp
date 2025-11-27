import { Button } from "@/components/ui/button";
import { LogOut, Scissors, Home, UserCircle, CheckCircle, DollarSign, ScanLine, Menu } from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

const OwnerLayout = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      toast.success("Logout realizado com sucesso!");
      navigate("/");
    } catch {
      toast.error("Erro ao fazer logout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed inset-x-0 top-0 z-50 border-b bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))]">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Scissors className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">CorteFácil - Salão</span>
            </div>
            <button className="md:hidden inline-flex items-center justify-center rounded p-2" onClick={() => setNavOpen((v) => !v)} aria-label="Abrir menu">
              <Menu className="h-6 w-6" />
            </button>
            <nav className="hidden md:flex items-center gap-3">
              <Button variant="outline" className="text-primary hover:text-primary" onClick={() => navigate("/owner/dashboard")}>
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
              <Button variant="outline" className="text-primary hover:text-primary" onClick={() => navigate("/owner/validar")}> 
                <ScanLine className="mr-2 h-4 w-4" />
                Validar Código
              </Button>
              <Button variant="outline" className="text-primary hover:text-primary" onClick={() => navigate("/owner/perfil")}> 
                <UserCircle className="mr-2 h-4 w-4" />
                Perfil do salão
              </Button>
              <Button variant="outline" className="text-primary hover:text-primary" onClick={() => navigate("/owner/validacoes")}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Validações
              </Button>
              <Button variant="outline" className="text-primary hover:text-primary" onClick={() => navigate("/owner/repasses")}>
                <DollarSign className="mr-2 h-4 w-4" />
                Repasses
              </Button>
            </nav>
          </div>
          <Button variant="outline" className="text-primary hover:text-primary" onClick={handleSignOut} disabled={loading}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
        {navOpen && (
          <div className="md:hidden border-t bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))]">
            <div className="container mx-auto px-4 py-3 grid gap-2">
              <Button variant="outline" className="text-primary hover:text-primary" onClick={() => { setNavOpen(false); navigate("/owner/dashboard"); }}>Dashboard</Button>
              <Button variant="outline" className="text-primary hover:text-primary" onClick={() => { setNavOpen(false); navigate("/owner/validar"); }}>Validar Código</Button>
              <Button variant="outline" className="text-primary hover:text-primary" onClick={() => { setNavOpen(false); navigate("/owner/perfil"); }}>Perfil do salão</Button>
              <Button variant="outline" className="text-primary hover:text-primary" onClick={() => { setNavOpen(false); navigate("/owner/validacoes"); }}>Validações</Button>
              <Button variant="outline" className="text-primary hover:text-primary" onClick={() => { setNavOpen(false); navigate("/owner/repasses"); }}>Repasses</Button>
            </div>
          </div>
        )}
      </header>
      <main className="container mx-auto px-4 py-8 pt-20">
        <Outlet />
      </main>
    </div>
  );
};

export default OwnerLayout;
