import { MainLayout } from "@/components/layout/MainLayout";
import { useGetShipment, useGetShipmentBids, usePlaceBid, useAcceptBid, useGetMyProfile } from "@workspace/api-client-react";
import { useRoute, Link, useLocation } from "wouter";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { formatCurrency, formatDateTime, getStatusColor, formatVehicleName, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MapPin, Calendar, Clock, DollarSign, Truck, Info, AlertTriangle, ShieldCheck, CheckCircle2, User, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@workspace/replit-auth-web";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
  const { isAuthenticated } = useAuth();
  
  const { data: profile } = useGetMyProfile({ query: { enabled: isAuthenticated } });
  
  const { data: shipment, isLoading, refetch: refetchShipment } = useGetShipment(shipmentId, {
    query: { enabled: !!shipmentId }
  });
  
  const { data: bidsData, refetch: refetchBids } = useGetShipmentBids(shipmentId, {
    query: { enabled: !!shipmentId }
  });

  const placeBidMutation = usePlaceBid();
  const acceptBidMutation = useAcceptBid();
  
  const [isBidDialogOpen, setIsBidDialogOpen] = useState(false);

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
  const hasMyBid = bidsData?.bids.some(b => b.driverId === profile?.id);

  function onSubmitBid(values: z.infer<typeof bidSchema>) {
    placeBidMutation.mutate({
      shipmentId,
      data: values
    }, {
      onSuccess: () => {
        toast({ title: "Bid Placed Successfully", description: "The shipper will review your bid." });
        setIsBidDialogOpen(false);
        refetchBids();
        refetchShipment();
      },
      onError: (err: any) => {
        toast({ title: "Failed to place bid", description: err.message, variant: "destructive" });
      }
    });
  }

  function handleAcceptBid(bidId: string) {
    if (!confirm("Are you sure you want to accept this bid? This will create a binding booking.")) return;
    
    acceptBidMutation.mutate({ bidId }, {
      onSuccess: (booking) => {
        toast({ title: "Bid Accepted!", description: "Booking created successfully." });
        setLocation(`/bookings/${booking.id}`);
      },
      onError: (err: any) => {
        toast({ title: "Failed to accept bid", description: err.message, variant: "destructive" });
      }
    });
  }

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
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Badge className={getStatusColor(shipment.status)}>{shipment.status.replace('_', ' ').toUpperCase()}</Badge>
            <Badge variant="outline" className="text-white border-white/30 capitalize bg-white/5">{shipment.transportType} Transport</Badge>
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
                    <div className="uppercase text-xs font-bold text-primary tracking-wider mb-2">Origin</div>
                    <h3 className="text-2xl font-bold mb-1">{shipment.originCity}, {shipment.originState}</h3>
                    <p className="text-muted-foreground">{shipment.originZip}</p>
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
                    <div className="uppercase text-xs font-bold text-accent tracking-wider mb-2">Destination</div>
                    <h3 className="text-2xl font-bold mb-1">{shipment.destinationCity}, {shipment.destinationState}</h3>
                    <p className="text-muted-foreground">{shipment.destinationZip}</p>
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
                                    <span>{bid.driver?.completedJobs || 0} jobs</span>
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
                <CardTitle>Target Budget</CardTitle>
                <div className="text-3xl font-display font-bold mt-2">
                  {shipment.budgetMax ? `${formatCurrency(shipment.budgetMin || 0)} - ${formatCurrency(shipment.budgetMax)}` : 'Open for Bids'}
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

                          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex gap-3 mt-6">
                            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-800 dark:text-amber-300">
                              By submitting this bid, you agree to AutoHaul Connect's Terms of Service. You act as an independent carrier and hold full liability for the transport. AutoHaul Connect takes 0% commission.
                            </p>
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

            {/* Shipper Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCheck className="h-4 w-4" /> About the Shipper
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-lg font-bold text-primary">
                    {shipment.shipper?.firstName?.[0] || 'U'}
                  </div>
                  <div>
                    <div className="font-semibold">{shipment.shipper?.firstName} {shipment.shipper?.lastName}</div>
                    <div className="text-xs text-muted-foreground flex items-center">
                      ⭐ {shipment.shipper?.averageRating?.toFixed(1) || 'New'} ({shipment.shipper?.totalReviews || 0} reviews)
                    </div>
                  </div>
                </div>
                {isAuthenticated && !isOwner && (
                  <Button variant="outline" className="w-full text-xs h-8">
                    Message Shipper
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
