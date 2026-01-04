import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { SubscriberDashboard } from "@/components/dashboard/SubscriberDashboard";
import { SalonDashboard } from "@/components/dashboard/SalonDashboard";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      {role === "admin" && <AdminDashboard />}
      {role === "salon_owner" && <SalonDashboard />}
      {role === "subscriber" && <SubscriberDashboard />}
      {!role && (
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando perfil...</p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
