import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, ArrowRight, Lock } from "lucide-react";
import { apiBase, clerkAuthHeaders } from "@/lib/api";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];

const FREE_TIER_LIMIT = 3;

interface LanePreferencesProps {
  role: "driver" | "shipper";
  isPremium?: boolean;
}

async function fetchPrefs() {
  const authHeaders = await clerkAuthHeaders();
  const res = await fetch(`${apiBase}/lane-preferences`, { credentials: "include", headers: authHeaders });
  return res.json();
}

async function addPref(data: { originState: string; destinationState: string; role: string }) {
  const authHeaders = await clerkAuthHeaders();
  const res = await fetch(`${apiBase}/lane-preferences`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
  return res.json();
}

async function deletePref(id: string) {
  const authHeaders = await clerkAuthHeaders();
  const res = await fetch(`${apiBase}/lane-preferences/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: authHeaders,
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
  return res.json();
}

export function LanePreferences({ role, isPremium }: LanePreferencesProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [originState, setOriginState] = useState("");
  const [destinationState, setDestinationState] = useState("");

  const { data } = useQuery({ queryKey: ["lanePrefs"], queryFn: fetchPrefs });
  const prefs = (data?.preferences ?? []).filter((p: any) => p.role === role);
  const limit = isPremium ? null : FREE_TIER_LIMIT;
  const atLimit = limit !== null && prefs.length >= limit;

  const addMutation = useMutation({
    mutationFn: addPref,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lanePrefs"] });
      setOriginState("");
      setDestinationState("");
      toast({ title: "Lane preference added", description: "You'll be notified when matching loads are posted." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePref,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lanePrefs"] }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const label = role === "driver"
    ? "You'll get instant alerts when loads matching these lanes are posted."
    : "You'll get instant alerts when drivers post backhaul routes on these lanes.";

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">{label}</p>

      {/* Existing preferences */}
      {prefs.length > 0 && (
        <div className="space-y-2">
          {prefs.map((pref: any) => (
            <div key={pref.id} className="flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-800/40 px-4 py-2.5">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <Badge className="bg-slate-700 text-slate-200 border-0 text-xs">{pref.originState}</Badge>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                <Badge className="bg-slate-700 text-slate-200 border-0 text-xs">{pref.destinationState}</Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-slate-500 hover:text-red-400"
                onClick={() => deleteMutation.mutate(pref.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add new */}
      {atLimit ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
          <Lock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-300 font-semibold">Free tier limit reached ({FREE_TIER_LIMIT} lanes)</p>
            <p className="text-xs text-amber-400/70 mt-1">Upgrade to Pro for unlimited lane preferences.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">From State</label>
            <Select value={originState} onValueChange={setOriginState}>
              <SelectTrigger className="bg-slate-800/60 border-slate-700 text-white h-10">
                <SelectValue placeholder="Origin" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-600 mb-2.5 shrink-0" />
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">To State</label>
            <Select value={destinationState} onValueChange={setDestinationState}>
              <SelectTrigger className="bg-slate-800/60 border-slate-700 text-white h-10">
                <SelectValue placeholder="Destination" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="bg-blue-600 hover:bg-blue-500 text-white border-0 h-10"
            onClick={() => {
              if (!originState || !destinationState) {
                toast({ title: "Both states required", variant: "destructive" });
                return;
              }
              addMutation.mutate({ originState, destinationState, role });
            }}
            disabled={addMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Lane
          </Button>
        </div>
      )}

      {!isPremium && (
        <p className="text-[11px] text-slate-600">
          {prefs.length}/{FREE_TIER_LIMIT} lanes used on free tier.
          {!atLimit && ` ${FREE_TIER_LIMIT - prefs.length} remaining.`}
        </p>
      )}
    </div>
  );
}
