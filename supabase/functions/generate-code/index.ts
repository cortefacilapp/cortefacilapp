import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function randomCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default Deno.serve(async (req: Request) => {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const supa = createClient(url, key, {
    global: {
      headers: {
        Authorization: req.headers.get("Authorization") || "",
      },
    },
  });

  const { data: user } = await supa.auth.getUser();
  const uid = user?.user?.id;
  if (!uid) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  // Optional: prevent multiple active codes within 24h
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await supa.from("codes").select("id").eq("user_id", uid).eq("status", "generated").gte("expires_at", since).limit(1);
  if (existing && existing.length) return new Response(JSON.stringify({ error: "existing_code" }), { status: 400, headers: { "Content-Type": "application/json" } });

  let code = randomCode(8);
  // ensure uniqueness
  for (let i = 0; i < 3; i++) {
    const { data: dup } = await supa.from("codes").select("id").eq("code", code).limit(1);
    if (!dup || dup.length === 0) break;
    code = randomCode(8);
  }

  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supa.from("codes").insert({ code, user_id: uid, status: "generated", expires_at: expires });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } });
  await supa.from("audit_logs").insert({ actor_id: uid, action: "generate_code", payload: { code } });
  return new Response(JSON.stringify({ code }), { headers: { "Content-Type": "application/json" } });
});
