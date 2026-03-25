import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/AuthGuard";
import { useGetBooking, useUpdateBookingStatus, useGetMyProfile } from "@workspace/api-client-react";
import { useRoute, Link } from "wouter";
import { formatCurrency, formatDateTime, getStatusColor, formatVehicleName } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Truck, MapPin, CheckCircle2, Navigation, MessageSquare, AlertTriangle, User } from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

export default function BookingDetail() {
  const [, params] = useRoute("/bookings/:id");
  const bookingId = params?.id || "";
  const { toast } = useToast();
  
  const { data: profile } = useGetMyProfile();
  const { data: booking, isLoading, refetch } = useGetBooking(bookingId, {
    query: { enabled: !!bookingId }
  });
  
  const updateStatusMutation = useUpdateBookingStatus();
  const [notes, setNotes] = useState("");

  const isDriver = profile?.id === booking?.driverId;
  const isShipper = profile?.id === booking?.shipperId;

  const handleUpdateStatus = (newStatus: "picked_up" | "in_transit" | "delivered") => {
    updateStatusMutation.mutate({
      bookingId,
      data: { status: newStatus, trackingNotes: notes }
    }, {
      onSuccess: () => {
        toast({ title: "Status Updated", description: `Shipment marked as ${newStatus.replace('_', ' ')}` });
        setNotes("");
        refetch();
      },
      onError: (err: any) => {
        toast({ title: "Update Failed", description: err.message, variant: "destructive" });
      }
    });
  };

  if (isLoading || !booking) {
    return (
      <MainLayout>
        <div className="container py-20 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div></div>
      </MainLayout>
    );
  }

  // Calculate timeline progress
  const steps = ['confirmed', 'picked_up', 'in_transit', 'delivered'];
  const currentStepIndex = steps.indexOf(booking.status);

  return (
    <AuthGuard>
      <MainLayout>
        <div className="bg-slate-50 dark:bg-slate-900/20 py-8 min-h-screen border-t">
          <div className="container max-w-5xl mx-auto px-4">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl md:text-3xl font-display font-bold">Booking #{booking.id.split('-')[0].toUpperCase()}</h1>
                  <Badge className={getStatusColor(booking.status)}>{booking.status.replace('_', ' ').toUpperCase()}</Badge>
                </div>
                <p className="text-muted-foreground">Contract finalized on {formatDateTime(booking.createdAt)}</p>
              </div>
              <div className="text-right bg-background px-4 py-2 rounded-xl border shadow-sm">
                 <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Agreed Price</p>
                 <p className="text-3xl font-display font-bold text-foreground">{formatCurrency(booking.agreedPrice)}</p>
              </div>
            </div>

            {/* Status Timeline */}
            <Card className="mb-8 overflow-hidden">
              <div className="bg-slate-900 p-6 text-white">
                <h3 className="font-semibold mb-6 flex items-center"><Navigation className="h-5 w-5 mr-2 text-primary"/> Transport Timeline</h3>
                
                <div className="relative">
                  <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -translate-y-1/2 z-0"></div>
                  <div className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 z-0 transition-all duration-1000" 
                       style={{ width: `${(Math.max(0, currentStepIndex) / 3) * 100}%` }}></div>
                  
                  <div className="relative z-10 flex justify-between">
                    {[
                      { id: 'confirmed', label: 'Booked' },
                      { id: 'picked_up', label: 'Picked Up' },
                      { id: 'in_transit', label: 'In Transit' },
                      { id: 'delivered', label: 'Delivered' }
                    ].map((step, idx) => {
                      const isCompleted = currentStepIndex >= idx;
                      const isCurrent = currentStepIndex === idx;
                      return (
                        <div key={step.id} className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-slate-900 transition-colors ${
                            isCompleted ? 'bg-primary text-white' : 'bg-slate-700 text-transparent'
                          } ${isCurrent ? 'ring-4 ring-primary/30' : ''}`}>
                            {isCompleted && <CheckCircle2 className="h-4 w-4" />}
                          </div>
                          <span className={`text-xs mt-2 font-medium ${isCompleted ? 'text-white' : 'text-slate-500'}`}>{step.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Driver Action Panel (Only visible to Driver if not delivered) */}
              {isDriver && booking.status !== 'delivered' && booking.status !== 'cancelled' && (
                <div className="p-6 bg-accent/5 border-t">
                  <h4 className="font-bold mb-4">Update Transport Status</h4>
                  <div className="flex flex-col md:flex-row gap-4">
                    <Textarea 
                      placeholder="Add an optional tracking note (e.g. 'Running 2 hours late due to traffic')" 
                      className="resize-none bg-background"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    <div className="flex flex-col gap-2 shrink-0 md:w-48">
                      {booking.status === 'confirmed' && (
                        <Button className="w-full" onClick={() => handleUpdateStatus('picked_up')} disabled={updateStatusMutation.isPending}>
                          Mark Picked Up
                        </Button>
                      )}
                      {booking.status === 'picked_up' && (
                        <Button className="w-full" onClick={() => handleUpdateStatus('in_transit')} disabled={updateStatusMutation.isPending}>
                          Mark In Transit
                        </Button>
                      )}
                      {booking.status === 'in_transit' && (
                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => handleUpdateStatus('delivered')} disabled={updateStatusMutation.isPending}>
                          Mark Delivered
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Vehicle & Route */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg"><Truck className="mr-2 h-5 w-5"/> Transport Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/30 p-4 rounded-lg border mb-6">
                       <h3 className="font-bold text-xl mb-1">{booking.shipment ? formatVehicleName(booking.shipment.vehicleYear, booking.shipment.vehicleMake, booking.shipment.vehicleModel) : ''}</h3>
                       <div className="flex gap-2 text-sm mt-2">
                         <Badge variant="secondary">{booking.shipment?.vehicleType}</Badge>
                         <Badge variant="outline">{booking.shipment?.transportType} transport</Badge>
                       </div>
                    </div>

                    <div className="relative pl-6 space-y-8 border-l-2 border-muted ml-3">
                      <div className="relative">
                        <div className="absolute -left-[31px] bg-background border-2 border-primary w-4 h-4 rounded-full"></div>
                        <p className="text-xs font-bold text-primary uppercase">Origin</p>
                        <p className="font-semibold text-lg">{booking.shipment?.originCity}, {booking.shipment?.originState} {booking.shipment?.originZip}</p>
                        <p className="text-sm text-muted-foreground mt-1">{booking.shipment?.originAddress || "Address provided directly by shipper"}</p>
                      </div>
                      
                      <div className="relative">
                        <div className="absolute -left-[31px] bg-background border-2 border-accent w-4 h-4 rounded-full"></div>
                        <p className="text-xs font-bold text-accent uppercase">Destination</p>
                        <p className="font-semibold text-lg">{booking.shipment?.destinationCity}, {booking.shipment?.destinationState} {booking.shipment?.destinationZip}</p>
                        <p className="text-sm text-muted-foreground mt-1">{booking.shipment?.destinationAddress || "Address provided directly by shipper"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tracking Notes Log */}
                {booking.trackingNotes && (
                   <Card>
                     <CardHeader>
                       <CardTitle className="text-base flex items-center"><Info className="mr-2 h-4 w-4"/> Latest Updates</CardTitle>
                     </CardHeader>
                     <CardContent>
                       <p className="text-sm bg-muted p-3 rounded italic border-l-2 border-primary">"{booking.trackingNotes}"</p>
                     </CardContent>
                   </Card>
                )}
              </div>

              {/* Contact Info Column */}
              <div className="space-y-6">
                
                {/* Driver Info for Shipper */}
                {isShipper && (
                  <Card className="border-primary/20 shadow-sm">
                    <CardHeader className="bg-primary/5 pb-4">
                      <CardTitle className="text-base flex justify-between items-center">
                        Assigned Carrier <Badge variant="outline" className="bg-white">Verified</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-12 w-12 bg-slate-200 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-slate-500" />
                        </div>
                        <div>
                          <div className="font-bold text-lg">{booking.driver?.firstName} {booking.driver?.lastName}</div>
                          <div className="text-sm text-muted-foreground">{booking.driver?.phone || "No phone provided"}</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border">
                        <div className="flex justify-between"><span className="text-muted-foreground">DOT #:</span> <span className="font-medium">{booking.driver?.dotNumber || "Verified"}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Equipment:</span> <span className="font-medium">{booking.driver?.truckType || "Auto Carrier"}</span></div>
                      </div>

                      <Button className="w-full mt-4" asChild>
                        <Link href="/messages"><MessageSquare className="mr-2 h-4 w-4"/> Message Carrier</Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Shipper Info for Driver */}
                {isDriver && (
                  <Card>
                    <CardHeader className="pb-4 border-b">
                      <CardTitle className="text-base">Shipper Contact</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="font-bold text-lg">{booking.shipper?.firstName} {booking.shipper?.lastName}</div>
                      <div className="text-sm text-muted-foreground mb-4">{booking.shipper?.phone || "Phone available in chat"}</div>
                      
                      <Button className="w-full" variant="outline" asChild>
                        <Link href="/messages"><MessageSquare className="mr-2 h-4 w-4"/> Message Shipper</Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-400">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                    <p>
                      <strong>Payment Reminder:</strong> AutoHaul Connect does not process payments. Payment terms should be arranged directly between shipper and carrier.
                    </p>
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

// Dummy Info import fix since Info was used but maybe not exported from lucide-react in previous line
import { Info } from "lucide-react";
