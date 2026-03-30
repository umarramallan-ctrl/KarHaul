import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/AuthGuard";
import { useGetBooking, useUpdateBookingStatus, useGetMyProfile } from "@workspace/api-client-react";
import { useRoute, Link } from "wouter";
import { formatCurrency, formatDateTime, getStatusColor, formatVehicleName } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Truck, MapPin, CheckCircle2, Navigation, MessageSquare, AlertTriangle, User, Info, Phone, PlusCircle, Loader2, Shield, DollarSign, Clock, Star } from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const MILESTONE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  departed_origin: { label: "Departed Origin", icon: "🚛", color: "text-blue-600" },
  en_route: { label: "En Route", icon: "🛣️", color: "text-primary" },
  checkpoint: { label: "Location Checkpoint", icon: "📍", color: "text-violet-600" },
  weather_delay: { label: "Weather / Delay", icon: "⚠️", color: "text-amber-600" },
  near_destination: { label: "Approaching Destination", icon: "🏁", color: "text-emerald-600" },
  custom: { label: "Driver Update", icon: "💬", color: "text-slate-600" },
};

async function fetchTracking(bookingId: string) {
  const res = await fetch(`${BASE}/api/bookings/${bookingId}/tracking`, { credentials: "include" });
  return res.json();
}

async function postCheckpoint(bookingId: string, data: Record<string, string>) {
  const res = await fetch(`${BASE}/api/bookings/${bookingId}/tracking`, {
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
  const res = await fetch(`${BASE}/api/reviews/booking/${bookingId}`, { credentials: "include" });
  if (!res.ok) return { reviews: [], total: 0 };
  return res.json();
}

async function submitReview(data: Record<string, any>) {
  const res = await fetch(`${BASE}/api/reviews`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed to submit review"); }
  return res.json();
}

function ReviewPanel({ bookingId, isShipper, isDriver, revieweeId, revieweeName }: {
  bookingId: string;
  isShipper: boolean;
  isDriver: boolean;
  revieweeId: string;
  revieweeName: string;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [timelyPickup, setTimelyPickup] = useState(0);
  const [deliveryOnTime, setDeliveryOnTime] = useState(0);
  const [timelyPayment, setTimelyPayment] = useState(0);
  const [comment, setComment] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["bookingReviews", bookingId],
    queryFn: () => fetchBookingReviews(bookingId),
  });

  const myReview = data?.reviews?.find((r: any) =>
    (isShipper && r.reviewerRole === "shipper") ||
    (isDriver && r.reviewerRole === "driver")
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
      if (timelyPickup) payload.timelyPickup = timelyPickup;
      if (deliveryOnTime) payload.deliveryOnTime = deliveryOnTime;
    }
    if (isDriver && timelyPayment) payload.timelyPayment = timelyPayment;
    mutation.mutate(payload);
  };

  if (isLoading) return null;

  return (
    <Card className="mb-6 border-primary/20">
      <CardHeader className="pb-3 bg-primary/5 rounded-t-xl">
        <CardTitle className="flex items-center gap-2 text-base">
          <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
          {myReview ? `Your Review of ${revieweeName}` : `Rate ${revieweeName}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        {myReview ? (
          <div className="space-y-3">
            <div className="flex gap-1">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={`h-5 w-5 ${s <= myReview.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
              ))}
              <span className="text-sm text-muted-foreground ml-1">{myReview.rating}/5 overall</span>
            </div>
            {myReview.timelyPickup && (
              <p className="text-sm text-muted-foreground">Timely Pickup: {myReview.timelyPickup}/5</p>
            )}
            {myReview.deliveryOnTime && (
              <p className="text-sm text-muted-foreground">Delivery on Time: {myReview.deliveryOnTime}/5</p>
            )}
            {myReview.timelyPayment && (
              <p className="text-sm text-muted-foreground">Timely Payment: {myReview.timelyPayment}/5</p>
            )}
            {myReview.comment && (
              <p className="text-sm italic text-muted-foreground">"{myReview.comment}"</p>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <StarRating value={rating} onChange={setRating} label="Overall Rating *" />
            {isShipper && (
              <>
                <StarRating value={timelyPickup} onChange={setTimelyPickup} label="Timely Pickup" />
                <StarRating value={deliveryOnTime} onChange={setDeliveryOnTime} label="Delivery on Time" />
              </>
            )}
            {isDriver && (
              <StarRating value={timelyPayment} onChange={setTimelyPayment} label="Timely Payment" />
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Comment (optional)</label>
              <Textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Share details about your experience..."
                className="resize-none h-20"
              />
            </div>
            <Button onClick={handleSubmit} disabled={mutation.isPending} className="w-full">
              {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</> : "Submit Review"}
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
  const { data: booking, isLoading, refetch } = useGetBooking(bookingId, { query: { enabled: !!bookingId } });
  const updateStatusMutation = useUpdateBookingStatus();
  const [notes, setNotes] = useState("");

  const isDriver = profile?.id === (booking as any)?.driverId;
  const isShipper = profile?.id === (booking as any)?.shipperId;
  const b = booking as any;

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

            {/* Location Tracking */}
            <TrackingPanel bookingId={bookingId} isDriver={isDriver} bookingStatus={b.status} />

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
                          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">A 3% platform maintenance fee ({formatCurrency(platformFee)}) is charged to the shipper on top of the agreed transport price. This keeps KarHaul free for drivers and funds platform safety, insurance verification, and support. You still save significantly versus broker-arranged transport.</p>
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
