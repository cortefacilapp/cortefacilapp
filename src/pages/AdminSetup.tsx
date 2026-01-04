import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AdminSetup = () => {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const createAdmin = async () => {
    setStatus("loading");
    setMessage("Criando usuário administrador...");

    try {
      // 1. Criar usuário com metadados para a trigger
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: "mayconreis2030@gmail.com",
        password: "Brava1997",
        options: {
          data: {
            full_name: "Maycon Wender",
            role: "admin", // Importante para a trigger criar a role correta
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Erro ao criar usuário: Nenhum usuário retornado.");
      }

      setMessage("Usuário criado. Atualizando CPF...");

      // 2. Atualizar CPF na tabela profiles
      // A trigger já deve ter criado o perfil com nome e email
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ cpf: "05286558178" })
        .eq("id", authData.user.id);

      if (profileError) {
        console.error("Erro ao atualizar perfil:", profileError);
        // Não lançar erro aqui se o usuário já foi criado, apenas avisar
        setMessage(`Usuário criado, mas erro ao atualizar CPF: ${profileError.message}`);
        setStatus("success"); // Considerar sucesso parcial
        return;
      }

      setStatus("success");
      setMessage("Administrador criado com sucesso! Você já pode fazer login.");
    } catch (error: any) {
      console.error("Erro:", error);
      setStatus("error");
      setMessage(`Erro: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Configuração de Admin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            <p><strong>Nome:</strong> Maycon Wender</p>
            <p><strong>Email:</strong> mayconreis2030@gmail.com</p>
            <p><strong>CPF:</strong> 05286558178</p>
          </div>
          
          {message && (
            <div className={`p-3 rounded text-sm ${
              status === "error" ? "bg-red-100 text-red-700" : 
              status === "success" ? "bg-green-100 text-green-700" : 
              "bg-blue-100 text-blue-700"
            }`}>
              {message}
            </div>
          )}

          <Button 
            onClick={createAdmin} 
            disabled={status === "loading" || status === "success"}
            className="w-full"
          >
            {status === "loading" ? "Processando..." : "Criar Admin"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSetup;
