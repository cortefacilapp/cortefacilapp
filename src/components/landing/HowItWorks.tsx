import { UserPlus, CreditCard, QrCode, Scissors } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Cadastre-se",
    description: "Crie sua conta em menos de 2 minutos",
    icon: UserPlus,
  },
  {
    number: "02",
    title: "Escolha o Plano",
    description: "Selecione o plano ideal para você",
    icon: CreditCard,
  },
  {
    number: "03",
    title: "Gere seu Código",
    description: "Acesse seu painel e gere o código de validação",
    icon: QrCode,
  },
  {
    number: "04",
    title: "Corte o Cabelo",
    description: "Apresente o código na barbearia e aproveite!",
    icon: Scissors,
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 bg-card/50">
      <div className="section-container">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl mb-4">
            COMO <span className="text-gold-gradient">FUNCIONA</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Simples, rápido e sem complicação. Veja como é fácil usar nossa plataforma.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="relative group"
              >
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[60%] w-full h-[2px] bg-gradient-to-r from-primary/50 to-transparent" />
                )}

                <div className="relative z-10 text-center">
                  {/* Number badge */}
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-card border border-border mb-6 group-hover:border-primary transition-colors">
                    <Icon className="w-8 h-8 text-primary" />
                  </div>

                  {/* Step number */}
                  <div className="font-display text-6xl text-primary/20 absolute -top-4 left-1/2 -translate-x-1/2">
                    {step.number}
                  </div>

                  {/* Content */}
                  <h3 className="font-display text-2xl mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
