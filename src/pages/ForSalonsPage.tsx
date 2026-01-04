import { Header } from "@/components/landing/Header";
import { ForSalons } from "@/components/landing/ForSalons";
import { Footer } from "@/components/landing/Footer";

const ForSalonsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        <ForSalons />
      </main>
      <Footer />
    </div>
  );
};

export default ForSalonsPage;
