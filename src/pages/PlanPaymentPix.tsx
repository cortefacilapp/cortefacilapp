import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const PlanPaymentPix = () => {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<any | null>(null);
  const [planIdState, setPlanIdState] = useState<string | null>(null);
  const [pixCode, setPixCode] = useState<string>("");
  const [pixImageBase64, setPixImageBase64] = useState<string>("");
  const [step, setStep] = useState<number>(1);
  const [secondsLeft, setSecondsLeft] = useState<number>(60);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [err, setErr] = useState<string>("");
  const [paymentKey, setPaymentKey] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let p: any | null = null;
      if (planId) {
        const { data, error } = await supabase
          .from("plans")
          .select("id,name,price,interval,monthly_credits")
          .eq("id", planId)
          .maybeSingle();
        if (!error && data) p = data;
      }
      if (!p) {
        const { data: list } = await supabase
          .from("plans")
          .select("id,name,price,interval,monthly_credits,active")
          .eq("active", true)
          .order("price", { ascending: true });
        const preferred = (list || []).find((x: any) => x.name === "Popular") || (list || [])[0] || null;
        p = preferred;
      }
      if (!p) {
        toast.error("Plano não encontrado");
        navigate("/planos");
        return;
      }
      setPlanIdState(p.id);
      setPlan(p);
      try {
        await generateAsaasPix(p.id, Number(p.price || 0), String(p.name || "Plano"));
        setErr("");
      } catch (e: any) {
        const m = e?.message || "Erro ao gerar PIX";
        setErr(m);
        toast.error(m);
      } finally {
        setLoading(false);
      }
    };
    load();
    (window as any).__retryPix = undefined;
  }, [planId]);

  useEffect(() => {
    if (!pixCode) return;
    setSecondsLeft(60);
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          setModalOpen(true);
          setTimeout(() => navigate("/dashboard"), 3000);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [pixCode]);

  useEffect(() => {
    if (!paymentKey || !(planIdState || plan?.id)) return;
    let stop = false;
    const subRealtime = async () => {
      const ch = supabase
        .channel(`payment-status-${paymentKey}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "payments", filter: `provider_payment_id=eq.${paymentKey}` },
          async (payload) => {
            const next = (payload.new as { status?: string | null; user_id?: string | null }) || {};
            if (next.status === "approved") {
              const { data: userData } = await supabase.auth.getUser();
              const uid = userData?.user?.id;
              if (uid) {
                await supabase
                  .from("user_subscriptions")
                  .update({ status: "active" })
                  .eq("user_id", uid)
                  .eq("plan_id", planIdState || plan.id);
              }
              setStep(3);
              setModalOpen(true);
              stop = true;
              try { supabase.removeChannel(ch); } catch (_) {}
            }
          },
        )
        .subscribe();
      return ch;
    };
    const startPolling = () => {
      let tries = 0;
      const pollId = setInterval(async () => {
        if (stop) { clearInterval(pollId); return; }
        tries += 1;
        const { data } = await supabase
          .from("payments")
          .select("status,user_id")
          .eq("provider_payment_id", paymentKey)
          .maybeSingle();
        if (data?.status === "approved") {
          const { data: userData } = await supabase.auth.getUser();
          const uid = userData?.user?.id;
          if (uid) {
            await supabase
              .from("user_subscriptions")
              .update({ status: "active" })
              .eq("user_id", uid)
              .eq("plan_id", planIdState || plan.id);
          }
          setStep(3);
          setModalOpen(true);
          stop = true;
          clearInterval(pollId);
        }
        if (tries > 60) {
          clearInterval(pollId);
        }
      }, 5000);
    };
    subRealtime();
    startPolling();
    return () => { stop = true; };
  }, [paymentKey, planIdState, plan?.id]);

  const payViaCheckout = async () => {
    try {
      const amount = Number(plan?.price) / 100;
      const text = encodeURIComponent(
        `Olá! Envio comprovante do pagamento do plano ${plan?.name} no valor R$ ${amount.toFixed(2)}. Chave PIX: d66c563a-71b6-4e2b-9292-8c71d218eb31`
      );
      window.location.href = `https://wa.me/5561982152648?text=${text}`;
    } catch (e: any) {
      toast.error(e?.message || "Erro ao iniciar checkout");
    }
  };

  const generateAsaasPix = async (targetPlanId?: string, priceCentsOverride?: number, planNameOverride?: string) => {
    try {
      const pid = targetPlanId || planIdState || plan?.id;
      if (!pid) { toast.error("Plano inválido"); return; }
      const cents = typeof priceCentsOverride === "number" ? priceCentsOverride : Number(plan?.price || 0);
      const amount = Math.round(cents) / 100;
      const providerId = `pix_${pid}_${Date.now()}`;
      const code = generatePixCopyPaste({
        key: STATIC_PIX_KEY,
        merchantName: "CORTEFACIL",
        merchantCity: "BRASILIA",
        amount,
        description: `Assinatura ${planNameOverride || plan?.name || "Plano"}`,
      });
      setPixImageBase64("");
      setPixCode(code);
      setPaymentKey(providerId);
      setStep(2);
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData?.user?.id;
        if (uid) {
          await supabase.from("payments").insert({ user_id: uid, amount: Number(plan?.price || 0), currency: "BRL", status: "pending", provider: "pix", provider_payment_id: providerId });
          await supabase.from("user_subscriptions").insert({ user_id: uid, plan_id: pid, status: "pending", current_period_start: new Date().toISOString(), current_period_end: new Date(Date.now() + 30*24*60*60*1000).toISOString() });
        }
      } catch (_) {}
    } catch (e: any) {
      const cents2 = typeof priceCentsOverride === "number" ? priceCentsOverride : Number(plan?.price || 0);
      const amount = Math.round(cents2) / 100;
      const providerId = `pix_${targetPlanId || planIdState || plan?.id}_${Date.now()}`;
      const code = generatePixCopyPaste({
        key: STATIC_PIX_KEY,
        merchantName: "CORTEFACIL",
        merchantCity: "BRASILIA",
        amount,
        description: `Assinatura ${planNameOverride || plan?.name || "Plano"}`,
      });
      setPixImageBase64("");
      setPixCode(code);
      setPaymentKey(providerId);
      setStep(2);
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData?.user?.id;
        if (uid) {
          await supabase.from("payments").insert({ user_id: uid, amount: Number(plan?.price || 0), currency: "BRL", status: "pending", provider: "pix", provider_payment_id: providerId });
          await supabase.from("user_subscriptions").insert({ user_id: uid, plan_id: targetPlanId || planIdState || plan?.id, status: "pending", current_period_start: new Date().toISOString(), current_period_end: new Date(Date.now() + 30*24*60*60*1000).toISOString() });
        }
      } catch (_) {}
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed inset-x-0 top-0 z-50 border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="text-xl font-bold">Pagamento PIX</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="text-primary border-primary" onClick={() => navigate("/planos")}>Voltar</Button>
            <Button variant="outline" className="text-primary border-primary" onClick={() => navigate("/dashboard")}>Dashboard</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pt-20">
        <Card className="border-2 hover:shadow-lg transition-shadow">
          <CardHeader className="bg-primary/5 rounded-md">
            <CardTitle>{plan?.name} • R$ {(Number(plan?.price) / 100).toFixed(2)} / {plan?.interval === "year" ? "ano" : "mês"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="text-sm text-muted-foreground">Cortes mensais: {plan?.monthly_credits}</div>
                {(() => {
                  const n = String(plan?.name || "");
                  const note = n === "Social"
                    ? "Observação: corte simples degradê"
                    : n === "Popular"
                    ? "Observação: corte simples + sobrancelhas"
                    : n === "Premium"
                    ? "Observação: corte profissional + sobrancelha + barba"
                    : "";
                  return note ? (
                    <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{note}</div>
                  ) : null;
                })()}
                <div className="mt-2 text-sm">Use o QR Code ao lado para pagar sua assinatura.</div>
                <div className="mt-3 text-sm">Tempo restante: {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}</div>
              </div>
              <div className="flex flex-col items-center justify-center">
                <div className="rounded-xl border bg-card p-4 shadow-lg">
                  {pixImageBase64 ? (
                    <img src={`data:image/png;base64,${pixImageBase64}`} alt="PIX QR Code" className="h-56 w-56 rounded" />
                  ) : (
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=224x224&data=${encodeURIComponent(pixCode)}`}
                      alt="PIX QR Code"
                      className="h-56 w-56 rounded"
                    />
                  )}
                </div>
                <div className="mt-2 w-full break-words text-center text-xs text-muted-foreground">
                  {pixCode}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" onClick={() => { navigator.clipboard.writeText(pixCode); toast.success("Código PIX copiado"); }}>Copiar código PIX</Button>
                  <Button onClick={() => { setStep(3); payViaCheckout(); }}>Enviar comprovante via WhatsApp</Button>
                </div>
                {!!err && <div className="mt-2 text-xs text-muted-foreground">{err}</div>}
              </div>
            </div>
            <div className="mt-6 grid gap-3">
              <div className="rounded border p-3 text-sm">
                <div className="font-medium">Passo 1</div>
                <div>Veja o plano e o valor, e confirme.</div>
              </div>
              <div className="rounded border p-3 text-sm">
                <div className="font-medium">Passo 2</div>
                <div>Faça o pagamento via PIX usando o QR Code ou copie o código acima.</div>
              </div>
              <div className="rounded border p-3 text-sm">
                <div className="font-medium">Passo 3</div>
                <div>Envie o comprovante pelo WhatsApp para aprovação (até 24h).</div>
              </div>
              <div className="text-xs text-muted-foreground">Status atual: Passo {step} de 3</div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-lg w-full max-w-full sm:w-auto sm:rounded-lg rounded-none sm:h-auto h-[90vh]">
            <DialogHeader>
              <DialogTitle>Obrigado por assinar!</DialogTitle>
              <DialogDescription>
                Pagamento registrado. Você será direcionado para o Dashboard.
              </DialogDescription>
            </DialogHeader>
            <div className="text-sm text-muted-foreground">Se preferir, clique abaixo.</div>
            <div className="mt-3">
              <Button className="w-full" onClick={() => navigate("/dashboard")}>Ir para Dashboard</Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default PlanPaymentPix;

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function tag(id: string, value: string) {
  return `${id}${pad2(value.length)}${value}`;
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function generatePixCopyPaste(opts: { key: string; merchantName: string; merchantCity: string; amount?: number; description?: string }) {
  const gui = tag("00", "BR.GOV.BCB.PIX");
  const key = tag("01", opts.key);
  const desc = opts.description ? tag("02", opts.description) : "";
  const mai = tag("26", `${gui}${key}${desc}`);
  const addData = tag("62", tag("05", "CORTFACIL"));
  const amt = typeof opts.amount === "number" && isFinite(opts.amount) ? tag("54", opts.amount.toFixed(2)) : "";
  const payloadNoCRC =
    tag("00", "01") + // Payload Format Indicator
    tag("01", "11") + // Point of Initiation Method: static
    tag("52", "0000") + // Merchant Category Code
    tag("53", "986") + // Currency: BRL
    amt + // Amount (optional)
    tag("58", "BR") + // Country Code
    tag("59", opts.merchantName) + // Merchant Name
    tag("60", opts.merchantCity) + // Merchant City
    mai + // Merchant Account Information
    addData; // Additional Data Field (reference label)
  const full = payloadNoCRC + "6304";
  const checksum = crc16(full);
  return payloadNoCRC + tag("63", checksum);
}
  const STATIC_PIX_KEY = String((import.meta as any).env?.VITE_PIX_STATIC_KEY || "d66c563a-71b6-4e2b-9292-8c71d218eb31");
