import { Routes, Route } from "react-router-dom";
import { SalonOverview } from "./salon/SalonOverview";
import { SalonValidate } from "./salon/SalonValidate";
import { SalonSubscribers } from "./salon/SalonSubscribers";
import { SalonHistory } from "./salon/SalonHistory";
import { SalonFinancial } from "./salon/SalonFinancial";
import { SalonProfile } from "./salon/SalonProfile";
import { SalonOwnerProfile } from "./salon/SalonOwnerProfile";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

const bankDataSchema = z.object({
  pix_key_type: z.enum(["cpf", "cnpj", "email", "phone", "random"], {
    required_error: "Selecione o tipo de chave PIX",
  }),
  pix_key: z.string().min(1, "A chave PIX é obrigatória"),
});

type BankDataForm = z.infer<typeof bankDataSchema>;

function SalonPixConfig() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const form = useForm<BankDataForm>({
    resolver: zodResolver(bankDataSchema),
    defaultValues: {
      pix_key_type: "cpf",
      pix_key: "",
    },
  });

  useEffect(() => {
    async function fetchBankData() {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("salon_bank_data")
          .select("*")
          .eq("salon_id", user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          throw error;
        }

        if (data) {
          form.reset({
            pix_key_type: data.pix_key_type as any,
            pix_key: data.pix_key,
          });
        }
      } catch (error) {
        console.error("Erro ao buscar dados bancários:", error);
        toast.error("Erro ao carregar dados bancários");
      } finally {
        setFetching(false);
      }
    }

    fetchBankData();
  }, [user, form]);

  const onSubmit = async (data: BankDataForm) => {
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from("salon_bank_data")
        .upsert({
          salon_id: user.id,
          pix_key_type: data.pix_key_type,
          pix_key: data.pix_key,
          updated_at: new Date().toISOString(),
        }, { onConflict: "salon_id" });

      if (error) throw error;

      toast.success("Dados bancários salvos com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar dados bancários:", error);
      toast.error("Erro ao salvar dados bancários");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dados Bancários</h2>
        <p className="text-muted-foreground">
          Cadastre sua chave PIX para receber os repasses mensais.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chave PIX</CardTitle>
          <CardDescription>
            Informe sua chave PIX para recebimento. Mantenha os dados sempre atualizados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="pix_key_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Chave</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cpf">CPF</SelectItem>
                        <SelectItem value="cnpj">CNPJ</SelectItem>
                        <SelectItem value="email">E-mail</SelectItem>
                        <SelectItem value="phone">Telefone</SelectItem>
                        <SelectItem value="random">Chave Aleatória</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pix_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chave PIX</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite sua chave PIX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {!loading && <Save className="mr-2 h-4 w-4" />}
                  Salvar Dados
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export function SalonDashboard() {
  return (
    <Routes>
      <Route index element={<SalonOverview />} />
      <Route path="validar" element={<SalonValidate />} />
      <Route path="meus-assinantes" element={<SalonSubscribers />} />
      <Route path="historico" element={<SalonHistory />} />
      <Route path="meu-financeiro" element={<SalonFinancial />} />
      <Route path="dados-bancarios" element={<SalonPixConfig />} />
      <Route path="meu-salao" element={<SalonProfile />} />
      <Route path="perfil" element={<SalonOwnerProfile />} />
    </Routes>
  );
}
