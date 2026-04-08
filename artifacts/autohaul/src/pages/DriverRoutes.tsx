import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Truck, Calendar, Star, Shield, Plus, MessageCircle, Loader2, Route, Users, Info, ArrowRight, MapPin, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { apiBase } from "@/lib/api";
const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];

async function fetchDriverRoutes(params: Record<string, string>) {
  const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v && v !== "all")));
  const res = await fetch(`${apiBase}/driver-routes?${q}`, { credentials: "include" });
  return res.json();
}
async function postDriverRoute(data: Record<string, unknown>) {
  const res = await fetch(`${apiBase}/driver-routes`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error("Failed to post route");
  return res.json();
}
async function getCurrentUser() {
  const res = await fetch(`${apiBase}/auth/user`, { credentials: "include" });
  return res.json();
}

function PostRouteDialog({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ originCity: "", originState: "", destinationCity: "", destinationState: "", departureDateFrom: "", departureDateTo: "", truckCapacity: "1", availableSpots: "1", transportType: "open", pricePerVehicle: "", notes: "" });
  const [open, setOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: postDriverRoute,
    onSuccess: () => { setOpen(false); onSuccess(); toast({ title: "Route posted!", description: "Shippers heading your way can now find you." }); },
    onError: () => toast({ title: "Error", description: "Failed to post route.", variant: "destructive" }),
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2 bg-blue-600 hover:bg-blue-500 border-0 text-white font-bold shadow-xl shadow-blue-600/20">
          <Plus className="h-4 w-4" /> Post My Route
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">Post Your Route</DialogTitle>
          <p className="text-sm text-slate-400 mt-1">Let shippers know you're heading their way — fill your empty miles with backhaul loads.</p>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {[
            { label: "Origin City", key: "originCity", type: "text", placeholder: "e.g. Dallas", stateKey: "originState" },
            { label: "Destination City", key: "destinationCity", type: "text", placeholder: "e.g. Phoenix", stateKey: "destinationState" },
          ].map(({ label, key, placeholder, stateKey }) => (
            <div key={key} className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">{label}</label>
                <Input value={(form as any)[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder}
                  className="bg-slate-800/60 border-slate-700 text-white h-11" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">State</label>
                <Select value={(form as any)[stateKey]} onValueChange={v => set(stateKey, v)}>
                  <SelectTrigger className="bg-slate-800/60 border-slate-700 text-white h-11"><SelectValue placeholder="State" /></SelectTrigger>
                  <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            {[{ label: "Departure From", key: "departureDateFrom" }, { label: "Departure To", key: "departureDateTo" }].map(({ label, key }) => (
              <div key={key}>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">{label}</label>
                <Input type="date" value={(form as any)[key]} onChange={e => set(key, e.target.value)}
                  className="bg-slate-800/60 border-slate-700 text-white h-11" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[{ label: "Truck Capacity", key: "truckCapacity" }, { label: "Available Spots", key: "availableSpots" }].map(({ label, key }) => (
              <div key={key}>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">{label}</label>
                <Input type="number" min="1" max="12" value={(form as any)[key]} onChange={e => set(key, e.target.value)}
                  className="bg-slate-800/60 border-slate-700 text-white h-11" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Transport Type</label>
              <Select value={form.transportType} onValueChange={v => set("transportType", v)}>
                <SelectTrigger className="bg-slate-800/60 border-slate-700 text-white h-11"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="open">Open Carrier</SelectItem><SelectItem value="enclosed">Enclosed Carrier</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Price Per Vehicle ($)</label>
              <Input type="number" value={form.pricePerVehicle} onChange={e => set("pricePerVehicle", e.target.value)} placeholder="Optional"
                className="bg-slate-800/60 border-slate-700 text-white h-11" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Notes (optional)</label>
            <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="e.g. Can pick up within 50 miles of route"
              className="bg-slate-800/60 border-slate-700 text-white h-11" />
          </div>
          <Button className="w-full bg-blue-600 hover:bg-blue-500 border-0 text-white font-bold h-11"
            onClick={() => mutation.mutate({ ...form, truckCapacity: parseInt(form.truckCapacity), availableSpots: parseInt(form.availableSpots), pricePerVehicle: form.pricePerVehicle ? parseFloat(form.pricePerVehicle) : undefined })}
            disabled={mutation.isPending || !form.originCity || !form.originState || !form.destinationCity || !form.destinationState || !form.departureDateFrom || !form.departureDateTo}>
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Posting...</> : "Post Route"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function DriverRoutes() {
  const qc = useQueryClient();
  const [originState, setOriginState] = useState("all");
  const [destinationState, setDestinationState] = useState("all");
  const [transportType, setTransportType] = useState("all");
  const { data: authData } = useQuery({ queryKey: ["auth-user"], queryFn: getCurrentUser });
  const isAuthenticated = authData?.isAuthenticated;
  const { data, isLoading } = useQuery({
    queryKey: ["driver-routes", originState, destinationState, transportType],
    queryFn: () => fetchDriverRoutes({ originState, destinationState, transportType }),
  });
  const routes = data?.routes || [];

  return (
    <MainLayout>
      {/* Header */}
      <div className="bg-slate-950 border-b border-slate-800/60 py-14">
        <div className="container mx-auto px-4 md:px-8">
          <button onClick={() => window.history.back()} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6 -ml-1 group">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Back
          </button>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px w-8 bg-emerald-500" />
                <span className="text-emerald-400 font-mono text-xs font-bold tracking-[0.2em] uppercase">New — Backhaul Finder</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tight mb-3">Driver Route Board</h1>
              <p className="text-slate-400 text-lg max-w-2xl">Drivers post planned routes. Shippers match loads to drivers already heading their way — no empty miles, no broker markup.</p>
            </div>
            {isAuthenticated && (
              <div className="shrink-0">
                <PostRouteDialog onSuccess={() => qc.invalidateQueries({ queryKey: ["driver-routes"] })} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-950 border-b border-slate-800/60 py-4">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Filter</span>
            {[
              { value: originState, onChange: setOriginState, placeholder: "Any Origin" },
              { value: destinationState, onChange: setDestinationState, placeholder: "Any Destination" },
            ].map(({ value, onChange, placeholder }, i) => (
              <Select key={i} value={value} onValueChange={onChange}>
                <SelectTrigger className="w-40 bg-slate-900 border-slate-800 text-slate-300 h-9 text-xs"><SelectValue placeholder={placeholder} /></SelectTrigger>
                <SelectContent><SelectItem value="all">{placeholder}</SelectItem>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            ))}
            <Select value={transportType} onValueChange={setTransportType}>
              <SelectTrigger className="w-44 bg-slate-900 border-slate-800 text-slate-300 h-9 text-xs"><SelectValue placeholder="Any Type" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Any Type</SelectItem><SelectItem value="open">Open Carrier</SelectItem><SelectItem value="enclosed">Enclosed Carrier</SelectItem></SelectContent>
            </Select>
            {routes.length > 0 && <span className="text-xs text-slate-500 ml-auto font-mono">{routes.length} driver{routes.length !== 1 ? "s" : ""} found</span>}
          </div>
        </div>
      </div>

      <div className="bg-slate-950 min-h-screen">
        <div className="container mx-auto px-4 md:px-8 py-10">
          {!isAuthenticated && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-start gap-3 bg-blue-500/8 border border-blue-500/20 rounded-xl p-4">
              <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-300">Sign in to post your route or contact drivers</p>
                <p className="text-xs text-blue-400/70 mt-0.5">Browsing is always free. No subscription required.</p>
              </div>
            </motion.div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center py-24"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
          ) : routes.length === 0 ? (
            <div className="text-center py-24 rounded-2xl border border-dashed border-slate-800">
              <Route className="h-12 w-12 text-slate-700 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No routes posted yet</h3>
              <p className="text-slate-500 mb-6">Be the first driver to post your planned route.</p>
              {isAuthenticated && <PostRouteDialog onSuccess={() => qc.invalidateQueries({ queryKey: ["driver-routes"] })} />}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {routes.map((route: any, i: number) => (
                <motion.div key={route.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 hover:bg-slate-900/90 hover:border-slate-700 transition-all duration-200 overflow-hidden">
                    <div className="p-5">
                      {/* Route line */}
                      <div className="flex items-start gap-3 mb-5">
                        <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                          <div className="w-px h-6 bg-slate-700" />
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div>
                            <p className="font-bold text-white text-sm">{route.originCity}, {route.originState}</p>
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">{route.destinationCity}, {route.destinationState}</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 items-end shrink-0">
                          <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full uppercase tracking-wide ${
                            route.transportType === "enclosed" ? "bg-violet-500/15 text-violet-300 border-violet-500/25" : "bg-slate-500/15 text-slate-400 border-slate-500/25"
                          }`}>{route.transportType === "enclosed" ? "Enclosed" : "Open"}</span>
                          {route.availableSpots <= 2 && (
                            <span className="text-[10px] font-bold border border-amber-500/25 bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-full uppercase tracking-wide">
                              {route.availableSpots} left
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{route.departureDateFrom} – {route.departureDateTo}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Users className="h-3.5 w-3.5" />
                            <span>{route.availableSpots} of {route.truckCapacity} spots open</span>
                          </div>
                          {route.pricePerVehicle && (
                            <span className="font-bold text-emerald-400">${route.pricePerVehicle.toLocaleString()}/car</span>
                          )}
                        </div>
                        {route.notes && (
                          <p className="text-xs text-slate-500 bg-slate-800/60 rounded-lg px-3 py-2 italic">{route.notes}</p>
                        )}
                      </div>

                      {/* Driver */}
                      {route.driver && (
                        <div className="flex items-center justify-between pt-4 border-t border-slate-800/60">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/20 flex items-center justify-center text-blue-300 font-bold text-sm shrink-0">
                              {(route.driver.firstName || "D").charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-semibold text-white">
                                  {[route.driver.firstName, route.driver.lastName].filter(Boolean).join(" ") || "Driver"}
                                </span>
                                {route.driver.isVerified && <Shield className="h-3.5 w-3.5 text-emerald-400" />}
                              </div>
                              {route.driver.averageRating > 0 && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                                  <span className="text-xs text-slate-500">{route.driver.averageRating.toFixed(1)} ({route.driver.totalReviews})</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {isAuthenticated && (
                            <Button size="sm" variant="outline" className="gap-1.5 h-8 border-slate-700 text-slate-300 bg-slate-800/40 hover:bg-slate-800 text-xs" asChild>
                              <Link href={`/messages?driverId=${route.driverId}`}>
                                <MessageCircle className="h-3.5 w-3.5" /> Contact
                              </Link>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
