import { MainLayout } from "@/components/layout/MainLayout";
import { useGetShipment, useGetShipmentBids, usePlaceBid, useAcceptBid, useGetMyProfile } from "@workspace/api-client-react";
import { useRoute, Link, useLocation } from "wouter";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { EscrowConfirmModal } from "@/components/EscrowConfirmModal";
import { formatCurrency, formatDateTime, getStatusColor, formatVehicleName, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MapPin, Calendar, Clock, DollarSign, Truck, Info, AlertTriangle, ShieldCheck, CheckCircle2, User, UserCheck, Home, Building2, Anchor, Shield, Warehouse, PlaneTakeoff, HelpCircle, ChevronDown, ChevronUp, CloudRain, CloudSnow, Zap, Wind, CloudDrizzle, ArrowRight, ArrowLeft, Phone, MessageSquare, Flag } from "lucide-react";
import { useWeatherAlert } from "@/lib/weather";
import { UserProfileModal } from "@/components/UserProfileModal";
import { ReportModal } from "@/components/ReportModal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/clerk-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiBase } from "@/lib/api";
import { Star } from "lucide-react";

const LOCATION_INFO: Record<string, {
  label: string;
  icon: any;
  color: string;
  badgeClass: string;
  requirements: string[];
  safetyTips: string[];
  warning?: string;
}> = {
  residential: {
    label: "Residential Area",
    icon: Home,
    color: "blue",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
    requirements: [],
    safetyTips: [
      "Call ahead to confirm truck can access the street or driveway",
      "Check for low-hanging trees, narrow driveways, or overhead obstacles",
      "If unable to pull up, plan to load from the nearest open street",
      "HOA communities may restrict large vehicle access — confirm in advance",
    ],
  },
  dealer: {
    label: "Auto Dealer / Lot",
    icon: Building2,
    color: "slate",
    badgeClass: "bg-slate-50 text-slate-800 border-slate-200",
    requirements: [],
    safetyTips: [
      "Confirm dealer lot hours before arrival — many close by 6 PM",
      "Get a contact name at the dealership for a smooth handoff",
      "Inspect and photograph the vehicle before and after loading",
      "Ensure the correct vehicle is released — verify VIN and year/make/model",
    ],
  },
  auction: {
    label: "Auto Auction House",
    icon: Building2,
    color: "amber",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    warning: "Auction release paperwork required",
    requirements: [
      "Signed auction release form confirming vehicle is paid and cleared",
      "Gate pass or lot number from the shipper",
    ],
    safetyTips: [
      "Do NOT load a vehicle without a signed release form — you could be held liable",
      "Auction lots are busy; expect delays and plan extra time",
      "Verify VIN against the release paperwork before loading",
      "Confirm the vehicle has a title or at minimum a buyer's certificate",
    ],
  },
  port: {
    label: "Port / Marine Terminal",
    icon: Anchor,
    color: "red",
    badgeClass: "bg-red-50 text-red-800 border-red-200",
    warning: "TWIC card federally required",
    requirements: [
      "Transportation Worker Identification Credential (TWIC) card — federal law",
      "Carrier-specific gate appointment or booking number",
      "Commercial vehicle registration and proof of insurance on hand",
    ],
    safetyTips: [
      "Schedule a gate appointment — most ports do not allow walk-ins",
      "Arrive early; port security checks can add 45–90 minutes",
      "Follow all posted traffic and safety signs inside the terminal",
      "Do not leave your cab unattended once inside the terminal",
      "All passengers must also have valid TWIC cards to enter",
    ],
  },
  military: {
    label: "Military Base",
    icon: Shield,
    color: "olive",
    badgeClass: "bg-green-50 text-green-900 border-green-200",
    warning: "Government ID + escort required",
    requirements: [
      "Government-issued photo ID (driver's license or passport)",
      "Vehicle registration and proof of insurance",
      "Prior coordination with the base's Vehicle Control Office",
    ],
    safetyTips: [
      "Contact the base's Visitor Control Center in advance — walk-ins are typically denied",
      "Your vehicle may be subject to a thorough inspection at the gate",
      "No photography is permitted on base",
      "You will likely require a military escort throughout the base — do not proceed unaccompanied",
      "Leave at least 1–2 hours buffer for gate security clearance",
    ],
  },
  storage: {
    label: "Storage Facility / Compound",
    icon: Warehouse,
    color: "slate",
    badgeClass: "bg-slate-50 text-slate-800 border-slate-200",
    requirements: [],
    safetyTips: [
      "Get the gate access code from the shipper before departure",
      "Confirm access road weight limits — some storage facilities restrict heavy trucks",
      "Check facility hours; many storage lots lock after hours",
      "Photograph the vehicle's condition at the storage site before loading",
    ],
  },
  airport: {
    label: "Airport / Private Airfield",
    icon: PlaneTakeoff,
    color: "purple",
    badgeClass: "bg-purple-50 text-purple-800 border-purple-200",
    warning: "Pre-approved access required",
    requirements: [
      "Pre-approval from the airport authority or FBO (Fixed-Base Operator)",
      "Commercial vehicle permit for airside or tarmac access (if applicable)",
    ],
    safetyTips: [
      "Confirm access permissions well in advance — most airports require prior authorization",
      "Do not enter restricted airside areas without explicit escort and clearance",
      "Follow all posted speed limits and directions inside the airfield",
      "Cargo or executive terminals may have separate access gates — confirm which to use",
    ],
  },
  other: {
    label: "Other Location",
    icon: HelpCircle,
    color: "gray",
    badgeClass: "bg-gray-50 text-gray-800 border-gray-200",
    requirements: [],
    safetyTips: [
      "Review the shipper's notes for any location-specific instructions",
      "Contact the shipper ahead of time to confirm access requirements",
      "Photograph the vehicle thoroughly at pickup before loading",
    ],
  },
};

const bidSchema = z.object({
  amount: z.coerce.number().min(50, "Amount must be at least $50"),
  note: z.string().optional(),
  estimatedPickupDate: z.string().min(1, "Pickup date is required"),
  estimatedDeliveryDate: z.string().min(1, "Delivery date is required"),
});

export default function ShipmentDetail() {
  const [, params] = useRoute("/shipments/:id");
  const shipmentId = params?.id || "";
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isSignedIn: isAuthenticated } = useAuth();
  
  const { data: profile } = useGetMyProfile({ query: { enabled: isAuthenticated } as any });

  const { data: shipment, isLoading, refetch: refetchShipment } = useGetShipment(shipmentId, {
    query: { enabled: !!shipmentId } as any,
  });

  const { data: bidsData, refetch: refetchBids } = useGetShipmentBids(shipmentId, {
    query: { enabled: !!shipmentId } as any,
  });

  const placeBidMutation = usePlaceBid();
  const acceptBidMutation = useAcceptBid();

  const [isBidDialogOpen, setIsBidDialogOpen] = useState(false);
  const [bidConfirmOpen, setBidConfirmOpen] = useState(false);
  const [pendingBidValues, setPendingBidValues] = useState<z.infer<typeof bidSchema> | null>(null);
  const [acceptConfirmOpen, setAcceptConfirmOpen] = useState(false);
  const [pendingAcceptBidId, setPendingAcceptBidId] = useState<string | null>(null);
  const [saveDriverOpen, setSaveDriverOpen] = useState(false);
  const [justAcceptedBookingId, setJustAcceptedBookingId] = useState<string | null>(null);
  const [justAcceptedDriver, setJustAcceptedDriver] = useState<{ id: string; name: string } | null>(null);

  const qc = useQueryClient();
  const saveDriverMutation = useMutation({
    mutationFn: async (driverId: string) => {
      const token = await (window as any).Clerk?.session?.getToken();
      const res = await fetch(`${apiBase}/users/saved-drivers/${driverId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({}),
      });
      if (!res.ok && res.status !== 409) throw new Error("Failed to save driver");
      return res.json();
    },
  });

  const form = useForm<z.infer<typeof bidSchema>>({
    resolver: zodResolver(bidSchema),
    defaultValues: {
      amount: shipment?.budgetMax || 0,
      note: "",
      estimatedPickupDate: shipment?.pickupDateFrom ? new Date(shipment.pickupDateFrom).toISOString().split('T')[0] : "",
      estimatedDeliveryDate: "",
    },
  });

  const isOwner = profile?.id === shipment?.shipperId;
  const isDriver = profile?.role === 'driver' || profile?.role === 'both';
  const canBid = isAuthenticated && isDriver && !isOwner && shipment?.status === 'open';
  const myBid = bidsData?.bids?.find(b => b.driverId === profile?.id);
  const hasMyBid = !!myBid;
  const myBidAccepted = myBid?.status === 'accepted';

  const { data: originWeather } = useWeatherAlert(shipment?.originCity, shipment?.originState);
  const { data: destWeather } = useWeatherAlert(shipment?.destinationCity, shipment?.destinationState);

  const weatherAlerts = [
    originWeather ? { ...originWeather, location: `${shipment?.originCity}, ${shipment?.originState}`, leg: "Pickup" } : null,
    destWeather ? { ...destWeather, location: `${shipment?.destinationCity}, ${shipment?.destinationState}`, leg: "Delivery" } : null,
  ].filter(Boolean) as Array<typeof originWeather & { location: string; leg: string }>;

  const WEATHER_ICONS = { "cloud-rain": CloudRain, "cloud-snow": CloudSnow, "zap": Zap, "wind": Wind, "cloud-drizzle": CloudDrizzle } as const;
  const SEVERITY_STYLES = {
    advisory: "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-200",
    warning: "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200",
    watch: "bg-red-50 border-red-200 text-red-900 dark:bg-red-950/30 dark:border-red-800 dark:text-red-200",
  } as const;

  // Step 1: validate form → show confirmation modal
  function onSubmitBid(values: z.infer<typeof bidSchema>) {
    setPendingBidValues(values);
    setIsBidDialogOpen(false);
    setBidConfirmOpen(true);
  }

  // Step 2: confirmed → actually place the bid
  function confirmPlaceBid() {
    if (!pendingBidValues) return;
    placeBidMutation.mutate({ shipmentId, data: pendingBidValues }, {
      onSuccess: () => {
        toast({ title: "Bid Placed Successfully", description: "The shipper will review your bid." });
        setBidConfirmOpen(false);
        setPendingBidValues(null);
        refetchBids();
        refetchShipment();
      },
      onError: (err: any) => {
        toast({ title: "Failed to place bid", description: err.message, variant: "destructive" });
      }
    });
  }

  function handleAcceptBid(bidId: string) {
    setPendingAcceptBidId(bidId);
    setAcceptConfirmOpen(true);
  }

  function confirmAcceptBid() {
    if (!pendingAcceptBidId) return;
    const bid = bidsData?.bids?.find((b: any) => b.id === pendingAcceptBidId);
    acceptBidMutation.mutate({ bidId: pendingAcceptBidId }, {
      onSuccess: (booking: any) => {
        toast({ title: "Bid Accepted!", description: "Booking created. 1-hour cancellation window is now open." });
        setAcceptConfirmOpen(false);
        setJustAcceptedBookingId(booking.id);
        setJustAcceptedDriver({
          id: bid?.driverId || "",
          name: [bid?.driver?.firstName, bid?.driver?.lastName].filter(Boolean).join(" ") || "this driver",
        });
        setSaveDriverOpen(true);
      },
      onError: (err: any) => {
        toast({ title: "Failed to accept bid", description: err.message, variant: "destructive" });
      }
    });
  }

  const budgetMax = shipment?.budgetMax ?? 0;
  const driverFee = parseFloat((budgetMax * 0.03).toFixed(2));
  const shipperFee = parseFloat((budgetMax * 0.05).toFixed(2));
  const pendingBidAmount = pendingBidValues?.amount ?? 0;

  const acceptedBid = bidsData?.bids?.find((b: any) => b.status === 'accepted');

  const { data: driverReviewsData } = useQuery({
    queryKey: ["driver-reviews", acceptedBid?.driverId],
    queryFn: async () => {
      const token = await (window as any).Clerk?.session?.getToken();
      const res = await fetch(`${apiBase}/reviews/user/${acceptedBid?.driverId}`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return res.json();
    },
    enabled: !!acceptedBid?.driverId,
  });

  if (isLoading || !shipment) {
    return (
      <MainLayout>
        <div className="container py-20 flex justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Header Banner */}
      <div className="bg-slate-900 text-white pt-12 pb-24">
        <div className="container mx-auto px-4 md:px-6">
          <button onClick={() => window.history.back()} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6 -ml-1 group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Badge className={getStatusColor(shipment.status)}>{shipment.status.replace('_', ' ').toUpperCase()}</Badge>
            <Badge variant="outline" className="text-white border-white/30 capitalize bg-white/5">{shipment.transportType} Transport</Badge>
            {(shipment as any).serviceType && (
              <Badge variant="outline" className="text-white border-white/30 bg-white/5">
                {(shipment as any).serviceType === 'door_to_door' ? 'Door to Door' : 'Door to Port'}
              </Badge>
            )}
            {shipment.vehicleCondition === 'non_running' && (
              <Badge variant="destructive">INOP / Non-Running</Badge>
            )}
            <span className="text-sm text-slate-400 ml-auto flex items-center">
              <Clock className="w-4 h-4 mr-1" /> Posted {formatDate(shipment.createdAt)}
            </span>
          </div>
          
          <h1 className="text-3xl md:text-5xl font-display font-bold mb-2">
            {formatVehicleName(shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel)}
          </h1>
          <p className="text-slate-400 text-lg">VIN: <span className="font-mono text-slate-300 bg-white/10 px-2 py-0.5 rounded">{shipment.vin || "Not Provided"}</span></p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 -mt-12 mb-20 relative z-10">
        {weatherAlerts.length > 0 && (
          <div className="mb-6 space-y-3">
            {weatherAlerts.map((alert, i) => {
              if (!alert) return null;
              const IconComp = WEATHER_ICONS[alert.icon as keyof typeof WEATHER_ICONS] || CloudRain;
              const styles = SEVERITY_STYLES[alert.severity as keyof typeof SEVERITY_STYLES] || SEVERITY_STYLES.advisory;
              const severityLabel = alert.severity === "watch" ? "WEATHER WATCH" : alert.severity === "warning" ? "WEATHER WARNING" : "WEATHER ADVISORY";
              return (
                <div key={i} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${styles}`}>
                  <IconComp className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide mb-0.5">{severityLabel} · {alert.leg} Location</p>
                    <p className="font-semibold text-sm">{alert.headline}</p>
                    <p className="text-sm opacity-80 mt-0.5">{alert.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Route Card */}
            <Card className="shadow-lg border-0 shadow-slate-200/50 dark:shadow-none">
              <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b">
                <CardTitle className="text-xl flex items-center gap-2">
                  <MapPin className="text-primary h-5 w-5" /> Route Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  <div className="flex-1 p-6 md:p-8 relative">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-background border shadow-sm text-muted-foreground">
                      <ArrowRight className="h-5 w-5" />
                    </div>
                    <div className="uppercase text-xs font-bold text-primary tracking-wider mb-2">Origin / Pickup</div>
                    <h3 className="text-2xl font-bold mb-1">{shipment.originCity}, {shipment.originState}</h3>
                    <p className="text-muted-foreground">{shipment.originZip}</p>
                    {(shipment as any).pickupLocationType && LOCATION_INFO[(shipment as any).pickupLocationType] && (() => {
                      const loc = LOCATION_INFO[(shipment as any).pickupLocationType];
                      const Icon = loc.icon;
                      return (
                        <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full border text-xs font-medium ${loc.badgeClass}`}>
                          <Icon className="h-3 w-3" />
                          {loc.label}
                          {loc.warning && <span className="font-bold ml-1">· {loc.warning}</span>}
                        </div>
                      );
                    })()}
                    <p className="text-sm mt-3 pt-3 border-t text-muted-foreground">
                      <span className="font-medium text-foreground">Pickup:</span> {formatDate(shipment.pickupDateFrom)} - {formatDate(shipment.pickupDateTo)}
                    </p>
                  </div>
                  
                  <div className="md:hidden h-px w-full bg-border relative">
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border rounded-full p-2 text-muted-foreground">
                      <ArrowRight className="h-4 w-4 rotate-90" />
                    </div>
                  </div>

                  <div className="flex-1 p-6 md:p-8 bg-slate-50/50 dark:bg-slate-900/20">
                    <div className="uppercase text-xs font-bold text-accent tracking-wider mb-2">Destination / Delivery</div>
                    <h3 className="text-2xl font-bold mb-1">{shipment.destinationCity}, {shipment.destinationState}</h3>
                    <p className="text-muted-foreground">{shipment.destinationZip}</p>
                    {(shipment as any).deliveryLocationType && LOCATION_INFO[(shipment as any).deliveryLocationType] && (() => {
                      const loc = LOCATION_INFO[(shipment as any).deliveryLocationType];
                      const Icon = loc.icon;
                      return (
                        <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full border text-xs font-medium ${loc.badgeClass}`}>
                          <Icon className="h-3 w-3" />
                          {loc.label}
                          {loc.warning && <span className="font-bold ml-1">· {loc.warning}</span>}
                        </div>
                      );
                    })()}
                    <p className="text-sm mt-3 pt-3 border-t text-muted-foreground">
                      <span className="font-medium text-foreground">Delivery:</span> Flexible
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes Card */}
            {shipment.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Info className="text-primary h-5 w-5" /> Shipper Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                    {shipment.notes}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Driver Safety & Location Requirements Panel */}
            {(() => {
              const pickupLoc = (shipment as any).pickupLocationType ? LOCATION_INFO[(shipment as any).pickupLocationType] : null;
              const deliveryLoc = (shipment as any).deliveryLocationType ? LOCATION_INFO[(shipment as any).deliveryLocationType] : null;
              if (!pickupLoc && !deliveryLoc) return null;
              const hasRequirements = (pickupLoc?.requirements?.length || 0) + (deliveryLoc?.requirements?.length || 0) > 0;
              const hasWarnings = pickupLoc?.warning || deliveryLoc?.warning;

              return (
                <Card className={`border-2 ${hasWarnings ? 'border-amber-300 dark:border-amber-700' : 'border-blue-200 dark:border-blue-800'}`}>
                  <CardHeader className={`pb-3 ${hasWarnings ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className={`h-5 w-5 ${hasWarnings ? 'text-amber-600' : 'text-blue-600'}`} />
                      Driver Safety & Location Requirements
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Review all requirements before accepting this load.</p>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-6">

                    {/* Pickup safety */}
                    {pickupLoc && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="text-xs font-bold uppercase tracking-wider text-primary">Pickup</div>
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${pickupLoc.badgeClass}`}>
                            {pickupLoc.label}
                          </div>
                        </div>
                        {pickupLoc.requirements.length > 0 && (
                          <div className="mb-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3">
                            <p className="text-xs font-bold text-red-800 dark:text-red-300 mb-2 uppercase tracking-wide">Required Items — Must Have Before Arrival</p>
                            <ul className="space-y-1.5">
                              {pickupLoc.requirements.map((req, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-red-800 dark:text-red-300">
                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-500" />
                                  {req}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <ul className="space-y-2">
                          {pickupLoc.safetyTips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Delivery safety */}
                    {deliveryLoc && (
                      <div className={pickupLoc ? 'border-t pt-5' : ''}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="text-xs font-bold uppercase tracking-wider text-accent">Delivery</div>
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${deliveryLoc.badgeClass}`}>
                            {deliveryLoc.label}
                          </div>
                        </div>
                        {deliveryLoc.requirements.length > 0 && (
                          <div className="mb-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3">
                            <p className="text-xs font-bold text-red-800 dark:text-red-300 mb-2 uppercase tracking-wide">Required Items — Must Have Before Arrival</p>
                            <ul className="space-y-1.5">
                              {deliveryLoc.requirements.map((req, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-red-800 dark:text-red-300">
                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-500" />
                                  {req}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <ul className="space-y-2">
                          {deliveryLoc.safetyTips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Universal tips */}
                    <div className="border-t pt-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Always at Pickup & Delivery</p>
                      <ul className="space-y-2">
                        {[
                          "Take timestamped photos of the vehicle on all 4 sides before loading",
                          "Complete and sign a Bill of Lading (BOL) — this is your legal protection",
                          "Note all existing damage on the BOL before the shipper signs",
                          "Confirm the shipper's identity matches the name on the listing",
                        ].map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Bids List (Visible to owner or if you bid) */}
            {bidsData && (isOwner || hasMyBid) && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-xl">
                    {isOwner ? `Current Bids (${bidsData.total})` : "Your Bid"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {bidsData.bids.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      No bids yet.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {bidsData.bids.map((bid) => {
                        const isMyBid = bid.driverId === profile?.id;
                        if (!isOwner && !isMyBid) return null; // Only show other bids to owner

                        return (
                          <div key={bid.id} className={`p-6 ${isMyBid ? 'bg-primary/5' : ''}`}>
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                              <div className="flex items-start gap-4">
                                <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                  <User className="h-6 w-6 text-slate-500" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-lg">{bid.driver?.firstName} {bid.driver?.lastName}</h4>
                                    {bid.driver?.isVerified && (
                                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                    )}
                                    {isMyBid && <Badge variant="secondary" className="ml-2">Your Bid</Badge>}
                                  </div>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                                    <span className="flex items-center"><Truck className="h-3 w-3 mr-1"/> {bid.driver?.truckType || 'Carrier'}</span>
                                    <span>{bid.driver?.completedJobs || 0} hauls completed</span>
                                    <span>★ {bid.driver?.averageRating?.toFixed(1) || 'New'}</span>
                                  </div>
                                  {bid.note && (
                                    <p className="mt-3 text-sm italic border-l-2 border-primary/20 pl-3 py-1">"{bid.note}"</p>
                                  )}
                                  <div className="grid grid-cols-2 gap-4 mt-4 text-xs">
                                    <div><span className="font-medium">Est Pickup:</span> {formatDate(bid.estimatedPickupDate)}</div>
                                    <div><span className="font-medium">Est Delivery:</span> {formatDate(bid.estimatedDeliveryDate)}</div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex flex-col items-end justify-between border-t md:border-t-0 md:border-l pl-0 md:pl-6 pt-4 md:pt-0 shrink-0">
                                <div className="text-right mb-4">
                                  <div className="text-3xl font-display font-bold text-primary">{formatCurrency(bid.amount)}</div>
                                  <Badge className={`mt-1 ${getStatusColor(bid.status)}`} variant="outline">{bid.status.toUpperCase()}</Badge>
                                </div>
                                
                                {isOwner && shipment.status === 'open' && bid.status === 'pending' && (
                                  <Button 
                                    className="w-full hover-elevate shadow-md shadow-primary/20" 
                                    onClick={() => handleAcceptBid(bid.id)}
                                    disabled={acceptBidMutation.isPending}
                                  >
                                    {acceptBidMutation.isPending ? 'Accepting...' : 'Accept & Book'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            <Card className="shadow-lg border-primary/20 shadow-primary/5">
              <CardHeader className="bg-primary/5 pb-4">
                <CardTitle>Maximum Budget</CardTitle>
                <div className="text-3xl font-display font-bold mt-2">
                  {shipment.budgetMax ? formatCurrency(shipment.budgetMax) : 'Open for Bids'}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Current Bids:</span>
                  <span className="font-bold">{shipment.bidCount || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-bold capitalize">{shipment.status.replace('_', ' ')}</span>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                {canBid ? (
                  <Dialog open={isBidDialogOpen} onOpenChange={setIsBidDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full h-12 text-lg hover-elevate shadow-lg shadow-primary/25">Place a Bid</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Submit Transport Bid</DialogTitle>
                        <DialogDescription>
                          Your bid is binding. The shipper will review all bids and select their preferred carrier.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmitBid)} className="space-y-4 pt-4">
                          <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Bid Amount ($)</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="e.g. 800" {...field} className="text-lg font-semibold h-12" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="estimatedPickupDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Est. Pickup Date</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="estimatedDeliveryDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Est. Delivery Date</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name="note"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Note to Shipper (Optional)</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="e.g. I have an open spot on my trailer passing through this Tuesday." 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex gap-3 mt-6">
                            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                            <div className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                              <p><strong>Your fee:</strong> If accepted, a <strong>3% platform fee</strong> on your accepted bid is held in escrow and released to KarHaul on delivery.</p>
                              <p><strong>Payment:</strong> You are paid directly by the shipper — KarHaul does not process transport payments.</p>
                              <p><strong>Cancellation:</strong> You have 1 hour after acceptance to cancel penalty-free. After that, cancelling forfeits your escrow.</p>
                            </div>
                          </div>

                          <DialogFooter className="mt-6">
                            <Button variant="outline" type="button" onClick={() => setIsBidDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={placeBidMutation.isPending}>
                              {placeBidMutation.isPending ? 'Submitting...' : 'Submit Binding Bid'}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                ) : !isAuthenticated ? (
                  <Button className="w-full" variant="outline" asChild>
                    <Link href="/profile">Login to Bid</Link>
                  </Button>
                ) : myBidAccepted ? (
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-600 text-white cursor-not-allowed" disabled>Bid Accepted</Button>
                ) : hasMyBid ? (
                  <Button className="w-full" variant="secondary" disabled>You've Placed a Bid</Button>
                ) : isOwner ? (
                  <Button className="w-full" variant="outline" disabled>This is your shipment</Button>
                ) : !isDriver ? (
                  <Button className="w-full" variant="outline" disabled>Only verified drivers can bid</Button>
                ) : (
                  <Button className="w-full" disabled>Cannot bid on this status</Button>
                )}
              </CardFooter>
            </Card>

            {/* Driver Profile (when owner has an accepted driver) OR Shipper Info (for drivers viewing) */}
            {isOwner && acceptedBid ? (
              <Card className="border-emerald-200 dark:border-emerald-800">
                <CardHeader className="pb-3 bg-emerald-50 dark:bg-emerald-900/20">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Truck className="h-4 w-4 text-emerald-600" /> Accepted Driver
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-lg font-bold text-emerald-700 dark:text-emerald-300">
                      {acceptedBid.driver?.firstName?.[0] || "D"}
                    </div>
                    <div>
                      <div className="font-bold text-lg">{acceptedBid.driver?.firstName} {acceptedBid.driver?.lastName}</div>
                      {acceptedBid.driver?.isVerified && (
                        <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="h-3 w-3" /> Verified carrier
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5 text-sm bg-muted/30 p-3 rounded-lg border">
                    {(acceptedBid.driver?.averageRating ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rating:</span>
                        <span className="font-medium flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {acceptedBid.driver?.averageRating?.toFixed(1)} ({acceptedBid.driver?.totalReviews} reviews)
                        </span>
                      </div>
                    )}
                    {(acceptedBid.driver?.completedJobs ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Hauls completed:</span>
                        <span className="font-medium">{acceptedBid.driver?.completedJobs}</span>
                      </div>
                    )}
                    {acceptedBid.driver?.truckType && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Equipment:</span>
                        <span className="font-medium">{acceptedBid.driver.truckType}</span>
                      </div>
                    )}
                    {acceptedBid.driver?.dotNumber && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">DOT #:</span>
                        <span className="font-medium font-mono">{acceptedBid.driver.dotNumber}</span>
                      </div>
                    )}
                  </div>
                  {/* Driver reviews */}
                  {driverReviewsData?.reviews?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Recent Reviews</p>
                      {driverReviewsData.reviews.slice(0, 3).map((r: any) => r.comment && (
                        <div key={r.id} className="bg-muted/30 rounded-lg p-2.5 border text-xs">
                          <div className="flex items-center gap-1 mb-1">
                            {[1,2,3,4,5].map(s => <Star key={s} className={`h-3 w-3 ${s <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />)}
                          </div>
                          <p className="text-muted-foreground italic">"{r.comment}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : !isOwner ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserCheck className="h-4 w-4" /> About the Shipper
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <UserProfileModal userId={shipment.shipperId}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-lg font-bold text-primary">
                      {shipment.shipper?.firstName?.[0] || 'U'}
                    </div>
                    <div>
                      <div className="font-semibold hover:text-primary transition-colors">{shipment.shipper?.firstName} {shipment.shipper?.lastName}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>⭐ {shipment.shipper?.averageRating?.toFixed(1) || 'New'} ({shipment.shipper?.totalReviews || 0} reviews)</span>
                        {(shipment.shipper?.completedJobs ?? 0) > 0 && (
                          <span>· {shipment.shipper?.completedJobs} hauls completed</span>
                        )}
                      </div>
                    </div>
                  </div>
                  </UserProfileModal>
                  {isAuthenticated && !isOwner && (
                    <div className="space-y-2 mt-2">
                      {myBidAccepted ? (
                        <>
                          <Button variant="outline" className="w-full text-xs h-8 gap-1.5" asChild>
                            <Link href={`/messages?to=${shipment.shipperId}`}>
                              <MessageSquare className="h-3.5 w-3.5" /> Message Shipper
                            </Link>
                          </Button>
                          {(shipment as any).shipper?.phone ? (
                            <Button variant="outline" className="w-full text-xs h-8 gap-1.5" asChild>
                              <a href={`tel:${(shipment as any).shipper.phone}`}>
                                <Phone className="h-3.5 w-3.5" /> Call Shipper
                              </a>
                            </Button>
                          ) : (
                            <Button variant="outline" className="w-full text-xs h-8 gap-1.5" onClick={() => toast({ title: "In-App Call", description: `Connecting you with ${(shipment as any).shipper?.firstName || "the shipper"}. Both parties will be notified.` })}>
                              <Phone className="h-3.5 w-3.5" /> Call Shipper
                            </Button>
                          )}
                        </>
                      ) : (
                        <p className="text-[11px] text-muted-foreground text-center py-1">Contact is only available once your bid is accepted.</p>
                      )}
                      <ReportModal
                        reportedUserId={shipment.shipperId}
                        reportedUserName={`${(shipment as any).shipper?.firstName || ""} ${(shipment as any).shipper?.lastName || ""}`.trim() || "this shipper"}
                        trigger={
                          <div className="flex items-center justify-center gap-1.5 w-full text-xs text-muted-foreground hover:text-destructive transition-colors py-1 cursor-pointer">
                            <Flag className="h-3 w-3" /> Report Shipper
                          </div>
                        }
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>

      {/* Bid submission confirmation modal */}
      <EscrowConfirmModal
        open={bidConfirmOpen}
        onOpenChange={setBidConfirmOpen}
        title="Confirm Bid Submission"
        description={`You're submitting a $${pendingBidValues?.amount?.toFixed(2) ?? "0.00"} bid. If accepted, a 3% platform fee (held in escrow) is charged to you. You are paid directly by the shipper — KarHaul does not process transport payments.`}
        fees={budgetMax > 0 ? [
          { label: "Your platform fee (3% of max budget)", amount: driverFee },
        ] : []}
        commitmentText="By confirming, you commit to transporting this vehicle if your bid is accepted. You have 1 hour after acceptance to cancel penalty-free. Cancelling after that forfeits your escrow."
        confirmLabel="Submit Bid"
        onConfirm={confirmPlaceBid}
        isLoading={placeBidMutation.isPending}
      />

      {/* Accept bid confirmation modal */}
      <EscrowConfirmModal
        open={acceptConfirmOpen}
        onOpenChange={setAcceptConfirmOpen}
        title="Accept Bid & Create Booking"
        description={`Accepting creates a binding booking. A 5% platform fee is held in escrow from you now; the driver's 3% is held when they confirm. Both fees go to KarHaul on delivery. You pay the driver directly — KarHaul does not process transport payments.`}
        fees={budgetMax > 0 ? [
          { label: "Your platform fee (5% of max budget)", amount: shipperFee },
          { label: "Driver platform fee (3% of max budget)", amount: driverFee },
        ] : []}
        commitmentText="You have 1 hour to cancel penalty-free. After that, cancelling forfeits your escrow. If the driver no-shows, you get your escrow back."
        confirmLabel="Accept Bid"
        onConfirm={confirmAcceptBid}
        isLoading={acceptBidMutation.isPending}
      />

      {/* Save driver prompt after acceptance */}
      <Dialog open={saveDriverOpen} onOpenChange={open => { if (!open) { setSaveDriverOpen(false); if (justAcceptedBookingId) setLocation(`/bookings/${justAcceptedBookingId}`); } }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Save {justAcceptedDriver?.name} to your network?</DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              Save this driver so you can rebook them directly on future loads — no bidding required.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 flex-1" onClick={() => { setSaveDriverOpen(false); if (justAcceptedBookingId) setLocation(`/bookings/${justAcceptedBookingId}`); }}>
              Skip
            </Button>
            <Button className="bg-rose-600 hover:bg-rose-500 text-white border-0 flex-1" disabled={saveDriverMutation.isPending}
              onClick={() => {
                if (!justAcceptedDriver?.id) return;
                saveDriverMutation.mutate(justAcceptedDriver.id, {
                  onSettled: () => { setSaveDriverOpen(false); if (justAcceptedBookingId) setLocation(`/bookings/${justAcceptedBookingId}`); },
                  onSuccess: () => toast({ title: `${justAcceptedDriver.name} saved!`, description: "Find them in Saved Drivers to rebook anytime." }),
                });
              }}>
              {saveDriverMutation.isPending ? "Saving…" : "Save Driver"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
