import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { apiBase } from "@/lib/api";

async function fetchStripeStatus() {
  const res = await fetch(`${apiBase}/stripe/connect/status`, { credentials: "include" });
  return res.json();
}

async function startOnboarding() {
  const res = await fetch(`${apiBase}/stripe/connect/onboard`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      returnUrl: window.location.href,
      refreshUrl: window.location.href,
    }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
  return res.json();
}

export function StripeConnectSetup() {
  const { toast } = useToast();
  const { data, isLoading, refetch } = useQuery({ queryKey: ["stripeStatus"], queryFn: fetchStripeStatus });

  const mutation = useMutation({
    mutationFn: startOnboarding,
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return <div className="animate-pulse h-10 rounded-xl bg-slate-800/40" />;
  }

  const status = data?.status ?? "not_connected";

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-800/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            {/* Stripe S logo approximation */}
            <span className="text-indigo-400 font-bold text-sm">S</span>
          </div>
          <div>
            <p className="text-sm font-bold text-white">Stripe Connect</p>
            <p className="text-xs text-slate-500">Required to receive payments and hold escrow</p>
          </div>
        </div>
        {status === "active" ? (
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Connected
          </Badge>
        ) : status === "pending" ? (
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
            <Clock className="h-3.5 w-3.5 mr-1" /> Pending
          </Badge>
        ) : (
          <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Not connected
          </Badge>
        )}
      </div>

      {status !== "active" && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">
            Connect your bank account via Stripe to receive transport payments and participate in the escrow system.
            This is required to accept bookings.
          </p>
          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white border-0 font-bold h-10"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Redirecting…" : (
              <>
                {status === "pending" ? "Continue Stripe Setup" : "Connect Stripe Account"}
                <ExternalLink className="h-3.5 w-3.5 ml-2" />
              </>
            )}
          </Button>
          {status === "pending" && (
            <p className="text-xs text-slate-600 text-center">
              Already finished setup?{" "}
              <button className="text-indigo-400 underline" onClick={() => refetch()}>
                Refresh status
              </button>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
