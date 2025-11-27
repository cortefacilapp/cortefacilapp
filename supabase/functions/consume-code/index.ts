import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export default Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const supa = createClient(url, key, {
    global: {
      headers: {
        Authorization: req.headers.get("Authorization") || "",
      },
    },
  });
  const { code } = await req.json();
  const { data: user } = await supa.auth.getUser();
  const uid = user?.user?.id;
  if (!uid) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  // Resolve salon from owner
  const { data: salon } = await supa.from("salons").select("id").eq("owner_id", uid).maybeSingle();
  if (!salon?.id) return new Response(JSON.stringify({ error: "no_salon" }), { status: 400, headers: { "Content-Type": "application/json" } });

  // Check subscription active
  const { data: sub } = await supa.from("subscriptions").select("status, plan_id").eq("salon_id", salon.id).order("created_at", { ascending: false }).maybeSingle();
  if (!sub || sub.status !== "active") return new Response(JSON.stringify({ error: "subscription_inactive" }), { status: 400, headers: { "Content-Type": "application/json" } });
  const { data: rpc, error: rpcErr } = await supa.rpc("consume_code_with_amount", { p_code: code, p_salon: salon.id });
  if (rpcErr) return new Response(JSON.stringify({ error: rpcErr.message }), { status: 400, headers: { "Content-Type": "application/json" } });
  await supa.from("audit_logs").insert({ actor_id: uid, action: "consume_code", payload: { code } });
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
