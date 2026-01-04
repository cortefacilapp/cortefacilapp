import { Routes, Route } from "react-router-dom";
import { SalonOverview } from "./salon/SalonOverview";
import { SalonValidate } from "./salon/SalonValidate";
import { SalonSubscribers } from "./salon/SalonSubscribers";
import { SalonHistory } from "./salon/SalonHistory";
import { SalonFinancial } from "./salon/SalonFinancial";
import { SalonProfile } from "./salon/SalonProfile";

export function SalonDashboard() {
  return (
    <Routes>
      <Route index element={<SalonOverview />} />
      <Route path="validar" element={<SalonValidate />} />
      <Route path="meus-assinantes" element={<SalonSubscribers />} />
      <Route path="historico" element={<SalonHistory />} />
      <Route path="meu-financeiro" element={<SalonFinancial />} />
      <Route path="meu-salao" element={<SalonProfile />} />
    </Routes>
  );
}
