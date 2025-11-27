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
  const supaKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
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
    const { data: sub } = await client.from("subscriptions").select("id,plan_id").eq("id", ext).maybeSingle();
    if (sub?.id) {
      let newStatus = "pending";
      if (status === "approved") newStatus = "active";
      else if (status === "rejected" || status === "cancelled" || status === "refunded" || status === "charged_back") newStatus = "canceled";
      const { data: plan } = await client.from("plans").select("interval").eq("id", sub.plan_id).maybeSingle();
      const now = new Date();
      const end = new Date(now);
      if (plan?.interval === "year") end.setFullYear(end.getFullYear() + 1);
      else end.setMonth(end.getMonth() + 1);
      await client.from("subscriptions").update({ status: newStatus, started_at: newStatus === "active" ? now.toISOString() : null, current_period_end: newStatus === "active" ? end.toISOString() : null, mp_payment_id: String(pay.id) }).eq("id", sub.id);
      await client.from("subscription_events").insert({ subscription_id: sub.id, type: `payment_${status}`, payload: pay });
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});

