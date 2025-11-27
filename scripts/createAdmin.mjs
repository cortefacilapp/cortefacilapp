import { createClient } from "@supabase/supabase-js";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_NAME,
  ADMIN_CPF,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

const { data, error } = await supabase.auth.admin.createUser({
  email: ADMIN_EMAIL,
  password: ADMIN_PASSWORD,
  email_confirm: true,
  user_metadata: { name: ADMIN_NAME, cpf: ADMIN_CPF },
});

let userId = data?.user?.id;
if (error) {
  const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", ADMIN_EMAIL)
    .maybeSingle();
  if (profErr || !prof) {
    console.error(error.message);
    process.exit(1);
  }
  userId = prof.id;
}

const { error: upsertError } = await supabase
  .from("profiles")
  .upsert({ id: userId, role: "admin", name: ADMIN_NAME, email: ADMIN_EMAIL });

if (upsertError) {
  console.error(upsertError.message);
  process.exit(1);
}

const { error: roleError } = await supabase
  .from("user_roles")
  .upsert({ user_id: userId, role: "admin" });

if (roleError) {
  console.error(roleError.message);
  process.exit(1);
}

console.log(`Admin ensured: ${userId}`);
