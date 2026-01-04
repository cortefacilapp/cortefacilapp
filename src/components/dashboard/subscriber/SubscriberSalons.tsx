import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Store, MapPin, Check, Search, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Salon {
  id: string;
  name: string;
  address: string;
  phone: string;
}

interface Subscription {
  id: string;
  salon_id: string | null;
  status: string;
  end_date: string;
}

export function SubscriberSalons() {
  const { user } = useAuth();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // 1. Fetch Active Subscription
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('id, salon_id, status, end_date')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError) throw subError;
      setSubscription(subData);

      // 2. Fetch All Salons
      const { data: salonsData, error: salonsError } = await supabase
        .from('salons')
        .select('*')
        .order('name');

      if (salonsError) throw salonsError;
      setSalons(salonsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleLinkSalon = async (salonId: string) => {
    if (!subscription) {
      toast.error("Você precisa de uma assinatura ativa para vincular a um salão.");
      return;
    }

    if (subscription.salon_id) {
       toast.error(`Você já está vinculado a um salão neste ciclo. Aguarde até ${formatDate(subscription.end_date)} para trocar.`);
       return;
    }

    setLinking(salonId);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ salon_id: salonId })
        .eq('id', subscription.id);

      if (error) throw error;

      // Update local state
      setSubscription({ ...subscription, salon_id: salonId });
      toast.success("Salão vinculado com sucesso!");
    } catch (error) {
      console.error('Error linking salon:', error);
      toast.error("Erro ao vincular salão.");
    } finally {
      setLinking(null);
    }
  };

  const filteredSalons = salons.filter(salon => 
    salon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    salon.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const isLocked = !!subscription?.salon_id;

  if (loading) {
    return <div className="text-center py-10">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Store className="w-8 h-8 text-primary" />
          <div>
            <h1 className="font-display text-3xl">Vincular Salão</h1>
            <p className="text-muted-foreground">Escolha o salão onde você cortará o cabelo.</p>
          </div>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input 
            placeholder="Buscar salão..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {!subscription ? (
        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardContent className="py-6 flex items-center gap-4">
            <div className="p-3 bg-yellow-500/20 rounded-full text-yellow-600">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-yellow-700">Assinatura Necessária</h3>
              <p className="text-muted-foreground">Você precisa assinar um plano antes de escolher um salão.</p>
            </div>
            <Button className="ml-auto" variant="outline" onClick={() => window.location.href = '/planos'}>
              Ver Planos
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {isLocked && (
            <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-800">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Vínculo Ativo</AlertTitle>
              <AlertDescription>
                Você já está vinculado a um salão. A troca de salão só será permitida após o fim do ciclo atual em <strong>{formatDate(subscription.end_date)}</strong>.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSalons.map((salon) => (
              <Card key={salon.id} className={`transition-all hover:border-primary/50 ${subscription.salon_id === salon.id ? 'border-primary bg-primary/5' : ''}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-3">
                      <Store className="w-5 h-5 text-primary" />
                    </div>
                    {subscription.salon_id === salon.id && (
                      <Badge variant="default" className="bg-primary text-primary-foreground">
                        <Check className="w-3 h-3 mr-1" /> Atual
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="font-display text-xl">{salon.name}</CardTitle>
                  <CardDescription className="flex items-start gap-2 mt-2">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{salon.address || "Endereço não informado"}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full" 
                    variant={subscription.salon_id === salon.id ? "outline" : "default"}
                    disabled={isLocked || linking === salon.id}
                    onClick={() => handleLinkSalon(salon.id)}
                  >
                    {linking === salon.id ? "Vinculando..." : subscription.salon_id === salon.id ? "Vinculado" : "Vincular a este Salão"}
                  </Button>
                </CardContent>
              </Card>
            ))}
            
            {filteredSalons.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                Nenhum salão encontrado.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Badge({ children, className, variant }: any) {
  return (
    <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
      {children}
    </div>
  );
}
