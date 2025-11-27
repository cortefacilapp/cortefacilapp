import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export default Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key =
    Deno.env.get("SERVICE_ROLE_KEY") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    Deno.env.get("CHAVE_FUNÇÃO_DE_SERVIÇO") ||
    "";
  const mpToken = Deno.env.get("MP_ACCESS_TOKEN") || "";
  const returnBase = Deno.env.get("CHECKOUT_RETURN_URL") || Deno.env.get("URL_DE_RETIRADA_DO_CHECKOUT") || "";
  const client = createClient(url, key);
  const { plan_id } = await req.json();
  const { data: user } = await client.auth.getUser();
  const uid = user?.user?.id;
  if (!uid || !plan_id) return new Response(JSON.stringify({ error: "missing_params" }), { status: 400, headers: { "Content-Type": "application/json" } });

  const { data: plan, error: planErr } = await client.from("plans").select("id,name,price,interval,active,monthly_credits").eq("id", plan_id).eq("active", true).maybeSingle();
  if (planErr || !plan) return new Response(JSON.stringify({ error: planErr?.message || "plan_not_found" }), { status: 400, headers: { "Content-Type": "application/json" } });

  const { data: sub, error: subErr } = await client.from("user_subscriptions").insert({ user_id: uid, plan_id, status: "pending" }).select("id").maybeSingle();
  if (subErr || !sub) return new Response(JSON.stringify({ error: subErr?.message || "sub_create_failed" }), { status: 400, headers: { "Content-Type": "application/json" } });

  const unitPrice = Number(plan.price) / 100;
  const prefRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${mpToken}` },
    body: JSON.stringify({
      items: [{ title: plan.name, quantity: 1, unit_price: unitPrice, currency_id: "BRL" }],
      external_reference: sub.id,
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
  await client.from("user_subscriptions").update({ mp_payment_id: pref?.id }).eq("id", sub.id);
  return new Response(JSON.stringify({ subscription_id: sub.id, preference_id: pref?.id, init_point: pref?.init_point }), { headers: { "Content-Type": "application/json" } });
});
