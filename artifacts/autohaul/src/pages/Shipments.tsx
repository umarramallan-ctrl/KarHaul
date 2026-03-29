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
import { MapPin, Calendar, DollarSign, Search, Filter, Loader2, ArrowRight, Home, Building2, Anchor, Shield, Warehouse, PlaneTakeoff, HelpCircle, X } from "lucide-react";

const LOCATION_BADGE: Record<string, { label: string; icon: any; cls: string }> = {
  residential: { label: "Residential", icon: Home, cls: "bg-blue-50 text-blue-700 border-blue-200" },
  dealer:      { label: "Dealer Lot", icon: Building2, cls: "bg-slate-100 text-slate-700 border-slate-200" },
  auction:     { label: "Auction", icon: Building2, cls: "bg-amber-50 text-amber-700 border-amber-200" },
  port:        { label: "Port · TWIC Req.", icon: Anchor, cls: "bg-red-50 text-red-700 border-red-200" },
  military:    { label: "Military Base", icon: Shield, cls: "bg-green-50 text-green-800 border-green-200" },
  storage:     { label: "Storage Facility", icon: Warehouse, cls: "bg-slate-100 text-slate-700 border-slate-200" },
  airport:     { label: "Airport", icon: PlaneTakeoff, cls: "bg-purple-50 text-purple-700 border-purple-200" },
  other:       { label: "Other", icon: HelpCircle, cls: "bg-gray-100 text-gray-600 border-gray-200" },
};

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

type ShipmentStatus = "open" | "assigned" | "in_transit" | "delivered" | "cancelled";
type ShipmentTransportType = "open" | "enclosed";

export default function Shipments() {
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | "all">("open");
  const [transportTypeFilter, setTransportTypeFilter] = useState<ShipmentTransportType | "all">("all");
  const [originStateFilter, setOriginStateFilter] = useState<string>("all");
  const [destinationStateFilter, setDestinationStateFilter] = useState<string>("all");
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeFilters: Record<string, string> = {};
  if (statusFilter !== "all") activeFilters.status = statusFilter;
  if (transportTypeFilter !== "all") activeFilters.transportType = transportTypeFilter;
  if (originStateFilter !== "all") activeFilters.originState = originStateFilter;
  if (destinationStateFilter !== "all") activeFilters.destinationState = destinationStateFilter;
  if (conditionFilter !== "all") activeFilters.vehicleCondition = conditionFilter;
  if (searchQuery.trim()) activeFilters.search = searchQuery.trim();
  if (minBudget) activeFilters.minBudget = minBudget;
  if (maxBudget) activeFilters.maxBudget = maxBudget;

  const { data, isLoading } = useListShipments({
    query: { queryKey: ["/api/shipments", activeFilters] },
    request: { query: activeFilters as any },
  });

  function clearAll() {
    setStatusFilter("open");
    setTransportTypeFilter("all");
    setOriginStateFilter("all");
    setDestinationStateFilter("all");
    setConditionFilter("all");
    setSearchQuery("");
    setMinBudget("");
    setMaxBudget("");
  }

  const hasActiveFilters = Object.keys(activeFilters).some(k => k !== "status");

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
        <div className="bg-card border rounded-xl p-4 shadow-sm mb-8">
          {/* Top row: search + primary filters */}
          <div className="flex flex-col md:flex-row gap-4 items-end">
            {/* Search */}
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Make, model, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="w-full md:w-44 space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
              <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open / Needs Driver</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-44 space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Transport Type</label>
              <Select value={transportTypeFilter} onValueChange={(val: any) => setTransportTypeFilter(val)}>
                <SelectTrigger><SelectValue placeholder="Any Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Type</SelectItem>
                  <SelectItem value="open">Open Carrier</SelectItem>
                  <SelectItem value="enclosed">Enclosed Carrier</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              className="shrink-0"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Filter className="mr-2 h-4 w-4" />
              {showAdvanced ? "Hide Filters" : "More Filters"}
              {hasActiveFilters && <span className="ml-2 flex h-2 w-2 rounded-full bg-primary" />}
            </Button>
          </div>

          {/* Advanced filters */}
          {showAdvanced && (
            <div className="mt-4 pt-4 border-t flex flex-col md:flex-row flex-wrap gap-4 items-end">
              <div className="w-full md:w-40 space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Origin State</label>
                <Select value={originStateFilter} onValueChange={setOriginStateFilter}>
                  <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any State</SelectItem>
                    {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:w-40 space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Destination State</label>
                <Select value={destinationStateFilter} onValueChange={setDestinationStateFilter}>
                  <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any State</SelectItem>
                    {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:w-44 space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Condition</label>
                <Select value={conditionFilter} onValueChange={setConditionFilter}>
                  <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Condition</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="non_running">Non-Running (INOP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:w-32 space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Min Budget</label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="0"
                    value={minBudget}
                    onChange={(e) => setMinBudget(e.target.value)}
                    className="pl-7"
                    min={0}
                  />
                </div>
              </div>

              <div className="w-full md:w-32 space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Max Budget</label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="any"
                    value={maxBudget}
                    onChange={(e) => setMaxBudget(e.target.value)}
                    className="pl-7"
                    min={0}
                  />
                </div>
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={clearAll}>
                  <X className="mr-1 h-3.5 w-3.5" /> Clear all
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Results count */}
        {!isLoading && data?.shipments && (
          <p className="text-sm text-muted-foreground mb-4">
            {data.total} load{data.total !== 1 ? "s" : ""} found
          </p>
        )}

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
            <Button variant="outline" className="mt-6" onClick={clearAll}>
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
                      {(shipment as any).pickupLocationType && LOCATION_BADGE[(shipment as any).pickupLocationType] && (() => {
                        const lb = LOCATION_BADGE[(shipment as any).pickupLocationType];
                        const Icon = lb.icon;
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${lb.cls}`}>
                            <Icon className="h-3 w-3" /> {lb.label}
                          </span>
                        );
                      })()}
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
