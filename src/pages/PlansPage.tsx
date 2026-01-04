import { Header } from "@/components/landing/Header";
import { Plans } from "@/components/landing/Plans";
import { Footer } from "@/components/landing/Footer";

const PlansPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        <Plans />
      </main>
      <Footer />
    </div>
  );
};

export default PlansPage;
