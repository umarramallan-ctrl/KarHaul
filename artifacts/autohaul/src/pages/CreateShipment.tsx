import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/AuthGuard";
import { useCreateShipment } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Car, MapPin, DollarSign, Truck, AlertTriangle, Home, Building2, Anchor, ShieldAlert, Warehouse, PlaneTakeoff, HelpCircle, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { EscrowConfirmModal } from "@/components/EscrowConfirmModal";
import { apiBase } from "@/lib/api";
import { motion } from "framer-motion";
import { InviteDriversModal } from "@/components/InviteDriversModal";

type ShipmentVehicleType = "sedan" | "suv" | "truck" | "van" | "motorcycle" | "rv" | "exotic" | "other";
type ShipmentVehicleCondition = "running" | "non_running" | "starts_does_not_drive";

const VEHICLE_TYPES: { value: ShipmentVehicleType; label: string }[] = [
  { value: "sedan", label: "Sedan" },
  { value: "suv", label: "SUV" },
  { value: "truck", label: "Truck" },
  { value: "van", label: "Van" },
  { value: "motorcycle", label: "Motorcycle" },
  { value: "rv", label: "RV" },
  { value: "exotic", label: "Exotic" },
  { value: "other", label: "Other" },
];
type ShipmentTransportType = "open" | "enclosed";

const LOCATION_TYPES = [
  { value: "residential", label: "Residential Address", icon: Home, description: "Private home or apartment. Carriers should confirm truck access before arrival.", warning: null },
  { value: "dealer", label: "Auto Dealer / Lot", icon: Building2, description: "Commercial dealer location. Standard truck access, confirm lot hours.", warning: null },
  { value: "auction", label: "Auto Auction House", icon: Building2, description: "Auction facility. Bring release paperwork confirming vehicle is paid and cleared.", warning: "Auction release required" },
  { value: "port", label: "Port / Marine Terminal", icon: Anchor, description: "Seaport or marine terminal. TWIC card is federally required for entry.", warning: "TWIC card required" },
  { value: "military", label: "Military Base", icon: ShieldAlert, description: "Government military facility. Government-issued ID required.", warning: "Gov. ID + escort required" },
  { value: "storage", label: "Storage Facility", icon: Warehouse, description: "Storage lot or impound. Confirm gate access and road weight limits.", warning: null },
  { value: "airport", label: "Airport / Airfield", icon: PlaneTakeoff, description: "Airport cargo area. Confirm access permissions in advance.", warning: "Access pre-approval needed" },
  { value: "other", label: "Other / Not Specified", icon: HelpCircle, description: "Provide details in the notes field.", warning: null },
];

const formSchema = z.object({
  vehicleYear: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
  vehicleMake: z.string().min(2, "Make is required"),
  vehicleModel: z.string().min(1, "Model is required"),
  vehicleType: z.enum(["sedan", "suv", "truck", "van", "motorcycle", "rv", "exotic", "other"]),
  vehicleCondition: z.enum(["running", "non_running", "starts_does_not_drive"]),
  vin: z.string().regex(/^[A-HJ-NPR-Z0-9]{17}$/i, "VIN must be exactly 17 alphanumeric characters (no I, O, Q)"),
  transportType: z.enum(["open", "enclosed"]),
  serviceType: z.enum(["door_to_door", "door_to_port"]).optional(),
  originStreet: z.string().min(3, "Street address is required"),
  originCity: z.string().min(2, "City is required"),
  originState: z.string().length(2, "Use 2-letter state code"),
  originZip: z.string().min(5, "ZIP required"),
  pickupLocationType: z.string().optional(),
  destinationStreet: z.string().min(3, "Street address is required"),
  destinationCity: z.string().min(2, "City is required"),
  destinationState: z.string().length(2, "Use 2-letter state code"),
  destinationZip: z.string().min(5, "ZIP required"),
  deliveryLocationType: z.string().optional(),
  pickupDateFrom: z.string().optional(),
  pickupDateTo: z.string().optional(),
  budgetMin: z.coerce.number().optional(),
  budgetMax: z.coerce.number().optional(),
  notes: z.string().optional(),
  agreeToTerms: z.boolean().refine(val => val === true, { message: "You must agree to the liability waiver" }),
});

// --- NHTSA Vehicle Make/Model Autocomplete ---

interface AutocompleteInputProps {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder: string;
  className?: string;
}

function AutocompleteInput({ value, onChange, suggestions, placeholder, className }: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const safeValue = value ?? "";

  const filtered = safeValue.trim().length > 0
    ? suggestions.filter(s => s.toLowerCase().includes(safeValue.toLowerCase())).slice(0, 8)
    : [];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

// -----------------------------------------------

function LocationTypeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const selected = LOCATION_TYPES.find(lt => lt.value === value);
  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-slate-800/60 border-slate-700 text-white h-11 focus:border-blue-500">
          <SelectValue placeholder="Select location type…" />
        </SelectTrigger>
        <SelectContent>
          {LOCATION_TYPES.map(lt => {
            const Icon = lt.icon;
            return (
              <SelectItem key={lt.value} value={lt.value}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span>{lt.label}</span>
                  {lt.warning && <span className="ml-1 text-xs text-amber-400 font-medium">({lt.warning})</span>}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {selected && selected.value !== "other" && (
        <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs border ${selected.warning ? "bg-amber-500/8 border-amber-500/20 text-amber-300" : "bg-slate-800/40 border-slate-700/60 text-slate-500"}`}>
          {selected.warning ? <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> : <selected.icon className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
          <span>{selected.description}</span>
        </div>
      )}
    </div>
  );
}

const STEPS = [
  { num: 1, label: "Vehicle", icon: Car },
  { num: 2, label: "Route", icon: MapPin },
  { num: 3, label: "Details", icon: DollarSign },
];

export default function CreateShipment() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { getToken } = useAuth();
  const createMutation = useCreateShipment();
  // Check for invited driver from Saved Drivers page
  const inviteDriverId = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("inviteDriver");
  const inviteDriverName = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("driverName");
  const [step, setStep] = useState(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<z.infer<typeof formSchema> | null>(null);
  const [postedShipmentId, setPostedShipmentId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);

  const { data: savedDriversData } = useQuery({
    queryKey: ["saved-drivers"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${apiBase}/users/saved-drivers`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return { savedDrivers: [] };
      try {
        return await res.json();
      } catch {
        return { savedDrivers: [] };
      }
    },
  });
  const savedDrivers = (savedDriversData?.savedDrivers || []) as Array<{ driver: { id: string; firstName: string; lastName: string; averageRating?: number; completedJobs?: number } }>;

  const inviteMutation = useMutation({
    mutationFn: async ({ shipmentId, driverIds }: { shipmentId: string; driverIds: string[] }) => {
      const token = await getToken();
      const res = await fetch(`${apiBase}/shipments/${shipmentId}/invite-drivers`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ driverIds }),
      });
      return res.json();
    },
    onSettled: (_, __, { shipmentId }) => {
      setInviteOpen(false);
      setLocation(`/shipments/${shipmentId}`);
    },
  });

  // AI budget suggestion — fires when step 3 is reached
  const watchedOriginState = form.watch("originState");
  const watchedDestState = form.watch("destinationState");
  const watchedMakeForBudget = form.watch("vehicleMake");
  const watchedYear = form.watch("vehicleYear");
  const watchedTransport = form.watch("transportType");

  const { data: budgetSuggestion, isFetching: budgetFetching } = useQuery({
    queryKey: ["budget-suggest", watchedMakeForBudget, watchedOriginState, watchedDestState, watchedYear, watchedTransport],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${apiBase}/ai/budget-suggest`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          vehicleYear: form.getValues("vehicleYear"),
          vehicleMake: form.getValues("vehicleMake"),
          vehicleModel: form.getValues("vehicleModel"),
          vehicleType: form.getValues("vehicleType"),
          vehicleCondition: form.getValues("vehicleCondition"),
          transportType: form.getValues("transportType"),
          originCity: form.getValues("originCity"),
          originState: watchedOriginState,
          destinationCity: form.getValues("destinationCity"),
          destinationState: watchedDestState,
        }),
      });
      return res.json();
    },
    enabled: step === 3 && !!watchedMakeForBudget && !!watchedOriginState && !!watchedDestState,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch car makes from NHTSA (no form dependency)
  const { data: nhtsaMakes = [] } = useQuery({
    queryKey: ["nhtsa-makes"],
    queryFn: async () => {
      const res = await fetch("https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/car?format=json");
      const data = await res.json();
      return (data.Results as Array<{ MakeId: number; MakeName: string }>)
        .map(m => m.MakeName)
        .sort();
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { vehicleYear: undefined as any, vehicleMake: "", vehicleModel: "", vehicleType: "sedan", vehicleCondition: "running", transportType: "open", agreeToTerms: false },
  });

  const watchedMake = form.watch("vehicleMake");

  // Fetch models for the selected make from NHTSA
  const { data: nhtsaModels = [] } = useQuery({
    queryKey: ["nhtsa-models", watchedMake],
    queryFn: async () => {
      const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/${encodeURIComponent(watchedMake)}?format=json`);
      const data = await res.json();
      return [...new Set((data.Results as Array<{ Model_Name: string }>).map(m => m.Model_Name))].sort() as string[];
    },
    enabled: watchedMake.trim().length >= 2,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    setPendingValues(values);
    setConfirmOpen(true);
  }

  function confirmPost() {
    if (!pendingValues) return;
    const { agreeToTerms, ...apiData } = pendingValues;
    createMutation.mutate({ data: apiData as any }, {
      onSuccess: (data) => {
        setConfirmOpen(false);
        if (savedDrivers.length > 0) {
          setPostedShipmentId(data.id);
          setSelectedDriverIds([]);
          setInviteOpen(true);
          toast({ title: "Load Posted!", description: "Invite your saved drivers for first look." });
        } else {
          toast({ title: "Load Posted!", description: "Drivers can now bid on your shipment." });
          setLocation(`/shipments/${data.id}`);
        }
      },
      onError: (err: any) => {
        setConfirmOpen(false);
        toast({ title: "Failed to post load", description: err.message, variant: "destructive" });
      },
    });
  }

  const pendingBudgetMax = pendingValues?.budgetMax ?? 0;
  const shipperFee = parseFloat((pendingBudgetMax * 0.05).toFixed(2));

  const nextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (step === 1) fieldsToValidate = ["vehicleYear", "vehicleMake", "vehicleModel", "vehicleType", "vehicleCondition", "vin"];
    if (step === 2) fieldsToValidate = ["originStreet", "originCity", "originState", "originZip", "destinationStreet", "destinationCity", "destinationState", "destinationZip"];
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) setStep(step + 1);
  };

  const inputCls = "bg-slate-800/60 border-slate-700 text-white h-11 focus:border-blue-500 placeholder:text-slate-600";

  return (
    <AuthGuard requireRole="shipper">
      <MainLayout>
        <div className="bg-slate-950 border-b border-slate-800/60 py-14">
          <div className="container mx-auto px-4 md:px-8">
            <button onClick={() => window.history.back()} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6 -ml-1 group">
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              Back
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8 bg-blue-500" />
              <span className="text-blue-400 font-mono text-xs font-bold tracking-[0.2em] uppercase">Post a Load</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tight mb-2">Post a Vehicle for Transport</h1>
            <p className="text-slate-400">Get direct bids from verified carriers. Zero broker fees.</p>
          </div>
        </div>

        <div className="bg-slate-950 min-h-screen">
          <div className="container max-w-2xl mx-auto px-4 md:px-8 py-10">
            {/* Stepper */}
            <div className="flex items-center mb-10 relative">
              <div className="absolute top-5 left-5 right-5 h-px bg-slate-800" />
              <div className="absolute top-5 left-5 h-px bg-blue-600 transition-all duration-500"
                style={{ width: `calc(${((step - 1) / 2) * 100}% - 0px)`, right: "auto" }} />
              {STEPS.map((s) => {
                const Icon = s.icon;
                const done = step > s.num;
                const active = step === s.num;
                return (
                  <div key={s.num} className="flex-1 flex justify-center relative z-10">
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                        done ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-600/30" :
                        active ? "bg-slate-900 border-blue-500 shadow-lg shadow-blue-500/20" :
                        "bg-slate-900 border-slate-800"
                      }`}>
                        {done ? <Check className="h-4 w-4 text-white" /> : <Icon className={`h-4 w-4 ${active ? "text-blue-400" : "text-slate-600"}`} />}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${active ? "text-blue-400" : done ? "text-white" : "text-slate-600"}`}>{s.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Form card */}
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 overflow-hidden">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>

                  {/* Step 1 — Vehicle */}
                  {step === 1 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-6 space-y-5">
                      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800/60">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                          <Car className="h-4 w-4 text-blue-400" />
                        </div>
                        <h2 className="font-bold text-white">Vehicle Information</h2>
                      </div>
                      {inviteDriverId && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-center gap-3">
                          <span className="text-amber-400 text-lg">⭐</span>
                          <p className="text-sm text-amber-200">
                            <strong>{inviteDriverName || "Your saved driver"}</strong> will be notified when this load is posted and invited to bid directly.
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-4">
                        <FormField control={form.control} name="vehicleYear" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Year</FormLabel>
                            <FormControl><Input type="number" placeholder="2023" {...field} className={inputCls} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="vehicleMake" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Make</FormLabel>
                            <FormControl>
                              <AutocompleteInput
                                value={field.value}
                                onChange={v => { field.onChange(v); form.setValue("vehicleModel", ""); }}
                                suggestions={nhtsaMakes}
                                placeholder="Ford, Toyota…"
                                className={inputCls}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="vehicleModel" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Model</FormLabel>
                            <FormControl>
                              <AutocompleteInput
                                value={field.value}
                                onChange={field.onChange}
                                suggestions={nhtsaModels}
                                placeholder="F-150, Camry…"
                                className={inputCls}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="vehicleType" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vehicle Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger className={inputCls}><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                {VEHICLE_TYPES.map(({ value, label }) => (
                                  <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="vehicleCondition" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Condition</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger className={inputCls}><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="running">Runs & Drives</SelectItem>
                                <SelectItem value="starts_does_not_drive">Starts But Does Not Drive</SelectItem>
                                <SelectItem value="non_running">Inoperable (INOP)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription className="text-xs text-slate-600">INOP vehicles cost more — requires special equipment.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <FormField control={form.control} name="vin" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">VIN *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="17-character VIN"
                              {...field}
                              className={`${inputCls} uppercase tracking-widest font-mono`}
                              maxLength={17}
                              onChange={e => field.onChange(e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, ""))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="button" className="w-full h-11 font-bold bg-blue-600 hover:bg-blue-500 border-0 text-white mt-2" onClick={nextStep}>
                        Continue to Route <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </motion.div>
                  )}

                  {/* Step 2 — Route */}
                  {step === 2 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-6 space-y-6">
                      <div className="flex items-center gap-3 mb-2 pb-4 border-b border-slate-800/60">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                          <MapPin className="h-4 w-4 text-blue-400" />
                        </div>
                        <h2 className="font-bold text-white">Pickup & Delivery Route</h2>
                      </div>
                      {/* Pickup */}
                      <div className="rounded-xl border border-slate-800/60 bg-slate-800/20 p-5 relative">
                        <div className="absolute -left-3 top-5 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-blue-600/30">A</div>
                        <h3 className="font-semibold text-white text-sm mb-4">Pickup Location</h3>
                        <div className="mb-3">
                          <FormField control={form.control} name="originStreet" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Street Address</FormLabel>
                              <FormControl><Input placeholder="123 Main St" {...field} className={inputCls} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <div className="grid grid-cols-12 gap-3 mb-4">
                          <FormField control={form.control} name="originCity" render={({ field }) => (
                            <FormItem className="col-span-12 md:col-span-6">
                              <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">City</FormLabel>
                              <FormControl><Input placeholder="Miami" {...field} className={inputCls} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="originState" render={({ field }) => (
                            <FormItem className="col-span-6 md:col-span-3">
                              <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">State</FormLabel>
                              <FormControl><Input placeholder="FL" maxLength={2} className={`${inputCls} uppercase`} {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="originZip" render={({ field }) => (
                            <FormItem className="col-span-6 md:col-span-3">
                              <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ZIP</FormLabel>
                              <FormControl><Input placeholder="33101" {...field} className={inputCls} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <FormField control={form.control} name="pickupLocationType" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Location Type</FormLabel>
                            <FormControl><LocationTypeSelector value={field.value || ""} onChange={field.onChange} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <div className="flex justify-center py-1">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                          <Truck className="h-4 w-4 text-slate-500" />
                        </div>
                      </div>

                      {/* Delivery */}
                      <div className="rounded-xl border border-slate-800/60 bg-slate-800/20 p-5 relative">
                        <div className="absolute -left-3 top-5 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-slate-900 font-bold text-xs shadow-lg shadow-amber-500/30">B</div>
                        <h3 className="font-semibold text-white text-sm mb-4">Delivery Location</h3>
                        <div className="mb-3">
                          <FormField control={form.control} name="destinationStreet" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Street Address</FormLabel>
                              <FormControl><Input placeholder="456 Oak Ave" {...field} className={inputCls} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <div className="grid grid-cols-12 gap-3 mb-4">
                          <FormField control={form.control} name="destinationCity" render={({ field }) => (
                            <FormItem className="col-span-12 md:col-span-6">
                              <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">City</FormLabel>
                              <FormControl><Input placeholder="Los Angeles" {...field} className={inputCls} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="destinationState" render={({ field }) => (
                            <FormItem className="col-span-6 md:col-span-3">
                              <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">State</FormLabel>
                              <FormControl><Input placeholder="CA" maxLength={2} className={`${inputCls} uppercase`} {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="destinationZip" render={({ field }) => (
                            <FormItem className="col-span-6 md:col-span-3">
                              <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ZIP</FormLabel>
                              <FormControl><Input placeholder="90001" {...field} className={inputCls} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <FormField control={form.control} name="deliveryLocationType" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Location Type</FormLabel>
                            <FormControl><LocationTypeSelector value={field.value || ""} onChange={field.onChange} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" className="w-1/3 border-slate-700 text-slate-300 hover:bg-slate-800 h-11" onClick={() => setStep(1)}>Back</Button>
                        <Button type="button" className="w-2/3 h-11 font-bold bg-blue-600 hover:bg-blue-500 border-0 text-white" onClick={nextStep}>
                          Continue to Details <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3 — Details */}
                  {step === 3 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-6 space-y-6">
                      <div className="flex items-center gap-3 mb-2 pb-4 border-b border-slate-800/60">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                          <DollarSign className="h-4 w-4 text-blue-400" />
                        </div>
                        <h2 className="font-bold text-white">Logistics & Pricing</h2>
                      </div>

                      {/* Carrier type */}
                      <FormField control={form.control} name="transportType" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Trailer Type</FormLabel>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { val: "open", title: "Open Carrier", desc: "Standard. Exposed to elements. Most affordable." },
                              { val: "enclosed", title: "Enclosed Carrier", desc: "Fully covered. Classic/luxury vehicles. ~40% more." },
                            ].map(({ val, title, desc }) => (
                              <button key={val} type="button"
                                className={`text-left rounded-xl p-4 border-2 transition-all ${field.value === val ? "border-blue-500 bg-blue-500/10" : "border-slate-800 bg-slate-800/30 hover:border-slate-700"}`}
                                onClick={() => field.onChange(val)}>
                                <h4 className="font-bold text-white text-sm mb-1">{title}</h4>
                                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                              </button>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {/* Service type */}
                      <FormField control={form.control} name="serviceType" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Service Type (optional)</FormLabel>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { val: "door_to_door", title: "Door to Door", desc: "Pickup and delivery directly at your addresses." },
                              { val: "door_to_port", title: "Door to Port", desc: "Pickup at your address, delivery to a port terminal." },
                            ].map(({ val, title, desc }) => (
                              <button key={val} type="button"
                                className={`text-left rounded-xl p-4 border-2 transition-all ${field.value === val ? "border-blue-500 bg-blue-500/10" : "border-slate-800 bg-slate-800/30 hover:border-slate-700"}`}
                                onClick={() => field.onChange(val)}>
                                <h4 className="font-bold text-white text-sm mb-1">{title}</h4>
                                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                              </button>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {/* Dates */}
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/60">
                        {[
                          { name: "pickupDateFrom" as const, label: "Earliest Pickup" },
                          { name: "pickupDateTo" as const, label: "Latest Pickup" },
                        ].map(({ name, label }) => (
                          <FormField key={name} control={form.control} name={name} render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</FormLabel>
                              <FormControl><Input type="date" {...field} className={inputCls} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        ))}
                      </div>

                      {/* Budget */}
                      <div className="pt-2 border-t border-slate-800/60">
                        <FormField control={form.control} name="budgetMax" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Maximum Budget ($)</FormLabel>
                            <FormControl><Input type="number" placeholder="800" {...field} className={inputCls} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        {budgetFetching && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                            <div className="h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            Getting AI price suggestion…
                          </div>
                        )}
                        {!budgetFetching && budgetSuggestion?.min && budgetSuggestion?.max && (
                          <div className="mt-2 rounded-xl border border-blue-500/30 bg-blue-500/8 px-4 py-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-blue-400 text-xs font-bold uppercase tracking-widest">AI Estimate</span>
                            </div>
                            <p className="text-white font-semibold">${budgetSuggestion.min.toLocaleString()} – ${budgetSuggestion.max.toLocaleString()}</p>
                            {budgetSuggestion.note && <p className="text-slate-400 text-xs mt-1">{budgetSuggestion.note}</p>}
                            <button type="button" className="mt-2 text-xs text-blue-400 hover:underline"
                              onClick={() => form.setValue("budgetMax", budgetSuggestion.max)}>
                              Use ${budgetSuggestion.max.toLocaleString()} as budget
                            </button>
                          </div>
                        )}
                      </div>

                      <FormField control={form.control} name="notes" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Additional Instructions</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Gate codes, contact names, special requirements, vehicle modifications…"
                              className="bg-slate-800/60 border-slate-700 text-white focus:border-blue-500 placeholder:text-slate-600 min-h-[80px]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {/* Platform fee breakdown */}
                      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
                        <p className="text-xs font-bold text-blue-300 uppercase tracking-widest">How KarHaul Fees Work</p>
                        <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                          <div className="flex items-start gap-2"><span className="text-blue-400 font-bold shrink-0">Your fee:</span><span>5% of your budget is held in escrow when you post. Released to KarHaul after delivery.</span></div>
                          <div className="flex items-start gap-2"><span className="text-amber-400 font-bold shrink-0">Cancellation:</span><span>Both parties have a 1-hour window to cancel penalty-free. After that, the cancelling party forfeits their escrow fee.</span></div>
                          <div className="flex items-start gap-2"><span className="text-amber-400 font-bold shrink-0">No-show:</span><span>If the driver no-shows, they forfeit their escrow and yours is returned. If you no-show, yours is forfeited and theirs is returned.</span></div>
                          <div className="flex items-start gap-2 pt-1 border-t border-blue-500/20"><span className="text-slate-400 font-bold shrink-0">Payments:</span><span>KarHaul does NOT process transport payments. You pay the driver directly — cash, Zelle, Venmo, etc. The escrow above is the platform fee only.</span></div>
                        </div>
                      </div>

                      {/* Terms */}
                      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                        <FormField control={form.control} name="agreeToTerms" render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange}
                                className="mt-1 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" />
                            </FormControl>
                            <div>
                              <FormLabel className="text-red-300 font-bold text-sm">Legal Disclaimer & Liability Waiver</FormLabel>
                              <FormDescription className="text-red-400/60 text-xs mt-1 leading-relaxed">
                                I acknowledge that KarHaul is a technology platform only. The platform assumes ZERO LIABILITY for vehicle damage, delays, driver no-shows, or payment disputes. All contracts are strictly between the shipper and the carrier.
                              </FormDescription>
                            </div>
                          </FormItem>
                        )} />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" className="w-1/3 border-slate-700 text-slate-300 hover:bg-slate-800 h-11" onClick={() => setStep(2)}>Back</Button>
                        <Button type="submit" className="w-2/3 h-11 font-bold bg-blue-600 hover:bg-blue-500 border-0 text-white shadow-xl shadow-blue-600/20" disabled={createMutation.isPending}>
                          {createMutation.isPending ? "Posting…" : "Post to Load Board"}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </form>
              </Form>
            </div>
          </div>
        </div>
      <EscrowConfirmModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Post Load to Board"
        description={`Your load will be visible to all verified drivers. A 5% platform fee (based on your budget) is held in escrow now and released to KarHaul when delivery is confirmed. You pay the driver directly — KarHaul does not process transport payments.`}
        fees={pendingBudgetMax > 0 ? [
          { label: "Your platform fee (5% of max budget)", amount: shipperFee },
        ] : []}
        commitmentText="Once a driver's bid is accepted, you have 1 hour to cancel penalty-free. After that, cancelling forfeits your escrow fee. If the driver no-shows, your escrow is returned."
        confirmLabel="Post Load"
        onConfirm={confirmPost}
        isLoading={createMutation.isPending}
      />
      {/* Saved driver invite dialog */}
      <InviteDriversModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        savedDrivers={savedDrivers}
        selectedDriverIds={selectedDriverIds}
        setSelectedDriverIds={setSelectedDriverIds}
        inviteMutation={inviteMutation}
        postedShipmentId={postedShipmentId}
        onNavigate={(id) => setLocation(`/shipments/${id}`)}
      />

      </MainLayout>
    </AuthGuard>
  );
}
