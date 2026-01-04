import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Como funciona a assinatura?",
    answer: "Você escolhe um plano que melhor se adapta às suas necessidades (número de cortes por mês) e paga um valor fixo mensal. Com a assinatura ativa, você pode cortar o cabelo em qualquer barbearia parceira da nossa rede.",
  },
  {
    question: "Posso cancelar quando quiser?",
    answer: "Sim! Não temos fidelidade. Você pode cancelar sua assinatura a qualquer momento através do seu painel de controle, sem multas ou taxas adicionais.",
  },
  {
    question: "Os créditos acumulam para o mês seguinte?",
    answer: "Não, os créditos de corte são válidos apenas para o mês vigente. Eles são renovados automaticamente a cada ciclo de pagamento.",
  },
  {
    question: "Como agendo meu corte?",
    answer: "Você não precisa agendar pela plataforma. Basta ir até uma barbearia parceira e, na hora de pagar, informar que é assinante BarberClub e apresentar seu código de validação disponível no app.",
  },
  {
    question: "Posso usar em qualquer barbearia?",
    answer: "Você pode utilizar seus créditos em qualquer barbearia cadastrada em nossa rede de parceiros. Consulte a lista de barbearias disponíveis na sua região através do nosso aplicativo ou site.",
  },
  {
    question: "E se eu quiser cortar mais vezes do que meu plano permite?",
    answer: "Caso você utilize todos os créditos do seu plano, poderá realizar cortes avulsos pagando diretamente à barbearia ou fazer um upgrade de plano a qualquer momento.",
  },
];

export function FAQ() {
  return (
    <section className="py-24 relative">
      <div className="section-container max-w-3xl">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl sm:text-5xl mb-4">
            PERGUNTAS <span className="text-gold-gradient">FREQUENTES</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Tire suas dúvidas sobre como funciona o BarberClub
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left text-lg font-medium">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
