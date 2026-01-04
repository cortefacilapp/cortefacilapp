import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, Scissors, Star, Sparkles, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function Plans() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      let { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price');
      
      if (error) throw error;

      if (!data || data.length === 0) {
        // Auto-seed default plans if empty
        const defaultPlans = [
          { 
            name: "Básico", 
            price: 59.99, 
            credits_per_month: 2, 
            description: "Perfeito para manter o visual em dia",
            duration_days: 30
          },
          { 
            name: "Popular", 
            price: 79.99, 
            credits_per_month: 3, 
            description: "O favorito dos nossos assinantes",
            duration_days: 30
          },
          { 
            name: "Premium", 
            price: 159.99, 
            credits_per_month: 4, 
            description: "Para quem quer o melhor sempre",
            duration_days: 30
          }
        ];
        
        const { data: newPlans, error: seedError } = await supabase
          .from('plans')
          .insert(defaultPlans)
          .select();
          
        if (!seedError && newPlans) {
          data = newPlans;
        }
      }
      
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (name: string) => {
    if (name.toLowerCase().includes('básico')) return Scissors;
    if (name.toLowerCase().includes('premium')) return Sparkles;
    return Star;
  };

  const getFeatures = (plan: any) => {
    return [
      `${plan.credits_per_month} cortes por mês`,
      "Válido por 30 dias",
      "Qualquer barbearia parceira",
      "Código de validação seguro",
      plan.price > 60 ? "Prioridade no atendimento" : null,
      plan.price > 100 ? "Acesso a serviços exclusivos" : null
    ].filter(Boolean);
  };

  if (loading) {
    return (
      <section id="planos" className="py-24 relative min-h-[600px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </section>
    );
  }

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
            const Icon = getIcon(plan.name);
            const isPopular = plan.name.toLowerCase().includes('popular');
            const features = getFeatures(plan);

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-8 transition-all duration-300 card-hover ${
                  isPopular
                    ? "bg-gradient-card border-2 border-primary glow-gold"
                    : "bg-card border border-border"
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {isPopular && <div className="badge-popular">Mais Popular</div>}

                {/* Icon */}
                <div className={`icon-container mb-6 ${!isPopular && "bg-secondary"}`}>
                  <Icon className={`w-7 h-7 ${isPopular ? "text-primary-foreground" : "text-primary"}`} />
                </div>

                {/* Plan Info */}
                <h3 className="font-display text-3xl mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mb-6">{plan.description}</p>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-sm text-muted-foreground">R$</span>
                  <span className="font-display text-5xl text-gold-gradient">
                    {typeof plan.price === 'number' ? plan.price.toFixed(2).replace('.', ',') : plan.price}
                  </span>
                  <span className="text-muted-foreground">/mês</span>
                </div>

                {/* Credits highlight */}
                <div className="bg-primary/10 rounded-lg p-3 mb-6 text-center">
                  <span className="font-bold text-primary">{plan.credits_per_month} cortes</span>
                  <span className="text-muted-foreground"> por mês</span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {features.map((feature: any) => (
                    <li key={feature} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-sm text-secondary-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  variant={isPopular ? "hero" : "outline"}
                  className="w-full"
                  size="lg"
                  onClick={() => user ? navigate(`/checkout/${plan.id}`) : navigate('/login')}
                >
                  Assinar Agora
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
