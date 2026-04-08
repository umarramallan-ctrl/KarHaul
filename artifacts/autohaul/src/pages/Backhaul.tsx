import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/AuthGuard";
import { useGetMyProfile } from "@workspace/api-client-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Truck, MapPin, ArrowRight, ArrowLeft, Plus, DollarSign, Calendar, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiBase } from "@/lib/api";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];

const backhaulSchema = z.object({
  originCity: z.string().min(2, "City required"),
  originState: z.string().length(2, "2-letter state code"),
  destinationCity: z.string().min(2, "City required"),
  destinationState: z.string().length(2, "2-letter state code"),
  departureDateFrom: z.string().min(1, "Date required"),
  departureDateTo: z.string().min(1, "Date required"),
  availableSpots: z.coerce.number().min(1).max(20),
  transportType: z.enum(["open", "enclosed"]),
  pricePerVehicle: z.coerce.number().optional(),
  notes: z.string().optional(),
});

async function fetchBackhaul(originState?: string, destinationState?: string) {
  const params = new URLSearchParams();
  if (originState) params.set("originState", originState);
  if (destinationState) params.set("destinationState", destinationState);
  const res = await fetch(`${apiBase}/backhaul?${params}`, { credentials: "include" });
  return res.json();
}

async function postBackhaul(data: Record<string, any>) {
  const res = await fetch(`${apiBase}/backhaul`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
  return res.json();
}

export default function BackhaulBoard() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: profile } = useGetMyProfile();
  const isDriver = profile?.role === "driver" || profile?.role === "both";

  const [filterOrigin, setFilterOrigin] = useState("");
  const [filterDest, setFilterDest] = useState("");
  const [postOpen, setPostOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["backhaul", filterOrigin, filterDest],
    queryFn: () => fetchBackhaul(filterOrigin || undefined, filterDest || undefined),
  });

  const form = useForm<z.infer<typeof backhaulSchema>>({
    resolver: zodResolver(backhaulSchema),
    defaultValues: { availableSpots: 1, transportType: "open" },
  });

  const mutation = useMutation({
    mutationFn: postBackhaul,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backhaul"] });
      toast({ title: "Backhaul route posted!", description: "Matching shippers have been notified." });
      setPostOpen(false);
      form.reset();
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const inputCls = "bg-slate-800/60 border-slate-700 text-white h-10 focus:border-blue-500 placeholder:text-slate-600";

  return (
    <AuthGuard>
      <MainLayout>
        <div className="bg-slate-950 border-b border-slate-800/60 py-12">
          <div className="container mx-auto px-4 md:px-8">
            <button onClick={() => window.history.back()} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6 -ml-1 group">
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              Back
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8 bg-amber-500" />
              <span className="text-amber-400 font-mono text-xs font-bold tracking-[0.2em] uppercase">Backhaul Board</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-4xl font-display font-bold text-white mb-2">Backhaul Routes</h1>
                <p className="text-slate-400">Drivers post return-trip capacity at discounted rates. Shippers get savings on matching lanes.</p>
              </div>
              {isDriver && (
                <Dialog open={postOpen} onOpenChange={setPostOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold border-0 h-11 px-6">
                      <Plus className="h-4 w-4 mr-2" /> Post Backhaul Route
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Post Return Route</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(v => mutation.mutate(v))} className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="originCity" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-slate-400 uppercase tracking-widest">Origin City</FormLabel>
                              <FormControl><Input placeholder="Chicago" {...field} className={inputCls} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="originState" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-slate-400 uppercase tracking-widest">State</FormLabel>
                              <FormControl><Input placeholder="IL" maxLength={2} className={`${inputCls} uppercase`} {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <div className="flex justify-center py-1">
                          <ArrowRight className="h-5 w-5 text-slate-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="destinationCity" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-slate-400 uppercase tracking-widest">Destination City</FormLabel>
                              <FormControl><Input placeholder="Atlanta" {...field} className={inputCls} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="destinationState" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-slate-400 uppercase tracking-widest">State</FormLabel>
                              <FormControl><Input placeholder="GA" maxLength={2} className={`${inputCls} uppercase`} {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="departureDateFrom" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-slate-400 uppercase tracking-widest">Earliest Departure</FormLabel>
                              <FormControl><Input type="date" {...field} className={inputCls} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="departureDateTo" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-slate-400 uppercase tracking-widest">Latest Departure</FormLabel>
                              <FormControl><Input type="date" {...field} className={inputCls} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <FormField control={form.control} name="availableSpots" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-slate-400 uppercase tracking-widest">Spots</FormLabel>
                              <FormControl><Input type="number" min={1} {...field} className={inputCls} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="pricePerVehicle" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-slate-400 uppercase tracking-widest">$/Vehicle</FormLabel>
                              <FormControl><Input type="number" placeholder="450" {...field} className={inputCls} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="transportType" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-slate-400 uppercase tracking-widest">Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="open">Open</SelectItem>
                                  <SelectItem value="enclosed">Enclosed</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <FormField control={form.control} name="notes" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-slate-400 uppercase tracking-widest">Notes (optional)</FormLabel>
                            <FormControl>
                              <Textarea placeholder="e.g. Single vehicle only, running Monday…" className="bg-slate-800/60 border-slate-700 text-white focus:border-blue-500 placeholder:text-slate-600" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">
                          Standard 5%/3% platform fees apply. Matching shippers on your lane will be notified immediately.
                        </div>
                        <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold border-0" disabled={mutation.isPending}>
                          {mutation.isPending ? "Posting…" : "Post Route"}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-950 min-h-screen">
          <div className="container mx-auto px-4 md:px-8 py-8">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
              <Select value={filterOrigin} onValueChange={setFilterOrigin}>
                <SelectTrigger className="w-48 bg-slate-800/60 border-slate-700 text-white">
                  <SelectValue placeholder="Origin state…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All origins</SelectItem>
                  {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterDest} onValueChange={setFilterDest}>
                <SelectTrigger className="w-48 bg-slate-800/60 border-slate-700 text-white">
                  <SelectValue placeholder="Destination state…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All destinations</SelectItem>
                  {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {(filterOrigin || filterDest) && (
                <Button variant="ghost" className="text-slate-400" onClick={() => { setFilterOrigin(""); setFilterDest(""); }}>Clear filters</Button>
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
              </div>
            ) : !data?.routes?.length ? (
              <div className="text-center py-20">
                <Truck className="h-12 w-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">No backhaul routes available</p>
                <p className="text-slate-600 text-sm mt-1">Drivers post return routes after delivery. Check back soon.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data.routes.map((route: any) => (
                  <Card key={route.id} className="bg-slate-900/40 border-slate-700/60 hover:border-amber-500/30 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-amber-400" />
                          <span className="font-bold text-white text-sm">
                            {route.originCity}, {route.originState}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                          <span className="font-bold text-white text-sm">
                            {route.destinationCity}, {route.destinationState}
                          </span>
                        </div>
                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">
                          {route.transportType}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-slate-800/50 p-2">
                          <Package className="h-3.5 w-3.5 text-slate-400 mx-auto mb-1" />
                          <div className="text-xs text-white font-bold">{route.availableSpots}</div>
                          <div className="text-[10px] text-slate-500">spots</div>
                        </div>
                        <div className="rounded-lg bg-slate-800/50 p-2">
                          <DollarSign className="h-3.5 w-3.5 text-slate-400 mx-auto mb-1" />
                          <div className="text-xs text-white font-bold">
                            {route.pricePerVehicle ? `$${route.pricePerVehicle}` : "TBD"}
                          </div>
                          <div className="text-[10px] text-slate-500">per vehicle</div>
                        </div>
                        <div className="rounded-lg bg-slate-800/50 p-2">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 mx-auto mb-1" />
                          <div className="text-xs text-white font-bold">{route.departureDateFrom}</div>
                          <div className="text-[10px] text-slate-500">earliest</div>
                        </div>
                      </div>
                      {route.notes && (
                        <p className="text-xs text-slate-400 bg-slate-800/30 rounded-lg p-2">{route.notes}</p>
                      )}
                      {route.driver && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center">
                            <Truck className="h-3 w-3" />
                          </div>
                          {route.driver.firstName} {route.driver.lastName}
                          {route.driver.isVerified && <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-[10px]">Verified</Badge>}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </MainLayout>
    </AuthGuard>
  );
}
