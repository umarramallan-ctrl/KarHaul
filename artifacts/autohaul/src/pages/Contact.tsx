import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Phone, Mail, Send, CheckCircle } from "lucide-react";
import { apiBase } from "@/lib/api";

export default function Contact() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast({ title: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await fetch(`${apiBase}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setSubmitted(true);
    } catch {
      toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <MainLayout>
      {/* Hero */}
      <div className="bg-gradient-to-b from-slate-950 to-slate-900 border-b border-slate-800 py-16">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-8 bg-primary" />
            <span className="text-primary font-mono text-xs font-bold tracking-[0.2em] uppercase">Contact Us</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tight mb-3">
            Get in touch
          </h1>
          <p className="text-slate-400 text-lg max-w-xl">
            Questions, feedback, or partnership inquiries — our team is here to help.
          </p>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-5 gap-12">

          {/* Contact Info */}
          <div className="md:col-span-2 space-y-8">
            <div>
              <h2 className="text-lg font-semibold mb-4">Contact information</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Address</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      185 Stockwood Dr Ste 13045<br />
                      Woodstock, GA 30188
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <a href="tel:+17706759117" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      +1 (770) 675-9117
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <a href="mailto:admin@karhaul.com" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      admin@karhaul.com
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm font-medium mb-1">Business hours</p>
              <p className="text-sm text-muted-foreground">Monday – Friday: 9 AM – 6 PM ET</p>
              <p className="text-sm text-muted-foreground">Saturday: 10 AM – 3 PM ET</p>
              <p className="text-sm text-muted-foreground">Sunday: Closed</p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="md:col-span-3">
            {submitted ? (
              <div className="flex flex-col items-center justify-center gap-4 py-16 text-center rounded-2xl border border-green-500/20 bg-green-500/5">
                <CheckCircle className="h-12 w-12 text-green-500" />
                <h2 className="text-xl font-semibold">Message sent!</h2>
                <p className="text-muted-foreground max-w-sm">
                  Thanks for reaching out. We'll get back to you within one business day.
                </p>
                <Button variant="outline" onClick={() => { setSubmitted(false); setForm({ name: "", email: "", subject: "", message: "" }); }}>
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                    <Input id="name" name="name" placeholder="John Smith" value={form.name} onChange={handleChange} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                    <Input id="email" name="email" type="email" placeholder="john@example.com" value={form.email} onChange={handleChange} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" name="subject" placeholder="How can we help?" value={form.subject} onChange={handleChange} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="message">Message <span className="text-destructive">*</span></Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Tell us what's on your mind…"
                    value={form.message}
                    onChange={handleChange}
                    rows={6}
                    required
                  />
                </div>
                <Button type="submit" size="lg" disabled={loading} className="w-full sm:w-auto">
                  {loading ? "Sending…" : (
                    <><Send className="mr-2 h-4 w-4" />Send Message</>
                  )}
                </Button>
              </form>
            )}
          </div>

        </div>
      </div>
    </MainLayout>
  );
}
