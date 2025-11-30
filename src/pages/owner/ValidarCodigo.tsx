import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ValidarCodigo = () => {
  const [code, setCode] = useState("");
  const [salonId, setSalonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [recentCodes, setRecentCodes] = useState<any[]>([]);

  useEffect(() => {
    const loadSalon = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) return;
      const { data } = await supabase.from("salons").select("id").eq("owner_id", uid).maybeSingle();
      const sid = data?.id || null;
      setSalonId(sid);
      if (sid) {
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("status")
          .eq("salon_id", sid)
          .order("created_at", { ascending: false })
          .maybeSingle();
        setBlocked(!sub || sub.status !== "active");

        // load recent codes of affiliated users
        const { data: affUsers } = await supabase
          .from("user_affiliations")
          .select("user_id")
          .eq("salon_id", sid);
        const uids = (affUsers || []).map((a: any) => a.user_id);
        if (uids.length) {
          const nowIso = new Date().toISOString();
          const { data: codes } = await supabase
            .from("codes")
            .select("code,status,expires_at")
            .eq("status", "generated")
            .gte("expires_at", nowIso)
            .in("user_id", uids)
            .order("expires_at", { ascending: false })
            .limit(10);
          setRecentCodes(codes || []);
        }
      }
    };
    loadSalon();
  }, []);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salonId) {
      toast.error("Nenhum salão vinculado ao seu usuário");
      return;
    }
    if (!code || code.length < 4) {
      toast.error("Informe um código válido");
      return;
    }
    setLoading(true);
    try {
      // Primeira tentativa: RPC transacional (mais confiável)
      const { data: rpc, error: rpcErr } = await supabase.rpc("consume_code_with_amount", {
        p_code: code.toUpperCase(),
        p_salon: salonId,
      });
      if (!rpcErr && rpc?.ok) {
        const remaining = (rpc as any)?.remaining;
        toast.success(
          typeof remaining === "number" ? `Código consumido. Saldo: ${remaining}` : "Código validado e consumido"
        );
        setCode("");
        return;
      }

      // Fallback: função Edge
      const { data, error } = await supabase.functions
        .invoke("consume-code", { body: { code: code.toUpperCase() } })
        .catch((e: any) => ({ data: null, error: e }));
      if (!error && data?.ok) {
        toast.success("Código validado e consumido");
        setCode("");
        return;
      }

      // Fallback final: validação básica com permissões do salão
      const nowIso = new Date().toISOString();
      const { data: codeRow, error: selErr } = await supabase
        .from("codes")
        .select("id,user_id,status,expires_at,used,used_by_salon_id")
        .eq("code", code.toUpperCase())
        .maybeSingle();
      if (selErr) {
        throw new Error("Sem acesso à tabela de códigos. Verifique políticas RLS");
      }
      const exp = codeRow?.expires_at ? new Date(codeRow.expires_at) : null;
      if (!codeRow) throw new Error("Código inexistente");
      if (codeRow.status !== "generated") throw new Error("Código já utilizado");
      if (exp && exp.getTime() < Date.now()) throw new Error("Código expirado");
      const { data: aff } = await supabase
        .from("user_affiliations")
        .select("salon_id")
        .eq("user_id", codeRow.user_id)
        .maybeSingle();
      if (!aff?.salon_id || aff.salon_id !== salonId) {
        throw new Error("Usuário não afiliado a este salão");
      }
      const { error: updErr } = await supabase
        .from("codes")
        .update({ status: "used", used_at: nowIso, used_by_salon_id: salonId })
        .eq("id", codeRow.id);
      if (updErr) throw updErr;
      await supabase.from("cut_redemptions").insert({ code_id: codeRow.id, user_id: codeRow.user_id, salon_id: salonId, redeemed_at: nowIso });
      // attempt to decrement credits via RPC with security definer
      const { error: decRpcErr } = await supabase.rpc("decrement_credit_for_user", { p_user_id: codeRow.user_id });
      if (decRpcErr) {
        // as last resort, try direct update (may fail due to RLS)
        const { data: uSub } = await supabase
          .from("user_subscriptions")
          .select("plan_id,current_period_start,status")
          .eq("user_id", codeRow.user_id)
          .eq("status", "active")
          .order("current_period_start", { ascending: false })
          .maybeSingle();
        if (uSub?.plan_id) {
          const { data: uc } = await supabase
            .from("user_credits")
            .select("remaining")
            .eq("user_id", codeRow.user_id)
            .eq("plan_id", uSub.plan_id)
            .eq("period_start", uSub.current_period_start)
            .maybeSingle();
          const rem = Number(uc?.remaining ?? 0);
          if (rem > 0) {
            await supabase
              .from("user_credits")
              .update({ remaining: rem - 1 })
              .eq("user_id", codeRow.user_id)
              .eq("plan_id", uSub.plan_id)
              .eq("period_start", uSub.current_period_start);
          }
        }
      }
      toast.success("Código validado e consumido");
      setCode("");
    } catch (err: any) {
      toast.error(err.message || "Falha ao validar código");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-primary">
      <CardHeader>
        <CardTitle>Validar Código do Cliente</CardTitle>
        <CardDescription>Digite o código fornecido pelo cliente</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleValidate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Código</Label>
            <Input id="code" placeholder="Digite o código aqui" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={12} required />
          </div>
          <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>{loading ? "Validando..." : "Validar Código"}</Button>
        </form>
        {!!recentCodes.length && (
          <div className="mt-6">
            <div className="text-sm font-medium mb-2">Códigos recentes de afiliados</div>
            <div className="grid gap-2 md:grid-cols-2">
              {recentCodes.map((c, idx) => (
                <div key={idx} className="rounded border p-2 text-sm flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-mono">{c.code}</div>
                    <div className="text-xs">{String(c.status)}</div>
                  </div>
                  <div className="text-xs text-right">
                    {(() => {
                      const exp = new Date((c as any).expires_at);
                      const diff = exp.getTime() - Date.now();
                      if (diff <= 0) return "expirado";
                      const h = Math.floor(diff / (1000 * 60 * 60));
                      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                      return `expira em ${h}h ${m}m`;
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ValidarCodigo;
