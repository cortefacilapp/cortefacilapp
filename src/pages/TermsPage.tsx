import { Header } from "@/components/landing/Header";
import { Terms } from "@/components/landing/Terms";
import { Footer } from "@/components/landing/Footer";

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        <Terms />
      </main>
      <Footer />
    </div>
  );
};

export default TermsPage;
