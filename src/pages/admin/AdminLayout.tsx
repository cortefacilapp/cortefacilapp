import { Button } from "@/components/ui/button";
import { LogOut, Scissors, Home, Menu } from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const AdminLayout = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [authorized, setAuthorized] = useState<boolean>(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) { navigate("/auth"); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      const list = (roles || []).map((r: any) => String(r.role));
      if (list.includes("admin")) {
        setAuthorized(true);
      } else {
        const { data: prof } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle();
        const r = String((prof as any)?.role || "customer");
        if (r === "admin") {
          setAuthorized(true);
        } else {
          navigate("/dashboard");
        }
      }
    };
    checkAdmin();
  }, [navigate]);

  const handleSignOut = async () => {
    setLoading(true);
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
              <span className="text-xl font-bold">CorteFácil - Admin</span>
            </div>
            <button className="md:hidden inline-flex items-center justify-center rounded p-2" onClick={() => setNavOpen((v) => !v)} aria-label="Abrir menu">
              <Menu className="h-6 w-6" />
            </button>
            <nav className="hidden md:flex items-center gap-3">
              <Button variant="outline" className="text-primary border-primary" onClick={() => navigate("/admin")}>
                <Home className="mr-2 h-4 w-4" />
                <span translate="no" className="notranslate">Início</span>
              </Button>
              <Button variant="outline" className="text-primary border-primary" onClick={() => navigate("/admin/financeiro")}>Financeiro</Button>
              <Button variant="outline" className="text-primary border-primary" onClick={() => navigate("/admin/saloes")}>Salões Ativos</Button>
              <Button variant="outline" className="text-primary border-primary" onClick={() => navigate("/admin/pendentes")}>Salões Pendentes</Button>
              <Button variant="outline" className="text-primary border-primary" onClick={() => navigate("/admin/usuarios")}>Usuários</Button>
              <Button variant="outline" className="text-primary border-primary" onClick={() => navigate("/admin/planos")}>Planos</Button>
              <Button variant="outline" className="text-primary border-primary" onClick={() => navigate("/admin/faturas")}>Faturas Pendentes</Button>
              <Button variant="outline" className="text-primary border-primary" onClick={() => navigate("/admin/saques")}>Solicitações de Saque</Button>
            </nav>
          </div>
          <Button variant="outline" className="text-primary border-primary" onClick={handleSignOut} disabled={loading}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
        {navOpen && (
          <div className="md:hidden border-t bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))]">
            <div className="container mx-auto px-4 py-3 grid gap-2">
              <Button variant="outline" className="text-primary border-primary" onClick={() => { setNavOpen(false); navigate("/admin"); }}><span translate="no" className="notranslate">Início</span></Button>
              <Button variant="outline" className="text-primary border-primary" onClick={() => { setNavOpen(false); navigate("/admin/financeiro"); }}>Financeiro</Button>
              <Button variant="outline" className="text-primary border-primary" onClick={() => { setNavOpen(false); navigate("/admin/saloes"); }}>Salões Ativos</Button>
              <Button variant="outline" className="text-primary border-primary" onClick={() => { setNavOpen(false); navigate("/admin/pendentes"); }}>Salões Pendentes</Button>
              <Button variant="outline" className="text-primary border-primary" onClick={() => { setNavOpen(false); navigate("/admin/usuarios"); }}>Usuários</Button>
              <Button variant="outline" className="text-primary border-primary" onClick={() => { setNavOpen(false); navigate("/admin/planos"); }}>Planos</Button>
              <Button variant="outline" className="text-primary border-primary" onClick={() => { setNavOpen(false); navigate("/admin/faturas"); }}>Faturas Pendentes</Button>
              <Button variant="outline" className="text-primary border-primary" onClick={() => { setNavOpen(false); navigate("/admin/saques"); }}>Solicitações de Saque</Button>
            </div>
          </div>
        )}
      </header>
      {authorized && (
        <main className="container mx-auto px-4 py-8 pt-20">
          <Outlet />
        </main>
      )}
    </div>
  );
};

export default AdminLayout;
