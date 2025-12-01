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
  const client = createClient(url, key);
  const { email, plan_id, subscription_id, user_id } = await req.json();
  if (!subscription_id && (!plan_id || (!email && !user_id))) {
    return new Response(JSON.stringify({ error: "missing_params" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  let subId = subscription_id as string | null;
  let uid: string | null = user_id || null;
  if (!subId) {
    if (!uid && email) {
      const { data: user } = await client.from("profiles").select("id").eq("email", email).maybeSingle();
      uid = user?.id || null;
    }
    if (!uid) return new Response(JSON.stringify({ error: "user_not_found" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
    const { data: sub } = await client
      .from("user_subscriptions")
      .select("id,status")
      .eq("user_id", uid)
      .eq("plan_id", plan_id)
      .order("created_at", { ascending: false })
      .maybeSingle();
    subId = sub?.id || null;
    if (!subId) {
      const now = new Date();
      const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const { data: created, error: createErr } = await client
        .from("user_subscriptions")
        .insert({ user_id: uid, plan_id, status: "active", current_period_start: now.toISOString(), current_period_end: end.toISOString() })
        .select("id")
        .maybeSingle();
      if (createErr) return new Response(JSON.stringify({ error: createErr.message }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
      subId = created?.id || null;
      if (!subId) return new Response(JSON.stringify({ error: "subscription_create_failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }

  const now = new Date();
  const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const { error } = await client
    .from("user_subscriptions")
    .update({ status: "active", current_period_start: now.toISOString(), current_period_end: end.toISOString() })
    .eq("id", subId!);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
  if (!uid) {
    const { data: subUser } = await client.from("user_subscriptions").select("user_id").eq("id", subId!).maybeSingle();
    uid = subUser?.user_id || null;
  }
  // Mark last pending manual PIX payment as paid
  const { data: pay } = await client
    .from("payments")
    .select("id, amount")
    .eq("status", "pending")
    .eq("user_id", uid!)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (pay?.id) {
    const gross = Number(pay.amount) || 0;
    const platform_amount = Math.round(gross * 0.2);
    const salon_amount = gross - platform_amount;
    await client
      .from("payments")
      .update({ status: "approved", platform_amount, salon_amount, provider_payment_id: "manual_whatsapp" })
      .eq("id", pay.id);
  }
  return new Response(JSON.stringify({ ok: true, id: subId, payment_updated: !!pay?.id }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
});
