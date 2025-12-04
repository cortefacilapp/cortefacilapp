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
  const client = createClient(url, key, {
    global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
  });

  const body = await req.json();
  const amount: number = Number(body?.amount || 0);
  const currency: string = body?.currency || "BRL";
  let provider: string = body?.provider || "pix";
  // normalize provider to pass DB check constraint
  if (provider !== "pix" && provider !== "mercado_pago" && provider !== "manual") {
    provider = "pix";
  }
  const provider_payment_id: string = body?.provider_payment_id || "";
  const email: string | undefined = body?.email;
  const plan_id: string | undefined = body?.plan_id;

  const { data: user } = await client.auth.getUser();
  let uid = user?.user?.id || null;

  if (!uid && email) {
    const { data: prof } = await client.from("profiles").select("id").eq("email", email).maybeSingle();
    uid = prof?.id || null;
  }

  if (!uid) {
    return new Response(JSON.stringify({ error: "missing_params" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  // If plan_id provided, ensure a pending subscription exists for this user/plan
  if (plan_id) {
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
        return new Response(JSON.stringify({ error: subErr.message }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }
  }

  // Resolve plan price if not provided amount
  let gross = amount;
  if (!gross && plan_id) {
    const { data: plan } = await client.from("plans").select("price").eq("id", plan_id).maybeSingle();
    const pl: { price: number } | null = (plan as unknown) as { price: number } | null;
    gross = Number(pl?.price ?? 0) / 100;
  }
  const platform_amount = Math.round(gross * 0.2 * 100) / 100;
  const salon_amount = Math.max(0, gross - platform_amount);

  // Registrar como pendente para qualquer provedor (incluindo PIX); ativação só com aprovação do admin
  if (plan_id) {
    const { data: subRow } = await client
      .from("user_subscriptions")
      .select("id,status")
      .eq("user_id", uid)
      .eq("plan_id", plan_id)
      .maybeSingle();
    if (!subRow) {
      await client.from("user_subscriptions").insert({ user_id: uid, plan_id, status: "pending" });
    } else if (subRow.status !== "pending") {
      await client.from("user_subscriptions").update({ status: "pending", current_period_start: null, current_period_end: null }).eq("id", subRow.id);
    }
  }

  const { data, error } = await client
    .from("payments")
    .insert({ user_id: uid, amount: Math.round(gross * 100), currency, status: "pending", provider, provider_payment_id })
    .select("id")
    .maybeSingle();
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
  return new Response(JSON.stringify({ id: data?.id, approved: false }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
});
