import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { KeyRound, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiBase } from "@/lib/api";

interface PasskeyLoginButtonProps {
  onSuccess?: () => void;
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

export function PasskeyLoginButton({ onSuccess, variant = "outline", className }: PasskeyLoginButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handlePasskeyLogin = async () => {
    setLoading(true);
    try {
      const optRes = await fetch(`${apiBase}/auth/passkey/login/options`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!optRes.ok) { const e = await optRes.json(); throw new Error(e.error || "Could not start passkey sign-in"); }
      const { options, challengeKey } = await optRes.json();

      let credential: any;
      try {
        credential = await startAuthentication({ optionsJSON: options });
      } catch (e: any) {
        if (e.name === "NotAllowedError") throw new Error("Passkey sign-in was cancelled");
        throw e;
      }

      const verRes = await fetch(`${apiBase}/auth/passkey/login/verify`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential, challengeKey }),
      });
      const result = await verRes.json();
      if (!verRes.ok) throw new Error(result.error || "Passkey sign-in failed");

      toast({ title: "Signed in!", description: "Welcome back." });
      if (onSuccess) onSuccess();
      else window.location.reload();
    } catch (e: any) {
      toast({ title: "Sign-in failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant={variant} className={`gap-2 ${className || ""}`} onClick={handlePasskeyLogin} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
      {loading ? "Verifying..." : "Sign in with Passkey"}
    </Button>
  );
}
