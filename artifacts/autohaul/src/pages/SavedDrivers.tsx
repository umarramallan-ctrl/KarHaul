import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Star, Shield, Truck, MessageCircle, Trash2, Loader2, Users } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchSavedDrivers() {
  const res = await fetch(`${BASE}/api/saved-drivers`, { credentials: "include" });
  return res.json();
}

async function removeDriver(driverId: string) {
  const res = await fetch(`${BASE}/api/saved-drivers/${driverId}`, { method: "DELETE", credentials: "include" });
  return res.json();
}

export default function SavedDrivers() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery({ queryKey: ["saved-drivers"], queryFn: fetchSavedDrivers });
  const removeMutation = useMutation({
    mutationFn: removeDriver,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["saved-drivers"] }); toast({ title: "Driver removed from your saved list." }); },
    onError: () => toast({ title: "Error", description: "Could not remove driver.", variant: "destructive" }),
  });

  const savedDrivers = data?.savedDrivers || [];

  return (
    <AuthGuard>
      <MainLayout>
        <div className="bg-slate-900 py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <Heart className="h-5 w-5 text-rose-400" />
              </div>
              <h1 className="text-3xl font-display font-bold text-white">Saved Drivers</h1>
            </div>
            <p className="text-slate-400 ml-[52px]">Your trusted carrier network. Rebook them directly without going through the bidding process.</p>
          </div>
        </div>

        <div className="container mx-auto px-4 md:px-6 py-10">
          {isLoading ? (
            <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : savedDrivers.length === 0 ? (
            <div className="text-center py-24 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mx-auto mb-5">
                <Users className="h-8 w-8 text-rose-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">No saved drivers yet</h3>
              <p className="text-muted-foreground mb-6">After a successful shipment, save your driver to rebook them directly next time — no bidding required.</p>
              <Button asChild><Link href="/shipments">Browse Open Loads</Link></Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedDrivers.map((saved: any) => {
                const d = saved.driver;
                const name = [d?.firstName, d?.lastName].filter(Boolean).join(" ") || "Driver";
                return (
                  <Card key={saved.id} className="hover:shadow-lg hover:-translate-y-1 transition-all duration-200 border-border/60">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white text-xl font-bold shrink-0">
                          {name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-bold text-lg leading-tight">{name}</h3>
                            {d?.isVerified && (
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 gap-1 text-xs">
                                <Shield className="h-3 w-3" /> Verified
                              </Badge>
                            )}
                          </div>
                          {d?.averageRating > 0 && (
                            <div className="flex items-center gap-1.5 text-sm">
                              <div className="flex gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className={`h-3.5 w-3.5 ${i < Math.round(d.averageRating) ? "text-amber-400 fill-amber-400" : "text-muted stroke-muted"}`} />
                                ))}
                              </div>
                              <span className="font-medium">{d.averageRating.toFixed(1)}</span>
                              <span className="text-muted-foreground">({d.totalReviews} reviews)</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 mb-5 text-sm">
                        {d?.completedJobs > 0 && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Truck className="h-3.5 w-3.5" />
                            <span><strong className="text-foreground">{d.completedJobs}</strong> completed jobs</span>
                          </div>
                        )}
                        {d?.truckType && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Truck className="h-3.5 w-3.5" />
                            <span>{d.truckType}</span>
                          </div>
                        )}
                        {d?.dotNumber && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Shield className="h-3.5 w-3.5" />
                            <span>DOT #{d.dotNumber}</span>
                          </div>
                        )}
                        {saved.note && (
                          <div className="bg-muted rounded-lg px-3 py-2 text-muted-foreground italic text-xs">"{saved.note}"</div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 gap-1.5" asChild>
                          <Link href={`/messages?driverId=${saved.driverId}`}>
                            <MessageCircle className="h-3.5 w-3.5" /> Message
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-rose-500 border-rose-200 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-900/20"
                          onClick={() => removeMutation.mutate(saved.driverId)}
                          disabled={removeMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </MainLayout>
    </AuthGuard>
  );
}
