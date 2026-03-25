import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/AuthGuard";
import { useCreateShipment } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Car, MapPin, DollarSign, Truck, AlertTriangle, Home, Building2, Anchor, ShieldAlert, Warehouse, PlaneTakeoff, HelpCircle } from "lucide-react";
import { useState } from "react";

type ShipmentVehicleType = "sedan" | "suv" | "truck" | "van" | "motorcycle" | "rv" | "exotic" | "other";
type ShipmentVehicleCondition = "running" | "non_running";
type ShipmentTransportType = "open" | "enclosed";

const LOCATION_TYPES = [
  { value: "residential", label: "Residential Address", icon: Home, description: "Private home or apartment. Carriers should confirm truck access before arrival.", warning: null },
  { value: "dealer", label: "Auto Dealer / Lot", icon: Building2, description: "Commercial dealer location. Standard truck access, confirm lot hours.", warning: null },
  { value: "auction", label: "Auto Auction House", icon: Building2, description: "Auction facility. Bring release paperwork confirming vehicle is paid and cleared.", warning: "Auction release required" },
  { value: "port", label: "Port / Marine Terminal", icon: Anchor, description: "Seaport or marine terminal. TWIC card is federally required for entry.", warning: "TWIC card required" },
  { value: "military", label: "Military Base / Installation", icon: ShieldAlert, description: "Government military facility. Government-issued ID required; vehicle inspection may be required.", warning: "Gov. ID + escort required" },
  { value: "storage", label: "Storage Facility / Compound", icon: Warehouse, description: "Storage lot or impound. Confirm gate access code and access road weight limits.", warning: null },
  { value: "airport", label: "Airport / Private Airfield", icon: PlaneTakeoff, description: "Airport cargo area or private airfield. Confirm access permissions in advance.", warning: "Access pre-approval needed" },
  { value: "other", label: "Other / Not Specified", icon: HelpCircle, description: "Provide details in the notes field so the carrier can prepare.", warning: null },
];

const formSchema = z.object({
  vehicleYear: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
  vehicleMake: z.string().min(2, "Make is required"),
  vehicleModel: z.string().min(1, "Model is required"),
  vehicleType: z.enum(["sedan", "suv", "truck", "van", "motorcycle", "rv", "exotic", "other"]),
  vehicleCondition: z.enum(["running", "non_running"]),
  vin: z.string().optional(),
  transportType: z.enum(["open", "enclosed"]),

  originCity: z.string().min(2, "City is required"),
  originState: z.string().length(2, "Use 2-letter state code"),
  originZip: z.string().min(5, "ZIP required"),
  pickupLocationType: z.string().optional(),

  destinationCity: z.string().min(2, "City is required"),
  destinationState: z.string().length(2, "Use 2-letter state code"),
  destinationZip: z.string().min(5, "ZIP required"),
  deliveryLocationType: z.string().optional(),

  pickupDateFrom: z.string().optional(),
  pickupDateTo: z.string().optional(),

  budgetMin: z.coerce.number().optional(),
  budgetMax: z.coerce.number().optional(),
  notes: z.string().optional(),

  agreeToTerms: z.boolean().refine(val => val === true, { message: "You must agree to the liability waiver" })
});

function LocationTypeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const selected = LOCATION_TYPES.find(lt => lt.value === value);
  return (
    <div className="space-y-3">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11">
          <SelectValue placeholder="Select location type..." />
        </SelectTrigger>
        <SelectContent>
          {LOCATION_TYPES.map(lt => {
            const Icon = lt.icon;
            return (
              <SelectItem key={lt.value} value={lt.value}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span>{lt.label}</span>
                  {lt.warning && <span className="ml-1 text-xs text-amber-600 font-medium">({lt.warning})</span>}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {selected && selected.value !== "other" && (
        <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${selected.warning ? 'bg-amber-50 border border-amber-200 dark:bg-amber-900/10 dark:border-amber-800' : 'bg-slate-50 border dark:bg-slate-900/30'}`}>
          {selected.warning ? (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <selected.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
          )}
          <span className={selected.warning ? 'text-amber-800 dark:text-amber-300' : 'text-muted-foreground'}>
            {selected.description}
          </span>
        </div>
      )}
    </div>
  );
}

export default function CreateShipment() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createMutation = useCreateShipment();
  const [step, setStep] = useState(1);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicleType: "sedan",
      vehicleCondition: "running",
      transportType: "open",
      agreeToTerms: false
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const { agreeToTerms, ...apiData } = values;
    createMutation.mutate({ data: apiData as any }, {
      onSuccess: (data) => {
        toast({ title: "Load Posted Successfully!", description: "Drivers can now bid on your shipment." });
        setLocation(`/shipments/${data.id}`);
      },
      onError: (err: any) => {
        toast({ title: "Failed to post load", description: err.message, variant: "destructive" });
      }
    });
  }

  const nextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (step === 1) fieldsToValidate = ['vehicleYear', 'vehicleMake', 'vehicleModel', 'vehicleType', 'vehicleCondition'];
    if (step === 2) fieldsToValidate = ['originCity', 'originState', 'originZip', 'destinationCity', 'destinationState', 'destinationZip'];
    const isValid = await form.trigger(fieldsToValidate as any);
    if (isValid) setStep(step + 1);
  };

  return (
    <AuthGuard requireRole="shipper">
      <MainLayout>
        <div className="bg-slate-50 dark:bg-slate-900/20 py-12 min-h-screen">
          <div className="container max-w-3xl mx-auto px-4">

            <div className="mb-8">
              <h1 className="text-3xl font-display font-bold mb-2">Post a Vehicle for Transport</h1>
              <p className="text-muted-foreground">List your vehicle to the marketplace and get direct bids from verified carriers. Zero broker fees.</p>
            </div>

            {/* Stepper */}
            <div className="flex items-center mb-8 relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-border -z-10"></div>
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary -z-10 transition-all duration-500" style={{ width: `${((step - 1) / 2) * 100}%` }}></div>
              {[
                { num: 1, label: "Vehicle", icon: <Car className="h-4 w-4"/> },
                { num: 2, label: "Route", icon: <MapPin className="h-4 w-4"/> },
                { num: 3, label: "Details", icon: <DollarSign className="h-4 w-4"/> }
              ].map((s) => (
                <div key={s.num} className="flex-1 flex justify-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${
                      step >= s.num ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-background border-border text-muted-foreground'
                    }`}>{s.icon}</div>
                    <span className={`text-xs mt-2 font-medium ${step >= s.num ? 'text-primary' : 'text-muted-foreground'}`}>{s.label}</span>
                  </div>
                </div>
              ))}
            </div>

            <Card className="shadow-xl shadow-slate-200/50 dark:shadow-none border-t-4 border-t-primary">
              <CardContent className="pt-8">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                    {/* Step 1: Vehicle Info */}
                    <div className={step === 1 ? 'block animate-in fade-in slide-in-from-right-4' : 'hidden'}>
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <FormField control={form.control} name="vehicleYear" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Year</FormLabel>
                              <FormControl><Input type="number" placeholder="2023" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="vehicleMake" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Make</FormLabel>
                              <FormControl><Input placeholder="e.g. Ford, Toyota" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="vehicleModel" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Model</FormLabel>
                              <FormControl><Input placeholder="e.g. F-150, Camry" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField control={form.control} name="vehicleType" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vehicle Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  {["sedan","suv","truck","van","motorcycle","rv","exotic","other"].map(type => (
                                    <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="vehicleCondition" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Condition</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="running">Runs & Drives</SelectItem>
                                  <SelectItem value="non_running">Inoperable (INOP)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>INOP vehicles require special equipment and cost more.</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                        <FormField control={form.control} name="vin" render={({ field }) => (
                          <FormItem>
                            <FormLabel>VIN (Optional but recommended)</FormLabel>
                            <FormControl><Input placeholder="17-character VIN" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <Button type="button" className="w-full mt-4" onClick={nextStep}>Continue to Route</Button>
                      </div>
                    </div>

                    {/* Step 2: Route + Location Types */}
                    <div className={step === 2 ? 'block animate-in fade-in slide-in-from-right-4' : 'hidden'}>
                      <div className="space-y-8">

                        {/* Pickup */}
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 border relative">
                          <div className="absolute -left-3 top-6 bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">A</div>
                          <h3 className="font-semibold text-lg mb-4">Pickup Location</h3>
                          <div className="grid grid-cols-12 gap-4 mb-4">
                            <FormField control={form.control} name="originCity" render={({ field }) => (
                              <FormItem className="col-span-12 md:col-span-6">
                                <FormLabel>City</FormLabel>
                                <FormControl><Input placeholder="Miami" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="originState" render={({ field }) => (
                              <FormItem className="col-span-6 md:col-span-3">
                                <FormLabel>State</FormLabel>
                                <FormControl><Input placeholder="FL" maxLength={2} className="uppercase" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="originZip" render={({ field }) => (
                              <FormItem className="col-span-6 md:col-span-3">
                                <FormLabel>ZIP</FormLabel>
                                <FormControl><Input placeholder="33101" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                          <FormField control={form.control} name="pickupLocationType" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Location Type <span className="text-muted-foreground font-normal">(helps drivers prepare)</span></FormLabel>
                              <FormControl>
                                <LocationTypeSelector value={field.value || ""} onChange={field.onChange} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                        <div className="flex justify-center -my-4 relative z-10">
                          <div className="bg-background border shadow-sm p-2 rounded-full text-muted-foreground">
                            <Truck className="h-5 w-5" />
                          </div>
                        </div>

                        {/* Delivery */}
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 border relative">
                          <div className="absolute -left-3 top-6 bg-accent text-accent-foreground w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">B</div>
                          <h3 className="font-semibold text-lg mb-4">Delivery Location</h3>
                          <div className="grid grid-cols-12 gap-4 mb-4">
                            <FormField control={form.control} name="destinationCity" render={({ field }) => (
                              <FormItem className="col-span-12 md:col-span-6">
                                <FormLabel>City</FormLabel>
                                <FormControl><Input placeholder="Los Angeles" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="destinationState" render={({ field }) => (
                              <FormItem className="col-span-6 md:col-span-3">
                                <FormLabel>State</FormLabel>
                                <FormControl><Input placeholder="CA" maxLength={2} className="uppercase" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="destinationZip" render={({ field }) => (
                              <FormItem className="col-span-6 md:col-span-3">
                                <FormLabel>ZIP</FormLabel>
                                <FormControl><Input placeholder="90001" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                          <FormField control={form.control} name="deliveryLocationType" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Location Type <span className="text-muted-foreground font-normal">(helps drivers prepare)</span></FormLabel>
                              <FormControl>
                                <LocationTypeSelector value={field.value || ""} onChange={field.onChange} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                        <div className="flex gap-4">
                          <Button type="button" variant="outline" className="w-1/3" onClick={() => setStep(1)}>Back</Button>
                          <Button type="button" className="w-2/3" onClick={nextStep}>Continue to Details</Button>
                        </div>
                      </div>
                    </div>

                    {/* Step 3: Logistics & Pricing */}
                    <div className={step === 3 ? 'block animate-in fade-in slide-in-from-right-4' : 'hidden'}>
                      <div className="space-y-6">

                        <FormField control={form.control} name="transportType" render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>Trailer Type</FormLabel>
                            <FormControl>
                              <div className="grid grid-cols-2 gap-4">
                                <div
                                  className={`border-2 rounded-xl p-4 cursor-pointer transition-colors ${field.value === 'open' ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                                  onClick={() => field.onChange('open')}
                                >
                                  <h4 className="font-bold mb-1">Open Carrier</h4>
                                  <p className="text-xs text-muted-foreground">Standard transport. Exposed to weather. Cheaper.</p>
                                </div>
                                <div
                                  className={`border-2 rounded-xl p-4 cursor-pointer transition-colors ${field.value === 'enclosed' ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                                  onClick={() => field.onChange('enclosed')}
                                >
                                  <h4 className="font-bold mb-1">Enclosed Carrier</h4>
                                  <p className="text-xs text-muted-foreground">Fully covered. For classic/luxury cars. ~40% more.</p>
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                          <FormField control={form.control} name="pickupDateFrom" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Earliest Pickup Date (Optional)</FormLabel>
                              <FormControl><Input type="date" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="pickupDateTo" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Latest Pickup Date (Optional)</FormLabel>
                              <FormControl><Input type="date" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                          <FormField control={form.control} name="budgetMin" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Min Target Price ($) (Optional)</FormLabel>
                              <FormControl><Input type="number" placeholder="e.g. 500" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="budgetMax" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max Target Price ($) (Optional)</FormLabel>
                              <FormControl><Input type="number" placeholder="e.g. 800" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                        <FormField control={form.control} name="notes" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Additional Instructions</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Any specific requirements for pickup/delivery? Modifications to the vehicle? Gate codes or contact names?" className="h-24" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-200 dark:border-red-900 mt-6">
                          <FormField control={form.control} name="agreeToTerms" render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-1 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600" />
                              </FormControl>
                              <div className="space-y-1 leading-tight">
                                <FormLabel className="text-red-900 dark:text-red-300 font-semibold text-sm">Legal Disclaimer & Liability Waiver</FormLabel>
                                <FormDescription className="text-red-800/80 dark:text-red-400/80 text-xs">
                                  I acknowledge that Traxion is a technology platform connecting independent parties. The platform takes no fee and assumes ZERO LIABILITY for vehicle damage, delays, driver no-shows, or payment disputes. All contracts and payments are strictly between the shipper and the carrier.
                                </FormDescription>
                              </div>
                            </FormItem>
                          )} />
                        </div>

                        <div className="flex gap-4 pt-4">
                          <Button type="button" variant="outline" className="w-1/3" onClick={() => setStep(2)}>Back</Button>
                          <Button type="submit" className="w-2/3 hover-elevate shadow-lg shadow-primary/20" disabled={createMutation.isPending}>
                            {createMutation.isPending ? "Posting..." : "Post to Load Board"}
                          </Button>
                        </div>
                      </div>
                    </div>

                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    </AuthGuard>
  );
}
