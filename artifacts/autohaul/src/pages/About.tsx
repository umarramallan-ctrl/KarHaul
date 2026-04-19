import { MainLayout } from "@/components/layout/MainLayout";
import { Link } from "wouter";
import { Truck, Users, ShieldCheck, DollarSign, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function About() {
  return (
    <MainLayout>
      {/* Hero */}
      <div className="bg-gradient-to-b from-slate-950 to-slate-900 border-b border-slate-800 py-20">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-8 bg-primary" />
            <span className="text-primary font-mono text-xs font-bold tracking-[0.2em] uppercase">About KarHaul</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tight mb-4">
            Direct auto transport.<br />
            <span className="text-primary">Zero brokers.</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl">
            KarHaul is a technology marketplace connecting vehicle shippers directly with licensed carriers — cutting out the middlemen and putting money back in the pockets of both drivers and customers.
          </p>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-16 space-y-20">

        {/* The Problem */}
        <section className="space-y-6">
          <h2 className="text-2xl font-display font-bold tracking-tight">The problem we solve</h2>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 md:p-8">
            <p className="text-base text-muted-foreground leading-relaxed">
              The traditional auto transport industry is plagued by layers of brokers who add little value but take large cuts — often 20–40% of the total shipping cost. Shippers overpay, carriers are underpaid, and communication is opaque. Delays, hidden fees, and vague timelines are the norm.
            </p>
            <p className="text-base text-muted-foreground leading-relaxed mt-4">
              KarHaul eliminates this by letting shippers post loads directly and receive bids from verified, licensed carriers — no broker in between. Our platform handles escrow, messaging, BOL documents, and ratings so everyone stays protected without sacrificing transparency.
            </p>
          </div>
        </section>

        {/* How it works for shippers */}
        <section className="space-y-6">
          <h2 className="text-2xl font-display font-bold tracking-tight">How it works for shippers</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { step: "1", icon: DollarSign, title: "Post your load", body: "Describe your vehicle, enter pickup and delivery addresses, set your budget, and go live in minutes." },
              { step: "2", icon: Users, title: "Receive bids", body: "Verified carriers bid directly on your shipment. Compare ratings, completed jobs, and pricing — then accept the best offer." },
              { step: "3", icon: ShieldCheck, title: "Ship with confidence", body: "Funds are held in escrow until delivery is confirmed. Download your Bill of Lading. Rate your carrier." },
            ].map(({ step, icon: Icon, title, body }) => (
              <div key={step} className="rounded-2xl border border-border bg-card p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Step {step}</div>
                <h3 className="font-semibold text-base">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works for drivers */}
        <section className="space-y-6">
          <h2 className="text-2xl font-display font-bold tracking-tight">How it works for drivers</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { step: "1", icon: Truck, title: "Browse open loads", body: "Filter loads by route, vehicle type, and transport style. Find backhaul opportunities on your existing routes." },
              { step: "2", icon: DollarSign, title: "Bid your price", body: "Submit a competitive bid with your own pricing — no broker telling you what you'll earn. Keep 95% of every job." },
              { step: "3", icon: ShieldCheck, title: "Get paid fast", body: "Escrow releases on delivery confirmation. Build your rating with every completed job to win more business." },
            ].map(({ step, icon: Icon, title, body }) => (
              <div key={step} className="rounded-2xl border border-border bg-card p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Step {step}</div>
                <h3 className="font-semibold text-base">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Company */}
        <section className="space-y-6">
          <h2 className="text-2xl font-display font-bold tracking-tight">About EvoPoint LLC</h2>
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              KarHaul is a product of <strong className="text-foreground">EvoPoint LLC</strong>, a technology company focused on removing friction from industries that have historically relied on inefficient intermediaries.
            </p>
            <p>
              Our team has first-hand experience with the pain points on both sides of the auto transport equation — and we built KarHaul to fix them. We believe that when technology connects people directly, everyone wins.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-8 md:p-12 text-center space-y-4">
          <h2 className="text-2xl font-display font-bold tracking-tight">Ready to get started?</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Post your first load or browse open routes today. No broker fees, no guesswork.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-2">
            <Button asChild size="lg">
              <Link href="/post-load">Post a Load <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/shipments">Browse Loads</Link>
            </Button>
          </div>
        </section>

      </div>
    </MainLayout>
  );
}
