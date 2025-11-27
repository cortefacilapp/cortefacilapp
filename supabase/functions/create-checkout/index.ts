import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export default Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const mpToken = Deno.env.get("MP_ACCESS_TOKEN") || "";
  const webhookUrl = Deno.env.get("WEBHOOK_URL") || "";
  const returnBase = Deno.env.get("CHECKOUT_RETURN_URL") || "";
  const client = createClient(url, key);
  const body = await req.json();
  const salon_id: string = body?.salon_id;
  const plan_id: string = body?.plan_id;
  if (!salon_id || !plan_id) return new Response(JSON.stringify({ error: "missing_params" }), { status: 400, headers: { "Content-Type": "application/json" } });
  const { data: plan, error: planErr } = await client.from("plans").select("id,name,price,interval,active").eq("id", plan_id).eq("active", true).maybeSingle();
  if (planErr || !plan) return new Response(JSON.stringify({ error: planErr?.message || "plan_not_found" }), { status: 400, headers: { "Content-Type": "application/json" } });
  const { data: sub, error: subErr } = await client.from("subscriptions").insert({ salon_id, plan_id, status: "pending" }).select("id").maybeSingle();
  if (subErr || !sub) return new Response(JSON.stringify({ error: subErr?.message || "sub_create_failed" }), { status: 400, headers: { "Content-Type": "application/json" } });
  const unitPrice = Number(plan.price) / 100;
  const prefRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${mpToken}` },
    body: JSON.stringify({
      items: [{ title: plan.name, quantity: 1, unit_price: unitPrice, currency_id: "BRL" }],
      external_reference: sub.id,
      notification_url: webhookUrl || undefined,
      auto_return: "approved",
      back_urls: returnBase
        ? { success: `${returnBase}/success`, failure: `${returnBase}/failure`, pending: `${returnBase}/pending` }
        : undefined,
      statement_descriptor: "CorteFacil",
    }),
  });
  if (!prefRes.ok) {
    const t = await prefRes.text();
    return new Response(JSON.stringify({ error: "mp_preference_failed", detail: t }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const pref = await prefRes.json();
  const { error: updErr } = await client.from("subscriptions").update({ mp_preference_id: pref?.id, external_reference: sub.id }).eq("id", sub.id);
  if (updErr) return new Response(JSON.stringify({ error: updErr.message }), { status: 400, headers: { "Content-Type": "application/json" } });
  return new Response(JSON.stringify({ subscription_id: sub.id, preference_id: pref?.id, init_point: pref?.init_point }), { headers: { "Content-Type": "application/json" } });
});

