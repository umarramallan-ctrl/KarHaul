import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/AuthGuard";
import { useGetMyProfile, useUpdateMyProfile } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect } from "react";
import { ShieldCheck, Info } from "lucide-react";
type UpdateProfileBodyRole = "shipper" | "driver" | "both";

const profileSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  phone: z.string().min(10, "Valid phone required"),
  role: z.enum(["shipper", "driver", "both", "admin"]).optional(),
  
  // Driver specific
  dotNumber: z.string().optional(),
  mcNumber: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
  truckType: z.string().optional(),
  
  termsAccepted: z.boolean().refine(val => val === true, { message: "You must accept the terms of service." })
});

export default function Profile() {
  const { toast } = useToast();
  const { data: profile, isLoading } = useGetMyProfile();
  const updateMutation = useUpdateMyProfile();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      role: "shipper",
      dotNumber: "",
      mcNumber: "",
      insuranceProvider: "",
      insurancePolicyNumber: "",
      truckType: "",
      termsAccepted: false
    }
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        phone: profile.phone || "",
        role: profile.role || "shipper",
        dotNumber: profile.dotNumber || "",
        mcNumber: profile.mcNumber || "",
        insuranceProvider: profile.insuranceProvider || "",
        insurancePolicyNumber: profile.insurancePolicyNumber || "",
        truckType: profile.truckType || "",
        termsAccepted: profile.termsAccepted || false
      });
    }
  }, [profile, form]);

  function onSubmit(values: z.infer<typeof profileSchema>) {
    // Only send role if it's legally updatable from client (admin role shouldn't be set here ideally, but handled by schema)
    const validRole = (values.role === 'admin' ? 'both' : values.role) as UpdateProfileBodyRole;
    
    updateMutation.mutate({
      data: {
        ...values,
        role: validRole
      }
    }, {
      onSuccess: () => {
        toast({ title: "Profile Updated", description: "Your profile has been saved successfully." });
      },
      onError: (err: any) => {
        toast({ title: "Update Failed", description: err.message, variant: "destructive" });
      }
    });
  }

  const selectedRole = form.watch("role");
  const isDriverForm = selectedRole === "driver" || selectedRole === "both";

  if (isLoading) return <MainLayout><div className="p-20 text-center">Loading...</div></MainLayout>;

  return (
    <AuthGuard>
      <MainLayout>
        <div className="container max-w-3xl mx-auto px-4 py-10">
          
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold">Profile Setup</h1>
            <p className="text-muted-foreground">Complete your account to start using AutoHaul Connect.</p>
          </div>

          <Card className="shadow-lg border-t-4 border-t-primary">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 pb-6 border-b">
              <div className="flex justify-between items-center">
                <CardTitle>Account Details</CardTitle>
                {profile?.isVerified && (
                  <div className="flex items-center text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 mr-1" /> Verified Carrier
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="firstName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="lastName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl><Input type="tel" {...field} /></FormControl>
                        <FormDescription>Visible to your matches for coordination.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="role" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={profile?.isVerified}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="shipper">Shipper (I want to ship a car)</SelectItem>
                            <SelectItem value="driver">Carrier (I haul cars)</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                          </SelectContent>
                        </Select>
                        {profile?.isVerified && <FormDescription>Role locked while verified.</FormDescription>}
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  {isDriverForm && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-6">
                      <h3 className="font-bold text-lg flex items-center"><Truck className="mr-2 h-5 w-5 text-primary" /> Carrier Credentials</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="dotNumber" render={({ field }) => (
                          <FormItem>
                            <FormLabel>US DOT Number</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="mcNumber" render={({ field }) => (
                          <FormItem>
                            <FormLabel>MC Number</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="insuranceProvider" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Insurance Provider</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="insurancePolicyNumber" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Policy Number</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <FormField control={form.control} name="truckType" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Equipment Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="e.g. 3-Car Wedge, 9-Car Open" /></SelectTrigger></FormControl>
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
                  )}

                  <div className="bg-red-50 dark:bg-red-900/10 p-5 rounded-xl border border-red-200 dark:border-red-900">
                    <FormField control={form.control} name="termsAccepted" render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={profile?.termsAccepted} className="mt-1 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                        </FormControl>
                        <div className="space-y-1">
                          <FormLabel className="text-foreground font-semibold text-base cursor-pointer">I accept the Terms of Service & Liability Waiver</FormLabel>
                          <FormDescription className="text-muted-foreground text-sm">
                            I understand that AutoHaul Connect is strictly a software platform connecting independent shippers and carriers. AutoHaul Connect is NOT a broker or motor carrier and assumes ZERO liability for vehicle damage, delays, driver actions, or payment disputes.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )} />
                  </div>

                  <Button type="submit" size="lg" className="w-full h-12 text-lg hover-elevate" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Saving..." : "Save Profile"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </AuthGuard>
  );
}

// Dummy Truck import
import { Truck } from "lucide-react";
