import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { ArrowRight, ShieldCheck, DollarSign, Clock, MapPin, Truck, Star, X, Check, TrendingDown, Route, Heart, Camera, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];

async function estimatePrice(data: Record<string, string>) {
  const res = await fetch(`${BASE}/api/price-estimate`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  return res.json();
}

function PriceEstimator() {
  const [form, setForm] = useState({ originState: "", destinationState: "", vehicleType: "sedan", transportType: "open", vehicleCondition: "running" });
  const [result, setResult] = useState<any>(null);
  const mutation = useMutation({ mutationFn: estimatePrice, onSuccess: setResult });
  const set = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setResult(null); };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Origin State</label>
          <Select value={form.originState} onValueChange={v => set("originState", v)}>
            <SelectTrigger className="h-11"><SelectValue placeholder="From..." /></SelectTrigger>
            <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Destination State</label>
          <Select value={form.destinationState} onValueChange={v => set("destinationState", v)}>
            <SelectTrigger className="h-11"><SelectValue placeholder="To..." /></SelectTrigger>
            <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Vehicle</label>
          <Select value={form.vehicleType} onValueChange={v => set("vehicleType", v)}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["sedan","suv","truck","van","motorcycle","rv","exotic","other"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Carrier Type</label>
          <Select value={form.transportType} onValueChange={v => set("transportType", v)}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="enclosed">Enclosed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Condition</label>
          <Select value={form.vehicleCondition} onValueChange={v => set("vehicleCondition", v)}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="non_running">Non-Running</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        className="w-full h-11 font-semibold"
        onClick={() => mutation.mutate(form)}
        disabled={!form.originState || !form.destinationState || mutation.isPending}
      >
        {mutation.isPending ? "Calculating..." : "Get Free Estimate"}
      </Button>

      {result && !result.error && (
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
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Traxion vs. Traditional Brokers</h2>
            <p className="text-muted-foreground text-lg">The same drivers. Without the middleman tax.</p>
          </div>
          <div className="max-w-3xl mx-auto">
            <div className="rounded-2xl overflow-hidden border shadow-xl">
              <div className="grid grid-cols-3 bg-slate-800 dark:bg-slate-900 text-white text-sm font-semibold">
                <div className="p-4">Feature</div>
                <div className="p-4 text-center border-l border-slate-700 text-slate-400">Traditional Brokers</div>
                <div className="p-4 text-center border-l border-slate-700 text-primary">Traxion</div>
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
