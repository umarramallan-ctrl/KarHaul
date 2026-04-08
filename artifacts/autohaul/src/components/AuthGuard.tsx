import { useAuth, RedirectToSignIn } from "@clerk/clerk-react";
import { useGetMyProfile } from "@workspace/api-client-react";
import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { MainLayout } from "./layout/MainLayout";

interface AuthGuardProps {
  children: ReactNode;
  requireRole?: 'shipper' | 'driver' | 'admin' | 'any';
}

export function AuthGuard({ children, requireRole = 'any' }: AuthGuardProps) {
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { data: profile, isLoading: profileLoading, isFetched: profileFetched } = useGetMyProfile({
    query: { enabled: isSignedIn === true, retry: false } as any,
  });
  const [location, setLocation] = useLocation();

  // Only redirect to profile once the query has completed and confirmed no profile exists
  useEffect(() => {
    if (isSignedIn && profileFetched && !profile && location !== '/profile') {
      setLocation('/profile');
    }
  }, [isSignedIn, profileFetched, profile, location, setLocation]);

  if (!authLoaded || (isSignedIn && profileLoading)) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>Loading your account...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  if (profile && requireRole !== 'any' && profile.role !== requireRole && profile.role !== 'both' && profile.role !== 'admin') {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center min-h-[50vh] p-4">
          <div className="max-w-md text-center bg-card p-8 rounded-2xl border shadow-sm">
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-6">
              This page requires {requireRole} privileges. Your current role is {profile.role}.
            </p>
            <button
              onClick={() => setLocation('/')}
              className="text-primary font-medium hover:underline"
            >
              Return Home
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return <>{children}</>;
}
