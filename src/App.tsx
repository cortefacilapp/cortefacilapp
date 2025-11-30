import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import SalonSignup from "./pages/SalonSignup";
import AdminLayout from "./pages/admin/AdminLayout";
import Financeiro from "./pages/admin/Financeiro";
import SaloesAtivos from "./pages/admin/SaloesAtivos";
import SaloesPendentes from "./pages/admin/SaloesPendentes";
import UsuariosAtivos from "./pages/admin/UsuariosAtivos";
import FaturasPendentes from "./pages/admin/FaturasPendentes";
import PlanosAdmin from "./pages/admin/PlanosAdmin";
import OwnerLayout from "./pages/owner/OwnerLayout";
import AdminDashboardPage from "./pages/admin/Dashboard";
import OwnerDashboardPage from "./pages/owner/Dashboard";
import PerfilSalao from "./pages/owner/PerfilSalao";
import Validacoes from "./pages/owner/Validacoes";
import Repasses from "./pages/owner/Repasses";
import PlansSelect from "./pages/PlansSelect";
import SalonsBrowse from "./pages/SalonsBrowse";
import Invoices from "./pages/Invoices";
import PlanPaymentPix from "./pages/PlanPaymentPix";
import ValidarCodigo from "./pages/owner/ValidarCodigo";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/signup" element={<Auth />} />
          <Route path="/signup/salao" element={<SalonSignup />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="financeiro" element={<Financeiro />} />
            <Route path="saloes" element={<SaloesAtivos />} />
            <Route path="pendentes" element={<SaloesPendentes />} />
          <Route path="usuarios" element={<UsuariosAtivos />} />
          <Route path="planos" element={<PlanosAdmin />} />
          <Route path="faturas" element={<FaturasPendentes />} />
          </Route>
          <Route path="/owner" element={<OwnerLayout />}>
            <Route path="dashboard" element={<OwnerDashboardPage />} />
            <Route path="validar" element={<ValidarCodigo />} />
            <Route path="perfil" element={<PerfilSalao />} />
            <Route path="validacoes" element={<Validacoes />} />
            <Route path="repasses" element={<Repasses />} />
          </Route>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/planos" element={<PlansSelect />} />
          <Route path="/planos/pagar/:planId" element={<PlanPaymentPix />} />
          <Route path="/planos/pagar" element={<PlanPaymentPix />} />
          <Route path="/saloes" element={<SalonsBrowse />} />
          <Route path="/faturas" element={<Invoices />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
