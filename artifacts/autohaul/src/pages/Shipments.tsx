import { MainLayout } from "@/components/layout/MainLayout";
import { useListShipments } from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { formatCurrency, formatRelative, getStatusColor, formatVehicleName } from "@/lib/format";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Calendar, DollarSign, Search, Filter, Loader2, ArrowRight } from "lucide-react";
type ShipmentStatus = "open" | "assigned" | "in_transit" | "delivered" | "cancelled";
type ShipmentTransportType = "open" | "enclosed";

export default function Shipments() {
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | "all">("open");
  const [transportTypeFilter, setTransportTypeFilter] = useState<ShipmentTransportType | "all">("all");
  
  const { data, isLoading } = useListShipments({
    query: {
      queryKey: ["/api/shipments", statusFilter, transportTypeFilter],
    },
    request: {
      // @ts-ignore - bypassing strict type for 'all' to let backend ignore undefined
      query: { 
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        ...(transportTypeFilter !== "all" ? { transportType: transportTypeFilter } : {})
      }
    }
  });

  return (
    <MainLayout>
      <div className="bg-slate-900 text-white py-12">
        <div className="container mx-auto px-4 md:px-6">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">Load Board</h1>
          <p className="text-slate-300 max-w-2xl text-lg">
            Browse available vehicle transport jobs. Connect directly with shippers and secure your next haul.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-8">
        {/* Filters */}
        <div className="bg-card border rounded-xl p-4 shadow-sm mb-8 flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            <div className="w-full md:w-48 space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
              <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open / Needs Driver</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full md:w-48 space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Transport Type</label>
              <Select value={transportTypeFilter} onValueChange={(val: any) => setTransportTypeFilter(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Any Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Type</SelectItem>
                  <SelectItem value="open">Open Carrier</SelectItem>
                  <SelectItem value="enclosed">Enclosed Carrier</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button variant="outline" className="w-full md:w-auto shrink-0">
            <Filter className="mr-2 h-4 w-4" /> Advanced Filters
          </Button>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="py-20 flex justify-center items-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
          </div>
        ) : !data?.shipments || data.shipments.length === 0 ? (
          <div className="text-center py-20 bg-card border rounded-2xl border-dashed">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No loads found</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Try adjusting your filters or check back later. Shippers post new vehicles every day.
            </p>
            <Button variant="outline" className="mt-6" onClick={() => { setStatusFilter("all"); setTransportTypeFilter("all"); }}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {data.shipments.map((shipment) => (
              <Card key={shipment.id} className="overflow-hidden hover:shadow-md transition-shadow group">
                <CardHeader className="bg-muted/30 pb-4 border-b">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2 items-center flex-wrap">
                      <Badge className={getStatusColor(shipment.status)} variant="outline">
                        {shipment.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge variant="secondary" className="capitalize">{shipment.transportType}</Badge>
                      {shipment.vehicleCondition === 'non_running' && (
                        <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100">INOP</Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-foreground">
                        {shipment.budgetMax ? `${formatCurrency(shipment.budgetMin || 0)} - ${formatCurrency(shipment.budgetMax)}` : 'Open to Bids'}
                      </div>
                      <div className="text-xs text-muted-foreground">Target Budget</div>
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg line-clamp-1">
                    {formatVehicleName(shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel)}
                  </h3>
                </CardHeader>
                
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-6 relative">
                    {/* Route visualization */}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{shipment.originCity}, {shipment.originState}</p>
                      <p className="text-xs text-muted-foreground">{shipment.originZip}</p>
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center relative">
                      <div className="h-0.5 w-full bg-border absolute"></div>
                      <div className="bg-background border rounded-full p-1.5 z-10 text-muted-foreground group-hover:text-primary transition-colors group-hover:border-primary/30">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                    
                    <div className="flex-1 text-right">
                      <p className="text-sm font-medium text-foreground">{shipment.destinationCity}, {shipment.destinationState}</p>
                      <p className="text-xs text-muted-foreground">{shipment.destinationZip}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="mr-2 h-4 w-4 opacity-70" />
                      <span>Est. {shipment.pickupDateFrom ? new Date(shipment.pickupDateFrom).toLocaleDateString() : 'ASAP'}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground justify-end">
                      <span className="bg-accent/10 text-accent-foreground px-2 py-0.5 rounded font-medium text-xs">
                        {shipment.bidCount || 0} Bids
                      </span>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="bg-muted/10 border-t pt-4 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Posted {formatRelative(shipment.createdAt)}</span>
                  <Button asChild variant={shipment.status === 'open' ? 'default' : 'secondary'}>
                    <Link href={`/shipments/${shipment.id}`}>
                      {shipment.status === 'open' ? 'View & Bid' : 'View Details'}
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
