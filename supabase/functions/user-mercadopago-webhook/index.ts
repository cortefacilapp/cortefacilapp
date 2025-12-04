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
      if (status === "approved") newStatus = "approved";
      else if (["rejected","cancelled","refunded","charged_back"].includes(String(status))) newStatus = "canceled";
      await client
        .from("user_subscriptions")
        .update({ status: newStatus, current_period_start: null, current_period_end: null })
        .eq("id", sub.id);

      const { data: plan } = await client.from("plans").select("price").eq("id", sub.plan_id).maybeSingle();
      const priceCents = Number((plan as any)?.price ?? 0);
      const platform_amount = Math.round(priceCents * 0.2);
      const salon_amount = priceCents - platform_amount;

      const { data: existing } = await client
        .from("payments")
        .select("id")
        .eq("provider_payment_id", String(pay.id))
        .eq("user_id", sub.user_id)
        .maybeSingle();
      if (existing?.id) {
        await client
          .from("payments")
          .update({ amount: priceCents, currency: "BRL", status: "pending", provider: "mercado_pago", platform_amount, salon_amount })
          .eq("id", existing.id);
      } else {
        await client
          .from("payments")
          .insert({ user_id: sub.user_id, amount: priceCents, currency: "BRL", status: "pending", provider: "mercado_pago", provider_payment_id: String(pay.id), platform_amount, salon_amount });
      }
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
