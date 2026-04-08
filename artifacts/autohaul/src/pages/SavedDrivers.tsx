import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Star, Shield, Truck, MessageCircle, Trash2, Loader2, Users, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { apiBase } from "@/lib/api";

async function fetchSavedDrivers() {
  const res = await fetch(`${apiBase}/saved-drivers`, { credentials: "include" });
  return res.json();
}
async function removeDriver(driverId: string) {
  const res = await fetch(`${apiBase}/saved-drivers/${driverId}`, { method: "DELETE", credentials: "include" });
  return res.json();
}

export default function SavedDrivers() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery({ queryKey: ["saved-drivers"], queryFn: fetchSavedDrivers });
  const removeMutation = useMutation({
    mutationFn: removeDriver,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["saved-drivers"] }); toast({ title: "Driver removed from your network." }); },
    onError: () => toast({ title: "Error", description: "Could not remove driver.", variant: "destructive" }),
  });
  const savedDrivers = data?.savedDrivers || [];

  return (
    <AuthGuard>
      <MainLayout>
        {/* Header */}
        <div className="bg-slate-950 border-b border-slate-800/60 py-14">
          <div className="container mx-auto px-4 md:px-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8 bg-rose-500" />
              <span className="text-rose-400 font-mono text-xs font-bold tracking-[0.2em] uppercase">Your Network</span>
            </div>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Heart className="h-6 w-6 text-rose-400" />
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tight">Saved Drivers</h1>
            </div>
            <p className="text-slate-400 text-lg">Your trusted carrier network. Rebook them directly without going through the full bid process.</p>
          </div>
        </div>

        <div className="bg-slate-950 min-h-screen">
          <div className="container mx-auto px-4 md:px-8 py-10">
            {isLoading ? (
              <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-rose-500" /></div>
            ) : savedDrivers.length === 0 ? (
              <div className="text-center py-24 rounded-2xl border border-dashed border-slate-800 max-w-md mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-5">
                  <Users className="h-8 w-8 text-rose-400/60" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">No saved drivers yet</h3>
                <p className="text-slate-500 mb-6 text-sm leading-relaxed">After a successful shipment, save your driver to rebook them directly next time — no bidding required.</p>
                <Button className="bg-blue-600 hover:bg-blue-500 border-0 text-white" asChild>
                  <Link href="/shipments">Browse Open Loads <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedDrivers.map((saved: any, i: number) => {
                  const d = saved.driver;
                  const name = [d?.firstName, d?.lastName].filter(Boolean).join(" ") || "Driver";
                  return (
                    <motion.div key={saved.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 hover:border-slate-700 transition-colors p-6">
                        <div className="flex items-start gap-4 mb-5">
                          <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center text-blue-300 text-xl font-bold shrink-0">
                            {name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-bold text-white text-lg leading-tight">{name}</h3>
                              {d?.isVerified && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold border border-emerald-500/25 bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                  <Shield className="h-2.5 w-2.5" /> Verified
                                </span>
                              )}
                            </div>
                            {d?.averageRating > 0 && (
                              <div className="flex items-center gap-1.5 text-sm">
                                <div className="flex gap-0.5">
                                  {Array.from({ length: 5 }).map((_, j) => (
                                    <Star key={j} className={`h-3.5 w-3.5 ${j < Math.round(d.averageRating) ? "text-amber-400 fill-amber-400" : "text-slate-700"}`} />
                                  ))}
                                </div>
                                <span className="font-semibold text-white">{d.averageRating.toFixed(1)}</span>
                                <span className="text-slate-500">({d.totalReviews} reviews)</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 mb-5">
                          {d?.completedJobs > 0 && (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Truck className="h-3.5 w-3.5" />
                              <span><strong className="text-slate-300">{d.completedJobs}</strong> hauls completed</span>
                            </div>
                          )}
                          {d?.truckType && (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Truck className="h-3.5 w-3.5" />
                              <span>{d.truckType}</span>
                            </div>
                          )}
                          {d?.dotNumber && (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Shield className="h-3.5 w-3.5" />
                              <span>DOT #{d.dotNumber}</span>
                            </div>
                          )}
                          {saved.note && (
                            <div className="bg-slate-800/60 rounded-lg px-3 py-2 text-slate-400 italic text-xs">"{saved.note}"</div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-4 border-t border-slate-800/60">
                          <Button size="sm" className="flex-1 gap-1.5 bg-blue-600 hover:bg-blue-500 border-0 text-white text-xs" asChild>
                            <Link href={`/messages?driverId=${saved.driverId}`}>
                              <MessageCircle className="h-3.5 w-3.5" /> Message
                            </Link>
                          </Button>
                          <Button size="sm" variant="outline"
                            className="gap-1.5 border-red-500/25 text-red-400 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/40"
                            onClick={() => removeMutation.mutate(saved.driverId)} disabled={removeMutation.isPending}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </MainLayout>
    </AuthGuard>
  );
}
