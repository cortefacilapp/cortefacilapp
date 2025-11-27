import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export default Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const body = await req.json();
  const id: string = body?.id;
  const status: string = body?.status;
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const client = createClient(url, key);
  if (!id || !status) return new Response(JSON.stringify({ error: "missing_params" }), { status: 400, headers: { "Content-Type": "application/json" } });
  const allowed = ["pending", "active", "past_due", "canceled"];
  if (!allowed.includes(status)) return new Response(JSON.stringify({ error: "invalid_status" }), { status: 400, headers: { "Content-Type": "application/json" } });
  const { error } = await client.from("subscriptions").update({ status }).eq("id", id);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } });
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});

