import { ReactNode, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { 
  Scissors, 
  LogOut, 
  Menu, 
  X, 
  Home,
  CreditCard,
  History,
  Settings,
  Users,
  Building,
  DollarSign,
  QrCode,
  LayoutDashboard,
  Store,
  User
} from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getNavItems = () => {
    switch (role) {
      case "admin":
        return [
          { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
          { icon: Building, label: "Salões", href: "/dashboard/saloes" },
          { icon: Users, label: "Assinantes", href: "/dashboard/assinantes" },
          { icon: CreditCard, label: "Assinaturas", href: "/dashboard/assinaturas" },
          { icon: DollarSign, label: "Financeiro", href: "/dashboard/financeiro" },
          { icon: Settings, label: "Configurações", href: "/dashboard/configuracoes" },
        ];
      case "salon_owner":
        return [
          { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
          { icon: QrCode, label: "Validar Corte", href: "/dashboard/validar" },
          { icon: Users, label: "Assinantes", href: "/dashboard/meus-assinantes" },
          { icon: History, label: "Histórico", href: "/dashboard/historico" },
          { icon: DollarSign, label: "Financeiro", href: "/dashboard/meu-financeiro" },
          { icon: Building, label: "Dados Bancários", href: "/dashboard/dados-bancarios" },
          { icon: Settings, label: "Meu Salão", href: "/dashboard/meu-salao" },
          { icon: User, label: "Perfil", href: "/dashboard/perfil" },
        ];
      case "subscriber":
      default:
        return [
          { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
          { icon: Store, label: "Vincular Salão", href: "/dashboard/saloes" },
          { icon: QrCode, label: "Gerar Código", href: "/dashboard/codigo" },
          { icon: History, label: "Meus Cortes", href: "/dashboard/meus-cortes" },
          { icon: CreditCard, label: "Minha Assinatura", href: "/dashboard/minha-assinatura" },
          { icon: Settings, label: "Perfil", href: "/dashboard/perfil" },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-gold flex items-center justify-center">
                <Scissors className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl">BARBERCLUB</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User info & Logout */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 px-4 py-2 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.email}</p>
                <p className="text-xs text-muted-foreground capitalize">{role}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
              onClick={handleSignOut}
            >
              <LogOut className="w-5 h-5" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-gold flex items-center justify-center">
              <Scissors className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg">BARBERCLUB</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        {/* Page content */}
        <main className="p-6 pb-24 lg:p-8 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border lg:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex flex-col items-center justify-center w-full h-full gap-1 text-xs font-medium transition-colors ${
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "fill-current" : ""}`} />
                <span className="truncate max-w-[64px]">{item.label}</span>
              </Link>
            );
          })}
          
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center justify-center w-full h-full gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu className="w-5 h-5" />
            <span>Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
