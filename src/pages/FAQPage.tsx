import { Header } from "@/components/landing/Header";
import { FAQ } from "@/components/landing/FAQ";
import { Footer } from "@/components/landing/Footer";

const FAQPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        <FAQ />
      </main>
      <Footer />
    </div>
  );
};

export default FAQPage;
