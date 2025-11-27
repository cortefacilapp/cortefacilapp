import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export default Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const url = Deno.env.get("EDGE_SUPABASE_URL") || "";
  const key = Deno.env.get("EDGE_SUPABASE_SERVICE_ROLE_KEY") || "";
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

  // Check user affiliation matches this salon
  const { data: codeRow } = await supa.from("codes").select("user_id, used, used_by_salon_id").eq("code", String(code).toUpperCase()).maybeSingle();
  const codeUser = codeRow?.user_id || null;
  if (!codeUser) return new Response(JSON.stringify({ error: "invalid_code" }), { status: 400, headers: { "Content-Type": "application/json" } });
  if (codeRow?.used) return new Response(JSON.stringify({ error: "code_used" }), { status: 400, headers: { "Content-Type": "application/json" } });
  const { data: aff } = await supa.from("user_affiliations").select("salon_id").eq("user_id", codeUser).maybeSingle();
  if (!aff?.salon_id || aff.salon_id !== salon.id) {
    return new Response(JSON.stringify({ error: "not_affiliated" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }
  const { data: rpc, error: rpcErr } = await supa.rpc("consume_code_with_amount", { p_code: code, p_salon: salon.id });
  if (rpcErr) return new Response(JSON.stringify({ error: rpcErr.message }), { status: 400, headers: { "Content-Type": "application/json" } });
  await supa.from("audit_logs").insert({ actor_id: uid, action: "consume_code", payload: { code } });
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
