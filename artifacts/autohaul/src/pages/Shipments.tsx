import { MainLayout } from "@/components/layout/MainLayout";
import { useListShipments } from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { formatCurrency, formatRelative, getStatusColor, formatVehicleName } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Calendar, DollarSign, Search, Filter, Loader2, ArrowRight, Home, Building2, Anchor, Shield, Warehouse, PlaneTakeoff, HelpCircle, X, Truck, Star, Briefcase } from "lucide-react";
import { motion } from "framer-motion";

const LOCATION_BADGE: Record<string, { label: string; icon: any; cls: string }> = {
  residential: { label: "Residential", icon: Home, cls: "bg-blue-500/15 text-blue-300 border-blue-500/25" },
  dealer:      { label: "Dealer Lot", icon: Building2, cls: "bg-slate-500/15 text-slate-300 border-slate-500/25" },
  auction:     { label: "Auction", icon: Building2, cls: "bg-amber-500/15 text-amber-300 border-amber-500/25" },
  port:        { label: "Port · TWIC Req.", icon: Anchor, cls: "bg-red-500/15 text-red-300 border-red-500/25" },
  military:    { label: "Military Base", icon: Shield, cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25" },
  storage:     { label: "Storage Facility", icon: Warehouse, cls: "bg-slate-500/15 text-slate-300 border-slate-500/25" },
  airport:     { label: "Airport", icon: PlaneTakeoff, cls: "bg-violet-500/15 text-violet-300 border-violet-500/25" },
  other:       { label: "Other", icon: HelpCircle, cls: "bg-slate-500/15 text-slate-300 border-slate-500/25" },
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-300 border-blue-500/25",
  assigned: "bg-violet-500/15 text-violet-300 border-violet-500/25",
  in_transit: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  delivered: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  cancelled: "bg-red-500/15 text-red-300 border-red-500/25",
};

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

type ShipmentStatus = "open" | "assigned" | "in_transit" | "delivered" | "cancelled";
type ShipmentTransportType = "open" | "enclosed";

export default function Shipments() {
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | "all">("open");
  const [transportTypeFilter, setTransportTypeFilter] = useState<ShipmentTransportType | "all">("all");
  const [originStateFilter, setOriginStateFilter] = useState("all");
  const [destinationStateFilter, setDestinationStateFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeFilters: Record<string, string> = {};
  if (statusFilter !== "all") activeFilters.status = statusFilter;
  if (transportTypeFilter !== "all") activeFilters.transportType = transportTypeFilter;
  if (originStateFilter !== "all") activeFilters.originState = originStateFilter;
  if (destinationStateFilter !== "all") activeFilters.destinationState = destinationStateFilter;
  if (conditionFilter !== "all") activeFilters.vehicleCondition = conditionFilter;
  if (searchQuery.trim()) activeFilters.search = searchQuery.trim();
  if (maxBudget) activeFilters.maxBudget = maxBudget;

  const { data, isLoading } = useListShipments(activeFilters as any, {
    query: { queryKey: ["/api/shipments", activeFilters] } as any,
  });

  function clearAll() {
    setStatusFilter("open"); setTransportTypeFilter("all"); setOriginStateFilter("all");
    setDestinationStateFilter("all"); setConditionFilter("all"); setSearchQuery("");
    setMaxBudget("");
  }

  const hasActiveFilters = Object.keys(activeFilters).some(k => k !== "status");

  return (
    <MainLayout>
      {/* Header */}
      <div className="bg-slate-950 border-b border-slate-800/60 py-14">
        <div className="container mx-auto px-4 md:px-8">
          <button onClick={() => window.history.back()} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6 -ml-1 group">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Back
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-8 bg-blue-500" />
            <span className="text-blue-400 font-mono text-xs font-bold tracking-[0.2em] uppercase">Load Board</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tight mb-3">Browse Available Loads</h1>
          <p className="text-slate-400 text-lg max-w-2xl">Connect directly with shippers. No broker in the middle — what you bid is what you earn.</p>
        </div>
      </div>

      <div className="bg-slate-950 min-h-screen">
        <div className="container mx-auto px-4 md:px-8 py-8">
          {/* Filter bar */}
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 backdrop-blur-sm p-5 mb-8">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input placeholder="Make, model, city..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 h-11" />
                </div>
              </div>
              <div className="w-full md:w-44">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                  <SelectTrigger className="bg-slate-800/60 border-slate-700 text-white h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="open">Open / Needs Driver</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-44">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Carrier Type</label>
                <Select value={transportTypeFilter} onValueChange={(val: any) => setTransportTypeFilter(val)}>
                  <SelectTrigger className="bg-slate-800/60 border-slate-700 text-white h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Type</SelectItem>
                    <SelectItem value="open">Open Carrier</SelectItem>
                    <SelectItem value="enclosed">Enclosed Carrier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" className="shrink-0 border-slate-700 text-slate-300 bg-slate-800/40 hover:bg-slate-800 h-11"
                onClick={() => setShowAdvanced(!showAdvanced)}>
                <Filter className="mr-2 h-4 w-4" />
                {showAdvanced ? "Hide Filters" : "More Filters"}
                {hasActiveFilters && <span className="ml-2 flex h-2 w-2 rounded-full bg-blue-500" />}
              </Button>
            </div>

            {showAdvanced && (
              <div className="mt-5 pt-5 border-t border-slate-800 flex flex-col md:flex-row flex-wrap gap-4 items-end">
                {[
                  { label: "Origin State", value: originStateFilter, onChange: setOriginStateFilter, placeholder: "Any State" },
                  { label: "Dest. State", value: destinationStateFilter, onChange: setDestinationStateFilter, placeholder: "Any State" },
                ].map(({ label, value, onChange, placeholder }) => (
                  <div key={label} className="w-full md:w-40">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">{label}</label>
                    <Select value={value} onValueChange={onChange}>
                      <SelectTrigger className="bg-slate-800/60 border-slate-700 text-white h-11"><SelectValue placeholder={placeholder} /></SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto"><SelectItem value="all">{placeholder}</SelectItem>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
                <div className="w-full md:w-44">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Condition</label>
                  <Select value={conditionFilter} onValueChange={setConditionFilter}>
                    <SelectTrigger className="bg-slate-800/60 border-slate-700 text-white h-11"><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any Condition</SelectItem>
                      <SelectItem value="running">Running</SelectItem>
                      <SelectItem value="non_running">Non-Running (INOP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full md:w-40">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Max Budget</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    <Input type="number" placeholder="any" value={maxBudget} onChange={e => setMaxBudget(e.target.value)}
                      className="pl-7 bg-slate-800/60 border-slate-700 text-white h-11" />
                  </div>
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={clearAll}>
                    <X className="mr-1.5 h-3.5 w-3.5" /> Clear all
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Count */}
          {!isLoading && data?.shipments && (
            <p className="text-sm text-slate-500 mb-5 font-mono">{data.total} load{data.total !== 1 ? "s" : ""} found</p>
          )}

          {/* Results */}
          {isLoading ? (
            <div className="py-24 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-500 opacity-50" /></div>
          ) : !data?.shipments || data.shipments.length === 0 ? (
            <div className="text-center py-24 rounded-2xl border border-dashed border-slate-800">
              <Search className="h-12 w-12 text-slate-700 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No loads found</h3>
              <p className="text-slate-500 max-w-md mx-auto mb-6">Try adjusting your filters or check back soon — shippers post new vehicles every day.</p>
              <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={clearAll}>Clear Filters</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {data.shipments.map((shipment, i) => (
                <motion.div key={shipment.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Link href={`/shipments/${shipment.id}`}>
                    <div className="group rounded-2xl border border-slate-800/60 bg-slate-900/50 hover:bg-slate-900/90 hover:border-slate-700 transition-all duration-200 overflow-hidden cursor-pointer">
                      {/* Card header */}
                      <div className="px-5 pt-5 pb-4 border-b border-slate-800/60">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex flex-wrap gap-1.5">
                            <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full uppercase tracking-wide ${STATUS_STYLES[shipment.status] || STATUS_STYLES.open}`}>
                              {shipment.status.replace("_", " ")}
                            </span>
                            <span className="text-[10px] font-bold border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full uppercase tracking-wide capitalize">
                              {shipment.transportType}
                            </span>
                            {shipment.vehicleCondition === "non_running" && (
                              <span className="text-[10px] font-bold border border-red-500/25 bg-red-500/15 text-red-300 px-2 py-0.5 rounded-full uppercase tracking-wide">INOP</span>
                            )}
                            {(shipment as any).pickupLocationType && LOCATION_BADGE[(shipment as any).pickupLocationType] && (() => {
                              const lb = LOCATION_BADGE[(shipment as any).pickupLocationType];
                              const Icon = lb.icon;
                              return (
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold border px-2 py-0.5 rounded-full uppercase tracking-wide ${lb.cls}`}>
                                  <Icon className="h-2.5 w-2.5" /> {lb.label}
                                </span>
                              );
                            })()}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-lg font-bold text-white">
                              {shipment.budgetMax ? formatCurrency(shipment.budgetMax) : "Open Bid"}
                            </div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Max Budget</div>
                          </div>
                        </div>
                        <h3 className="font-bold text-white text-base">
                          {formatVehicleName(shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel)}
                        </h3>
                      </div>

                      {/* Route */}
                      <div className="px-5 py-4">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-white">{shipment.originCity}, {shipment.originState}</p>
                            <p className="text-xs text-slate-500">{shipment.originZip}</p>
                          </div>
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 border border-slate-700 group-hover:border-blue-500/50 group-hover:bg-blue-500/10 transition-colors shrink-0">
                            <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                          </div>
                          <div className="flex-1 text-right">
                            <p className="text-sm font-semibold text-white">{shipment.destinationCity}, {shipment.destinationState}</p>
                            <p className="text-xs text-slate-500">{shipment.destinationZip}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{shipment.pickupDateFrom ? new Date(shipment.pickupDateFrom).toLocaleDateString() : "ASAP"}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                              {shipment.bidCount || 0} bids
                            </span>
                            <span className="text-xs text-slate-600">{formatRelative(shipment.createdAt)}</span>
                          </div>
                        </div>

                        {/* Shipper reputation */}
                        {(shipment as any).shipper && (
                          <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                              {(shipment as any).shipper.firstName?.[0] || "S"}
                            </div>
                            <span className="text-xs text-slate-400 truncate">
                              {(shipment as any).shipper.firstName} {(shipment as any).shipper.lastName}
                            </span>
                            {(shipment as any).shipper.averageRating > 0 && (
                              <span className="flex items-center gap-0.5 text-xs text-amber-400 font-semibold ml-auto shrink-0">
                                <Star className="h-3 w-3 fill-amber-400" />
                                {(shipment as any).shipper.averageRating.toFixed(1)}
                              </span>
                            )}
                            {(shipment as any).shipper.completedJobs > 0 && (
                              <span className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
                                <Briefcase className="h-3 w-3" />
                                {(shipment as any).shipper.completedJobs} hauls
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* CTA footer */}
                      <div className="px-5 pb-4 flex justify-end">
                        <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                          shipment.status === "open"
                            ? "bg-blue-600 text-white group-hover:bg-blue-500"
                            : "bg-slate-700 text-slate-300 group-hover:bg-slate-600"
                        }`}>
                          {shipment.status === "open" ? "View & Bid" : "View Details"}
                          <ArrowRight className="h-3 w-3" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
