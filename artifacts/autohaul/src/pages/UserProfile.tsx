import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/AuthGuard";
import { UserRatingsCard } from "@/components/UserRatingsCard";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Truck, Star, Briefcase, User } from "lucide-react";
import { Loader2 } from "lucide-react";

function roleBadge(role?: string) {
  if (role === "driver") return { label: "Carrier / Driver", color: "bg-amber-500/15 text-amber-300 border-amber-500/25" };
  if (role === "shipper") return { label: "Shipper", color: "bg-blue-500/15 text-blue-300 border-blue-500/25" };
  return { label: "Shipper & Driver", color: "bg-violet-500/15 text-violet-300 border-violet-500/25" };
}

export default function UserProfile() {
  const [, params] = useRoute("/users/:userId");
  const userId = params?.userId || "";

  const { data: user, isLoading } = useQuery<any>({
    queryKey: ["/api/users", userId],
    queryFn: () => fetch(`/api/users/${userId}`).then(r => r.json()),
    enabled: !!userId,
  });

  const badge = roleBadge(user?.role);
  const name = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User" : "";

  return (
    <AuthGuard>
      <MainLayout>
        {isLoading || !user ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-slate-950 border-b border-slate-800/60 py-14">
              <div className="container mx-auto px-4 md:px-8">
                <div className="flex items-start gap-6">
                  {/* Avatar */}
                  <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
                    {user.profileImageUrl ? (
                      <img src={user.profileImageUrl} alt={name} className="w-20 h-20 rounded-2xl object-cover" />
                    ) : (
                      <User className="h-10 w-10 text-primary" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h1 className="text-3xl md:text-4xl font-display font-bold text-white">{name}</h1>
                      {user.isVerified && (
                        <span className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold">
                          <ShieldCheck className="h-3.5 w-3.5" /> Verified
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className={`text-xs font-bold border px-2.5 py-1 rounded-full ${badge.color}`}>
                        {badge.label}
                      </span>
                      {user.truckType && (
                        <span className="flex items-center gap-1 text-xs text-slate-400 border border-slate-700 px-2.5 py-1 rounded-full">
                          <Truck className="h-3 w-3" /> {user.truckType}
                        </span>
                      )}
                    </div>

                    {/* Stats row */}
                    <div className="flex flex-wrap gap-6">
                      {user.averageRating > 0 && (
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={`h-4 w-4 ${s <= Math.round(user.averageRating) ? "fill-amber-400 text-amber-400" : "text-slate-600"}`} />
                            ))}
                          </div>
                          <span className="text-white font-bold">{user.averageRating.toFixed(1)}</span>
                          <span className="text-slate-500 text-sm">({user.totalReviews} review{user.totalReviews !== 1 ? "s" : ""})</span>
                        </div>
                      )}
                      {user.completedJobs > 0 && (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Briefcase className="h-4 w-4" />
                          <span className="text-white font-semibold">{user.completedJobs}</span>
                          <span className="text-sm">completed haul{user.completedJobs !== 1 ? "s" : ""}</span>
                        </div>
                      )}
                      {user.dotNumber && (
                        <div className="text-slate-400 text-sm">DOT: <span className="text-white font-mono">{user.dotNumber}</span></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ratings section */}
            <div className="bg-slate-950 min-h-screen">
              <div className="container max-w-2xl mx-auto px-4 md:px-8 py-10">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Ratings & Reviews</h2>
                <UserRatingsCard userId={userId} role={user.role} />
              </div>
            </div>
          </>
        )}
      </MainLayout>
    </AuthGuard>
  );
}
