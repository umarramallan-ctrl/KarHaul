import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Truck, MapPin, Calendar, Star, Shield, Plus, MessageCircle, Loader2, Route, Users, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchDriverRoutes(params: Record<string, string>) {
  const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v && v !== "all")));
  const res = await fetch(`${BASE}/api/driver-routes?${q}`, { credentials: "include" });
  return res.json();
}

async function postDriverRoute(data: Record<string, unknown>) {
  const res = await fetch(`${BASE}/api/driver-routes`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to post route");
  return res.json();
}

async function getCurrentUser() {
  const res = await fetch(`${BASE}/api/auth/user`, { credentials: "include" });
  return res.json();
}

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];

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
        <Button size="lg" className="gap-2"><Plus className="h-4 w-4" /> Post My Route</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Post Your Route</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">Let shippers know you're heading their way — fill your empty miles with backhaul loads.</p>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Origin City</label>
              <Input value={form.originCity} onChange={e => set("originCity", e.target.value)} placeholder="e.g. Dallas" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">State</label>
              <Select value={form.originState} onValueChange={v => set("originState", v)}>
                <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Destination City</label>
              <Input value={form.destinationCity} onChange={e => set("destinationCity", e.target.value)} placeholder="e.g. Phoenix" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">State</label>
              <Select value={form.destinationState} onValueChange={v => set("destinationState", v)}>
                <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Departure From</label>
              <Input type="date" value={form.departureDateFrom} onChange={e => set("departureDateFrom", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Departure To</label>
              <Input type="date" value={form.departureDateTo} onChange={e => set("departureDateTo", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Truck Capacity (cars)</label>
              <Input type="number" min="1" max="12" value={form.truckCapacity} onChange={e => set("truckCapacity", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Available Spots</label>
              <Input type="number" min="1" max="12" value={form.availableSpots} onChange={e => set("availableSpots", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Transport Type</label>
              <Select value={form.transportType} onValueChange={v => set("transportType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open Carrier</SelectItem>
                  <SelectItem value="enclosed">Enclosed Carrier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Price Per Vehicle ($)</label>
              <Input type="number" value={form.pricePerVehicle} onChange={e => set("pricePerVehicle", e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Notes (optional)</label>
            <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="e.g. Can pick up within 50 miles of route" />
          </div>
          <Button
            className="w-full"
            onClick={() => mutation.mutate({ ...form, truckCapacity: parseInt(form.truckCapacity), availableSpots: parseInt(form.availableSpots), pricePerVehicle: form.pricePerVehicle ? parseFloat(form.pricePerVehicle) : undefined })}
            disabled={mutation.isPending || !form.originCity || !form.originState || !form.destinationCity || !form.destinationState || !form.departureDateFrom || !form.departureDateTo}
          >
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
      <div className="bg-slate-900 py-14">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="inline-block py-1 px-3 rounded-full bg-blue-500/20 text-blue-300 font-medium text-sm mb-4 border border-blue-500/30">
                New — Backhaul Finder
              </span>
              <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-3">Driver Route Board</h1>
              <p className="text-slate-300 text-lg max-w-2xl">
                Drivers post their planned routes. Shippers match loads to drivers already heading their way — everyone wins. No empty miles. No broker markup.
              </p>
            </div>
            {isAuthenticated && (
              <div className="shrink-0">
                <PostRouteDialog onSuccess={() => qc.invalidateQueries({ queryKey: ["driver-routes"] })} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-muted/30 border-b">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter:</span>
            </div>
            <Select value={originState} onValueChange={setOriginState}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Origin State" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Origin</SelectItem>
                {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={destinationState} onValueChange={setDestinationState}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Destination State" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Destination</SelectItem>
                {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={transportType} onValueChange={setTransportType}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Transport Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Type</SelectItem>
                <SelectItem value="open">Open Carrier</SelectItem>
                <SelectItem value="enclosed">Enclosed Carrier</SelectItem>
              </SelectContent>
            </Select>
            {routes.length > 0 && <span className="text-sm text-muted-foreground ml-auto">{routes.length} driver{routes.length !== 1 ? "s" : ""} found</span>}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-10">
        {!isAuthenticated && (
          <div className="mb-8 flex items-start gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Sign in to post your route or contact drivers</p>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-0.5">Browsing is free. No subscription required.</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : routes.length === 0 ? (
          <div className="text-center py-24">
            <Route className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No routes posted yet</h3>
            <p className="text-muted-foreground mb-6">Be the first driver to post your planned route.</p>
            {isAuthenticated && <PostRouteDialog onSuccess={() => qc.invalidateQueries({ queryKey: ["driver-routes"] })} />}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {routes.map((route: any) => (
              <Card key={route.id} className="hover:shadow-lg hover:-translate-y-1 transition-all duration-200 border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                        <span className="font-semibold text-base">{route.originCity}, {route.originState}</span>
                      </div>
                      <div className="flex items-center gap-2 ml-[18px]">
                        <div className="w-0.5 h-5 bg-border ml-[1px]" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-destructive shrink-0" />
                        <span className="font-semibold text-base">{route.destinationCity}, {route.destinationState}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Badge variant={route.transportType === "enclosed" ? "secondary" : "outline"} className="text-xs">
                        {route.transportType === "enclosed" ? "Enclosed" : "Open"}
                      </Badge>
                      {route.availableSpots <= 2 && <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Only {route.availableSpots} left</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>{route.departureDateFrom} – {route.departureDateTo}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>{route.availableSpots} of {route.truckCapacity} spots open</span>
                    </div>
                    {route.pricePerVehicle && (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">${route.pricePerVehicle.toLocaleString()}/car</span>
                    )}
                  </div>
                  {route.notes && <p className="text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2">{route.notes}</p>}
                  {route.driver && (
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {(route.driver.firstName || "D").charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium">{[route.driver.firstName, route.driver.lastName].filter(Boolean).join(" ") || "Driver"}</span>
                            {route.driver.isVerified && <Shield className="h-3.5 w-3.5 text-emerald-500" />}
                          </div>
                          {route.driver.averageRating > 0 && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                              <span className="text-xs text-muted-foreground">{route.driver.averageRating.toFixed(1)} ({route.driver.totalReviews})</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {isAuthenticated && (
                        <Button size="sm" variant="outline" className="gap-1.5 h-8" asChild>
                          <Link href={`/messages?driverId=${route.driverId}`}>
                            <MessageCircle className="h-3.5 w-3.5" /> Contact
                          </Link>
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
