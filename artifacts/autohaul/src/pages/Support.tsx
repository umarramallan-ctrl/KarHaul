import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronDown, ChevronUp, HelpCircle, ShieldCheck, Mail,
  Phone, Truck, Package, DollarSign, FileText, AlertTriangle,
  Clock, CheckCircle2, Search, Star, MessageSquarePlus,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@workspace/replit-auth-web";

interface FaqItem { q: string; a: string }

const FAQS: Record<string, FaqItem[]> = {
  "Shippers": [
    {
      q: "How do I post a vehicle for transport?",
      a: "Click 'Post a Load Free' from the homepage or navigation. Fill in the pickup and delivery locations, vehicle details (year, make, model, condition), your preferred transport type (open or enclosed), and your target price or 'make offer'. Your listing goes live instantly and carriers can begin submitting bids immediately.",
    },
    {
      q: "How do I choose the right carrier?",
      a: "Review each carrier's profile carefully: check their DOT/MC numbers (you can verify independently at the FMCSA website), look at their verified badge status, read reviews from previous shippers, and confirm they have adequate cargo insurance. Never hand over your vehicle without verifying current insurance documentation directly with the carrier.",
    },
    {
      q: "What does the 3% platform fee cover?",
      a: "KarHaul charges a single 3% service fee to shippers on the agreed transport price. This fee covers platform maintenance, identity verification of carriers, secure messaging, milestone tracking, and in-app communication tools. There are no hidden fees, subscriptions, or broker markups. Drivers pay nothing to use the platform.",
    },
    {
      q: "How and when do I pay the carrier?",
      a: "Payment is arranged directly between you and the carrier — KarHaul does not process or hold transport payments. Most carriers accept cash on delivery, Zelle, wire transfer, or certified check. Always agree on payment terms in writing (via in-app messages) before pickup. The 3% platform fee is noted on your booking confirmation.",
    },
    {
      q: "What is a Bill of Lading (BOL) and why do I need it?",
      a: "A Bill of Lading is the legal contract between you and the carrier documenting the vehicle's condition at pickup and delivery. ALWAYS complete a BOL with photos at both ends. If your vehicle arrives damaged and there's no BOL notation, you may have no recourse against the carrier's insurance. The BOL is your most important document in any dispute.",
    },
    {
      q: "What happens if my vehicle is damaged during transport?",
      a: "If you notice damage at delivery, note it on the carrier's Bill of Lading BEFORE signing — do not sign a clean BOL for a damaged vehicle. Take dated photos immediately. File a claim directly with the carrier's cargo insurance provider. KarHaul is not a carrier and does not mediate or compensate for damage claims; the platform's Terms of Service contain a full liability disclaimer.",
    },
    {
      q: "Can I cancel after accepting a bid?",
      a: "You may cancel before the carrier picks up the vehicle, but you should communicate immediately through the in-app messaging. Review any cancellation terms you agreed to with the carrier. Repeated cancellations may impact your shipper rating. If the carrier has already started en route, you may owe a cancellation fee as agreed.",
    },
    {
      q: "What if the carrier doesn't show up?",
      a: "Contact the carrier directly via the in-app call button or messaging. If you cannot reach them, you may cancel the booking and relist your shipment. KarHaul does not guarantee carrier performance — always vet carriers carefully and avoid paying any deposit before pickup without written confirmation.",
    },
  ],
  "Carriers & Drivers": [
    {
      q: "Is it free for drivers to use KarHaul?",
      a: "Yes — completely free. KarHaul charges zero fees to carriers or drivers. You can browse loads, submit bids, communicate with shippers, and manage bookings at no cost. The platform's 3% fee is charged to the shipper only.",
    },
    {
      q: "What documents do I need to register as a carrier?",
      a: "You'll need your USDOT number, MC (Motor Carrier) number, and proof of active cargo and liability insurance. During registration, enter your DOT and MC numbers in your profile — shippers and our verification team will confirm them against FMCSA records. Verified carriers receive a badge on their profile.",
    },
    {
      q: "How do I submit a bid on a load?",
      a: "From the Browse Loads page, click any shipment to view full details. Click 'Submit Bid', enter your price, estimated transit time, and any notes for the shipper. You can view all bids you've submitted in your driver dashboard. The shipper will review all bids and accept one — you'll receive an in-app notification.",
    },
    {
      q: "How do I use Backhaul Finder?",
      a: "The Backhaul Finder tool on your dashboard lets you enter your planned route (origin, destination, and travel dates). It shows you available loads that match your route so you can fill empty space on your truck and maximize revenue on return trips.",
    },
    {
      q: "What are milestone tracking checkpoints?",
      a: "When you accept a booking, you'll post milestone updates as you progress: Pickup Confirmed, In Transit, Approaching Delivery, and Delivered. Each update notifies the shipper and builds your reliability record. High completion rates with on-time milestones improve your reviews and help you win future bids.",
    },
    {
      q: "What insurance coverage is required?",
      a: "Federal law (49 CFR Part 387) requires auto haulers to carry a minimum of $750,000 in liability insurance. You must also carry cargo insurance sufficient to cover the value of vehicles you transport. Shippers have the right to request proof of insurance before releasing their vehicle, and you must provide it.",
    },
    {
      q: "Can I negotiate with a shipper after submitting a bid?",
      a: "Yes. Use the in-app messaging system to discuss pickup timing, vehicle condition, or route details with the shipper. You can also withdraw and resubmit a bid with an adjusted price before it's accepted. Once a bid is accepted, it becomes a binding agreement.",
    },
  ],
  "Account & Platform": [
    {
      q: "How does account verification work?",
      a: "When a carrier enters their DOT and MC numbers, our team cross-references them with FMCSA records and checks for active insurance on file. Verified carriers receive a blue checkmark on their profile. Note that this is a one-time check at setup — shippers are encouraged to independently verify current compliance before transport.",
    },
    {
      q: "How do I set up Two-Factor Authentication?",
      a: "Go to Profile & Settings and scroll to the Two-Factor Authentication section. You can add an authenticator app (Google Authenticator, Authy, 1Password) by scanning a QR code, or enable SMS verification by adding your phone number. Once enabled, every login will require your second factor.",
    },
    {
      q: "What is a Passkey and how do I use it?",
      a: "Passkeys use your device's biometrics (Face ID, Touch ID, Windows Hello) or PIN to sign in without a password. Set one up in Profile & Settings under the Passkeys section. Once registered, click 'Sign in with Passkey' on the login page — no password or code required.",
    },
    {
      q: "Can I use the platform as both a shipper and a driver?",
      a: "Yes. Set your role to 'Both' in your Profile & Settings. Your dashboard will show options for both shipper (My Shipments) and driver (Browse Loads, Bids, Backhaul Finder) activity. Your profile will display your relevant credentials based on the context.",
    },
    {
      q: "How is my data protected?",
      a: "All data is encrypted in transit (TLS) and at rest. We do not sell your personal information to third parties. Sensitive account data (phone numbers, credentials) is accessible only to you. See our Privacy Policy for full details on data handling, retention, and your rights.",
    },
  ],
};

function FaqSection({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="border rounded-lg overflow-hidden">
          <button
            className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/40 transition-colors gap-3"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="font-medium text-sm leading-snug">{item.q}</span>
            {open === i ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
          </button>
          {open === i && (
            <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed border-t bg-muted/10 pt-3">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const CATEGORIES = [
  { value: "app_experience", label: "App Experience" },
  { value: "feature_request", label: "Feature Request" },
  { value: "bug_report", label: "Bug Report" },
  { value: "general", label: "General" },
];

function FeedbackStars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} type="button" onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}>
          <Star className={`h-7 w-7 transition-colors ${s <= (hover || value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
        </button>
      ))}
    </div>
  );
}

async function postFeedback(data: Record<string, any>) {
  const res = await fetch("/api/feedback", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
  return res.json();
}

export default function Support() {
  const initialTab = (() => {
    const p = new URLSearchParams(window.location.search).get("tab");
    if (p === "safety") return "safety";
    if (p === "contact") return "contact";
    if (p === "feedback") return "feedback";
    return "help";
  })();
  const [activeTab, setActiveTab] = useState<"help" | "safety" | "contact" | "feedback">(initialTab);
  const [faqCategory, setFaqCategory] = useState("Shippers");
  const [search, setSearch] = useState("");
  const [contactForm, setContactForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [feedbackForm, setFeedbackForm] = useState({ category: "app_experience", rating: 0, message: "", email: "" });
  const [feedbackDone, setFeedbackDone] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const feedbackMutation = useMutation({
    mutationFn: postFeedback,
    onSuccess: () => setFeedbackDone(true),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filteredFaqs = FAQS[faqCategory].filter(
    f => !search || f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase())
  );

  function handleContact(e: React.FormEvent) {
    e.preventDefault();
    toast({ title: "Message sent", description: "We'll respond to your inquiry within 1–2 business days." });
    setContactForm({ name: "", email: "", subject: "", message: "" });
  }

  return (
    <MainLayout>
      <div className="bg-gradient-to-b from-primary/5 to-transparent py-14 border-b">
        <div className="container max-w-5xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <HelpCircle className="h-4 w-4" /> Support Center
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">How can we help?</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Find answers, learn about safety requirements, or reach out to the KarHaul team.
          </p>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto px-4 py-10">
        {/* Tab nav */}
        <div className="flex gap-2 mb-8 border-b overflow-x-auto">
          {(["help", "safety", "contact", "feedback"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "help" ? "Help Center" : tab === "safety" ? "Safety & Insurance" : tab === "contact" ? "Contact Us" : "Share Feedback"}
            </button>
          ))}
        </div>

        {/* ── Help Center ── */}
        {activeTab === "help" && (
          <div className="space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search help articles…"
                className="pl-10"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {Object.keys(FAQS).map(cat => (
                <button
                  key={cat}
                  onClick={() => { setFaqCategory(cat); setSearch(""); }}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    faqCategory === cat
                      ? "bg-primary text-white border-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {cat === "Shippers" ? <><Package className="h-3.5 w-3.5 inline mr-1.5" />Shippers</> :
                   cat === "Carriers & Drivers" ? <><Truck className="h-3.5 w-3.5 inline mr-1.5" />Carriers & Drivers</> :
                   <><HelpCircle className="h-3.5 w-3.5 inline mr-1.5" />Account & Platform</>}
                </button>
              ))}
            </div>

            {filteredFaqs.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p>No results for "<strong>{search}</strong>". Try different keywords or <button className="text-primary underline" onClick={() => setActiveTab("contact")}>contact support</button>.</p>
              </div>
            ) : (
              <FaqSection items={filteredFaqs} />
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              {[
                { icon: DollarSign, title: "Platform Fees", desc: "3% charged to shippers only. Drivers always free.", color: "text-green-600 bg-green-50" },
                { icon: FileText, title: "Bill of Lading", desc: "Always complete a BOL with photos at pickup and delivery.", color: "text-blue-600 bg-blue-50" },
                { icon: AlertTriangle, title: "Damage Claims", desc: "File directly with the carrier's cargo insurance — not KarHaul.", color: "text-amber-600 bg-amber-50" },
              ].map(({ icon: Icon, title, desc, color }) => (
                <Card key={title} className="border-0 bg-muted/30">
                  <CardContent className="pt-5 pb-5">
                    <div className={`p-2 rounded-lg w-fit mb-3 ${color}`}><Icon className="h-4 w-4" /></div>
                    <p className="font-semibold text-sm mb-1">{title}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── Safety & Insurance ── */}
        {activeTab === "safety" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Truck className="h-5 w-5 text-primary" /> Carrier Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <div><strong>USDOT Number</strong> — Required for all interstate commercial vehicle operators. Verify at FMCSA.dot.gov.</div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <div><strong>MC Authority</strong> — Motor Carrier operating authority from FMCSA for-hire transport across state lines.</div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <div><strong>Cargo Insurance</strong> — Minimum $100,000 cargo coverage for transported vehicles; higher limits recommended for luxury or collector cars.</div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <div><strong>Liability Insurance</strong> — Federal minimum of $750,000 for auto haulers (49 CFR §387.9).</div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <div><strong>Valid CDL</strong> — Commercial Driver's License appropriate for vehicle class and configuration.</div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <div><strong>Clean Safety Record</strong> — FMCSA Safety Rating of Satisfactory or no rating (unrated). Conditional or Unsatisfactory ratings should be disclosed.</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldCheck className="h-5 w-5 text-primary" /> Shipper Protection Guide
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <div><strong>Verify Insurance Yourself</strong> — Don't rely solely on the platform's Verified badge. Request a Certificate of Insurance (COI) directly from the carrier before handing over your vehicle.</div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <div><strong>Complete a Bill of Lading</strong> — Document vehicle condition with dated photos at pickup. Both parties should sign. Keep a copy.</div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <div><strong>Never Pay in Full Upfront</strong> — Standard industry practice is 0% upfront or a small deposit, with the balance due on delivery. Be cautious of carriers requiring full prepayment.</div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <div><strong>Check FMCSA Records</strong> — Look up the carrier's DOT number at safer.fmcsa.dot.gov to verify operating authority, insurance on file, and inspection history.</div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <div><strong>Inspect at Delivery</strong> — Thoroughly inspect your vehicle before signing the BOL at delivery. Note any new damage in writing before signing anything.</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5 text-primary" /> Bill of Lading — Best Practices
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-4">
                <p className="text-muted-foreground">The Bill of Lading (BOL) is your legal contract for vehicle transport. It is the single most important document in any damage claim. Do not skip it.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { step: "At Pickup", items: ["Note all pre-existing scratches, dents, chips", "Take video walking around the vehicle", "Record mileage and fuel level", "Both parties sign — get your copy"] },
                    { step: "At Delivery", items: ["Compare condition to pickup BOL immediately", "Note any new damage BEFORE signing", "Do not sign a clean BOL for a damaged vehicle", "Photograph all new damage with timestamps"] },
                  ].map(({ step, items }) => (
                    <div key={step} className="border rounded-lg p-4">
                      <p className="font-semibold mb-2">{step}</p>
                      <ul className="space-y-1">
                        {items.map(item => (
                          <li key={item} className="flex items-start gap-2 text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
              <CardContent className="pt-5 pb-5">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <strong className="text-amber-800 dark:text-amber-400">Platform Liability Notice</strong>
                    <p className="text-amber-700 dark:text-amber-500 mt-1">
                      KarHaul is a technology platform, not a motor carrier or freight broker. All transport liability exists strictly between the shipper and the contracted carrier. KarHaul does not hold, mediate, or insure any cargo. See our <a href="/terms" className="underline font-medium">Terms of Service</a> for the full liability disclaimer.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-5 w-5 text-primary" /> Filing a Damage Claim
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p className="text-muted-foreground">If your vehicle was damaged during transport, follow these steps immediately:</p>
                <ol className="space-y-2 list-none">
                  {[
                    "Note damage on the delivery BOL before signing — this is essential for any claim",
                    "Take comprehensive dated photos and video of all damage",
                    "Contact the carrier directly and request their cargo insurance carrier name and claim contact",
                    "File a cargo claim directly with the carrier's insurance company — include your BOL, photos, and repair estimates",
                    "If the carrier is unresponsive, file a complaint with the FMCSA at nccdb.fmcsa.dot.gov",
                    "Consult an attorney if the claim involves significant vehicle value",
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">{i + 1}</span>
                      <span className="text-muted-foreground pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Contact Us ── */}
        {activeTab === "contact" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Send Us a Message</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleContact} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" placeholder="Jane Smith" required value={contactForm.name} onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" type="email" placeholder="jane@example.com" required value={contactForm.email} onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="subject">Subject</Label>
                      <Input id="subject" placeholder="e.g. Carrier verification, billing question, damage claim" required value={contactForm.subject} onChange={e => setContactForm(p => ({ ...p, subject: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="message">Message</Label>
                      <Textarea id="message" placeholder="Describe your issue or question in detail, including any booking or shipment IDs if relevant…" rows={6} required value={contactForm.message} onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))} />
                    </div>
                    <Button type="submit" className="w-full sm:w-auto">Send Message</Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardContent className="pt-5 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="h-4 w-4 text-primary" />
                      <p className="font-semibold text-sm">Email Support</p>
                    </div>
                    <p className="text-sm text-muted-foreground">support@karhaul.com</p>
                    <Badge variant="secondary" className="mt-1 text-xs">1–2 business days</Badge>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Phone className="h-4 w-4 text-primary" />
                      <p className="font-semibold text-sm">Urgent Dispatch Issues</p>
                    </div>
                    <p className="text-sm text-muted-foreground">Available for active booking emergencies via in-app messaging with your carrier.</p>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-primary" />
                      <p className="font-semibold text-sm">Support Hours</p>
                    </div>
                    <p className="text-sm text-muted-foreground">Monday – Friday<br />8:00 AM – 6:00 PM ET</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/30 border-0">
                <CardContent className="pt-5 text-sm text-muted-foreground space-y-2">
                  <p className="font-semibold text-foreground">External Resources</p>
                  <a href="https://safer.fmcsa.dot.gov" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline text-sm">
                    <ShieldCheck className="h-3.5 w-3.5" /> FMCSA SAFER System
                  </a>
                  <a href="https://nccdb.fmcsa.dot.gov" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline text-sm">
                    <FileText className="h-3.5 w-3.5" /> File FMCSA Complaint
                  </a>
                  <a href="https://www.transportation.gov" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline text-sm">
                    <Truck className="h-3.5 w-3.5" /> U.S. DOT
                  </a>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        {/* ── Share Feedback ── */}
        {activeTab === "feedback" && (
          <div className="max-w-xl mx-auto">
            {feedbackDone ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Thank you!</h2>
                <p className="text-muted-foreground mb-6">Your feedback helps us improve KarHaul for everyone.</p>
                <Button variant="outline" onClick={() => { setFeedbackDone(false); setFeedbackForm({ category: "app_experience", rating: 0, message: "", email: "" }); }}>
                  Submit more feedback
                </Button>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquarePlus className="h-5 w-5 text-primary" /> Share Your Experience
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Tell us what's working, what's not, or what you'd love to see next.</p>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Category */}
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORIES.map(c => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setFeedbackForm(f => ({ ...f, category: c.value }))}
                          className={`border-2 rounded-lg px-3 py-2 text-sm font-medium text-left transition-colors ${
                            feedbackForm.category === c.value
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="space-y-2">
                    <Label>Overall Experience <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <FeedbackStars value={feedbackForm.rating} onChange={v => setFeedbackForm(f => ({ ...f, rating: v }))} />
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <Label htmlFor="fb-message">Your Feedback <span className="text-destructive">*</span></Label>
                    <Textarea
                      id="fb-message"
                      placeholder="Describe your experience, report a bug, or suggest a feature…"
                      rows={5}
                      className="resize-none"
                      value={feedbackForm.message}
                      onChange={e => setFeedbackForm(f => ({ ...f, message: e.target.value }))}
                    />
                  </div>

                  {/* Email — only if not logged in */}
                  {!isAuthenticated && (
                    <div className="space-y-2">
                      <Label htmlFor="fb-email">Email <span className="text-muted-foreground font-normal">(optional — for follow-up)</span></Label>
                      <Input
                        id="fb-email"
                        type="email"
                        placeholder="you@example.com"
                        value={feedbackForm.email}
                        onChange={e => setFeedbackForm(f => ({ ...f, email: e.target.value }))}
                      />
                    </div>
                  )}

                  <Button
                    className="w-full"
                    disabled={!feedbackForm.message.trim() || feedbackMutation.isPending}
                    onClick={() => feedbackMutation.mutate({
                      category: feedbackForm.category,
                      rating: feedbackForm.rating || undefined,
                      message: feedbackForm.message,
                      email: feedbackForm.email || undefined,
                    })}
                  >
                    {feedbackMutation.isPending ? "Submitting…" : "Submit Feedback"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
