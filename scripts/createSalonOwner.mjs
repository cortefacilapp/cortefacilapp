import { createClient } from "@supabase/supabase-js";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE,
  SALON_EMAIL = "salao.teste@cortefacil.local",
  SALON_PASSWORD = "Teste@12345!",
  SALON_OWNER_NAME = "Dono Teste",
  SALON_NAME = "Salão Teste",
  SALON_CITY = "São Paulo",
  SALON_STATE = "SP",
  SALON_ADDRESS = "Av. Exemplo, 123",
  SALON_PHONE = "(11) 99999-9999",
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

const { data, error } = await supabase.auth.admin.createUser({
  email: SALON_EMAIL,
  password: SALON_PASSWORD,
  email_confirm: true,
  user_metadata: { name: SALON_OWNER_NAME },
});

let userId = data?.user?.id;
if (error) {
  const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", SALON_EMAIL)
    .maybeSingle();
  if (profErr || !prof) {
    console.error(error.message);
    process.exit(1);
  }
  userId = prof.id;
}

const { error: upsertProfileError } = await supabase
  .from("profiles")
  .upsert({ id: userId, role: "salon_owner", name: SALON_OWNER_NAME, email: SALON_EMAIL });

if (upsertProfileError) {
  console.error(upsertProfileError.message);
  process.exit(1);
}

const { error: insertSalonError } = await supabase.from("salons").insert({
  name: SALON_NAME,
  city: SALON_CITY,
  state: SALON_STATE,
  address: SALON_ADDRESS,
  phone: SALON_PHONE,
  owner_id: userId,
  status: "pending",
});

if (insertSalonError) {
  console.error(insertSalonError.message);
  process.exit(1);
}

console.log("Salon owner created.");
console.log(`Login email: ${SALON_EMAIL}`);
console.log(`Login password: ${SALON_PASSWORD}`);

