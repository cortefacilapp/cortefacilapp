import { Button } from "@/components/ui/button";
import { Check, Scissors, Star, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Básico",
    price: "59,99",
    credits: 2,
    description: "Perfeito para manter o visual em dia",
    features: [
      "2 cortes por mês",
      "Válido por 30 dias",
      "Qualquer barbearia parceira",
      "Código de validação seguro",
    ],
    popular: false,
    icon: Scissors,
  },
  {
    name: "Popular",
    price: "79,99",
    credits: 3,
    description: "O favorito dos nossos assinantes",
    features: [
      "3 cortes por mês",
      "Válido por 30 dias",
      "Qualquer barbearia parceira",
      "Código de validação seguro",
      "Prioridade no atendimento",
    ],
    popular: true,
    icon: Star,
  },
  {
    name: "Premium",
    price: "159,99",
    credits: 4,
    description: "Para quem quer o melhor sempre",
    features: [
      "4 cortes por mês",
      "Válido por 30 dias",
      "Qualquer barbearia parceira",
      "Código de validação seguro",
      "Prioridade no atendimento",
      "Acesso a serviços exclusivos",
    ],
    popular: false,
    icon: Sparkles,
  },
];

export function Plans() {
  return (
    <section id="planos" className="py-24 relative">
      <div className="section-container">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl mb-4">
            ESCOLHA SEU <span className="text-gold-gradient">PLANO</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Planos flexíveis para todos os estilos. Cancele quando quiser.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 transition-all duration-300 card-hover ${
                  plan.popular
                    ? "bg-gradient-card border-2 border-primary glow-gold"
                    : "bg-card border border-border"
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {plan.popular && <div className="badge-popular">Mais Popular</div>}

                {/* Icon */}
                <div className={`icon-container mb-6 ${!plan.popular && "bg-secondary"}`}>
                  <Icon className={`w-7 h-7 ${plan.popular ? "text-primary-foreground" : "text-primary"}`} />
                </div>

                {/* Plan Info */}
                <h3 className="font-display text-3xl mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mb-6">{plan.description}</p>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-sm text-muted-foreground">R$</span>
                  <span className="font-display text-5xl text-gold-gradient">{plan.price}</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>

                {/* Credits highlight */}
                <div className="bg-primary/10 rounded-lg p-3 mb-6 text-center">
                  <span className="font-bold text-primary">{plan.credits} cortes</span>
                  <span className="text-muted-foreground"> por mês</span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-sm text-secondary-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  variant={plan.popular ? "hero" : "outline"}
                  className="w-full"
                  size="lg"
                  asChild
                >
                  <Link to="/cadastro">Assinar Agora</Link>
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
