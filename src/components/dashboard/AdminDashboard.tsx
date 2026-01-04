import { Routes, Route } from "react-router-dom";
import { AdminOverview } from "./admin/AdminOverview";
import { AdminSalons } from "./admin/AdminSalons";
import { AdminSubscribers } from "./admin/AdminSubscribers";
import { AdminSubscriptions } from "./admin/AdminSubscriptions";
import { AdminFinancial } from "./admin/AdminFinancial";
import { AdminSettings } from "./admin/AdminSettings";

export function AdminDashboard() {
  return (
    <Routes>
      <Route index element={<AdminOverview />} />
      <Route path="saloes" element={<AdminSalons />} />
      <Route path="assinantes" element={<AdminSubscribers />} />
      <Route path="assinaturas" element={<AdminSubscriptions />} />
      <Route path="financeiro" element={<AdminFinancial />} />
      <Route path="configuracoes" element={<AdminSettings />} />
    </Routes>
  );
}
