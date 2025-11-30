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
  const { data: sub } = await supa.from("subscriptions").select("id, status, plan_id").eq("salon_id", salon.id).order("created_at", { ascending: false }).maybeSingle();
  if (!sub || sub.status !== "active") return new Response(JSON.stringify({ error: "subscription_inactive" }), { status: 400, headers: { "Content-Type": "application/json" } });

  // Check user affiliation matches this salon
  const { data: codeRow } = await supa.from("codes").select("id, code, user_id, used, used_by_salon_id, status, expires_at").eq("code", String(code).toUpperCase()).maybeSingle();
  const codeUser = codeRow?.user_id || null;
  if (!codeUser) return new Response(JSON.stringify({ error: "invalid_code" }), { status: 400, headers: { "Content-Type": "application/json" } });
  if (codeRow?.used || codeRow?.status === "used") return new Response(JSON.stringify({ error: "code_used" }), { status: 400, headers: { "Content-Type": "application/json" } });
  if (codeRow?.expires_at && new Date(codeRow.expires_at).getTime() < Date.now()) return new Response(JSON.stringify({ error: "code_expired" }), { status: 400, headers: { "Content-Type": "application/json" } });
  const { data: aff } = await supa.from("user_affiliations").select("salon_id").eq("user_id", codeUser).maybeSingle();
  if (!aff?.salon_id || aff.salon_id !== salon.id) {
    return new Response(JSON.stringify({ error: "not_affiliated" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }
  // Resolve active subscription and credit for the user being validated
  const { data: uSub } = await supa
    .from("user_subscriptions")
    .select("plan_id,status,current_period_start,current_period_end")
    .eq("user_id", codeUser)
    .eq("status", "active")
    .order("current_period_end", { ascending: false })
    .maybeSingle();
  if (!uSub?.plan_id) return new Response(JSON.stringify({ error: "no_active_plan" }), { status: 400, headers: { "Content-Type": "application/json" } });
  const now = new Date();
  const ps = uSub.current_period_start ? new Date(uSub.current_period_start) : null;
  const pe = uSub.current_period_end ? new Date(uSub.current_period_end) : null;
  if (!ps || !pe || now < ps || now > pe) {
    return new Response(JSON.stringify({ error: "outside_period" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const { data: uc } = await supa
    .from("user_credits")
    .select("id, remaining")
    .eq("user_id", codeUser)
    .eq("plan_id", uSub.plan_id)
    .eq("period_start", uSub.current_period_start)
    .maybeSingle();
  let remaining = uc?.remaining ?? null;
  if (remaining === null) {
    const { data: plan } = await supa.from("plans").select("monthly_credits").eq("id", uSub.plan_id).maybeSingle();
    const startRemaining = Number(plan?.monthly_credits ?? 0);
    const { error: insUcErr } = await supa
      .from("user_credits")
      .insert({ user_id: codeUser, plan_id: uSub.plan_id, period_start: uSub.current_period_start, remaining: startRemaining });
    if (insUcErr) return new Response(JSON.stringify({ error: insUcErr.message }), { status: 400, headers: { "Content-Type": "application/json" } });
    remaining = startRemaining;
  }
  if (Number(remaining) <= 0) return new Response(JSON.stringify({ error: "no_credits" }), { status: 400, headers: { "Content-Type": "application/json" } });
  const { error: decErr } = await supa
    .from("user_credits")
    .update({ remaining: (Number(remaining) - 1) })
    .eq("user_id", codeUser)
    .eq("plan_id", uSub.plan_id)
    .eq("period_start", uSub.current_period_start);
  if (decErr) return new Response(JSON.stringify({ error: decErr.message }), { status: 400, headers: { "Content-Type": "application/json" } });

  // Mark code used and register visit
  const { error: updErr } = await supa
    .from("codes")
    .update({ status: "used", used: true, used_at: now.toISOString(), used_by_salon_id: salon.id })
    .eq("id", codeRow.id);
  if (updErr) return new Response(JSON.stringify({ error: updErr.message }), { status: 400, headers: { "Content-Type": "application/json" } });

  // Compute per-visit amount and 80/20 split using plan price and monthly credits
  const { data: plan } = await supa.from("plans").select("price, monthly_credits, cuts_per_month").eq("id", uSub.plan_id).maybeSingle();
  const credits = Number((plan as any)?.monthly_credits ?? (plan as any)?.cuts_per_month ?? 1) || 1;
  const price = Number((plan as any)?.price ?? 0);
  const visitAmount = credits > 0 ? Math.round((((price / 100) / credits) * 100)) / 100 : 0;
  const platformAmount = Math.round(visitAmount * 0.2 * 100) / 100;
  const salonAmount = visitAmount - platformAmount;

  await supa.from("visit_logs").insert({
    user_id: codeUser,
    salon_id: salon.id,
    subscription_id: sub.id,
    code_id: codeRow.id,
    amount: visitAmount,
    salon_amount: salonAmount,
    platform_amount: platformAmount,
  });
  await supa.from("audit_logs").insert({ actor_id: uid, action: "consume_code", payload: { code } });
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
