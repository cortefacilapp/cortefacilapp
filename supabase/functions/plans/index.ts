import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export default Deno.serve(async (req: Request) => {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const client = createClient(url, key);
  const { data, error } = await client.from("plans").select("id,name,price,interval,active").eq("active", true).order("price", { ascending: true });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } });
  return new Response(JSON.stringify({ plans: data || [] }), { headers: { "Content-Type": "application/json" } });
});

