import { Routes, Route } from "react-router-dom";
import { SubscriberOverview } from "./subscriber/SubscriberOverview";
import { SubscriberCode } from "./subscriber/SubscriberCode";
import { SubscriberHistory } from "./subscriber/SubscriberHistory";
import { SubscriberSubscription } from "./subscriber/SubscriberSubscription";
import { SubscriberProfile } from "./subscriber/SubscriberProfile";

export function SubscriberDashboard() {
  return (
    <Routes>
      <Route index element={<SubscriberOverview />} />
      <Route path="codigo" element={<SubscriberCode />} />
      <Route path="meus-cortes" element={<SubscriberHistory />} />
      <Route path="minha-assinatura" element={<SubscriberSubscription />} />
      <Route path="perfil" element={<SubscriberProfile />} />
    </Routes>
  );
}
