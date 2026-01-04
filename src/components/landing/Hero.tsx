import { Button } from "@/components/ui/button";
import { Scissors, Star, Users, Crown } from "lucide-react";
import { Link } from "react-router-dom";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-dark" />
      
      {/* Decorative elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      
      {/* Content */}
      <div className="relative z-10 section-container py-20 lg:py-32">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-8 animate-fade-in">
            <Crown className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Plataforma #1 de Assinaturas de Barbearia</span>
          </div>
          
          {/* Headline */}
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-none mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            CORTES ILIMITADOS.
            <br />
            <span className="text-gold-gradient">UM PREÇO FIXO.</span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Assine e tenha acesso a cortes de cabelo premium todos os meses. 
            Sem surpresas, sem filas, apenas estilo garantido.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Button variant="hero" size="xl" asChild>
              <Link to="/planos">
                <Scissors className="w-5 h-5" />
                Ver Planos
              </Link>
            </Button>
            <Button variant="hero-outline" size="xl" asChild>
              <Link to="/para-saloes">
                Sou Dono de Salão
              </Link>
            </Button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="text-center">
              <div className="stat-number">500+</div>
              <p className="text-sm text-muted-foreground mt-1">Assinantes Ativos</p>
            </div>
            <div className="text-center">
              <div className="stat-number">50+</div>
              <p className="text-sm text-muted-foreground mt-1">Barbearias Parceiras</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <span className="stat-number">4.9</span>
                <Star className="w-6 h-6 text-primary fill-primary" />
              </div>
              <p className="text-sm text-muted-foreground mt-1">Avaliação Média</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
