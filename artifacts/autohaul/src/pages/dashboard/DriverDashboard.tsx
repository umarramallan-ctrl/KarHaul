import { MainLayout } from "@/components/layout/MainLayout";
import { useGetMyBids, useListBookings } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatRelative, getStatusColor, formatVehicleName } from "@/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, MapPin, ArrowRight, DollarSign, Clock, Star, CheckCircle2 } from "lucide-react";

export default function DriverDashboard() {
  const { data: bidsData, isLoading: loadingBids } = useGetMyBids();
  const { data: bookingsData, isLoading: loadingBookings } = useListBookings();

  const pendingBids = bidsData?.bids?.filter(b => b.status === 'pending') || [];
  const activeBookings = bookingsData?.bookings?.filter(b => ['confirmed', 'picked_up', 'in_transit'].includes(b.status)) || [];
  const completedBookings = bookingsData?.bookings?.filter(b => b.status === 'delivered') || [];
  
  return (
    <MainLayout>
      <div className="bg-slate-900 text-white py-10">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold">Driver Dashboard</h1>
              <p className="text-slate-300 mt-1">Manage your active hauls and pending bids.</p>
            </div>
            <Button asChild variant="default" className="hover-elevate shadow-md shadow-accent/20">
              <Link href="/shipments">
                <Search className="mr-2 h-4 w-4" /> Find More Loads
              </Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
             <div className="bg-white/10 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                <div className="text-slate-400 text-sm mb-1">Active Hauls</div>
                <div className="text-3xl font-bold">{activeBookings.length}</div>
             </div>
             <div className="bg-white/10 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                <div className="text-slate-400 text-sm mb-1">Pending Bids</div>
                <div className="text-3xl font-bold">{pendingBids.length}</div>
             </div>
             <div className="bg-white/10 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                <div className="text-slate-400 text-sm mb-1">Potential Revenue</div>
                <div className="text-3xl font-bold text-accent">
                  {formatCurrency(activeBookings.reduce((sum, b) => sum + b.agreedPrice, 0))}
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-8">
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="bg-card border h-12 p-1">
            <TabsTrigger value="active" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Active Hauls ({activeBookings.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Pending Bids ({pendingBids.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Completed ({completedBookings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
             {activeBookings.length === 0 ? (
                <Card className="border-dashed py-12">
                  <CardContent className="flex flex-col items-center justify-center text-center">
                    <h3 className="text-xl font-semibold mb-2">No Active Hauls</h3>
                    <p className="text-muted-foreground mb-6">Find loads and place bids to get started.</p>
                    <Button asChild><Link href="/shipments">Browse Load Board</Link></Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {activeBookings.map(booking => (
                    <Card key={booking.id} className="overflow-hidden hover:border-primary/50 transition-colors">
                      <CardContent className="p-0 flex flex-col md:flex-row">
                        <div className="flex-1 p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                               <Badge className={getStatusColor(booking.status)}>{booking.status.replace('_', ' ').toUpperCase()}</Badge>
                               <h3 className="font-bold text-lg mt-2">
                                 {booking.shipment ? formatVehicleName(booking.shipment.vehicleYear, booking.shipment.vehicleMake, booking.shipment.vehicleModel) : 'Vehicle'}
                               </h3>
                            </div>
                            <div className="text-right">
                               <div className="text-2xl font-bold text-primary">{formatCurrency(booking.agreedPrice)}</div>
                               <div className="text-xs text-muted-foreground">Agreed Price</div>
                            </div>
                          </div>
                          
                          {booking.shipment && (
                            <div className="flex items-center gap-2 mb-4 bg-muted/30 p-3 rounded-lg border">
                              <MapPin className="h-4 w-4 text-muted-foreground shrink-0"/>
                              <span className="font-medium">{booking.shipment.originCity}, {booking.shipment.originState}</span>
                              <ArrowRight className="h-4 w-4 text-muted-foreground mx-2 shrink-0" />
                              <span className="font-medium">{booking.shipment.destinationCity}, {booking.shipment.destinationState}</span>
                            </div>
                          )}
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 flex flex-col justify-center border-t md:border-t-0 md:border-l shrink-0 w-full md:w-56 gap-3">
                           <Button className="w-full hover-elevate shadow-md shadow-primary/20" asChild>
                              <Link href={`/bookings/${booking.id}`}>Update Status</Link>
                           </Button>
                           <Button variant="outline" className="w-full" asChild>
                              <Link href={`/messages`}>Message Shipper</Link>
                           </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedBookings.length === 0 ? (
              <Card className="border-dashed py-12">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <CheckCircle2 className="h-10 w-10 text-muted-foreground mb-3 opacity-40" />
                  <p className="text-muted-foreground">Completed hauls will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {completedBookings.map(booking => (
                  <Card key={booking.id} className="overflow-hidden border-l-4 border-l-emerald-500">
                    <CardContent className="p-0 flex flex-col md:flex-row">
                      <div className="flex-1 p-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Delivered</Badge>
                        </div>
                        <h3 className="font-bold text-lg mb-3">
                          {booking.shipment ? formatVehicleName(booking.shipment.vehicleYear, booking.shipment.vehicleMake, booking.shipment.vehicleModel) : 'Vehicle'}
                        </h3>
                        {booking.shipment && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span>{booking.shipment.originCity}, {booking.shipment.originState}</span>
                            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                            <span>{booking.shipment.destinationCity}, {booking.shipment.destinationState}</span>
                          </div>
                        )}
                        <div className="text-sm font-semibold text-primary mt-1">{formatCurrency(booking.agreedPrice)}</div>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-900/20 border-t md:border-t-0 md:border-l border-amber-200 dark:border-amber-800 p-6 flex flex-col justify-center items-center gap-3 shrink-0 w-full md:w-56">
                        <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 text-sm font-semibold">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          Rate your shipper
                        </div>
                        <Button className="w-full" size="sm" asChild>
                          <Link href={`/bookings/${booking.id}`}>Leave a Review</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
             {pendingBids.length === 0 ? (
                <Card className="border-dashed py-12">
                  <CardContent className="flex flex-col items-center justify-center text-center">
                    <p className="text-muted-foreground">You don't have any pending bids.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingBids.map(bid => (
                    <Card key={bid.id}>
                      <CardContent className="p-5">
                        <div className="flex justify-between mb-4">
                          <div className="font-bold text-xl">{formatCurrency(bid.amount)}</div>
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">Pending</Badge>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground mb-4">
                          <Clock className="h-4 w-4 mr-1" /> Placed {formatRelative(bid.createdAt)}
                        </div>
                        <Button variant="secondary" className="w-full" asChild>
                           <Link href={`/shipments/${bid.shipmentId}`}>View Shipment</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
