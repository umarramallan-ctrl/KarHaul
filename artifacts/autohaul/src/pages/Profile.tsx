import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/AuthGuard";
import { useGetMyProfile, useUpdateMyProfile } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect } from "react";
import { ShieldCheck, Truck, User, Lock, Key } from "lucide-react";
import { PasskeyManager } from "@/components/passkeys/PasskeyManager";
import { TwoFASettings } from "@/components/security/TwoFASettings";
import { motion } from "framer-motion";

type UpdateProfileBodyRole = "shipper" | "driver" | "both";

const profileSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  phone: z.string().min(10, "Valid phone required"),
  role: z.enum(["shipper", "driver", "both", "admin"]).optional(),
  dotNumber: z.string().optional(),
  mcNumber: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
  truckType: z.string().optional(),
  termsAccepted: z.boolean().refine(val => val === true, { message: "You must accept the terms of service." }),
});

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800/60 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">{icon}</div>
        <h2 className="font-bold text-white text-sm uppercase tracking-wider">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function Profile() {
  const { toast } = useToast();
  const { data: profile, isLoading } = useGetMyProfile();
  const updateMutation = useUpdateMyProfile();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: "", lastName: "", phone: "", role: "shipper", dotNumber: "", mcNumber: "", insuranceProvider: "", insurancePolicyNumber: "", truckType: "", termsAccepted: false },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        firstName: profile.firstName || "", lastName: profile.lastName || "", phone: profile.phone || "",
        role: profile.role || "shipper", dotNumber: profile.dotNumber || "", mcNumber: profile.mcNumber || "",
        insuranceProvider: profile.insuranceProvider || "", insurancePolicyNumber: profile.insurancePolicyNumber || "",
        truckType: profile.truckType || "", termsAccepted: profile.termsAccepted || false,
      });
    }
  }, [profile, form]);

  function onSubmit(values: z.infer<typeof profileSchema>) {
    const validRole = (values.role === "admin" ? "both" : values.role) as UpdateProfileBodyRole;
    updateMutation.mutate({ data: { ...values, role: validRole } }, {
      onSuccess: () => toast({ title: "Profile Updated", description: "Your profile has been saved successfully." }),
      onError: (err: any) => toast({ title: "Update Failed", description: err.message, variant: "destructive" }),
    });
  }

  const selectedRole = form.watch("role");
  const isDriverForm = selectedRole === "driver" || selectedRole === "both";

  if (isLoading) return (
    <MainLayout>
      <div className="bg-slate-950 min-h-screen flex items-center justify-center">
        <div className="text-slate-500 animate-pulse">Loading…</div>
      </div>
    </MainLayout>
  );

  return (
    <AuthGuard>
      <MainLayout>
        <div className="bg-slate-950 border-b border-slate-800/60 py-14">
          <div className="container mx-auto px-4 md:px-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8 bg-violet-500" />
              <span className="text-violet-400 font-mono text-xs font-bold tracking-[0.2em] uppercase">Account</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tight mb-2">Profile & Settings</h1>
                <p className="text-slate-400">Complete your account to start using EVAUL.</p>
              </div>
              {profile?.isVerified && (
                <div className="hidden md:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 px-4 py-2 rounded-xl text-sm font-bold">
                  <ShieldCheck className="h-4 w-4" /> Verified Carrier
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-950 min-h-screen">
          <div className="container max-w-2xl mx-auto px-4 md:px-8 py-10 space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Personal Info */}
                <Section title="Personal Information" icon={<User className="h-4 w-4" />}>
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {[
                        { name: "firstName" as const, label: "First Name" },
                        { name: "lastName" as const, label: "Last Name" },
                      ].map(({ name, label }) => (
                        <FormField key={name} control={form.control} name={name} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</FormLabel>
                            <FormControl>
                              <Input {...field} className="bg-slate-800/60 border-slate-700 text-white h-11 focus:border-blue-500" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Phone Number</FormLabel>
                          <FormControl><Input type="tel" {...field} className="bg-slate-800/60 border-slate-700 text-white h-11 focus:border-blue-500" /></FormControl>
                          <FormDescription className="text-xs text-slate-600">Visible to your matches for coordination.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="role" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Account Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={profile?.isVerified}>
                            <FormControl>
                              <SelectTrigger className="bg-slate-800/60 border-slate-700 text-white h-11">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="shipper">Shipper (I want to ship a car)</SelectItem>
                              <SelectItem value="driver">Carrier (I haul cars)</SelectItem>
                              <SelectItem value="both">Both</SelectItem>
                            </SelectContent>
                          </Select>
                          {profile?.isVerified && <FormDescription className="text-xs text-slate-600">Role locked while verified.</FormDescription>}
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </Section>

                {/* Driver Credentials */}
                {isDriverForm && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Section title="Carrier Credentials" icon={<Truck className="h-4 w-4" />}>
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {[
                            { name: "dotNumber" as const, label: "US DOT Number" },
                            { name: "mcNumber" as const, label: "MC Number" },
                            { name: "insuranceProvider" as const, label: "Insurance Provider" },
                            { name: "insurancePolicyNumber" as const, label: "Policy Number" },
                          ].map(({ name, label }) => (
                            <FormField key={name} control={form.control} name={name} render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</FormLabel>
                                <FormControl><Input {...field} className="bg-slate-800/60 border-slate-700 text-white h-11 focus:border-blue-500" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          ))}
                        </div>
                        <FormField control={form.control} name="truckType" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Equipment Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-slate-800/60 border-slate-700 text-white h-11">
                                  <SelectValue placeholder="e.g. 3-Car Wedge, 9-Car Open" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Pickup with Trailer (1-2 cars)">Pickup with Trailer (1-2 cars)</SelectItem>
                                <SelectItem value="3-Car Wedge">3-Car Wedge</SelectItem>
                                <SelectItem value="Open Carrier (4-9 cars)">Open Carrier (4-9 cars)</SelectItem>
                                <SelectItem value="Enclosed Trailer">Enclosed Trailer</SelectItem>
                                <SelectItem value="Driveaway Service">Driveaway Service</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </Section>
                  </motion.div>
                )}

                {/* Terms */}
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                  <FormField control={form.control} name="termsAccepted" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={profile?.termsAccepted}
                          className="mt-1 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" />
                      </FormControl>
                      <div className="space-y-1">
                        <FormLabel className="text-red-300 font-bold text-sm cursor-pointer">I accept the Terms of Service & Liability Waiver</FormLabel>
                        <FormDescription className="text-red-400/60 text-xs leading-relaxed">
                          I understand that EVAUL is strictly a software platform connecting independent shippers and carriers. EVAUL assumes ZERO liability for vehicle damage, delays, driver actions, or payment disputes.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )} />
                </div>

                <Button type="submit" size="lg" className="w-full h-12 font-bold bg-blue-600 hover:bg-blue-500 border-0 text-white shadow-xl shadow-blue-600/20" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving…" : "Save Profile"}
                </Button>
              </form>
            </Form>

            {/* Security sections */}
            <Section title="Two-Factor Authentication" icon={<Lock className="h-4 w-4" />}>
              <TwoFASettings />
            </Section>
            <Section title="Passkeys" icon={<Key className="h-4 w-4" />}>
              <PasskeyManager />
            </Section>
          </div>
        </div>
      </MainLayout>
    </AuthGuard>
  );
}
