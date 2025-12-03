import "jsr:@supabase/functions-js/edge-runtime.d.ts";

export default Deno.serve(async (req: Request) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(null, { status: 405, headers: cors });
  const token = Deno.env.get("MP_ACCESS_TOKEN") || "";
  const notificationUrl = Deno.env.get("MP_NOTIFICATION_URL") || ""; // e.g., https://<project-ref>.functions.supabase.co/user-mercadopago-webhook?type=payment
  let body: any = {};
  try { body = await req.json(); } catch (_) {}
  const subscriptionId = String(body.subscription_id || "");
  const planName = String(body.plan_name || body.name || "Assinatura CorteFácil");
  const amount = Number(body.amount ?? body.price ?? 0);
  if (!subscriptionId || !amount || !token) {
    return new Response(JSON.stringify({ error: "missing_fields" }), { status: 400, headers: { "Content-Type": "application/json", ...cors } });
  }
  const prefReq = {
    items: [
      { title: planName, quantity: 1, unit_price: amount },
    ],
    external_reference: subscriptionId,
    auto_return: "approved",
    notification_url: notificationUrl || undefined,
    payment_methods: { excluded_payment_types: [], default_payment_method_id: undefined },
  } as Record<string, unknown>;
  const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(prefReq),
  });
  const data = await res.json();
  if (!res.ok) {
    return new Response(JSON.stringify({ error: data }), { status: res.status, headers: { "Content-Type": "application/json", ...cors } });
  }
  return new Response(JSON.stringify({ init_point: data?.init_point || data?.sandbox_init_point }), { headers: { "Content-Type": "application/json", ...cors } });
});
