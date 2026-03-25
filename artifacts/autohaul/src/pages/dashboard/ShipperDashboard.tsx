import { MainLayout } from "@/components/layout/MainLayout";
import { useGetMyShipments, useListBookings } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatRelative, getStatusColor, formatVehicleName } from "@/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Truck, Calendar, MapPin, ArrowRight, PlusCircle } from "lucide-react";

export default function ShipperDashboard() {
  const { data: shipmentsData, isLoading: loadingShipments } = useGetMyShipments();
  const { data: bookingsData, isLoading: loadingBookings } = useListBookings();

  const openShipments = shipmentsData?.shipments.filter(s => s.status === 'open') || [];
  const activeBookings = bookingsData?.bookings.filter(b => ['confirmed', 'picked_up', 'in_transit'].includes(b.status)) || [];
  const pastBookings = bookingsData?.bookings.filter(b => ['delivered', 'cancelled'].includes(b.status)) || [];

  return (
    <MainLayout>
      <div className="bg-slate-50 dark:bg-slate-900/20 py-10 min-h-[calc(100vh-4rem)]">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">Shipper Dashboard</h1>
              <p className="text-muted-foreground mt-1">Manage your posted loads and active transports.</p>
            </div>
            <Button asChild className="hover-elevate shadow-md shadow-primary/20">
              <Link href="/post-load">
                <PlusCircle className="mr-2 h-4 w-4" /> Post New Load
              </Link>
            </Button>
          </div>

          <Tabs defaultValue="active" className="space-y-6">
            <TabsList className="bg-card border h-12 p-1">
              <TabsTrigger value="active" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Needs Driver ({openShipments.length})
              </TabsTrigger>
              <TabsTrigger value="in_progress" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                In Progress ({activeBookings.length})
              </TabsTrigger>
              <TabsTrigger value="history">History ({pastBookings.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {openShipments.length === 0 ? (
                <Card className="border-dashed py-12">
                  <CardContent className="flex flex-col items-center justify-center text-center">
                    <div className="bg-muted p-4 rounded-full mb-4">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No Open Listings</h3>
                    <p className="text-muted-foreground max-w-sm mb-6">You don't have any vehicles waiting for bids.</p>
                    <Button asChild><Link href="/post-load">Post a Vehicle</Link></Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {openShipments.map(shipment => (
                    <Card key={shipment.id} className="hover:border-primary/30 transition-colors">
                      <CardHeader className="pb-3 border-b bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-lg">{formatVehicleName(shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel)}</h3>
                          <Badge variant={shipment.bidCount && shipment.bidCount > 0 ? "default" : "secondary"}>
                            {shipment.bidCount || 0} Bids
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="py-4">
                        <div className="flex items-center gap-2 mb-4 text-sm font-medium">
                          <span>{shipment.originCity}, {shipment.originState}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span>{shipment.destinationCity}, {shipment.destinationState}</span>
                        </div>
                        <div className="text-sm text-muted-foreground flex justify-between">
                          <span>Budget: {shipment.budgetMax ? formatCurrency(shipment.budgetMax) : 'Open'}</span>
                          <span>Posted {formatRelative(shipment.createdAt)}</span>
                        </div>
                        <Button variant="outline" className="w-full mt-4" asChild>
                          <Link href={`/shipments/${shipment.id}`}>Review Bids</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="in_progress" className="space-y-4">
               {activeBookings.length === 0 ? (
                <Card className="border-dashed py-12">
                  <CardContent className="flex flex-col items-center justify-center text-center">
                    <Truck className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold mb-2">No Active Transports</h3>
                    <p className="text-muted-foreground max-w-sm">When you accept a driver's bid, the active transport will appear here.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {activeBookings.map(booking => (
                    <Card key={booking.id} className="flex flex-col md:flex-row overflow-hidden border-l-4 border-l-primary hover:shadow-md transition-shadow">
                      <div className="flex-1 p-6">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={getStatusColor(booking.status)}>{booking.status.replace('_', ' ').toUpperCase()}</Badge>
                          <span className="text-sm text-muted-foreground font-mono">ID: {booking.id.split('-')[0].toUpperCase()}</span>
                        </div>
                        <h3 className="font-bold text-lg mb-4">
                          {booking.shipment ? formatVehicleName(booking.shipment.vehicleYear, booking.shipment.vehicleMake, booking.shipment.vehicleModel) : 'Vehicle'}
                        </h3>
                        
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <div className="flex items-center"><User className="mr-2 h-4 w-4"/> {booking.driver?.firstName} {booking.driver?.lastName}</div>
                          <div className="flex items-center"><DollarSign className="mr-1 h-4 w-4"/> {formatCurrency(booking.agreedPrice)}</div>
                        </div>
                      </div>
                      <div className="bg-muted/30 p-6 flex items-center justify-center md:border-l md:w-48 shrink-0">
                        <Button className="w-full hover-elevate" asChild>
                          <Link href={`/bookings/${booking.id}`}>Track Status</Link>
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history">
              {/* History logic similar to above */}
               <Card className="border-dashed py-12">
                  <CardContent className="flex flex-col items-center justify-center text-center">
                    <p className="text-muted-foreground">Past shipments will appear here.</p>
                  </CardContent>
                </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}

// Dummy User icon for above since it wasn't imported from lucide-react directly in the file
import { User } from "lucide-react";
