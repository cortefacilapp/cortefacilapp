import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Plans } from "@/components/landing/Plans";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ForSalons } from "@/components/landing/ForSalons";
import { Footer } from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <Plans />
        <ForSalons />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
