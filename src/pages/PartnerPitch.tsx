import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, DollarSign, Users, TrendingUp, QrCode, Calendar, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const PartnerPitch = () => {
  const benefits = [
    { title: "Entrada contínua de novos clientes", desc: "Ganhe visibilidade sem esforço", icon: Users },
    { title: "Faturamento previsível mensal", desc: "Receita recorrente garantida", icon: TrendingUp },
    { title: "Fidelização automática", desc: "Conforto da plataforma fideliza usuários", icon: Shield },
    { title: "Destaque na lista de salões", desc: "Mais exposição para seu negócio", icon: Users },
    { title: "Zero investimento inicial", desc: "Credencie-se sem custos", icon: CheckCircle },
    { title: "Custo zero de marketing", desc: "A plataforma gera demanda", icon: TrendingUp },
    { title: "Fluxo de caixa garantido", desc: "Repasses mensais automáticos", icon: DollarSign },
  ];

  const projections = [
    { users: 20, amount: "R$ 1.200 / mês" },
    { users: 50, amount: "R$ 3.200 / mês" },
    { users: 100, amount: "R$ 6.399 / mês" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="mb-5 text-4xl font-bold text-white md:text-5xl">A nova forma de aumentar a receita do seu salão</h1>
          <p className="mx-auto mb-8 max-w-3xl text-lg text-white/90">Receba clientes novos todos os dias, aumente sua receita mensal e tenha repasses garantidos ao final de cada mês.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" asChild className="bg-white text-primary hover:bg-white/90">
              <Link to="/signup/salao">Quero credenciar meu salão agora</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-white text-white hover:bg-white/10">
              <Link to="/salons">Ver salões credenciados</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold">Como o repasse funciona</h2>
            <p className="text-muted-foreground">Transparente, automático e visível no painel</p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Regra padrão</CardTitle>
                <CardDescription>80% para o salão • 20% para a plataforma</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-primary" />O usuário assina um plano mensal</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-primary" />O salão recebe uma parte do valor todo mês</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-primary" />Repasse com base nas autenticações de corte</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-primary" />Cálculo automático e transparente no painel</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle>Exemplo prático</CardTitle>
                <CardDescription>Plano de R$ 79,99</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Salão</span>
                    <span className="text-lg font-semibold text-green-600">R$ 63,99</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm">Plataforma</span>
                    <span className="text-lg font-semibold text-muted-foreground">R$ 16,00</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="bg-muted py-16">
        <div className="container mx-auto px-4">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold">Por que vale a pena ser parceiro?</h2>
            <p className="text-muted-foreground">Benefícios reais e imediatos para seu negócio</p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {benefits.map((b) => (
              <Card key={b.title} className="border-2 transition-shadow hover:shadow-elevated">
                <CardHeader>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    {b.icon && <b.icon className="h-5 w-5 text-primary" />}
                  </div>
                  <CardTitle className="text-lg">{b.title}</CardTitle>
                  <CardDescription>{b.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
          <div className="mx-auto mt-8 max-w-3xl text-center text-sm text-muted-foreground">
            <p>Seu salão ganha mais sem aumentar o trabalho. Transforme cada usuário em receita recorrente. Clientes novos, receita nova, todos os meses.</p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold">O fluxo do usuário</h2>
            <p className="text-muted-foreground">Simples e visual</p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            <Card className="border-2"><CardContent className="p-6"><div className="flex items-center gap-3"><Calendar className="h-5 w-5 text-primary" /><span>Usuário assina um plano mensal</span></div></CardContent></Card>
            <Card className="border-2"><CardContent className="p-6"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-primary" /><span>Seleciona seu salão parceiro</span></div></CardContent></Card>
            <Card className="border-2"><CardContent className="p-6"><div className="flex items-center gap-3"><QrCode className="h-5 w-5 text-primary" /><span>Recebe um código/QR Code</span></div></CardContent></Card>
            <Card className="border-2"><CardContent className="p-6"><div className="flex items-center gap-3"><Shield className="h-5 w-5 text-primary" /><span>Apresenta o código no salão</span></div></CardContent></Card>
            <Card className="border-2"><CardContent className="p-6"><div className="flex items-center gap-3"><CheckCircle className="h-5 w-5 text-primary" /><span>Validação no painel do parceiro</span></div></CardContent></Card>
            <Card className="border-2"><CardContent className="p-6"><div className="flex items-center gap-3"><DollarSign className="h-5 w-5 text-primary" /><span>Corte contabilizado no repasse mensal</span></div></CardContent></Card>
          </div>
        </div>
      </section>

      <section className="bg-muted py-16">
        <div className="container mx-auto px-4">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold">Projeção de faturamento</h2>
            <p className="text-muted-foreground">Cenários financeiros para seu salão</p>
          </div>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            {projections.map((p) => (
              <Card key={p.users} className="border-2">
                <CardHeader>
                  <CardTitle className="text-xl">{p.users} usuários</CardTitle>
                  <CardDescription>Receita estimada</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold text-foreground">{p.amount}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold">Depoimentos</h2>
            <p className="text-muted-foreground">Histórias de crescimento</p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            <Card className="border-2"><CardContent className="p-6"><p className="text-sm">“Aumentamos o faturamento e reduzimos a ociosidade em 30%.”</p><p className="mt-2 text-xs text-muted-foreground">Barbearia Alfa</p></CardContent></Card>
            <Card className="border-2"><CardContent className="p-6"><p className="text-sm">“Ganhei clientes novos todos os meses sem investir em marketing.”</p><p className="mt-2 text-xs text-muted-foreground">Studio Bella</p></CardContent></Card>
            <Card className="border-2"><CardContent className="p-6"><p className="text-sm">“Fluxo de caixa previsível fez toda a diferença para o negócio.”</p><p className="mt-2 text-xs text-muted-foreground">Salão Lux</p></CardContent></Card>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="bg-gradient-hero text-white">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl md:text-4xl">Comece hoje mesmo a aumentar a receita do seu salão</CardTitle>
              <CardDescription className="text-lg text-white/90">Cadastre-se em menos de 1 minuto</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button size="lg" asChild className="bg-white text-primary hover:bg-white/90">
                <Link to="/signup/salao">Credenciar agora</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default PartnerPitch;
