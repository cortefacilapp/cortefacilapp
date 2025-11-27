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

  if (!uid || !amount) {
    return new Response(JSON.stringify({ error: "missing_params" }), { status: 400, headers: { "Content-Type": "application/json" } });
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
          headers: { "Content-Type": "application/json" },
        });
      }
    }
  }

  const { data, error } = await client
    .from("payments")
    .insert({ user_id: uid, amount: Math.round(amount * 100), currency, status: "pending", provider, provider_payment_id })
    .select("id")
    .maybeSingle();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } });
  return new Response(JSON.stringify({ id: data?.id }), { headers: { "Content-Type": "application/json" } });
});
