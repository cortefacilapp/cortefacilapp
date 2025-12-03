import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Scissors, MapPin, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Básico",
    price: "R$ 59,99",
    cuts: 2,
    popular: false,
    features: ["2 cortes por mês", "Válido em todos os salões parceiros", "Suporte via email"],
  },
  {
    name: "Popular",
    price: "R$ 79,99",
    cuts: 3,
    popular: true,
    features: ["3 cortes por mês", "Válido em todos os salões parceiros", "Suporte prioritário", "Desconto especial"],
  },
  {
    name: "Premium",
    price: "R$ 159,99",
    cuts: 4,
    popular: false,
    features: ["4 cortes por mês", "Válido em todos os salões parceiros", "Suporte 24/7", "Benefícios exclusivos"],
  },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L2c+PC9zdmc+')] opacity-30"></div>
        
        <div className="container relative mx-auto px-4 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-6 text-5xl font-bold text-white md:text-6xl lg:text-7xl animate-fade-in">
              Cortes ilimitados por um preço fixo
            </h1>
            <p className="mb-8 text-xl text-white/90 animate-slide-up">
              Assine o CorteFácil e aproveite cortes mensais nos melhores salões da sua região
            </p>
            <div className="flex flex-wrap justify-center gap-4 animate-scale-in">
              <Button size="lg" asChild className="bg-white text-primary hover:bg-white/90">
                <Link to="/signup">Começar Agora</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-primary text-primary hover:bg-primary/10">
                <Link to="/salons">Ver Salões</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold">Como Funciona</h2>
            <p className="text-lg text-muted-foreground">Simples, rápido e econômico</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <Card className="border-2 transition-shadow hover:shadow-elevated">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-primary">
                  <Scissors className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle>Escolha seu Plano</CardTitle>
                <CardDescription>
                  Selecione o plano que melhor se adapta às suas necessidades
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 transition-shadow hover:shadow-elevated">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-secondary">
                  <MapPin className="h-6 w-6 text-secondary-foreground" />
                </div>
                <CardTitle>Encontre Salões</CardTitle>
                <CardDescription>
                  Acesse nossa rede de salões parceiros em toda a cidade
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 transition-shadow hover:shadow-elevated">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-accent">
                  <Shield className="h-6 w-6 text-accent-foreground" />
                </div>
                <CardTitle>Use seu Código</CardTitle>
                <CardDescription>
                  Gere um código único e apresente no salão para cada corte
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

  {/* Pricing Section */}
  <section className="bg-muted py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold">Planos e Preços</h2>
            <p className="text-lg text-muted-foreground">
              Escolha o plano ideal para você
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative transition-all hover:shadow-elevated ${
                  plan.popular ? "border-primary border-2 scale-105" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-accent px-4 py-1 text-sm font-semibold text-accent-foreground">
                    Mais Popular
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">/mês</span>
                  </CardDescription>
                  <p className="mt-2 text-sm font-medium text-primary">
                    {plan.cuts} cortes por mês
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="mb-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    className={plan.popular ? "w-full bg-gradient-primary" : "w-full"}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    <Link to="/signup">Assinar Agora</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
  </section>

  {/* Salon Owners Section */}
  <section className="py-20">
    <div className="container mx-auto px-4">
      <div className="mb-12 text-center">
        <h2 className="mb-4 text-4xl font-bold">Para Donos de Salão</h2>
        <p className="text-lg text-muted-foreground">Aumente sua clientela e simplifique sua gestão</p>
      </div>

      <div className="mx-auto max-w-5xl">
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Seja parceiro do CorteFácil</CardTitle>
            <CardDescription>
              Cadastre seu salão e receba clientes recorrentes com planos mensais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <p className="font-medium">Mais clientes</p>
                <p className="text-sm text-muted-foreground">Entre para nossa rede e ganhe visibilidade</p>
              </div>
              <div className="space-y-2">
                <p className="font-medium">Gestão simples</p>
                <p className="text-sm text-muted-foreground">Valide cortes com um código único</p>
              </div>
              <div className="space-y-2">
                <p className="font-medium">Pagamentos previsíveis</p>
                <p className="text-sm text-muted-foreground">Planos garantem receita mensal</p>
              </div>
            </div>

            <div className="mt-8 flex justify-center gap-3">
              <Button asChild size="lg" className="px-8">
                <Link to="/signup/salao">Cadastrar Salão</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="px-8">
                <Link to="/parceiros/saiba-mais">Saiba mais</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="bg-gradient-hero text-white">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl md:text-4xl">
                Pronto para começar?
              </CardTitle>
              <CardDescription className="text-lg text-white/90">
                Junte-se a milhares de clientes satisfeitos
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button size="lg" asChild className="bg-white text-primary hover:bg-white/90">
                <Link to="/signup">Criar Conta Grátis</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 CorteFácil. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
