import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const PerfilSalao = () => {
  const [loading, setLoading] = useState(true);
  type SalonRow = Tables<"salons">;
  type SalonRowExt = SalonRow & { doc?: string | null };
  type ProfileRow = Tables<"profiles">;
  type SalonForm = {
    name: string;
    phone: string | null;
    description: string | null;
    state: string;
    city: string;
    postal_code: string | null;
    address: string;
    doc: string | null;
    photo_url: string | null;
  };
  const [salon, setSalon] = useState<SalonRow | null>(null);
  const [form, setForm] = useState<SalonForm>({ name: "", phone: null, description: null, state: "", city: "", postal_code: null, address: "", doc: null, photo_url: null });
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [ownerFullName, setOwnerFullName] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) { setLoading(false); return; }
      setOwnerId(uid);
      const { data } = await supabase.from("salons").select("*").eq("owner_id", uid).maybeSingle();
      setSalon((data as SalonRow | null) || null);
      if (data) {
        const s = data as SalonRow;
        const sExt = s as unknown as SalonRowExt;
        setForm({
          name: s.name || "",
          phone: s.phone ?? null,
          description: s.description ?? null,
          state: s.state || "",
          city: s.city || "",
          postal_code: s.postal_code ?? null,
          address: s.address || "",
          doc: sExt.doc ?? null,
          photo_url: s.photo_url ?? null,
        });
      } else {
        setForm({ name: "", phone: null, description: null, state: "", city: "", postal_code: null, address: "", doc: null, photo_url: null });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name,name")
        .eq("id", uid)
        .maybeSingle();
      const pr = (profile as (ProfileRow & { name?: string | null }) | null);
      setOwnerFullName(pr?.full_name || pr?.name || "");
      setLoading(false);
    };
    load();
  }, []);

  const update = async () => {
    if (!salon?.id) return;
      const { error } = await supabase
        .from("salons")
        .update({
          name: form.name,
          phone: form.phone,
          description: form.description,
          state: form.state,
          city: form.city,
          postal_code: form.postal_code,
          address: form.address,
          photo_url: form.photo_url,
        })
        .eq("id", salon.id);
    if (error) { toast.error("Erro ao salvar"); return; }
    if (ownerId) {
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ full_name: ownerFullName, name: ownerFullName })
        .eq("id", ownerId);
      if (profErr) { toast.error("Erro ao salvar nome completo"); return; }
    }
    toast.success("Perfil atualizado");
  };

  const uploadPhoto = async (file: File) => {
    if (!salon?.id) { toast.error("Salão não encontrado"); return; }
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${salon.id}/profile-${Date.now()}.${ext}`;
      let bucket = "salons";
      let up = await supabase.storage.from(bucket).upload(path, file, { upsert: true, cacheControl: "3600" });
      if (up.error && String(up.error.message || "").toLowerCase().includes("not found")) {
        bucket = "public";
        up = await supabase.storage.from(bucket).upload(path, file, { upsert: true, cacheControl: "3600" });
      }
      if (up.error) { throw up.error; }
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      const url = pub?.publicUrl || "";
      if (!url) { throw new Error("Falha ao obter URL pública"); }
      setForm({ ...form, photo_url: url });
      const { error: updErr } = await supabase.from("salons").update({ photo_url: url }).eq("id", salon.id);
      if (updErr) { toast.error("Foto enviada, mas falhou ao salvar URL"); return; }
      toast.success("Foto atualizada");
    } catch (e: unknown) {
      const msg = typeof e === "object" && e && "message" in e ? String((e as { message?: unknown }).message) : "Erro ao enviar foto";
      toast.error(msg);
    }
  };

  const removePhoto = async () => {
    if (!salon?.id) return;
    const url = form.photo_url || "";
    if (!url) return;
    try {
      const marker = "/storage/v1/object/public/";
      const idx = url.indexOf(marker);
      if (idx === -1) throw new Error("URL inválida");
      const tail = url.slice(idx + marker.length);
      const parts = tail.split("/");
      const bucket = parts[0];
      const path = tail.slice(bucket.length + 1);
      const { error: delErr } = await supabase.storage.from(bucket).remove([path]);
      if (delErr) throw delErr;
      const { error: updErr } = await supabase.from("salons").update({ photo_url: null }).eq("id", salon.id);
      if (updErr) throw updErr;
      setForm({ ...form, photo_url: null });
      toast.success("Foto removida");
    } catch (e: unknown) {
      const msg = typeof e === "object" && e && "message" in e ? String((e as { message?: unknown }).message) : "Erro ao remover foto";
      toast.error(msg);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil do Salão</CardTitle>
      </CardHeader>
      <CardContent>
        {!salon && <div className="text-sm text-muted-foreground">Nenhum salão cadastrado</div>}
        {salon && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="doc">CPF/CNPJ</Label>
              <Input id="doc" value={form.doc || ""} readOnly disabled />
              {!form.doc && <div className="text-xs text-muted-foreground">Em branco</div>}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="owner_full_name">Nome completo (Dono)</Label>
              <Input id="owner_full_name" value={ownerFullName} onChange={(e) => setOwnerFullName(e.target.value)} />
              {!ownerFullName && <div className="text-xs text-muted-foreground">Em branco</div>}
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="name">Nome Fantasia</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {!form.name && <div className="text-xs text-muted-foreground">Em branco</div>}
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="phone">Telefone / WhatsApp</Label>
              <Input id="phone" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              {!form.phone && <div className="text-xs text-muted-foreground">Em branco</div>}
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="state">Estado</Label>
              <Input id="state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
              {!form.state && <div className="text-xs text-muted-foreground">Em branco</div>}
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              {!form.city && <div className="text-xs text-muted-foreground">Em branco</div>}
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="postal_code">CEP</Label>
              <Input id="postal_code" value={form.postal_code || ""} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
              {!form.postal_code && <div className="text-xs text-muted-foreground">Em branco</div>}
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              {!form.address && <div className="text-xs text-muted-foreground">Em branco</div>}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              {!form.description && <div className="text-xs text-muted-foreground">Em branco</div>}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="photo">Foto do salão</Label>
              {form.photo_url && (
                <div className="flex items-center gap-3">
                  <img src={form.photo_url} alt="Foto do salão" className="h-32 w-32 rounded object-cover border" />
                  <Button variant="outline" onClick={removePhoto}>Remover foto</Button>
                </div>
              )}
              <Input id="photo" type="file" accept="image/*" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadPhoto(f);
              }} />
            </div>
            <div className="md:col-span-2">
              <Button className="mt-2" onClick={update}>Salvar</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PerfilSalao;
