import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Smartphone, KeyRound, Loader2 } from "lucide-react";
import { CarCarrierIcon } from "@/components/icons/CarCarrierIcon";
import { apiBase } from "@/lib/api";

function getCookie(name: string): string | undefined {
  return document.cookie.split("; ").find(r => r.startsWith(name + "="))?.split("=")[1];
}

export default function VerifyTwoFactor() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [method, setMethod] = useState<"totp" | "sms" | null>(null);
  const [smsSent, setSmsSent] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Detect method from the pending session (ask the API)
    fetch(`${apiBase}/auth/2fa/status`, { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data?.twoFaMethod) setMethod(data.twoFaMethod as "totp" | "sms");
      })
      .catch(() => {});
  }, []);

  async function sendSmsCode() {
    setSendingSms(true);
    try {
      const res = await fetch(`${apiBase}/auth/2fa/login/sms-code`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to send code");
      }
      setSmsSent(true);
      toast({ title: "Code sent", description: "Check your phone for a 6-digit code." });
    } catch (err: any) {
      toast({ title: "Failed to send code", description: err.message, variant: "destructive" });
    } finally {
      setSendingSms(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/auth/2fa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Invalid code");

      const returnTo = decodeURIComponent(getCookie("pending_2fa_return_to") ?? "/");
      window.location.href = returnTo;
    } catch (err: any) {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="flex items-center gap-2 mb-8">
        <CarCarrierIcon className="h-5 w-6 text-primary" />
        <span className="text-xl font-bold text-white">AutoHaul <span className="text-primary">Connect</span></span>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 p-3 rounded-full bg-primary/10 w-fit">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <CardTitle>Two-Factor Verification</CardTitle>
          <CardDescription>
            {method === "sms"
              ? "Enter the 6-digit code sent to your phone number."
              : "Enter the 6-digit code from your authenticator app."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {method === "sms" && !smsSent && (
            <Button
              variant="outline"
              className="w-full"
              onClick={sendSmsCode}
              disabled={sendingSms}
            >
              {sendingSms ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Smartphone className="h-4 w-4 mr-2" />}
              Send SMS Code
            </Button>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">
                {method === "totp" ? "Authenticator Code" : method === "sms" ? "SMS Code" : "Verification Code"}
              </Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9 ]*"
                maxLength={7}
                placeholder="000 000"
                value={code}
                onChange={e => setCode(e.target.value)}
                className="text-center text-2xl tracking-widest font-mono"
                autoFocus
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading || !code.trim()}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
              Verify
            </Button>
          </form>

          {method === "sms" && smsSent && (
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => { setSmsSent(false); setCode(""); }}>
              Resend code
            </Button>
          )}

          <p className="text-center text-xs text-muted-foreground pt-2">
            Having trouble?{" "}
            <a href="/api/logout" className="text-primary hover:underline">Sign out and try again</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
