import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestConnection() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [plans, setPlans] = useState<any[]>([]);
  const [writeStatus, setWriteStatus] = useState<string>("");

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setStatus("loading");
    setMessage("Testando conexão com Supabase...");
    
    try {
      const { data, error } = await supabase.from("plans").select("*").limit(5);

      if (error) {
        throw error;
      }

      setPlans(data || []);
      setStatus("success");
      setMessage("Conexão estabelecida com sucesso!");
    } catch (error: any) {
      console.error("Erro de conexão:", error);
      setStatus("error");
      setMessage(`Erro ao conectar: ${error.message || JSON.stringify(error)}`);
    }
  };

  const createTestPlan = async () => {
    setWriteStatus("Tentando criar plano de teste...");
    try {
      const { data, error } = await supabase.from("plans").insert([
        {
          name: "Plano de Teste " + new Date().toLocaleTimeString(),
          price: 1.99,
          credits_per_month: 1,
          description: "Criado via teste de conexão"
        }
      ]).select();

      if (error) throw error;

      setWriteStatus("Plano criado com sucesso!");
      checkConnection(); // Recarrega a lista
    } catch (error: any) {
      console.error("Erro ao criar plano:", error);
      setWriteStatus(`Erro ao criar: ${error.message || JSON.stringify(error)}`);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Teste de Conexão Supabase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`p-4 rounded-md ${
            status === "success" ? "bg-green-100 text-green-800" : 
            status === "error" ? "bg-red-100 text-red-800" : 
            "bg-blue-100 text-blue-800"
          }`}>
            {message}
          </div>

          {status === "success" && (
            <div className="space-y-4">
              <div className="flex gap-4 items-center">
                <Button onClick={checkConnection} variant="outline">
                  Atualizar Lista
                </Button>
                <Button onClick={createTestPlan}>
                  Criar Plano de Teste (Teste de Escrita)
                </Button>
              </div>

              {writeStatus && (
                <div className="text-sm font-medium text-slate-600">
                  Status da escrita: {writeStatus}
                </div>
              )}

              <div>
                <h3 className="font-bold mb-2">Planos encontrados ({plans.length}):</h3>
                <pre className="bg-slate-100 p-4 rounded-md overflow-auto max-h-60 text-xs">
                  {JSON.stringify(plans, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {status !== "success" && (
            <Button onClick={checkConnection} disabled={status === "loading"}>
              Testar Novamente
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
