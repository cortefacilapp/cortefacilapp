import { Button } from "@/components/ui/button";
import { TrendingUp, Users, Shield, Banknote, Clock, Award } from "lucide-react";
import { Link } from "react-router-dom";

const benefits = [
  {
    icon: TrendingUp,
    title: "Receita Recorrente",
    description: "Receba mensalmente pelos cortes realizados com assinantes",
  },
  {
    icon: Users,
    title: "Novos Clientes",
    description: "Aumente sua base de clientes com assinantes da plataforma",
  },
  {
    icon: Shield,
    title: "Zero Inadimplência",
    description: "Pagamentos garantidos via plataforma, sem calote",
  },
  {
    icon: Banknote,
    title: "80% do Valor",
    description: "Você recebe 80% do valor de cada corte realizado",
  },
  {
    icon: Clock,
    title: "Gestão Simplificada",
    description: "Painel completo para gerenciar seus assinantes",
  },
  {
    icon: Award,
    title: "Destaque na Plataforma",
    description: "Seja encontrado por milhares de potenciais clientes",
  },
];

export function ForSalons() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent" />

      <div className="section-container relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
              <span className="text-sm font-medium text-primary">Para Barbearias</span>
            </div>

            <h2 className="font-display text-4xl sm:text-5xl md:text-6xl mb-6">
              AUMENTE SUA
              <br />
              <span className="text-gold-gradient">RECEITA MENSAL</span>
            </h2>

            <p className="text-lg text-muted-foreground mb-8">
              Cadastre sua barbearia na maior plataforma de assinaturas do Brasil 
              e receba clientes todo mês sem esforço de marketing.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" size="lg" asChild>
                <Link to="/cadastro-salao">Cadastrar Minha Barbearia</Link>
              </Button>
              <Button variant="hero-outline" size="lg" asChild>
                <Link to="/login">Já tenho conta</Link>
              </Button>
            </div>
          </div>

          {/* Right Content - Benefits Grid */}
          <div className="grid sm:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.title}
                  className="group p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 card-hover"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
