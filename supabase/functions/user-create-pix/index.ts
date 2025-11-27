import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

export default Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    if (req.method !== "POST") return new Response(null, { status: 405, headers: corsHeaders });
    const url = Deno.env.get("SUPABASE_URL") || "";
    const key =
      Deno.env.get("SERVICE_ROLE_KEY") ||
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("CHAVE_FUNÇÃO_DE_SERVIÇO") ||
      "";
    const mpToken = Deno.env.get("MP_ACCESS_TOKEN") || "";
    const webhookUrl = Deno.env.get("WEBHOOK_URL") || "";
    const client = createClient(url, key, {
      global: {
        headers: { Authorization: req.headers.get("Authorization") || "" },
      },
    });
    const { plan_id } = await req.json();
    const { data: user } = await client.auth.getUser();
    const uid = user?.user?.id || null;
    const email = user?.user?.email || "anon@cortefacil.app";
    if (!plan_id)
      return new Response(JSON.stringify({ error: "missing_params" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    const { data: plan, error: planErr } = await client
      .from("plans")
      .select("id,name,price,currency,interval,monthly_credits,active")
      .eq("id", plan_id)
      .eq("active", true)
      .maybeSingle();
    if (planErr || !plan)
      return new Response(JSON.stringify({ error: planErr?.message || "plan_not_found" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    let sub: { id: string } | null = null;
    if (uid) {
      const { data: found } = await client
        .from("user_subscriptions")
        .select("id, status")
        .eq("user_id", uid)
        .eq("plan_id", plan_id)
        .maybeSingle();
      sub = found || null;
      if (!sub) {
        const { data: created, error: subErr } = await client
          .from("user_subscriptions")
          .insert({ user_id: uid, plan_id, status: "pending" })
          .select("id")
          .maybeSingle();
        if (subErr || !created)
          return new Response(JSON.stringify({ error: subErr?.message || "sub_create_failed" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        sub = created;
      }
    }

    const unitPrice = Number((plan as any).price) / 100;
    const payRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${mpToken}` },
      body: JSON.stringify({
        transaction_amount: unitPrice,
        description: plan.name,
        payment_method_id: "pix",
        payer: { email },
        external_reference: sub?.id,
        notification_url: webhookUrl || undefined,
      }),
    });
    if (!payRes.ok) {
      const t = await payRes.text();
      return new Response(JSON.stringify({ error: "mp_pix_failed", detail: t }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const pay = await payRes.json();

    if (uid) {
      await client.from("payments").insert({
        user_id: uid,
        provider: "mercado_pago",
        provider_payment_id: String(pay.id),
        amount: (plan as any).price,
        currency: plan.currency || "BRL",
        status: "pending",
      });
    }

    const qr = pay.point_of_interaction?.transaction_data || {};
    return new Response(
      JSON.stringify({ qr_code: qr.qr_code, qr_code_base64: qr.qr_code_base64, payment_id: pay.id }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: "unexpected_error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
