import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function paymentDetails(id: string, token: string) {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  return await res.json();
}

export default Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || undefined;
  const token = Deno.env.get("MP_ACCESS_TOKEN") || "";
  const supaUrl = Deno.env.get("SUPABASE_URL") || "";
  const supaKey =
    Deno.env.get("SERVICE_ROLE_KEY") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    Deno.env.get("CHAVE_FUNÇÃO_DE_SERVIÇO") ||
    "";
  const client = createClient(supaUrl, supaKey);
  let payload: any = null;
  try {
    payload = await req.json();
  } catch (_) {}
  if (type === "payment" && payload?.data?.id) {
    const pay = await paymentDetails(String(payload.data.id), token);
    if (!pay) return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    const ext = pay?.external_reference || null;
    const status = pay?.status || "pending";
    const { data: sub } = await client.from("user_subscriptions").select("id,plan_id,user_id").eq("id", ext).maybeSingle();
    if (sub?.id) {
      let newStatus = "pending";
      if (status === "approved") newStatus = "active";
      else if (["rejected","cancelled","refunded","charged_back"].includes(String(status))) newStatus = "canceled";
      const now = new Date();
      const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      await client.from("user_subscriptions").update({ status: newStatus, current_period_start: newStatus === "active" ? now.toISOString() : null, current_period_end: newStatus === "active" ? end.toISOString() : null }).eq("id", sub.id);
      const { data: plan } = await client.from("plans").select("price").eq("id", sub.plan_id).maybeSingle();
      const gross = Number((plan as any)?.price ?? 0) / 100;
      const platform_amount = Math.round(gross * 0.2 * 100) / 100;
      const salon_amount = gross - platform_amount;
      await client.from("payments").insert({ user_id: sub.user_id, amount: gross, currency: "BRL", status: status === "approved" ? "approved" : "pending", provider: "mercado_pago", provider_payment_id: String(pay.id), platform_amount, salon_amount });
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});

