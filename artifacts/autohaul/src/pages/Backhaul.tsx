import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/AuthGuard";
import { useGetMyProfile } from "@workspace/api-client-react";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  Truck, MapPin, ArrowRight, ArrowLeft, Plus, DollarSign, Calendar, Package,
  Clock, X, Shield, CheckCircle, AlertTriangle, Car,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { apiBase } from "@/lib/api";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];

const BACKHAUL_LOCATION_TYPES = [
  { value: "residential", label: "Residential" },
  { value: "dealer",      label: "Auto Dealer / Lot" },
  { value: "auction",     label: "Auction House" },
  { value: "port",        label: "Port / Marine Terminal" },
] as const;

// ----- Driver post form schema -----

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

// ----- Shipper booking form schema -----

const shipperBookingSchema = z.object({
  originStreet:           z.string().min(3, "Street address required"),
  originCity:             z.string().min(2, "City required"),
  originState:            z.string().length(2, "2-letter state"),
  originZip:              z.string().regex(/^\d{5}$/, "5-digit ZIP required"),
  originLocationType:     z.enum(["residential", "dealer", "auction", "port"], { required_error: "Select a location type" }),
  destinationStreet:      z.string().min(3, "Street address required"),
  destinationCity:        z.string().min(2, "City required"),
  destinationState:       z.string().length(2, "2-letter state"),
  destinationZip:         z.string().regex(/^\d{5}$/, "5-digit ZIP required"),
  destinationLocationType:z.enum(["residential", "dealer", "auction", "port"], { required_error: "Select a location type" }),
  vehicleYear:            z.coerce.number({ invalid_type_error: "Year required" }).min(1900).max(new Date().getFullYear() + 1),
  vehicleMake:            z.string().min(1, "Make required"),
  vehicleModel:           z.string().min(1, "Model required"),
  vin:                    z.string().length(17, "VIN must be exactly 17 characters"),
});

type ShipperBookingData = z.infer<typeof shipperBookingSchema>;

// ----- API helpers -----

async function clerkHeaders(): Promise<HeadersInit> {
  const token = await (window as any).Clerk?.session?.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchBackhaul(originState?: string, destinationState?: string) {
  const params = new URLSearchParams();
  if (originState) params.set("originState", originState);
  if (destinationState) params.set("destinationState", destinationState);
  const res = await fetch(`${apiBase}/backhaul?${params}`, {
    credentials: "include",
    headers: await clerkHeaders(),
  });
  return res.json();
}

async function postBackhaul(data: Record<string, any>) {
  const authHeaders = await clerkHeaders();
  const res = await fetch(`${apiBase}/backhaul`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
  return res.json();
}

// ----- Shared types -----

interface BookingState {
  price: number;
  confirmedAt: Date;
  cancelled: boolean;
  shipperData: ShipperBookingData;
}

// ----- Helpers -----

function useCancellationCountdown(confirmedAt: Date | null): number {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!confirmedAt) { setRemaining(0); return; }
    const tick = () => {
      const end = confirmedAt.getTime() + 2 * 60 * 60 * 1000;
      setRemaining(Math.max(0, end - Date.now()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [confirmedAt]);
  return remaining;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Expired";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ----- Autocomplete input (NHTSA makes/models) -----

function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const safeValue = value ?? "";
  const filtered = safeValue.trim().length > 0
    ? suggestions.filter(s => s.toLowerCase().includes(safeValue.toLowerCase())).slice(0, 8)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={safeValue}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => filtered.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-xl divide-y divide-slate-800/50">
          {filtered.map(s => (
            <li key={s}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-slate-800 transition-colors"
                onMouseDown={e => { e.preventDefault(); onChange(s); setOpen(false); }}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ----- Policy notice -----

function PolicyNotice({ isShipper }: { isShipper: boolean }) {
  return (
    <div className="rounded-xl border border-slate-700/40 bg-slate-800/30 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400 leading-relaxed">
          <strong className="text-slate-300">KarHaul does not process transport payments.</strong>{" "}
          Pay your driver directly — cash, Zelle, Venmo, etc.
        </p>
      </div>
      {isShipper ? (
        <div className="pt-2 border-t border-slate-700/40 space-y-1.5 text-xs text-slate-400 leading-relaxed">
          <p>You have a <strong className="text-slate-300">2-hour window</strong> to cancel penalty-free. After that, your escrow fee is forfeited.</p>
          <p>If your vehicle is not accessible at pickup, your escrow fee is forfeited.</p>
        </div>
      ) : (
        <div className="pt-2 border-t border-slate-700/40 text-xs text-slate-400 leading-relaxed">
          <p>If the shipper's vehicle is not accessible at pickup, their escrow fee is forfeited to you.</p>
        </div>
      )}
    </div>
  );
}

// ----- Section header divider -----

function SectionLabel({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-3.5 w-3.5 text-slate-500" />
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">{children}</span>
      <div className="h-px flex-1 bg-slate-700/60" />
    </div>
  );
}

// ----- Booking confirmed panel -----

function BookingConfirmedPanel({
  booking,
  onCancel,
  isShipper,
}: {
  booking: BookingState;
  onCancel: () => void;
  isShipper: boolean;
}) {
  const countdown = useCancellationCountdown(booking.cancelled ? null : booking.confirmedAt);
  const inWindow = countdown > 0;

  if (booking.cancelled) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
        This booking has been cancelled.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-bold text-emerald-400">Booking Confirmed</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-300">Agreed Price</span>
          <span className="font-bold text-white">${booking.price.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-300">Platform Fee (5%)</span>
          <span className="font-bold text-white">${(booking.price * 0.05).toFixed(2)}</span>
        </div>
      </div>

      {inWindow && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex items-center gap-3">
          <Clock className="h-5 w-5 text-amber-400 shrink-0" />
          <div>
            <div className="text-xs text-amber-300/70 font-bold uppercase tracking-widest mb-0.5">Cancellation Window</div>
            <div className="text-2xl font-mono font-bold text-amber-400 leading-none">{formatCountdown(countdown)}</div>
            <div className="text-xs text-amber-300/70 mt-0.5">remaining to cancel penalty-free</div>
          </div>
        </div>
      )}

      <Button
        variant="outline"
        className="w-full border-red-500/40 text-red-400 hover:bg-red-500/10"
        onClick={onCancel}
      >
        <X className="h-4 w-4 mr-2" />
        Cancel Booking{!inWindow ? " (escrow forfeited)" : ""}
      </Button>

      <PolicyNotice isShipper={isShipper} />
    </div>
  );
}

// ----- Shipper action panel (with address/vehicle form) -----

function ShipperActionPanel({
  route,
  onAccept,
  onCounter,
}: {
  route: any;
  onAccept: (data: ShipperBookingData) => void;
  onCounter: (price: number, data: ShipperBookingData) => void;
}) {
  const [showCounter, setShowCounter] = useState(false);
  const [counterPrice, setCounterPrice] = useState("");

  const form = useForm<ShipperBookingData>({
    resolver: zodResolver(shipperBookingSchema),
    defaultValues: {
      originStreet: "", originCity: "", originState: "", originZip: "",
      destinationStreet: "", destinationCity: "", destinationState: "", destinationZip: "",
      vehicleYear: undefined as any, vehicleMake: "", vehicleModel: "", vin: "",
    },
  });

  const watchedMake = form.watch("vehicleMake") ?? "";

  const { data: nhtsaMakes = [] } = useQuery<string[]>({
    queryKey: ["nhtsa-makes"],
    queryFn: async () => {
      const res = await fetch("https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/car?format=json");
      const json = await res.json();
      return (json.Results as Array<{ MakeName: string }>).map(m => m.MakeName).sort();
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const { data: nhtsaModels = [] } = useQuery<string[]>({
    queryKey: ["nhtsa-models", watchedMake],
    queryFn: async () => {
      const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/${encodeURIComponent(watchedMake)}?format=json`);
      const json = await res.json();
      return [...new Set((json.Results as Array<{ Model_Name: string }>).map(m => m.Model_Name))].sort() as string[];
    },
    enabled: watchedMake.trim().length >= 2,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const ic = "bg-slate-800/60 border-slate-700 text-white h-10 focus:border-blue-500 placeholder:text-slate-600 text-sm";

  async function tryAccept() {
    const valid = await form.trigger();
    if (!valid) return;
    onAccept(form.getValues());
  }

  async function tryCounter() {
    const valid = await form.trigger();
    if (!valid) return;
    if (!counterPrice || Number(counterPrice) <= 0) return;
    onCounter(Number(counterPrice), form.getValues());
    setShowCounter(false);
    setCounterPrice("");
  }

  return (
    <div className="space-y-5">

      {/* ── Pickup Location ── */}
      <div>
        <SectionLabel icon={MapPin}>Pickup Location</SectionLabel>
        <div className="space-y-2.5">
          <FormField control={form.control} name="originStreet" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-slate-400">Street Address</FormLabel>
              <FormControl><Input placeholder="123 Main St" {...field} className={ic} /></FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )} />
          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-2">
              <FormField control={form.control} name="originCity" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-slate-400">City</FormLabel>
                  <FormControl><Input placeholder="Chicago" {...field} className={ic} /></FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="originState" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-slate-400">State</FormLabel>
                <FormControl><Input placeholder="IL" maxLength={2} {...field} className={`${ic} uppercase`} /></FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )} />
            <FormField control={form.control} name="originZip" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-slate-400">ZIP</FormLabel>
                <FormControl><Input placeholder="60601" maxLength={5} {...field} className={ic} /></FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="originLocationType" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-slate-400">Location Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className={ic}><SelectValue placeholder="Select type…" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {BACKHAUL_LOCATION_TYPES.map(lt => (
                    <SelectItem key={lt.value} value={lt.value}>{lt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )} />
        </div>
      </div>

      {/* ── Delivery Location ── */}
      <div>
        <SectionLabel icon={MapPin}>Delivery Location</SectionLabel>
        <div className="space-y-2.5">
          <FormField control={form.control} name="destinationStreet" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-slate-400">Street Address</FormLabel>
              <FormControl><Input placeholder="456 Oak Ave" {...field} className={ic} /></FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )} />
          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-2">
              <FormField control={form.control} name="destinationCity" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-slate-400">City</FormLabel>
                  <FormControl><Input placeholder="Atlanta" {...field} className={ic} /></FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="destinationState" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-slate-400">State</FormLabel>
                <FormControl><Input placeholder="GA" maxLength={2} {...field} className={`${ic} uppercase`} /></FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )} />
            <FormField control={form.control} name="destinationZip" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-slate-400">ZIP</FormLabel>
                <FormControl><Input placeholder="30301" maxLength={5} {...field} className={ic} /></FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="destinationLocationType" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-slate-400">Location Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className={ic}><SelectValue placeholder="Select type…" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {BACKHAUL_LOCATION_TYPES.map(lt => (
                    <SelectItem key={lt.value} value={lt.value}>{lt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )} />
        </div>
      </div>

      {/* ── Vehicle ── */}
      <div>
        <SectionLabel icon={Car}>Vehicle</SectionLabel>
        <div className="space-y-2.5">
          <div className="grid grid-cols-3 gap-2">
            <FormField control={form.control} name="vehicleYear" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-slate-400">Year</FormLabel>
                <FormControl><Input type="number" placeholder="2019" {...field} className={ic} /></FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )} />
            <div className="col-span-2">
              <FormField control={form.control} name="vehicleMake" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-slate-400">Make</FormLabel>
                  <FormControl>
                    <AutocompleteInput
                      value={field.value}
                      onChange={v => { field.onChange(v); form.setValue("vehicleModel", ""); }}
                      suggestions={nhtsaMakes}
                      placeholder="Toyota"
                      className={ic}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )} />
            </div>
          </div>
          <FormField control={form.control} name="vehicleModel" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-slate-400">Model</FormLabel>
              <FormControl>
                <AutocompleteInput
                  value={field.value}
                  onChange={field.onChange}
                  suggestions={nhtsaModels}
                  placeholder={watchedMake ? "Camry" : "Enter make first"}
                  className={ic}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )} />
          <FormField control={form.control} name="vin" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-slate-400">VIN (17 characters)</FormLabel>
              <FormControl>
                <Input
                  placeholder="1HGBH41JXMN109186"
                  maxLength={17}
                  {...field}
                  className={`${ic} font-mono tracking-wider uppercase`}
                  onChange={e => field.onChange(e.target.value.toUpperCase())}
                />
              </FormControl>
              <div className="flex justify-between">
                <FormMessage className="text-xs" />
                <span className="text-[10px] text-slate-600">{(field.value ?? "").length}/17</span>
              </div>
            </FormItem>
          )} />
        </div>
      </div>

      {/* ── Action buttons ── */}
      <div className="space-y-2 pt-1">
        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold border-0 h-11"
          onClick={tryAccept}
        >
          Accept — {route.pricePerVehicle ? `$${route.pricePerVehicle}/vehicle` : "Listed Price"}
        </Button>

        {!showCounter ? (
          <Button
            variant="outline"
            className="w-full border-slate-600 text-slate-300 hover:bg-slate-800 h-11"
            onClick={() => setShowCounter(true)}
          >
            Counter Offer
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="number"
                placeholder="Your offer per vehicle…"
                value={counterPrice}
                onChange={e => setCounterPrice(e.target.value)}
                className="bg-slate-800/60 border-slate-700 text-white h-11 pl-9 focus:border-blue-500 placeholder:text-slate-600"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1 text-slate-400 hover:text-white"
                onClick={() => { setShowCounter(false); setCounterPrice(""); }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold border-0"
                disabled={!counterPrice || Number(counterPrice) <= 0}
                onClick={tryCounter}
              >
                Submit Counter
              </Button>
            </div>
          </div>
        )}
      </div>

      <PolicyNotice isShipper />
    </div>
  );
}

// ----- Route detail dialog -----

function RouteDetailDialog({
  route,
  open,
  onOpenChange,
  booking,
  isShipper,
  isDriver,
  onAccept,
  onCounter,
  onCancel,
}: {
  route: any;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  booking: BookingState | undefined;
  isShipper: boolean;
  isDriver: boolean;
  onAccept: (data: ShipperBookingData) => void;
  onCounter: (price: number, data: ShipperBookingData) => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white text-base">
            <MapPin className="h-4 w-4 text-amber-400 shrink-0" />
            {route.originCity}, {route.originState}
            <ArrowRight className="h-4 w-4 text-slate-500 shrink-0" />
            {route.destinationCity}, {route.destinationState}
          </DialogTitle>
          <DialogDescription className="sr-only">Backhaul route details and booking actions</DialogDescription>
        </DialogHeader>

        {/* Compact route summary */}
        <div className="grid grid-cols-4 gap-2 py-1">
          <div className="rounded-lg bg-slate-800/50 p-2 text-center">
            <Package className="h-3 w-3 text-slate-400 mx-auto mb-1" />
            <div className="text-xs font-bold text-white">{route.availableSpots}</div>
            <div className="text-[10px] text-slate-500">spots</div>
          </div>
          <div className="rounded-lg bg-slate-800/50 p-2 text-center">
            <DollarSign className="h-3 w-3 text-slate-400 mx-auto mb-1" />
            <div className="text-xs font-bold text-white">{route.pricePerVehicle ? `$${route.pricePerVehicle}` : "TBD"}</div>
            <div className="text-[10px] text-slate-500">/ vehicle</div>
          </div>
          <div className="rounded-lg bg-slate-800/50 p-2 text-center">
            <Calendar className="h-3 w-3 text-slate-400 mx-auto mb-1" />
            <div className="text-xs font-bold text-white">{route.departureDateFrom}</div>
            <div className="text-[10px] text-slate-500">earliest</div>
          </div>
          <div className="rounded-lg bg-slate-800/50 p-2 text-center">
            <Truck className="h-3 w-3 text-slate-400 mx-auto mb-1" />
            <div className="text-xs font-bold text-white capitalize">{route.transportType}</div>
            <div className="text-[10px] text-slate-500">type</div>
          </div>
        </div>

        {route.notes && (
          <p className="text-xs text-slate-400 bg-slate-800/30 rounded-lg px-3 py-2 leading-relaxed">{route.notes}</p>
        )}
        {route.driver && (
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/30 rounded-lg px-3 py-2">
            <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
              <Truck className="h-3 w-3" />
            </div>
            <span>{route.driver.firstName} {route.driver.lastName}</span>
            {route.driver.isVerified && (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-[10px]">Verified</Badge>
            )}
          </div>
        )}

        <div className="border-t border-slate-700/60 pt-4">
          {booking && !booking.cancelled ? (
            <BookingConfirmedPanel booking={booking} onCancel={onCancel} isShipper={isShipper} />
          ) : booking?.cancelled ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
                This booking has been cancelled.
              </div>
              <PolicyNotice isShipper={isShipper} />
            </div>
          ) : isShipper ? (
            <ShipperActionPanel route={route} onAccept={onAccept} onCounter={onCounter} />
          ) : isDriver ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-3 text-xs text-slate-400 text-center">
                Waiting for a shipper to accept or counter.
              </div>
              <PolicyNotice isShipper={false} />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ----- Confirmation modal -----

function ConfirmActionModal({
  open,
  onOpenChange,
  price,
  type,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  price: number;
  type: "accept" | "counter";
  onConfirm: () => void;
}) {
  const fee = price * 0.05;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Shield className="h-5 w-5 text-amber-400" />
            </div>
            <DialogTitle className="text-white text-lg">
              {type === "accept" ? "Confirm Booking" : "Confirm Counter Offer"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-400 text-sm leading-relaxed">
            {type === "accept"
              ? "You're accepting the driver's listed price for this route."
              : "You're submitting a counter offer. The driver will be notified to review."}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-300">Agreed Price</span>
            <span className="font-bold text-white">${price.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-300">Platform Fee (5%)</span>
            <span className="font-bold text-white">${fee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-slate-700">
            <span className="text-slate-300 font-semibold">Total held in escrow</span>
            <span className="font-bold text-amber-400">${fee.toFixed(2)}</span>
          </div>
        </div>

        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 flex items-start gap-2">
          <Clock className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-300 leading-relaxed">
            A 5% platform fee on the final agreed bid is held in escrow at booking confirmation. You have 2 hours after confirmation to cancel penalty-free.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={() => onOpenChange(false)}
          >
            Go Back
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold border-0"
            onClick={onConfirm}
          >
            {type === "accept" ? "Confirm Booking" : "Submit Counter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----- Route card -----

function RouteCard({
  route,
  booking,
  onClick,
}: {
  route: any;
  booking: BookingState | undefined;
  onClick: () => void;
}) {
  const countdown = useCancellationCountdown(
    booking && !booking.cancelled ? booking.confirmedAt : null
  );
  const inWindow = countdown > 0;

  return (
    <Card
      className="bg-slate-900/40 border-slate-700/60 hover:border-amber-500/30 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-amber-400" />
            <span className="font-bold text-white text-sm">{route.originCity}, {route.originState}</span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
            <span className="font-bold text-white text-sm">{route.destinationCity}, {route.destinationState}</span>
          </div>
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">{route.transportType}</Badge>
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
            <div className="text-xs text-white font-bold">{route.pricePerVehicle ? `$${route.pricePerVehicle}` : "TBD"}</div>
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
            {route.driver.isVerified && (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-[10px]">Verified</Badge>
            )}
          </div>
        )}

        {booking && !booking.cancelled && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-semibold">Booked · ${booking.price}</span>
            </div>
            {inWindow && (
              <div className="flex items-center gap-1 text-amber-400">
                <Clock className="h-3 w-3" />
                <span className="text-xs font-mono font-bold">{formatCountdown(countdown)}</span>
              </div>
            )}
          </div>
        )}
        {booking?.cancelled && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2 text-xs text-red-400 text-center">
            Cancelled
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ----- Page -----

export default function BackhaulBoard() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: profile } = useGetMyProfile();
  const isDriver = profile?.role === "driver" || profile?.role === "both";
  const isShipper = profile?.role === "shipper" || profile?.role === "both";

  const [filterOrigin, setFilterOrigin] = useState("all");
  const [filterDest, setFilterDest] = useState("all");
  const [postOpen, setPostOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<any | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ price: number; type: "accept" | "counter"; shipperData: ShipperBookingData } | null>(null);
  const [bookings, setBookings] = useState<Record<string, BookingState>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["backhaul", filterOrigin, filterDest],
    queryFn: () => fetchBackhaul(
      filterOrigin !== "all" ? filterOrigin : undefined,
      filterDest !== "all" ? filterDest : undefined,
    ),
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

  function handleAccept(data: ShipperBookingData) {
    if (!selectedRoute?.pricePerVehicle) return;
    setConfirmModal({ price: selectedRoute.pricePerVehicle, type: "accept", shipperData: data });
  }

  function handleCounter(price: number, data: ShipperBookingData) {
    setConfirmModal({ price, type: "counter", shipperData: data });
  }

  function handleConfirm() {
    if (!confirmModal || !selectedRoute) return;
    setBookings(prev => ({
      ...prev,
      [selectedRoute.id]: {
        price: confirmModal.price,
        confirmedAt: new Date(),
        cancelled: false,
        shipperData: confirmModal.shipperData,
      },
    }));
    setConfirmModal(null);
    toast({
      title: confirmModal.type === "accept" ? "Booking confirmed!" : "Counter offer submitted!",
      description: "You have 2 hours to cancel penalty-free.",
    });
  }

  function handleCancel() {
    if (!selectedRoute) return;
    setBookings(prev => ({
      ...prev,
      [selectedRoute.id]: { ...prev[selectedRoute.id], cancelled: true },
    }));
    toast({ title: "Booking cancelled", description: "Your cancellation has been recorded." });
  }

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
                          A 3% platform fee applies on the agreed bid amount upon acceptance. Matching shippers on your lane will be notified immediately.
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
            <div className="flex flex-wrap gap-3 mb-6">
              <Select value={filterOrigin} onValueChange={setFilterOrigin}>
                <SelectTrigger className="w-48 bg-slate-800/60 border-slate-700 text-white">
                  <SelectValue placeholder="Origin state…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All origins</SelectItem>
                  {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterDest} onValueChange={setFilterDest}>
                <SelectTrigger className="w-48 bg-slate-800/60 border-slate-700 text-white">
                  <SelectValue placeholder="Destination state…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All destinations</SelectItem>
                  {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {(filterOrigin !== "all" || filterDest !== "all") && (
                <Button variant="ghost" className="text-slate-400" onClick={() => { setFilterOrigin("all"); setFilterDest("all"); }}>Clear filters</Button>
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
                  <RouteCard
                    key={route.id}
                    route={route}
                    booking={bookings[route.id]}
                    onClick={() => setSelectedRoute(route)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedRoute && (
          <RouteDetailDialog
            route={selectedRoute}
            open={!!selectedRoute}
            onOpenChange={open => { if (!open) setSelectedRoute(null); }}
            booking={bookings[selectedRoute.id]}
            isShipper={isShipper}
            isDriver={isDriver}
            onAccept={handleAccept}
            onCounter={handleCounter}
            onCancel={handleCancel}
          />
        )}

        {confirmModal && (
          <ConfirmActionModal
            open={!!confirmModal}
            onOpenChange={open => { if (!open) setConfirmModal(null); }}
            price={confirmModal.price}
            type={confirmModal.type}
            onConfirm={handleConfirm}
          />
        )}
      </MainLayout>
    </AuthGuard>
  );
}
