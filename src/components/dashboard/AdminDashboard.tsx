import { Routes, Route } from "react-router-dom";
import { AdminOverview } from "./admin/AdminOverview";
import { AdminSalons } from "./admin/AdminSalons";
import { AdminSubscribers } from "./admin/AdminSubscribers";
import { AdminSubscriptions } from "./admin/AdminSubscriptions";
import { AdminFinancial } from "./admin/AdminFinancial";
import { AdminWithdrawals } from "./admin/AdminWithdrawals";
import { AdminSettings } from "./admin/AdminSettings";
import { AdminUsers } from "./admin/AdminUsers";

export function AdminDashboard() {
  return (
    <Routes>
      <Route index element={<AdminOverview />} />
      <Route path="cadastros" element={<AdminUsers />} />
      <Route path="saloes" element={<AdminSalons />} />
      <Route path="assinantes" element={<AdminSubscribers />} />
      <Route path="assinaturas" element={<AdminSubscriptions />} />
      <Route path="financeiro" element={<AdminFinancial />} />
      <Route path="saques" element={<AdminWithdrawals />} />
      <Route path="configuracoes" element={<AdminSettings />} />
    </Routes>
  );
}
