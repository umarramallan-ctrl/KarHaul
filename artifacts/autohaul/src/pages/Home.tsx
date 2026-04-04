import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { ArrowRight, ShieldCheck, DollarSign, Clock, MapPin, Truck, Star, X, Check, TrendingDown, Route, Heart, Camera, Zap, User, Building2, FileText, CreditCard, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function geocode(query: string): Promise<[number, number] | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=us`;
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    const data = await res.json();
    if (!data.length) return null;
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch {
    return null;
  }
}

type EstimateResult = { estimatedMin: number; estimatedMax: number; distanceMiles: number; brokerSavings: number };

const VEHICLE_MULT: Record<string, number> = {
  sedan:1.0, suv:1.1, truck:1.2, van:1.15, coupe:1.0,
  convertible:1.05, pickup_truck:1.2, minivan:1.15,
};

function PriceEstimator() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [vehicleType, setVehicleType] = useState("sedan");
  const [transportType, setTransportType] = useState("open");
  const [vehicleCondition, setVehicleCondition] = useState("running");
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEstimate() {
    if (!origin.trim() || !destination.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const [oCoords, dCoords] = await Promise.all([geocode(origin), geocode(destination)]);
    setLoading(false);
    if (!oCoords) { setError("Couldn't find origin — try a zip code or 'City, State'."); return; }
    if (!dCoords) { setError("Couldn't find destination — try a zip code or 'City, State'."); return; }
    const miles = Math.round(haversine(oCoords[0], oCoords[1], dCoords[0], dCoords[1]));
    const rate = transportType === "enclosed" ? 1.50 : 1.00;
    const condMult = vehicleCondition === "non_running" ? 1.25 : 1.0;
    const base = Math.max(300, Math.round(miles * rate * (VEHICLE_MULT[vehicleType] ?? 1.0) * condMult));
    const max = Math.round(base * 1.25);
    setResult({ estimatedMin: base, estimatedMax: max, distanceMiles: miles, brokerSavings: Math.round((base + max) / 2 * 0.25) });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Origin</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              className="h-11 pl-9"
              placeholder="Zip, city, or address"
              value={origin}
              onChange={e => { setOrigin(e.target.value); setResult(null); setError(null); }}
              onKeyDown={e => e.key === "Enter" && handleEstimate()}
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Destination</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              className="h-11 pl-9"
              placeholder="Zip, city, or address"
              value={destination}
              onChange={e => { setDestination(e.target.value); setResult(null); setError(null); }}
              onKeyDown={e => e.key === "Enter" && handleEstimate()}
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Vehicle</label>
          <Select value={vehicleType} onValueChange={v => { setVehicleType(v); setResult(null); }}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent side="bottom">
              <SelectItem value="sedan">Sedan</SelectItem>
              <SelectItem value="suv">SUV</SelectItem>
              <SelectItem value="truck">Truck</SelectItem>
              <SelectItem value="van">Van</SelectItem>
              <SelectItem value="coupe">Coupe</SelectItem>
              <SelectItem value="convertible">Convertible</SelectItem>
              <SelectItem value="pickup_truck">Pickup Truck</SelectItem>
              <SelectItem value="minivan">Minivan</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Carrier Type</label>
          <Select value={transportType} onValueChange={v => { setTransportType(v); setResult(null); }}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent side="bottom">
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="enclosed">Enclosed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Condition</label>
          <Select value={vehicleCondition} onValueChange={v => { setVehicleCondition(v); setResult(null); }}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent side="bottom">
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="non_running">Non-Running</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        className="w-full h-11 font-semibold"
        onClick={handleEstimate}
        disabled={!origin.trim() || !destination.trim() || loading}
      >
        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Looking up locations…</> : "Get Free Estimate"}
      </Button>

      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Direct Driver Price</p>
              <p className="text-3xl font-display font-bold text-foreground">${result.estimatedMin.toLocaleString()} – ${result.estimatedMax.toLocaleString()}</p>
            </div>
            <div className="text-right bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">You Save</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">~${result.brokerSavings.toLocaleString()}</p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">vs. broker</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{result.distanceMiles.toLocaleString()} miles · Based on real market rates for direct driver connections</p>
          <Button size="sm" className="w-full" asChild>
            <Link href="/post-load">Post This Load Free <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
          </Button>
        </motion.div>
      )}
    </div>
  );
}

const COMPARISON = [
  { feature: "Broker markup per car", brokers: "$150–$500", us: "$0" },
  { feature: "Monthly subscription for drivers", brokers: "$150+/mo", us: "$0" },
  { feature: "Direct contact with carrier", brokers: false, us: true },
  { feature: "Know who drives your car", brokers: false, us: true },
  { feature: "Backhaul route matching", brokers: false, us: true },
  { feature: "Photo condition reports", brokers: false, us: true },
  { feature: "Rebook trusted drivers", brokers: false, us: true },
  { feature: "Real-time status updates", brokers: false, us: true },
];

const NEW_FEATURES = [
  {
    icon: <Route className="h-6 w-6 text-primary" />,
    title: "Backhaul Finder",
    badge: "New",
    desc: "Drivers post their planned routes. Shippers match loads to trucks already heading their way — zero empty miles, better prices for everyone.",
    link: "/driver-routes",
    linkText: "Browse Driver Routes",
  },
  {
    icon: <TrendingDown className="h-6 w-6 text-emerald-600" />,
    title: "Smart Price Estimator",
    badge: "Free Tool",
    desc: "Get an instant market-rate estimate before you post. See exactly how much you'd save compared to using a traditional broker.",
    link: null,
  },
  {
    icon: <Heart className="h-6 w-6 text-rose-500" />,
    title: "Save & Rebook Drivers",
    badge: "Loyalty",
    desc: "Build your own carrier network. Save drivers you've worked with and rebook them directly — no re-listing, no waiting for new bids.",
    link: "/dashboard",
    linkText: "Your Saved Drivers",
  },
  {
    icon: <Camera className="h-6 w-6 text-blue-600" />,
    title: "Condition Photo Reports",
    badge: "Protection",
    desc: "Timestamped photo uploads at pickup and delivery. Protects both shippers and drivers from he-said-she-said disputes.",
    link: null,
  },
  {
    icon: <Zap className="h-6 w-6 text-amber-500" />,
    title: "Pay-Per-Booking, Not Subscriptions",
    badge: "Driver Favorite",
    desc: "Drivers pay a small flat fee only when they win a job — not a monthly subscription just to see loads. Keep more of what you earn.",
    link: null,
  },
  {
    icon: <ShieldCheck className="h-6 w-6 text-violet-600" />,
    title: "Verified DOT & Insurance",
    badge: "Trust",
    desc: "Every driver is verified for active FMCSA authority and insurance before their first job. Shippers see the badge, not just a name.",
    link: null,
  },
];

const TESTIMONIALS = [
  { quote: "I made more on my last run than I had in three months on other platforms combined. I paid nothing upfront.", name: "Mike T.", role: "Owner-Operator, 9 years", stars: 5 },
  { quote: "My dealer was paying brokers $350 per car. Now I deal directly with the same quality drivers for half the price.", name: "Sarah K.", role: "Independent Auto Dealer", stars: 5 },
  { quote: "The backhaul finder is a game changer. I fill my return trips now instead of driving empty.", name: "Carlos R.", role: "Fleet Driver, Dallas TX", stars: 5 },
];

export default function Home() {
  return (
    <MainLayout>
      {/* Hero */}
      <section className="relative w-full py-20 md:py-28 overflow-hidden bg-slate-900">
        <div className="absolute inset-0 z-0">
          <img src={`${import.meta.env.BASE_URL}images/hero-truck.png`} alt="Auto transport semi truck" className="w-full h-full object-cover opacity-40 mix-blend-overlay blur-sm scale-105" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/80 to-transparent" />
        </div>
        <div className="container relative z-10 mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <span className="inline-block py-1 px-3 rounded-full bg-emerald-500/20 text-emerald-300 font-medium text-sm mb-6 border border-emerald-500/30">
                Zero Broker Fees. Zero Subscriptions.
              </span>
              <h1 className="text-4xl md:text-6xl font-display font-bold text-white leading-tight mb-6">
                The auto transport market<br /><span className="text-gradient">without the middleman.</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-xl leading-relaxed">
                Shippers post free. Drivers browse free. Connect directly — no broker markup, no monthly subscriptions, no opacity.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="text-base h-14 px-8 shadow-lg shadow-primary/20" asChild>
                  <Link href="/post-load">Post a Load Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button size="lg" variant="outline" className="text-base h-14 px-8 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white backdrop-blur-sm" asChild>
                  <Link href="/driver-routes"><Route className="mr-2 h-4 w-4" /> Backhaul Finder</Link>
                </Button>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
              <Card className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md shadow-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingDown className="h-5 w-5 text-emerald-600" />
                    <h3 className="font-display font-bold text-lg">Price Estimator</h3>
                    <span className="ml-auto text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full">Free</span>
                  </div>
                  <PriceEstimator />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-8 border-b bg-muted/40">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "$0", label: "Broker Fees" },
              { value: "$0/mo", label: "Driver Subscriptions" },
              { value: "100%", label: "Direct Connections" },
              { value: "~30%", label: "Avg. Shipper Savings" },
            ].map((s, i) => (
              <div key={i} className={i > 0 ? "border-l border-border/50" : ""}>
                <p className="text-3xl md:text-4xl font-display font-bold text-primary">{s.value}</p>
                <p className="text-xs md:text-sm text-muted-foreground mt-1 font-medium uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* New Features */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Built for drivers and shippers — not brokers</h2>
            <p className="text-lg text-muted-foreground">Every feature was designed around a real pain point from the people who actually move cars for a living.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {NEW_FEATURES.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                <Card className="h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-200 border-border/60 group">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center group-hover:scale-110 transition-transform duration-200">{f.icon}</div>
                      <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">{f.badge}</span>
                    </div>
                    <h3 className="font-display font-bold text-lg mb-2">{f.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">{f.desc}</p>
                    {f.link && (
                      <Button variant="outline" size="sm" className="mt-auto" asChild>
                        <Link href={f.link}>{f.linkText} <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/40">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">KarHaul vs. Traditional Brokers</h2>
            <p className="text-muted-foreground text-lg">The same drivers. Without the middleman tax.</p>
          </div>
          <div className="max-w-3xl mx-auto">
            <div className="rounded-2xl overflow-hidden border shadow-xl">
              <div className="grid grid-cols-3 bg-slate-800 dark:bg-slate-900 text-white text-sm font-semibold">
                <div className="p-4">Feature</div>
                <div className="p-4 text-center border-l border-slate-700 text-slate-400">Traditional Brokers</div>
                <div className="p-4 text-center border-l border-slate-700 text-primary">KarHaul</div>
              </div>
              {COMPARISON.map((row, i) => (
                <div key={i} className={`grid grid-cols-3 text-sm ${i % 2 === 0 ? "bg-white dark:bg-slate-800/60" : "bg-slate-50/80 dark:bg-slate-800/30"}`}>
                  <div className="p-4 font-medium text-foreground">{row.feature}</div>
                  <div className="p-4 text-center border-l border-border flex items-center justify-center">
                    {typeof row.brokers === "boolean" ? (
                      row.brokers ? <Check className="h-5 w-5 text-emerald-500" /> : <X className="h-5 w-5 text-red-400" />
                    ) : <span className="text-red-500 font-semibold">{row.brokers}</span>}
                  </div>
                  <div className="p-4 text-center border-l border-border flex items-center justify-center">
                    {typeof row.us === "boolean" ? (
                      row.us ? <Check className="h-5 w-5 text-emerald-500" /> : <X className="h-5 w-5 text-red-400" />
                    ) : <span className="text-emerald-600 font-bold text-base">{row.us}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">How it works</h2>
            <p className="text-lg text-muted-foreground">Ship your car or find your next load in minutes.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full text-sm font-semibold mb-8">
                <Truck className="h-4 w-4" /> For Shippers
              </div>
              {[
                { icon: <MapPin className="h-5 w-5 text-primary" />, title: "Post your vehicle for free", desc: "Enter the pickup location, destination, vehicle info, and your target budget. Takes 2 minutes." },
                { icon: <DollarSign className="h-5 w-5 text-primary" />, title: "Receive bids from real drivers", desc: "Verified carriers — not brokers — submit competitive bids. You see their rating, reviews, and DOT info." },
                { icon: <ShieldCheck className="h-5 w-5 text-primary" />, title: "Accept and track directly", desc: "Accept the best bid, message your driver in-app, get photo condition reports at pickup and delivery." },
              ].map((s, i) => (
                <div key={i} className="flex gap-4 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">{s.icon}</div>
                  <div>
                    <h4 className="font-semibold text-base mb-1">{s.title}</h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
              <Button asChild><Link href="/post-load">Post a Load Free <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-full text-sm font-semibold mb-8">
                <Route className="h-4 w-4" /> For Drivers
              </div>
              {[
                { icon: <Truck className="h-5 w-5 text-emerald-600" />, title: "Browse loads or post your route", desc: "Search open loads along your route, or use Backhaul Finder to post where you're heading and let shippers find you." },
                { icon: <DollarSign className="h-5 w-5 text-emerald-600" />, title: "Bid what you're actually worth", desc: "No broker squeezing your margin. Submit a bid, negotiate directly, and agree on terms without a middleman taking a cut." },
                { icon: <Star className="h-5 w-5 text-emerald-600" />, title: "Build your reputation, not a broker's", desc: "Every delivery builds your verified review score. Shippers save and rebook drivers they trust — you own your reputation." },
              ].map((s, i) => (
                <div key={i} className="flex gap-4 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">{s.icon}</div>
                  <div>
                    <h4 className="font-semibold text-base mb-1">{s.title}</h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
              <Button variant="outline" asChild><Link href="/shipments">Browse Open Loads <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            </div>
          </div>
        </div>
      </section>

      {/* Who is KarHaul for? */}
      <section className="py-20 md:py-28 bg-slate-50 dark:bg-slate-900/40">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary font-medium text-sm mb-4 border border-primary/20">Open to Everyone</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Who can use KarHaul?</h2>
            <p className="text-lg text-muted-foreground">You don't need to be a dealer or a corporation. Anyone with a vehicle to move or a truck to haul can sign up — here's what you'll need.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">

            {/* Individual Shipper */}
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0 }}>
              <Card className="h-full border-2 hover:border-primary/40 transition-colors">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                    <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="inline-block text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full mb-3">Individual / Private Owner</div>
                  <h3 className="font-display font-bold text-xl mb-2">Shipping your personal vehicle</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-5">Relocating? Bought a car online? Sending a vehicle to a family member? You don't need a business — just create a free account and post your load.</p>
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-foreground">What you'll need to sign up:</p>
                    {[
                      { icon: FileText, text: "Government-issued photo ID (driver's license or passport)" },
                      { icon: CreditCard, text: "Payment method to pay the 3% platform fee (charged only on acceptance)" },
                      { icon: FileText, text: "Vehicle title or registration to confirm ownership" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <item.icon className="h-4 w-4 shrink-0 mt-0.5 text-blue-500" />
                        {item.text}
                      </div>
                    ))}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-2">
                      <p className="text-xs text-blue-800 dark:text-blue-300"><strong>No business license needed.</strong> Individuals ship vehicles every day — relocation, online purchases, estate transfers, and more.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Auto Dealer */}
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
              <Card className="h-full border-2 hover:border-primary/40 transition-colors">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                    <Building2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="inline-block text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full mb-3">Independent Auto Dealer</div>
                  <h3 className="font-display font-bold text-xl mb-2">Moving inventory at scale</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-5">Post individual cars or batches. Stop paying broker margins on every unit. Rebook drivers you trust directly — no re-listing required.</p>
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-foreground">What you'll need to sign up:</p>
                    {[
                      { icon: FileText, text: "Dealer license or business registration" },
                      { icon: CreditCard, text: "Business payment method for the 3% platform fee" },
                      { icon: FileText, text: "Lot address and contact information" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <item.icon className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
                        {item.text}
                      </div>
                    ))}
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 mt-2">
                      <p className="text-xs text-emerald-800 dark:text-emerald-300"><strong>Dealers pay $0 in broker markup.</strong> The 3% platform fee replaces $150–$500 per-car broker fees — you keep the difference.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Professional Driver */}
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
              <Card className="h-full border-2 hover:border-primary/40 transition-colors">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                    <Truck className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="inline-block text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full mb-3">Professional Driver / Carrier</div>
                  <h3 className="font-display font-bold text-xl mb-2">Get paid to haul — no subscription</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-5">Browse open loads for free. Bid on jobs along your routes. You only pay when you win a job — no monthly fee just to see available loads.</p>
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-foreground">Federal requirements to haul:</p>
                    {[
                      { icon: FileText, text: "Active USDOT number (registered with FMCSA)" },
                      { icon: FileText, text: "Active MC (Motor Carrier) authority number" },
                      { icon: ShieldCheck, text: "Minimum $750,000 auto liability insurance (per 49 CFR 387)" },
                      { icon: FileText, text: "Truck type and hauling capacity on your profile" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <item.icon className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                        {item.text}
                      </div>
                    ))}
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-2">
                      <p className="text-xs text-amber-800 dark:text-amber-300"><strong>Drivers pay $0.</strong> No monthly subscription, no listing fees, no broker cut. We verify your credentials and you're live.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

          </div>

          <div className="text-center mt-12">
            <Button size="lg" asChild>
              <Link href="/api/auth/login?screen_hint=signup">Create a Free Account <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-slate-900">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-3">What our community says</h2>
            <p className="text-slate-400">From drivers who ditched expensive subscriptions and shippers who stopped paying broker fees.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <Card className="bg-slate-800 border-slate-700 h-full">
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-4">{Array.from({ length: t.stars }).map((_, j) => <Star key={j} className="h-4 w-4 text-amber-400 fill-amber-400" />)}</div>
                    <p className="text-slate-200 text-sm leading-relaxed mb-5 italic">"{t.quote}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm shrink-0">{t.name.charAt(0)}</div>
                      <div>
                        <p className="text-white font-semibold text-sm">{t.name}</p>
                        <p className="text-slate-400 text-xs">{t.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-semibold mb-6 border border-primary/20">
              <Zap className="h-4 w-4" /> Always free to post. Always free to browse.
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">Ready to cut out the middleman?</h2>
            <p className="text-lg text-muted-foreground mb-10">Join thousands of drivers and shippers who've already switched from broker dependency to direct connection.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="h-14 px-10 text-base" asChild>
                <Link href="/post-load">Post a Load <ArrowRight className="ml-2" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-10 text-base" asChild>
                <Link href="/driver-routes"><Route className="mr-2 h-4 w-4" /> Find a Route</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
