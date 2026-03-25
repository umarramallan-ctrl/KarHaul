import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, ShieldCheck, DollarSign, Clock, MapPin, Truck } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative w-full py-20 md:py-32 overflow-hidden bg-slate-900">
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-truck.png`} 
            alt="Auto transport semi truck on highway" 
            className="w-full h-full object-cover opacity-40 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/80 to-transparent" />
        </div>
        
        <div className="container relative z-10 mx-auto px-4 md:px-6">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block py-1 px-3 rounded-full bg-accent/20 text-accent font-medium text-sm mb-6 border border-accent/30">
                Zero Broker Fees. Direct Connection.
              </span>
              <h1 className="text-4xl md:text-6xl font-display font-bold text-white leading-tight mb-6">
                Ship cars directly with <span className="text-gradient">verified carriers.</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl leading-relaxed">
                AutoHaul Connect is the marketplace that eliminates the middleman. Shippers save money, drivers earn more, and vehicles move faster.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="text-base h-14 px-8 shadow-lg shadow-primary/20" asChild>
                  <Link href="/post-load">
                    Post a Vehicle to Ship <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="text-base h-14 px-8 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white backdrop-blur-sm" asChild>
                  <Link href="/shipments">
                    Browse Available Loads
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats/Social Proof */}
      <section className="py-10 border-b bg-muted/30">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-border/50">
            <div>
              <p className="text-4xl font-display font-bold text-foreground">0%</p>
              <p className="text-sm text-muted-foreground mt-1 font-medium uppercase tracking-wider">Broker Fees</p>
            </div>
            <div>
              <p className="text-4xl font-display font-bold text-foreground">10k+</p>
              <p className="text-sm text-muted-foreground mt-1 font-medium uppercase tracking-wider">Verified Drivers</p>
            </div>
            <div>
              <p className="text-4xl font-display font-bold text-foreground">$2M+</p>
              <p className="text-sm text-muted-foreground mt-1 font-medium uppercase tracking-wider">Saved by Shippers</p>
            </div>
            <div>
              <p className="text-4xl font-display font-bold text-foreground">24/7</p>
              <p className="text-sm text-muted-foreground mt-1 font-medium uppercase tracking-wider">Direct Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">How AutoHaul Works</h2>
            <p className="text-lg text-muted-foreground">The simplest way to transport a vehicle from point A to point B.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-primary/20 via-primary/50 to-primary/20 z-0" />

            {[
              {
                icon: <MapPin className="h-6 w-6 text-primary" />,
                title: "1. Post Your Load",
                desc: "Enter vehicle details, pickup and delivery locations, and your target budget."
              },
              {
                icon: <DollarSign className="h-6 w-6 text-primary" />,
                title: "2. Receive Direct Bids",
                desc: "Verified carriers see your load and submit competitive bids directly to you."
              },
              {
                icon: <Truck className="h-6 w-6 text-primary" />,
                title: "3. Book & Track",
                desc: "Accept the best bid, communicate directly with the driver, and track status."
              }
            ].map((step, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-2xl bg-background border shadow-xl shadow-primary/5 flex items-center justify-center mb-6 hover:-translate-y-2 transition-transform duration-300">
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                    {step.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Split Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img 
                  src={`${import.meta.env.BASE_URL}images/abstract-bg.png`} 
                  alt="Abstract background" 
                  className="w-full h-full object-cover min-h-[400px]"
                />
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm p-8 md:p-12 flex flex-col justify-center">
                  <div className="bg-background rounded-2xl p-6 shadow-lg mb-6 border flex items-start gap-4">
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-full text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">Verified Carriers Only</h4>
                      <p className="text-sm text-muted-foreground mt-1">Every driver is checked for active DOT/MC authority and insurance.</p>
                    </div>
                  </div>
                  <div className="bg-background rounded-2xl p-6 shadow-lg border flex items-start gap-4">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full text-blue-600 dark:text-blue-400">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">Direct Communication</h4>
                      <p className="text-sm text-muted-foreground mt-1">No phone tag with brokers. Message your driver directly in the app.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Why bypass the broker?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Traditional auto transport brokers charge $150-$300+ per vehicle just to post your job on a dispatch board. We give you access to that same board for free.
              </p>
              
              <ul className="space-y-6">
                {[
                  "Keep 100% of your budget for the actual transport",
                  "Drivers get paid more, making them prioritize your load",
                  "Know exactly who has your car, not just an agency name",
                  "Transparent reviews and ratings for every carrier"
                ].map((item, i) => (
                  <li key={i} className="flex items-start">
                    <div className="mt-1 mr-4 rounded-full bg-primary/10 p-1">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-foreground font-medium">{item}</span>
                  </li>
                ))}
              </ul>
              
              <Button size="lg" className="mt-10" asChild>
                <Link href="/shipments">View Open Loads</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
