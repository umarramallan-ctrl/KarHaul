import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/AuthGuard";
import { useGetBooking, useUpdateBookingStatus, useGetMyProfile } from "@workspace/api-client-react";
import { useRoute, Link } from "wouter";
import { formatCurrency, formatDateTime, getStatusColor, formatVehicleName } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Truck, MapPin, CheckCircle2, Navigation, MessageSquare, AlertTriangle, User, Info, Phone, PlusCircle, Loader2, Shield, DollarSign, Clock, Star, XCircle, ArrowLeft, CreditCard, Banknote, Heart } from "lucide-react";
import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiBase } from "@/lib/api";

const MILESTONE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  departed_origin: { label: "Departed Origin", icon: "🚛", color: "text-blue-600" },
  en_route: { label: "En Route", icon: "🛣️", color: "text-primary" },
  checkpoint: { label: "Location Checkpoint", icon: "📍", color: "text-violet-600" },
  weather_delay: { label: "Weather / Delay", icon: "⚠️", color: "text-amber-600" },
  near_destination: { label: "Approaching Destination", icon: "🏁", color: "text-emerald-600" },
  custom: { label: "Driver Update", icon: "💬", color: "text-slate-600" },
};

async function fetchTracking(bookingId: string) {
  const res = await fetch(`${apiBase}/bookings/${bookingId}/tracking`, { credentials: "include" });
  return res.json();
}

async function postCheckpoint(bookingId: string, data: Record<string, string>) {
  const res = await fetch(`${apiBase}/bookings/${bookingId}/tracking`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
  return res.json();
}

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];

function TrackingPanel({ bookingId, isDriver, bookingStatus }: { bookingId: string; isDriver: boolean; bookingStatus: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ city: "", state: "", milestone: "en_route", notes: "", estimatedArrival: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["tracking", bookingId],
    queryFn: () => fetchTracking(bookingId),
    refetchInterval: 60000,
  });

  const mutation = useMutation({
    mutationFn: (d: Record<string, string>) => postCheckpoint(bookingId, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tracking", bookingId] });
      setShowForm(false);
      setForm({ city: "", state: "", milestone: "en_route", notes: "", estimatedArrival: "" });
      toast({ title: "Location update posted", description: "The shipper has been notified." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const checkpoints = data?.checkpoints || [];
  const isActive = !["delivered", "cancelled"].includes(bookingStatus);

  return (
    <Card className="mb-8">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-primary" /> Location Updates
          </CardTitle>
          {isDriver && isActive && (
            <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => setShowForm(v => !v)}>
              <PlusCircle className="h-3.5 w-3.5" /> Post Update
            </Button>
          )}
        </div>
        {!isDriver && <p className="text-xs text-muted-foreground mt-1">Your driver posts location checkpoints along the route. Updates appear here within minutes.</p>}
      </CardHeader>
      <CardContent>
        {isDriver && isActive && showForm && (
          <div className="mb-5 p-4 bg-muted/40 rounded-xl border space-y-3">
            <h4 className="text-sm font-semibold">Post Location Update</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">City (optional)</label>
                <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="e.g. Oklahoma City" className="h-9" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">State</label>
                <Select value={form.state} onValueChange={v => setForm(f => ({ ...f, state: v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="State" /></SelectTrigger>
                  <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Milestone</label>
                <Select value={form.milestone} onValueChange={v => setForm(f => ({ ...f, milestone: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(MILESTONE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Est. Arrival (optional)</label>
                <Input type="date" value={form.estimatedArrival} onChange={e => setForm(f => ({ ...f, estimatedArrival: e.target.value }))} className="h-9" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Note (optional)</label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Running about 2 hours ahead of schedule" className="h-9" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
                {mutation.isPending ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Posting...</> : "Post Update"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : checkpoints.length === 0 ? (
          <div className="py-8 text-center">
            <Navigation className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-sm text-muted-foreground">No location updates yet. {isDriver ? "Post your first update above." : "Your driver will post checkpoints as they travel."}</p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 border-l-2 border-muted ml-2">
            {checkpoints.map((cp: any, i: number) => {
              const m = MILESTONE_LABELS[cp.milestone] || MILESTONE_LABELS.custom;
              return (
                <div key={cp.id} className="relative">
                  <div className="absolute -left-[27px] top-1 w-5 h-5 rounded-full bg-background border-2 border-primary flex items-center justify-center text-[10px]">
                    {m.icon}
                  </div>
                  <div className="bg-muted/30 rounded-xl p-3 border">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`text-xs font-semibold ${m.color} uppercase tracking-wide`}>{m.label}</span>
                        {(cp.city || cp.state) && (
                          <p className="font-semibold mt-0.5">{[cp.city, cp.state].filter(Boolean).join(", ")}</p>
                        )}
                        {cp.notes && <p className="text-sm text-muted-foreground mt-1">{cp.notes}</p>}
                        {cp.estimatedArrival && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600">
                            <Clock className="h-3 w-3" /> Est. arrival: {cp.estimatedArrival}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 mt-0.5">{new Date(cp.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InAppCallButton({ otherName }: { otherName: string }) {
  const { toast } = useToast();
  const [calling, setCalling] = useState(false);
  const handleCall = () => {
    setCalling(true);
    setTimeout(() => {
      setCalling(false);
      toast({ title: "Call initiated", description: `Connecting you with ${otherName}. Both parties have been notified.` });
    }, 1500);
  };
  return (
    <Button variant="outline" className="w-full gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20" onClick={handleCall} disabled={calling}>
      {calling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
      {calling ? "Connecting..." : `Call ${otherName}`}
    </Button>
  );
}

function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="focus:outline-none"
          >
            <Star
              className={`h-6 w-6 transition-colors ${
                star <= (hover || value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

async function fetchBookingReviews(bookingId: string) {
  const res = await fetch(`${apiBase}/reviews/booking/${bookingId}`, { credentials: "include" });
  if (!res.ok) return { reviews: [], total: 0 };
  return res.json();
}

async function submitReview(data: Record<string, any>) {
  const res = await fetch(`${apiBase}/reviews`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed to submit review"); }
  return res.json();
}

const CRITERIA_DISPLAY: { key: string; label: string }[] = [
  { key: "timelyPickup",              label: "Pickup on Time" },
  { key: "deliveryOnTime",            label: "Delivery on Time" },
  { key: "vehicleCondition",          label: "Vehicle Condition" },
  { key: "communication",             label: "Communication" },
  { key: "professionalism",           label: "Professionalism" },
  { key: "timelyPayment",             label: "Timely Payment" },
  { key: "accurateVehicleDescription",label: "Accurate Description" },
  { key: "easyAccess",                label: "Easy Access" },
];

function ReviewPanel({ bookingId, isShipper, isDriver, revieweeId, revieweeName }: {
  bookingId: string;
  isShipper: boolean;
  isDriver: boolean;
  revieweeId: string;
  revieweeName: string;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  // Overall
  const [rating, setRating] = useState(0);
  // Shipper → Driver
  const [timelyPickup,    setTimelyPickup]    = useState(0);
  const [deliveryOnTime,  setDeliveryOnTime]  = useState(0);
  const [vehicleCondition,setVehicleCondition]= useState(0);
  const [professionalism, setProfessionalism] = useState(0);
  // Driver → Shipper
  const [timelyPayment,              setTimelyPayment]              = useState(0);
  const [accurateVehicleDescription, setAccurateVehicleDescription] = useState(0);
  const [easyAccess,                 setEasyAccess]                 = useState(0);
  // Both
  const [communication, setCommunication] = useState(0);
  const [comment, setComment] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["bookingReviews", bookingId],
    queryFn: () => fetchBookingReviews(bookingId),
  });

  const myReview = data?.reviews?.find((r: any) =>
    (isShipper && r.reviewerRole === "shipper") ||
    (isDriver  && r.reviewerRole === "driver")
  );

  const mutation = useMutation({
    mutationFn: submitReview,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookingReviews", bookingId] });
      toast({ title: "Review submitted", description: "Thank you for your feedback!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = () => {
    if (!rating) { toast({ title: "Rating required", description: "Please set an overall rating.", variant: "destructive" }); return; }
    const payload: Record<string, any> = { bookingId, revieweeId, rating, comment: comment || undefined };
    if (isShipper) {
      if (timelyPickup)     payload.timelyPickup     = timelyPickup;
      if (deliveryOnTime)   payload.deliveryOnTime   = deliveryOnTime;
      if (vehicleCondition) payload.vehicleCondition = vehicleCondition;
      if (professionalism)  payload.professionalism  = professionalism;
    }
    if (isDriver) {
      if (timelyPayment)               payload.timelyPayment               = timelyPayment;
      if (accurateVehicleDescription)  payload.accurateVehicleDescription  = accurateVehicleDescription;
      if (easyAccess)                  payload.easyAccess                  = easyAccess;
    }
    if (communication) payload.communication = communication;
    mutation.mutate(payload);
  };

  if (isLoading) return null;

  return (
    <Card className="mb-6 border-amber-500/20 bg-amber-500/5">
      <CardHeader className="pb-3 border-b border-amber-500/20">
        <CardTitle className="flex items-center gap-2 text-base">
          <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
          {myReview ? `Your Review of ${revieweeName}` : `Rate ${revieweeName}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        {myReview ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={`h-5 w-5 ${s <= myReview.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
              ))}
              <span className="text-sm font-semibold">{myReview.rating}/5 overall</span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              {CRITERIA_DISPLAY.map(c => myReview[c.key] != null && (
                <p key={c.key} className="text-sm text-muted-foreground">
                  {c.label}: <span className="text-amber-500 font-semibold">{myReview[c.key]}/5</span>
                </p>
              ))}
            </div>
            {myReview.comment && (
              <p className="text-sm italic text-muted-foreground border-t pt-3">"{myReview.comment}"</p>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <StarRating value={rating} onChange={setRating} label="Overall Rating *" />

            {isShipper && (
              <>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-t pt-4">Driver Performance</p>
                <StarRating value={timelyPickup}     onChange={setTimelyPickup}     label="Pickup on Time" />
                <StarRating value={deliveryOnTime}   onChange={setDeliveryOnTime}   label="Delivery on Time" />
                <StarRating value={vehicleCondition} onChange={setVehicleCondition} label="Vehicle Condition at Delivery" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-t pt-4">Interaction</p>
                <StarRating value={communication}    onChange={setCommunication}    label="Communication & Responsiveness" />
                <StarRating value={professionalism}  onChange={setProfessionalism}  label="Professionalism" />
              </>
            )}

            {isDriver && (
              <>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-t pt-4">Shipper Information</p>
                <StarRating value={timelyPayment}               onChange={setTimelyPayment}               label="Timely Payment" />
                <StarRating value={accurateVehicleDescription}  onChange={setAccurateVehicleDescription}  label="Accurate Vehicle Description" />
                <StarRating value={easyAccess}                  onChange={setEasyAccess}                  label="Easy Pickup / Dropoff Access" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-t pt-4">Interaction</p>
                <StarRating value={communication} onChange={setCommunication} label="Communication & Responsiveness" />
              </>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Comment (optional)</label>
              <Textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Share details about your experience..."
                className="resize-none h-24"
              />
            </div>
            <Button onClick={handleSubmit} disabled={mutation.isPending} className="w-full">
              {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</> : "Submit Review"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function BookingDetail() {
  const [, params] = useRoute("/bookings/:id");
  const bookingId = params?.id || "";
  const { toast } = useToast();

  const { data: profile } = useGetMyProfile();
  const { data: booking, isLoading, refetch } = useGetBooking(bookingId, { query: { enabled: !!bookingId } as any });
  const updateStatusMutation = useUpdateBookingStatus();
  const [notes, setNotes] = useState("");
  const [saveDriverDismissed, setSaveDriverDismissed] = useState(false);
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["saved-drivers"] }); setSaveDriverDismissed(true); toast({ title: "Driver saved!", description: "Find them in Saved Drivers to rebook anytime." }); },
    onError: () => { setSaveDriverDismissed(true); },
  });

  const isDriver = profile?.id === (booking as any)?.driverId;
  const isShipper = profile?.id === (booking as any)?.shipperId;
  const b = booking as any;
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!b.cancellationDeadline) return;
    const deadline = new Date(b.cancellationDeadline).getTime();
    const update = () => {
      const diff = deadline - Date.now();
      if (diff <= 0) { setTimeLeft("Expired"); return; }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}m ${secs}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [b.cancellationDeadline]);

  const withinWindow = b.cancellationDeadline
    ? new Date() <= new Date(b.cancellationDeadline)
    : false;

  async function handleCancel() {
    const res = await fetch(`${apiBase}/bookings/${bookingId}/cancel`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const e = await res.json();
      toast({ title: "Cancel failed", description: e.error, variant: "destructive" });
    } else {
      toast({ title: "Booking cancelled", description: withinWindow ? "Escrow returned to both parties." : "Escrow forfeited per cancellation policy." });
      setCancelConfirm(false);
      refetch();
    }
  }

  const handleUpdateStatus = (newStatus: "picked_up" | "in_transit" | "delivered") => {
    updateStatusMutation.mutate({ bookingId, data: { status: newStatus, trackingNotes: notes } }, {
      onSuccess: () => {
        toast({ title: "Status Updated", description: `Shipment marked as ${newStatus.replace("_", " ")}` });
        setNotes("");
        refetch();
      },
      onError: (err: any) => toast({ title: "Update Failed", description: err.message, variant: "destructive" }),
    });
  };

  if (isLoading || !booking) {
    return <MainLayout><div className="container py-20 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div></MainLayout>;
  }

  const steps = ["confirmed", "picked_up", "in_transit", "delivered"];
  const currentStepIndex = steps.indexOf(b.status);
  const platformFee = b.platformFeeAmount ?? 0;
  const totalShipperCost = b.agreedPrice + platformFee;

  return (
    <AuthGuard>
      <MainLayout>
        <div className="bg-slate-50 dark:bg-slate-900/20 py-8 min-h-screen border-t">
          <div className="container max-w-5xl mx-auto px-4">

            <button onClick={() => window.history.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 -ml-1 group">
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              Back
            </button>

            {/* Confirmation banner for newly created booking */}
            {b.status === "confirmed" && isShipper && (
              <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  <h2 className="font-bold text-emerald-300 text-base">Booking Confirmed — Next Steps</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="rounded-xl bg-slate-900/50 border border-slate-700/60 p-4 space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Banknote className="h-4 w-4 text-blue-400" />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Payment Instructions</span>
                    </div>
                    <p className="text-sm text-slate-300">
                      Pay the agreed price of <span className="font-bold text-white">{formatCurrency(b.agreedPrice)}</span> directly to the carrier at pickup or via agreed method.
                    </p>
                    <p className="text-xs text-slate-500 mt-2">KarHaul does not process transport payments — this is between you and the carrier.</p>
                  </div>
                  <div className="rounded-xl bg-slate-900/50 border border-slate-700/60 p-4 space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-violet-400" />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Escrow & Platform Fee</span>
                    </div>
                    <p className="text-sm text-slate-300">
                      A 5% platform fee ({b.shipment?.shipperEscrowAmount ? `$${Number(b.shipment.shipperEscrowAmount).toFixed(2)}` : "—"}) is held in escrow and released upon delivery confirmation.
                    </p>
                    <p className="text-xs text-slate-500 mt-2">Cancellations within 1 hour of booking incur no penalty. After that, the escrow fee is forfeited.</p>
                  </div>
                </div>
                <div className="mt-4 rounded-xl bg-slate-900/50 border border-slate-700/60 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Shipment Details</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div><span className="text-slate-500 text-xs">Vehicle</span><p className="text-white font-medium">{b.shipment?.vehicleYear} {b.shipment?.vehicleMake} {b.shipment?.vehicleModel}</p></div>
                    <div><span className="text-slate-500 text-xs">Pickup</span><p className="text-white font-medium">{b.shipment?.originCity}, {b.shipment?.originState}</p></div>
                    <div><span className="text-slate-500 text-xs">Delivery</span><p className="text-white font-medium">{b.shipment?.destinationCity}, {b.shipment?.destinationState}</p></div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl md:text-3xl font-display font-bold">Booking #{b.id?.split("-")[0].toUpperCase()}</h1>
                  <Badge className={getStatusColor(b.status)}>{b.status?.replace("_", " ").toUpperCase()}</Badge>
                </div>
                <p className="text-muted-foreground">Created {formatDateTime(b.createdAt)}</p>
              </div>
              <div className="bg-background px-5 py-3 rounded-xl border shadow-sm space-y-1 text-right">
                <div className="flex items-center justify-between gap-8">
                  <span className="text-xs text-muted-foreground">Transport price</span>
                  <span className="font-semibold">{formatCurrency(b.agreedPrice)}</span>
                </div>
                {platformFee > 0 && (
                  <div className="flex items-center justify-between gap-8">
                    <span className="text-xs text-muted-foreground">Platform fee (3%)</span>
                    <span className="text-sm text-amber-600">+{formatCurrency(platformFee)}</span>
                  </div>
                )}
                {platformFee > 0 && (
                  <div className="flex items-center justify-between gap-8 pt-1 border-t">
                    <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Total</span>
                    <span className="text-2xl font-display font-bold">{formatCurrency(totalShipperCost)}</span>
                  </div>
                )}
                {platformFee === 0 && (
                  <p className="text-2xl font-display font-bold">{formatCurrency(b.agreedPrice)}</p>
                )}
              </div>
            </div>

            {/* Status Timeline */}
            <Card className="mb-6 overflow-hidden">
              <div className="bg-slate-900 p-6 text-white">
                <h3 className="font-semibold mb-6 flex items-center"><Navigation className="h-5 w-5 mr-2 text-primary" /> Transport Timeline</h3>
                <div className="relative">
                  <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -translate-y-1/2 z-0" />
                  <div className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 z-0 transition-all duration-1000" style={{ width: `${(Math.max(0, currentStepIndex) / 3) * 100}%` }} />
                  <div className="relative z-10 flex justify-between">
                    {[{ id: "confirmed", label: "Booked" }, { id: "picked_up", label: "Picked Up" }, { id: "in_transit", label: "In Transit" }, { id: "delivered", label: "Delivered" }].map((step, idx) => {
                      const isCompleted = currentStepIndex >= idx;
                      const isCurrent = currentStepIndex === idx;
                      return (
                        <div key={step.id} className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-slate-900 transition-colors ${isCompleted ? "bg-primary text-white" : "bg-slate-700"} ${isCurrent ? "ring-4 ring-primary/30" : ""}`}>
                            {isCompleted && <CheckCircle2 className="h-4 w-4" />}
                          </div>
                          <span className={`text-xs mt-2 font-medium ${isCompleted ? "text-white" : "text-slate-500"}`}>{step.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              {isDriver && b.status !== "delivered" && b.status !== "cancelled" && (
                <div className="p-6 bg-accent/5 border-t">
                  <h4 className="font-bold mb-4">Update Transport Status</h4>
                  <div className="flex flex-col md:flex-row gap-4">
                    <Textarea placeholder="Add an optional tracking note (e.g. 'Running 2 hours late due to traffic')" className="resize-none bg-background" value={notes} onChange={e => setNotes(e.target.value)} />
                    <div className="flex flex-col gap-2 shrink-0 md:w-48">
                      {b.status === "confirmed" && <Button className="w-full" onClick={() => handleUpdateStatus("picked_up")} disabled={updateStatusMutation.isPending}>Mark Picked Up</Button>}
                      {b.status === "picked_up" && <Button className="w-full" onClick={() => handleUpdateStatus("in_transit")} disabled={updateStatusMutation.isPending}>Mark In Transit</Button>}
                      {b.status === "in_transit" && <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => handleUpdateStatus("delivered")} disabled={updateStatusMutation.isPending}>Mark Delivered</Button>}
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Escrow & Cancellation Policy */}
            {["confirmed", "picked_up", "in_transit"].includes(b.status) && (
              <Card className="mb-6 border-slate-700/40 bg-slate-900/30">
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row gap-4 items-start">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-blue-400" />
                        <span className="text-sm font-bold text-white">Escrow Status</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg bg-slate-800/50 border border-slate-700/60 p-3">
                          <div className="text-xs text-slate-500 mb-1">Shipper escrow (5%)</div>
                          <div className="font-bold text-white">
                            {b.shipment?.shipperEscrowAmount ? `$${b.shipment.shipperEscrowAmount.toFixed(2)}` : "—"}
                          </div>
                          <div className={`text-xs mt-1 ${
                            b.shipment?.shipperEscrowStatus === "held" ? "text-amber-400" :
                            b.shipment?.shipperEscrowStatus === "captured" ? "text-green-400" :
                            b.shipment?.shipperEscrowStatus === "returned" ? "text-blue-400" : "text-slate-500"
                          }`}>
                            {b.shipment?.shipperEscrowStatus ?? "none"}
                          </div>
                        </div>
                        <div className="rounded-lg bg-slate-800/50 border border-slate-700/60 p-3">
                          <div className="text-xs text-slate-500 mb-1">Driver escrow (3%)</div>
                          <div className="font-bold text-white">
                            {b.driverEscrowAmount ? `$${b.driverEscrowAmount.toFixed(2)}` : "—"}
                          </div>
                          <div className={`text-xs mt-1 ${
                            b.driverEscrowStatus === "held" ? "text-amber-400" :
                            b.driverEscrowStatus === "captured" ? "text-green-400" :
                            b.driverEscrowStatus === "returned" ? "text-blue-400" : "text-slate-500"
                          }`}>
                            {b.driverEscrowStatus ?? "none"}
                          </div>
                        </div>
                      </div>
                    </div>
                    {b.cancellationDeadline && b.status === "confirmed" && (
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-amber-400" />
                          <span className="text-sm font-bold text-white">Cancellation Window</span>
                        </div>
                        <div className={`rounded-lg border p-3 text-sm ${withinWindow ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                          {withinWindow ? (
                            <>
                              <div className="text-emerald-400 font-bold text-lg">{timeLeft}</div>
                              <div className="text-xs text-slate-400 mt-1">Cancel now for a full escrow refund.</div>
                            </>
                          ) : (
                            <>
                              <div className="text-red-400 font-bold">Window closed</div>
                              <div className="text-xs text-slate-400 mt-1">Cancelling now forfeits your escrow.</div>
                            </>
                          )}
                        </div>
                        {!cancelConfirm ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-500/40 text-red-400 hover:bg-red-500/10 w-full"
                            onClick={() => setCancelConfirm(true)}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1.5" />
                            Cancel Booking
                          </Button>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs text-red-400">
                              {withinWindow
                                ? "Are you sure? Escrow will be returned to both parties."
                                : "Warning: cancelling now will forfeit your escrow fee."}
                            </p>
                            <div className="flex gap-2">
                              <Button size="sm" variant="destructive" className="flex-1" onClick={handleCancel}>Confirm Cancel</Button>
                              <Button size="sm" variant="outline" className="flex-1 border-slate-700" onClick={() => setCancelConfirm(false)}>Go Back</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Location Tracking */}
            <TrackingPanel bookingId={bookingId} isDriver={isDriver} bookingStatus={b.status} />

            {/* Save driver prompt after delivery */}
            {b.status === "delivered" && isShipper && b.driverId && !saveDriverDismissed && (
              <Card className="mb-6 border-rose-500/30 bg-rose-500/5">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                      <Heart className="h-5 w-5 text-rose-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm mb-1">Save {b.driver?.firstName || "this driver"} for future loads?</p>
                      <p className="text-xs text-slate-400 mb-4">Add them to your Saved Drivers network so you can rebook directly — no bidding required next time.</p>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-rose-600 hover:bg-rose-500 text-white border-0" disabled={saveDriverMutation.isPending}
                          onClick={() => saveDriverMutation.mutate(b.driverId)}>
                          {saveDriverMutation.isPending ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving…</> : "Save Driver"}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white" onClick={() => setSaveDriverDismissed(true)}>
                          No thanks
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Review Panel — shown after delivery */}
            {b.status === "delivered" && (isShipper || isDriver) && (
              <ReviewPanel
                bookingId={bookingId}
                isShipper={isShipper}
                isDriver={isDriver}
                revieweeId={isShipper ? b.driverId : b.shipperId}
                revieweeName={isShipper ? `${b.driver?.firstName || "Driver"}` : `${b.shipper?.firstName || "Shipper"}`}
              />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg"><Truck className="mr-2 h-5 w-5" /> Transport Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/30 p-4 rounded-lg border mb-6">
                      <h3 className="font-bold text-xl mb-1">{b.shipment ? formatVehicleName(b.shipment.vehicleYear, b.shipment.vehicleMake, b.shipment.vehicleModel) : ""}</h3>
                      <div className="flex gap-2 text-sm mt-2">
                        <Badge variant="secondary">{b.shipment?.vehicleType}</Badge>
                        <Badge variant="outline">{b.shipment?.transportType} transport</Badge>
                        {(b.shipment as any)?.serviceType && (
                          <Badge variant="outline">
                            {(b.shipment as any).serviceType === 'door_to_door' ? 'Door to Door' : 'Door to Port'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="relative pl-6 space-y-8 border-l-2 border-muted ml-3">
                      <div className="relative">
                        <div className="absolute -left-[31px] bg-background border-2 border-primary w-4 h-4 rounded-full" />
                        <p className="text-xs font-bold text-primary uppercase">Origin</p>
                        <p className="font-semibold text-lg">{b.shipment?.originCity}, {b.shipment?.originState} {b.shipment?.originZip}</p>
                        <p className="text-sm text-muted-foreground mt-1">{b.shipment?.originAddress || "Address provided directly by shipper"}</p>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[31px] bg-background border-2 border-accent w-4 h-4 rounded-full" />
                        <p className="text-xs font-bold text-accent uppercase">Destination</p>
                        <p className="font-semibold text-lg">{b.shipment?.destinationCity}, {b.shipment?.destinationState} {b.shipment?.destinationZip}</p>
                        <p className="text-sm text-muted-foreground mt-1">{b.shipment?.destinationAddress || "Address provided directly by shipper"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Platform Fee Info */}
                {platformFee > 0 && (
                  <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Platform Fee Breakdown</p>
                          <div className="text-xs text-amber-700 dark:text-amber-400 mt-1 space-y-1">
                            <p><strong>Shipper:</strong> 5% of the max budget held in escrow when the load was posted — released to KarHaul on delivery.</p>
                            <p><strong>Driver:</strong> 3% of the max budget held in escrow when bid was accepted — released to KarHaul on delivery.</p>
                            <p className="pt-1 border-t border-amber-300/30"><strong>Transport payment:</strong> KarHaul does not process payments between shipper and driver. You pay each other directly.</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Contact Column */}
              <div className="space-y-6">
                {isShipper && (
                  <Card className="border-primary/20 shadow-sm">
                    <CardHeader className="bg-primary/5 pb-4">
                      <CardTitle className="text-base flex justify-between items-center">
                        Assigned Carrier <Badge variant="outline" className="bg-white"><Shield className="h-3 w-3 mr-1 text-emerald-600" />Verified</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="font-bold text-lg">{b.driver?.firstName} {b.driver?.lastName}</div>
                          {b.driver?.dotNumber && <div className="text-xs text-muted-foreground">DOT #{b.driver.dotNumber}</div>}
                        </div>
                      </div>
                      <div className="space-y-1.5 text-sm bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border">
                        <div className="flex justify-between"><span className="text-muted-foreground">Equipment:</span><span className="font-medium">{b.driver?.truckType || "Auto Carrier"}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Hauls completed:</span><span className="font-medium">{b.driver?.completedJobs ?? 0}</span></div>
                        {(b.driver?.averageRating ?? 0) > 0 && (
                          <div className="flex justify-between"><span className="text-muted-foreground">Rating:</span><span className="font-medium">★ {b.driver?.averageRating?.toFixed(1)} ({b.driver?.totalReviews} reviews)</span></div>
                        )}
                      </div>
                      <Button className="w-full gap-2" asChild>
                        <Link href="/messages"><MessageSquare className="h-4 w-4" /> Message Carrier</Link>
                      </Button>
                      <InAppCallButton otherName={`${b.driver?.firstName || "Carrier"}`} />
                    </CardContent>
                  </Card>
                )}

                {isDriver && (
                  <Card>
                    <CardHeader className="pb-4 border-b">
                      <CardTitle className="text-base">Shipper Contact</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-bold text-lg">{b.shipper?.firstName} {b.shipper?.lastName}</div>
                          <div className="text-xs text-muted-foreground">{b.shipper?.completedJobs ?? 0} hauls completed</div>
                        </div>
                      </div>
                      <Button className="w-full gap-2" variant="outline" asChild>
                        <Link href="/messages"><MessageSquare className="h-4 w-4" /> Message Shipper</Link>
                      </Button>
                      <InAppCallButton otherName={`${b.shipper?.firstName || "Shipper"}`} />
                    </CardContent>
                  </Card>
                )}

                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-blue-800 dark:text-blue-300">Use the in-app call button to connect securely. Sharing phone numbers or personal contact info in messages is not permitted for your protection.</p>
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-amber-800 dark:text-amber-400"><strong>Payment Reminder:</strong> KarHaul does not process payments. Payment terms are arranged directly between shipper and carrier.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    </AuthGuard>
  );
}
