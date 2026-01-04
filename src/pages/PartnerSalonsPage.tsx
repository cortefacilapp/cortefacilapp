import { Header } from "@/components/landing/Header";
import { PartnerSalons } from "@/components/landing/PartnerSalons";
import { Footer } from "@/components/landing/Footer";

const PartnerSalonsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        <PartnerSalons />
      </main>
      <Footer />
    </div>
  );
};

export default PartnerSalonsPage;
