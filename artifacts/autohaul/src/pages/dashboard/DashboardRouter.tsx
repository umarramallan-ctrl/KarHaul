import { useAuth } from "@workspace/replit-auth-web";
import { useGetMyProfile } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import ShipperDashboard from "./ShipperDashboard";
import DriverDashboard from "./DriverDashboard";
import { MainLayout } from "@/components/layout/MainLayout";
import { Loader2 } from "lucide-react";

export default function DashboardRouter() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useGetMyProfile({
    query: { enabled: isAuthenticated } as any,
  });
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  if (authLoading || profileLoading) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!profile) {
    setLocation("/profile");
    return null;
  }

  if (profile.role === 'shipper') return <ShipperDashboard />;
  if (profile.role === 'driver') return <DriverDashboard />;
  
  // Both or Admin can see a unified view, or just default to shipper view with driver tabs
  return <ShipperDashboard />; 
}
