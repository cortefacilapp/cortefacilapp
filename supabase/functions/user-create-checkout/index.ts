import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export default Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(null, { status: 405, headers: corsHeaders });
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key =
    Deno.env.get("SERVICE_ROLE_KEY") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    Deno.env.get("CHAVE_FUNÇÃO_DE_SERVIÇO") ||
    "";
  const mpToken = Deno.env.get("MP_ACCESS_TOKEN") || "";
  const webhookUrl = Deno.env.get("WEBHOOK_URL") || "";
  const returnBase = Deno.env.get("CHECKOUT_RETURN_URL") || "";
  const client = createClient(url, key, {
    global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
  });

  const body = await req.json();
  const plan_id: string = body?.plan_id;

  const { data: user } = await client.auth.getUser();
  const uid = user?.user?.id || null;
  if (!uid || !plan_id || !mpToken) {
    return new Response(JSON.stringify({ error: "missing_params" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  const { data: plan, error: planErr } = await client
    .from("plans")
    .select("id,name,price,interval,active")
    .eq("id", plan_id)
    .eq("active", true)
    .maybeSingle();
  if (planErr || !plan) {
    return new Response(JSON.stringify({ error: planErr?.message || "plan_not_found" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  const { data: existing } = await client
    .from("user_subscriptions")
    .select("id, status")
    .eq("user_id", uid)
    .eq("plan_id", plan_id)
    .maybeSingle();
  if (!existing) {
    const { error: subErr } = await client
      .from("user_subscriptions")
      .insert({ user_id: uid, plan_id, status: "pending" });
    if (subErr) {
      return new Response(JSON.stringify({ error: subErr.message }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
  }

  const p: { id: string; name: string; price: number; interval?: string | null; active: boolean } = plan as {
    id: string;
    name: string;
    price: number;
    interval?: string | null;
    active: boolean;
  };
  const unitPrice = Number(p.price) / 100;

  const { data: payRow, error: payErr } = await client
    .from("payments")
    .insert({ user_id: uid, amount: Math.round(unitPrice * 100), currency: "BRL", status: "pending", provider: "mercado_pago", provider_payment_id: "" })
    .select("id")
    .maybeSingle();
  if (payErr || !payRow?.id) {
    return new Response(JSON.stringify({ error: payErr?.message || "payment_create_failed" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  const prefRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${mpToken}` },
    body: JSON.stringify({
      items: [{ title: p.name, quantity: 1, unit_price: unitPrice, currency_id: "BRL" }],
      external_reference: payRow.id,
      notification_url: webhookUrl || undefined,
      auto_return: "approved",
      back_urls: returnBase ? { success: `${returnBase}/success`, failure: `${returnBase}/failure`, pending: `${returnBase}/pending` } : undefined,
      statement_descriptor: "CorteFacil",
    }),
  });
  if (!prefRes.ok) {
    const t = await prefRes.text();
    return new Response(JSON.stringify({ error: "mp_preference_failed", detail: t }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
  const pref = await prefRes.json();
  const { error: updErr } = await client
    .from("payments")
    .update({ provider_payment_id: pref?.id })
    .eq("id", payRow.id);
  if (updErr) {
    return new Response(JSON.stringify({ error: updErr.message }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  return new Response(JSON.stringify({ preference_id: pref?.id, init_point: pref?.init_point }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
});
