import React, { useState, useEffect, useRef, Component } from "react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  MapPin, ArrowRight, DollarSign, Users, Calendar, Truck, User,
  Clock, CheckCircle2, XCircle, AlertCircle, ChevronLeft, Plus, Pencil, Trash2,
} from "lucide-react";

// ---------- UI primitives (project's shadcn wrappers) ----------
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";   // returns { data: currentUser }
import { Layout } from "@/components/Layout";

// ---------- Constants ----------
const API_BASE = "https://karhaul-production.up.railway.app/api";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

const LOCATION_TYPES = [
  { value: "residential", label: "Residential" },
  { value: "dealer",      label: "Auto Dealer / Lot" },
  { value: "auction",     label: "Auction House" },
  { value: "port",        label: "Port / Marine Terminal" },
];

// ---------- Auth helper ----------
async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await (window as any).Clerk?.session?.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---------- API functions ----------
async function fetchRoutes(originState?: string, destState?: string) {
  const params = new URLSearchParams();
  if (originState) params.set("originState", originState);
  if (destState)   params.set("destinationState", destState);
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/backhaul?${params}`, { credentials: "include", headers });
  return res.json();
}

async function postRoute(data: PostRouteFormValues) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/backhaul`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to post route");
  }
  return res.json();
}

async function deleteDriverRoute(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/driver-routes/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to delete route");
  }
  return res.json().catch(() => ({}));
}

// ---------- Schemas ----------
const postRouteSchema = z.object({
  originCity:      z.string().min(2, "City required"),
  originState:     z.string().length(2, "2-letter state code"),
  destinationCity: z.string().min(2, "City required"),
  destinationState:z.string().length(2, "2-letter state code"),
  departureDateFrom: z.string().min(1, "Date required"),
  departureDateTo:   z.string().min(1, "Date required"),
  availableSpots:  z.coerce.number().min(1).max(20),
  transportType:   z.enum(["open", "enclosed"]),
  pricePerVehicle: z.coerce.number().optional(),
  notes:           z.string().optional(),
});
type PostRouteFormValues = z.infer<typeof postRouteSchema>;

const shipperBookingSchema = z.object({
  originStreet:            z.string().min(3, "Street address required"),
  originCity:              z.string().min(2, "City required"),
  originState:             z.string().length(2, "2-letter state"),
  originZip:               z.string().regex(/^\d{5}$/, "5-digit ZIP required"),
  originLocationType:      z.enum(["residential","dealer","auction","port"], { required_error: "Select a location type" }),
  destinationStreet:       z.string().min(3, "Street address required"),
  destinationCity:         z.string().min(2, "City required"),
  destinationState:        z.string().length(2, "2-letter state"),
  destinationZip:          z.string().regex(/^\d{5}$/, "5-digit ZIP required"),
  destinationLocationType: z.enum(["residential","dealer","auction","port"], { required_error: "Select a location type" }),
  vehicleYear:  z.coerce.number({ invalid_type_error: "Year required" }).min(1900).max(new Date().getFullYear() + 1),
  vehicleMake:  z.string().min(1, "Make required"),
  vehicleModel: z.string().min(1, "Model required"),
  vin:          z.string().length(17, "VIN must be exactly 17 characters"),
});
type ShipperBookingValues = z.infer<typeof shipperBookingSchema>;

// ---------- Types ----------
interface DriverRoute {
  id: string;
  driverId: string;
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  departureDateFrom: string;
  departureDateTo: string;
  availableSpots: number;
  transportType: string;
  pricePerVehicle: number | null;
  notes: string | null;
  driver?: {
    id: string;
    authId: string;
    firstName: string;
    lastName: string;
    isVerified: boolean;
  };
}

interface BookingState {
  status: "shipper_pending" | "confirmed" | "declined" | "cancelled";
  price: number;
  shipperData?: ShipperBookingValues;
  confirmedAt?: Date;
}

interface ConfirmationState {
  price: number;
  type: "accept" | "counter";
  party: "shipper" | "driver";
  shipperData?: ShipperBookingValues;
}

// ---------- Countdown hook ----------
function useCountdown(from: Date | null | undefined): number {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (!from) { setMs(0); return; }
    const tick = () => {
      const end = new Date(from).getTime() + 2 * 60 * 60 * 1000;
      setMs(Math.max(0, end - Date.now()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [from]);
  return ms;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Expired";
  const s   = Math.floor(ms / 1000);
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}

function locationTypeLabel(val: string): string {
  return LOCATION_TYPES.find(t => t.value === val)?.label ?? val;
}

// ---------- Small UI helpers ----------
function SectionHeader({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-3.5 w-3.5 text-amber-400" />
      <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{children}</span>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200 font-medium">{value}</span>
    </div>
  );
}

// ---------- NHTSA autocomplete ----------
function AutocompleteInput({
  value, onChange, suggestions, placeholder, className,
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtered = value.trim().length > 0
    ? suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase())).slice(0, 8)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { if (filtered.length > 0) setOpen(true); }}
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

// ---------- Payment & cancellation notice ----------
function PaymentNotice({ isShipper }: { isShipper: boolean }) {
  return (
    <div className="rounded-xl border border-slate-700/40 bg-slate-800/30 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400 leading-relaxed">
          <strong className="text-slate-300">KarHaul does not process transport payments.</strong>{" "}
          Pay directly — cash, Zelle, Venmo, etc.
        </p>
      </div>
      <div className="pt-2 border-t border-slate-700/40 space-y-1.5 text-xs text-slate-400 leading-relaxed">
        <p>
          You have a <strong className="text-slate-300">2-hour window</strong> to cancel
          penalty-free. After that, your escrow fee is forfeited.
        </p>
        {isShipper ? (
          <p>If your vehicle is not accessible at pickup, your escrow fee is forfeited.</p>
        ) : (
          <p>If you no-show at the pickup location, your escrow fee is forfeited.</p>
        )}
      </div>
    </div>
  );
}

// ---------- Confirmation modal ----------
function ConfirmationModal({
  open, onOpenChange, price, type, party, onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  price: number;
  type: "accept" | "counter";
  party: "shipper" | "driver";
  onConfirm: () => void;
}) {
  const fee = price * 0.05;
  const title =
    type === "accept"
      ? party === "shipper" ? "Confirm Booking Request" : "Confirm Transport Acceptance"
      : "Submit Counter Offer";
  const description =
    type === "accept"
      ? party === "shipper"
        ? "You're requesting transport at the driver's listed price. The driver will review and confirm."
        : "You're accepting this shipment. Both parties are now confirmed."
      : party === "shipper"
        ? "You're proposing a different price. The driver will be notified to review."
        : "You're proposing a different price. This will lock in as the agreed price.";
  const ctaLabel =
    type === "accept" ? (party === "shipper" ? "Send Request" : "Confirm Acceptance") : "Submit Counter";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-amber-400" />
            </div>
            <DialogTitle className="text-white text-lg">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-slate-400 text-sm leading-relaxed">
            {description}
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
            A 5% platform fee on the final agreed bid is held in escrow at booking confirmation.
            You have 2 hours after mutual acceptance to cancel penalty-free.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => onOpenChange(false)}>
            Go Back
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold border-0" onClick={onConfirm}>
            {ctaLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Confirmed booking (post-acceptance) ----------
function ConfirmedBooking({
  booking, onCancel, isShipper,
}: {
  booking: BookingState;
  onCancel: () => void;
  isShipper: boolean;
}) {
  const ms = useCountdown(booking.confirmedAt);
  const inWindow = ms > 0;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
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
            <div className="text-xs text-amber-300/70 font-bold uppercase tracking-widest mb-0.5">
              Cancellation Window
            </div>
            <div className="text-2xl font-mono font-bold text-amber-400 leading-none">
              {formatCountdown(ms)}
            </div>
            <div className="text-xs text-amber-300/70 mt-0.5">remaining to cancel penalty-free</div>
          </div>
        </div>
      )}

      <Button
        variant="outline"
        className="w-full border-red-500/40 text-red-400 hover:bg-red-500/10"
        onClick={onCancel}
      >
        <XCircle className="h-4 w-4 mr-2" />
        Cancel Booking{!inWindow ? " (escrow forfeited)" : ""}
      </Button>

      <PaymentNotice isShipper={isShipper} />
    </div>
  );
}

// ---------- Shipper awaiting driver response ----------
function ShipperWaiting({ booking }: { booking: BookingState }) {
  const d = booking.shipperData!;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-semibold text-blue-300">Awaiting Driver Response</span>
        </div>
        <p className="text-xs text-blue-300/80 leading-relaxed">
          Your request was sent at{" "}
          <strong className="text-blue-200">${booking.price}/vehicle</strong>.
          The driver will accept, counter, or decline.
        </p>
      </div>

      <div>
        <SectionHeader icon={Truck}>Your Submitted Vehicle</SectionHeader>
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-3 space-y-1.5">
          <DetailRow label="Year / Make / Model" value={`${d.vehicleYear} ${d.vehicleMake} ${d.vehicleModel}`} />
          <DetailRow label="VIN" value={d.vin} />
        </div>
      </div>

      <div>
        <SectionHeader icon={MapPin}>Pickup</SectionHeader>
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-3 space-y-1.5">
          <DetailRow label="Address" value={`${d.originStreet}, ${d.originCity}, ${d.originState} ${d.originZip}`} />
          <DetailRow label="Type" value={locationTypeLabel(d.originLocationType)} />
        </div>
      </div>

      <div>
        <SectionHeader icon={MapPin}>Delivery</SectionHeader>
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-3 space-y-1.5">
          <DetailRow label="Address" value={`${d.destinationStreet}, ${d.destinationCity}, ${d.destinationState} ${d.destinationZip}`} />
          <DetailRow label="Type" value={locationTypeLabel(d.destinationLocationType)} />
        </div>
      </div>

      <PaymentNotice isShipper={true} />
    </div>
  );
}

// ---------- Driver incoming request view ----------
function DriverIncomingRequest({
  booking, onAccept, onCounter, onDecline,
}: {
  booking: BookingState;
  onAccept: () => void;
  onCounter: (price: number) => void;
  onDecline: () => void;
}) {
  const [showCounter, setShowCounter] = useState(false);
  const [counterVal, setCounterVal] = useState("");
  const d = booking.shipperData!;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
        <p className="text-xs text-amber-300 leading-relaxed">
          A shipper wants to ship their vehicle on your route at{" "}
          <strong className="text-amber-200">${booking.price}/vehicle</strong>.
        </p>
      </div>

      <div>
        <SectionHeader icon={Truck}>Vehicle to Transport</SectionHeader>
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-3 space-y-1.5">
          <DetailRow label="Year / Make / Model" value={`${d.vehicleYear} ${d.vehicleMake} ${d.vehicleModel}`} />
          <DetailRow label="VIN" value={d.vin} />
        </div>
      </div>

      <div>
        <SectionHeader icon={MapPin}>Pickup Location</SectionHeader>
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-3 space-y-1.5">
          <DetailRow label="Street" value={d.originStreet} />
          <DetailRow label="City / State / ZIP" value={`${d.originCity}, ${d.originState} ${d.originZip}`} />
          <DetailRow label="Type" value={locationTypeLabel(d.originLocationType)} />
        </div>
      </div>

      <div>
        <SectionHeader icon={MapPin}>Delivery Location</SectionHeader>
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-3 space-y-1.5">
          <DetailRow label="Street" value={d.destinationStreet} />
          <DetailRow label="City / State / ZIP" value={`${d.destinationCity}, ${d.destinationState} ${d.destinationZip}`} />
          <DetailRow label="Type" value={locationTypeLabel(d.destinationLocationType)} />
        </div>
      </div>

      <div className="space-y-2 pt-1">
        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold border-0 h-11"
          onClick={onAccept}
        >
          Accept — ${booking.price}/vehicle
        </Button>

        {showCounter ? (
          <div className="space-y-2">
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="number"
                placeholder="Your price per vehicle…"
                value={counterVal}
                onChange={e => setCounterVal(e.target.value)}
                className="bg-slate-800/60 border-slate-700 text-white h-11 pl-9 focus:border-blue-500 placeholder:text-slate-600"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 text-slate-400 hover:text-white" onClick={() => { setShowCounter(false); setCounterVal(""); }}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold border-0"
                disabled={!counterVal || Number(counterVal) <= 0}
                onClick={() => { onCounter(Number(counterVal)); setShowCounter(false); setCounterVal(""); }}
              >
                Submit Counter
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-800 h-11" onClick={() => setShowCounter(true)}>
            Counter Offer
          </Button>
        )}

        <Button variant="outline" className="w-full border-red-500/40 text-red-400 hover:bg-red-500/10 h-11" onClick={onDecline}>
          Decline Request
        </Button>
      </div>

      <PaymentNotice isShipper={false} />
    </div>
  );
}

// ---------- Error boundary ----------
class BookingFormErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: false };
  }
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300 leading-relaxed">
          Something went wrong loading the booking form. Please close this dialog and try again.
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------- Shipper booking form ----------
function ShipperBookingForm({
  route, onAccept, onCounter,
}: {
  route: DriverRoute;
  onAccept: (data: ShipperBookingValues) => void;
  onCounter: (price: number, data: ShipperBookingValues) => void;
}) {
  const [showCounter, setShowCounter] = useState(false);
  const [counterVal, setCounterVal] = useState("");

  const form = useForm<ShipperBookingValues>({
    resolver: zodResolver(shipperBookingSchema),
    defaultValues: {
      originStreet: "",
      originCity: "",
      originState: "",
      originZip: "",
      originLocationType: undefined,
      destinationStreet: "",
      destinationCity: "",
      destinationState: "",
      destinationZip: "",
      destinationLocationType: undefined,
      vehicleYear: new Date().getFullYear(),
      vehicleMake: "",
      vehicleModel: "",
      vin: "",
    },
  });

  const vehicleMake = form.watch("vehicleMake") ?? "";

  const { data: makes = [] } = useQuery<string[]>({
    queryKey: ["nhtsa-makes"],
    queryFn: async () => {
      try {
        const res = await fetch("https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/car?format=json");
        const json = await res.json();
        return json.Results.map((r: any) => r.MakeName).sort();
      } catch { return []; }
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
    throwOnError: false,
  });

  const { data: models = [] } = useQuery<string[]>({
    queryKey: ["nhtsa-models", vehicleMake],
    queryFn: async () => {
      try {
        const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/${encodeURIComponent(vehicleMake)}?format=json`);
        const json = await res.json();
        return [...new Set(json.Results.map((r: any) => r.Model_Name) as string[])].sort();
      } catch { return []; }
    },
    enabled: vehicleMake.trim().length >= 2,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
    throwOnError: false,
  });

  const fieldCls = "bg-slate-800/60 border-slate-700 text-white h-10 focus:border-blue-500 placeholder:text-slate-600 text-sm";

  async function handleAccept() {
    const valid = await form.trigger();
    if (valid) onAccept(form.getValues());
  }

  async function handleCounter() {
    const valid = await form.trigger();
    if (!valid) return;
    if (!counterVal || Number(counterVal) <= 0) return;
    onCounter(Number(counterVal), form.getValues());
    setShowCounter(false);
    setCounterVal("");
  }

  return (
    <Form {...form}>
      <div className="space-y-5">
        {/* Pickup */}
        <div>
          <SectionHeader icon={MapPin}>Pickup Location</SectionHeader>
          <div className="space-y-2.5">
            <FormField
              control={form.control}
              name="originStreet"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-slate-400">Street Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St" {...field} className={fieldCls} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name="originCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-400">City</FormLabel>
                      <FormControl>
                        <Input placeholder="Chicago" {...field} className={fieldCls} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="originState"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-slate-400">State</FormLabel>
                    <FormControl>
                      <Input placeholder="IL" maxLength={2} {...field} className={`${fieldCls} uppercase`} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="originZip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-slate-400">ZIP</FormLabel>
                    <FormControl>
                      <Input placeholder="60601" maxLength={5} {...field} className={fieldCls} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>
            {/* ✅ FIX: FormControl wraps Select (not inside it) */}
            <FormField
              control={form.control}
              name="originLocationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-slate-400">Location Type</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className={fieldCls}>
                        <SelectValue placeholder="Select type…" />
                      </SelectTrigger>
                      <SelectContent>
                        {LOCATION_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Delivery */}
        <div>
          <SectionHeader icon={MapPin}>Delivery Location</SectionHeader>
          <div className="space-y-2.5">
            <FormField
              control={form.control}
              name="destinationStreet"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-slate-400">Street Address</FormLabel>
                  <FormControl>
                    <Input placeholder="456 Oak Ave" {...field} className={fieldCls} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name="destinationCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-400">City</FormLabel>
                      <FormControl>
                        <Input placeholder="Atlanta" {...field} className={fieldCls} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="destinationState"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-slate-400">State</FormLabel>
                    <FormControl>
                      <Input placeholder="GA" maxLength={2} {...field} className={`${fieldCls} uppercase`} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="destinationZip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-slate-400">ZIP</FormLabel>
                    <FormControl>
                      <Input placeholder="30301" maxLength={5} {...field} className={fieldCls} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>
            {/* ✅ FIX: FormControl wraps Select */}
            <FormField
              control={form.control}
              name="destinationLocationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-slate-400">Location Type</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className={fieldCls}>
                        <SelectValue placeholder="Select type…" />
                      </SelectTrigger>
                      <SelectContent>
                        {LOCATION_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Vehicle */}
        <div>
          <SectionHeader icon={Truck}>Vehicle</SectionHeader>
          <div className="space-y-2.5">
            <div className="grid grid-cols-3 gap-2">
              <FormField
                control={form.control}
                name="vehicleYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-slate-400">Year</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="2019" {...field} className={fieldCls} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <div className="col
