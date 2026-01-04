import { Header } from "@/components/landing/Header";
import { Privacy } from "@/components/landing/Privacy";
import { Footer } from "@/components/landing/Footer";

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        <Privacy />
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPage;
