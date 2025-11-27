import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import CustomerDashboard from "@/components/dashboard/CustomerDashboard";
import OwnerDashboard from "@/components/dashboard/OwnerDashboard";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import { Loader2 } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const detectRole = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        const roles = (rolesData || []).map((r: any) => String(r.role));

        if (roles.includes("admin")) {
          setUserRole("admin");
        } else if (roles.includes("owner") || roles.includes("salon_owner")) {
          setUserRole("owner");
        } else {
          // fallback to profiles.role in case roles table not populated yet
          const { data: prof } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();
          const profRole = String((prof as any)?.role || "customer");
          if (profRole === "admin") {
            setUserRole("admin");
          } else if (profRole === "owner" || profRole === "salon_owner") {
            setUserRole("owner");
          } else {
            setUserRole("customer");
          }
        }
      } catch (e) {
        setUserRole("customer");
      } finally {
        setLoading(false);
      }
    };

    detectRole();
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (userRole === "admin") {
    navigate("/admin");
    return null;
  }

  if (userRole === "owner") {
    navigate("/owner/validar");
    return null;
  }

  return <CustomerDashboard user={user!} />;
};

export default Dashboard;
