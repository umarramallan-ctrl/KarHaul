import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { startRegistration } from "@simplewebauthn/browser";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Plus, Trash2, Loader2, ShieldCheck, Smartphone, Monitor, Cloud } from "lucide-react";
import { apiBase, clerkAuthHeaders } from "@/lib/api";

async function fetchPasskeys() {
  const authHeaders = await clerkAuthHeaders();
  const res = await fetch(`${apiBase}/auth/passkey/list`, { credentials: "include", headers: authHeaders });
  return res.json();
}

async function deletePasskey(id: string) {
  const authHeaders = await clerkAuthHeaders();
  const res = await fetch(`${apiBase}/auth/passkey/${id}`, { method: "DELETE", credentials: "include", headers: authHeaders });
  if (!res.ok) throw new Error("Failed to remove passkey");
  return res.json();
}

export function PasskeyManager() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [passkeyName, setPasskeyName] = useState("");
  const [registering, setRegistering] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["passkeys"], queryFn: fetchPasskeys });

  const deleteMutation = useMutation({
    mutationFn: deletePasskey,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["passkeys"] }); toast({ title: "Passkey removed" }); },
    onError: () => toast({ title: "Failed to remove passkey", variant: "destructive" }),
  });

  const handleRegister = async () => {
    setRegistering(true);
    try {
      const authHeaders = await clerkAuthHeaders();
      const optRes = await fetch(`${apiBase}/auth/passkey/register/options`, { credentials: "include", headers: authHeaders });
      if (!optRes.ok) { const e = await optRes.json(); throw new Error(e.error || "Failed to start registration"); }
      const { options, challengeKey } = await optRes.json();

      let credential: any;
      try {
        credential = await startRegistration({ optionsJSON: options });
      } catch (e: any) {
        if (e.name === "NotAllowedError") throw new Error("Passkey registration was cancelled or not allowed");
        throw e;
      }

      const verRes = await fetch(`${apiBase}/auth/passkey/register/verify`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ credential, challengeKey, name: passkeyName.trim() || "Passkey" }),
      });
      if (!verRes.ok) { const e = await verRes.json(); throw new Error(e.error || "Registration failed"); }

      qc.invalidateQueries({ queryKey: ["passkeys"] });
      toast({ title: "Passkey added!", description: "You can now sign in with your passkey." });
      setAdding(false);
      setPasskeyName("");
    } catch (e: any) {
      toast({ title: "Passkey setup failed", description: e.message, variant: "destructive" });
    } finally {
      setRegistering(false);
    }
  };

  const passkeys = data?.passkeys || [];

  return (
    <Card className="border-t-4 border-t-violet-500">
      <CardHeader className="bg-slate-50 dark:bg-slate-900/50 pb-4 border-b">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
            <KeyRound className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <CardTitle className="text-base">Passkeys</CardTitle>
            <CardDescription className="text-xs mt-0.5">Sign in with Face ID, Touch ID, or your device PIN — no password needed</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-4">
        {isLoading ? (
          <div className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : passkeys.length === 0 ? (
          <div className="bg-muted/40 rounded-xl p-5 text-center border border-dashed">
            <KeyRound className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium text-foreground mb-1">No passkeys yet</p>
            <p className="text-xs text-muted-foreground">Add a passkey to sign in instantly with biometrics or your device PIN.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {passkeys.map((pk: any) => (
              <div key={pk.id} className="flex items-center justify-between p-3 rounded-xl border bg-background hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-violet-100 dark:bg-violet-900/20 rounded-lg">
                    {pk.deviceType === "multiDevice" ? (
                      <Cloud className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    ) : (
                      <Smartphone className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{pk.name || "Passkey"}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {pk.backedUp && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Synced</Badge>}
                      <span className="text-[11px] text-muted-foreground">Added {new Date(pk.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(pk.id)} disabled={deleteMutation.isPending}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {adding ? (
          <div className="space-y-3 pt-2 border-t">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Give this passkey a name (optional)</label>
              <Input
                value={passkeyName}
                onChange={e => setPasskeyName(e.target.value)}
                placeholder='e.g. "MacBook Pro" or "iPhone"'
                className="h-9"
                autoFocus
                onKeyDown={e => { if (e.key === "Enter") handleRegister(); if (e.key === "Escape") setAdding(false); }}
              />
            </div>
            <div className="flex gap-2">
              <Button className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white" onClick={handleRegister} disabled={registering}>
                {registering ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Setting up...</> : <><ShieldCheck className="h-3.5 w-3.5" />Create Passkey</>}
              </Button>
              <Button variant="ghost" onClick={() => { setAdding(false); setPasskeyName(""); }} disabled={registering}>Cancel</Button>
            </div>
            <p className="text-xs text-muted-foreground">Your browser or device will prompt you to verify with biometrics or a PIN.</p>
          </div>
        ) : (
          <Button variant="outline" className="gap-1.5 w-full border-dashed border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:hover:bg-violet-900/20" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add Passkey
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
