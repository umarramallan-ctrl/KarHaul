import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Smartphone, ScanLine, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { apiBase, clerkAuthHeaders } from "@/lib/api";

interface TwoFAStatus {
  totpEnabled: boolean;
  smsOtpEnabled: boolean;
  twoFaMethod: string;
  phone: string | null;
}

export function TwoFASettings() {
  const { toast } = useToast();
  const [status, setStatus] = useState<TwoFAStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // TOTP setup state
  const [totpOpen, setTotpOpen] = useState(false);
  const [totpSetup, setTotpSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpDisableCode, setTotpDisableCode] = useState("");
  const [totpBusy, setTotpBusy] = useState(false);

  // SMS setup state
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsPhone, setSmsPhone] = useState("");
  const [smsSent, setSmsSent] = useState(false);
  const [smsCode, setSmsCode] = useState("");
  const [smsBusy, setSmsBusy] = useState(false);

  async function fetchStatus() {
    try {
      const authHeaders = await clerkAuthHeaders();
      const res = await fetch(`${apiBase}/auth/2fa/status`, { credentials: "include", headers: authHeaders });
      const data = await res.json();
      setStatus(data);
      if (data.phone) setSmsPhone(data.phone);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchStatus(); }, []);

  // ── TOTP ──────────────────────────────────────────────────────────────────

  async function startTotpSetup() {
    setTotpBusy(true);
    try {
      const authHeaders = await clerkAuthHeaders();
      const res = await fetch(`${apiBase}/auth/2fa/totp/setup`, { credentials: "include", headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTotpSetup(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setTotpBusy(false);
    }
  }

  async function enableTotp() {
    if (!totpSetup || !totpCode.trim()) return;
    setTotpBusy(true);
    try {
      const authHeaders = await clerkAuthHeaders();
      const res = await fetch(`${apiBase}/auth/2fa/totp/enable`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        credentials: "include",
        body: JSON.stringify({ secret: totpSetup.secret, code: totpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Authenticator app enabled", description: "Your account is now protected with TOTP 2FA." });
      setTotpSetup(null);
      setTotpCode("");
      setTotpOpen(false);
      fetchStatus();
    } catch (err: any) {
      toast({ title: "Invalid code", description: err.message, variant: "destructive" });
    } finally {
      setTotpBusy(false);
    }
  }

  async function disableTotp() {
    setTotpBusy(true);
    try {
      const authHeaders = await clerkAuthHeaders();
      const res = await fetch(`${apiBase}/auth/2fa/totp/disable`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        credentials: "include",
        body: JSON.stringify({ code: totpDisableCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Authenticator app removed" });
      setTotpDisableCode("");
      setTotpOpen(false);
      fetchStatus();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setTotpBusy(false);
    }
  }

  // ── SMS ───────────────────────────────────────────────────────────────────

  async function sendSmsCode() {
    if (!smsPhone.trim()) return;
    setSmsBusy(true);
    try {
      const authHeaders = await clerkAuthHeaders();
      const res = await fetch(`${apiBase}/auth/2fa/sms/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        credentials: "include",
        body: JSON.stringify({ phone: smsPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSmsSent(true);
      toast({ title: "Code sent", description: `A verification code was sent to ${smsPhone}.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSmsBusy(false);
    }
  }

  async function enableSms() {
    if (!smsCode.trim()) return;
    setSmsBusy(true);
    try {
      const authHeaders = await clerkAuthHeaders();
      const res = await fetch(`${apiBase}/auth/2fa/sms/enable`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        credentials: "include",
        body: JSON.stringify({ code: smsCode, phone: smsPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "SMS verification enabled" });
      setSmsCode("");
      setSmsSent(false);
      setSmsOpen(false);
      fetchStatus();
    } catch (err: any) {
      toast({ title: "Invalid code", description: err.message, variant: "destructive" });
    } finally {
      setSmsBusy(false);
    }
  }

  async function disableSms() {
    setSmsBusy(true);
    try {
      const authHeaders = await clerkAuthHeaders();
      const res = await fetch(`${apiBase}/auth/2fa/sms/disable`, {
        method: "POST",
        credentials: "include",
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "SMS 2FA disabled" });
      setSmsOpen(false);
      fetchStatus();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSmsBusy(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
        </div>
        <CardDescription>
          Add an extra layer of security. After you log in, you'll be asked to confirm your identity with a second step.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">

        {/* ── Authenticator App (TOTP) ── */}
        <div className="border rounded-lg overflow-hidden">
          <button
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            onClick={() => {
              setTotpOpen(!totpOpen);
              if (!totpOpen && !status?.totpEnabled) startTotpSetup();
            }}
          >
            <div className="flex items-center gap-3">
              <ScanLine className="h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="text-sm font-medium">Authenticator App</p>
                <p className="text-xs text-muted-foreground">Google Authenticator, Authy, 1Password, etc.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {status?.totpEnabled
                ? <Badge variant="secondary" className="text-green-600 bg-green-50"><CheckCircle2 className="h-3 w-3 mr-1" />Active</Badge>
                : <Badge variant="outline" className="text-muted-foreground"><XCircle className="h-3 w-3 mr-1" />Off</Badge>}
              {totpOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </button>

          {totpOpen && (
            <div className="border-t p-4 bg-muted/20 space-y-4">
              {!status?.totpEnabled ? (
                <>
                  {totpSetup ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Scan this QR code with your authenticator app, then enter the 6-digit code to confirm.
                      </p>
                      <div className="flex justify-center py-2">
                        <div className="p-3 bg-white rounded-xl border">
                          <QRCodeSVG value={totpSetup.uri} size={180} />
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Can't scan? Enter this key manually:</p>
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all">{totpSetup.secret}</code>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="totp-code">Verification Code</Label>
                        <Input
                          id="totp-code"
                          type="text"
                          inputMode="numeric"
                          placeholder="000 000"
                          value={totpCode}
                          onChange={e => setTotpCode(e.target.value)}
                          className="text-center tracking-widest font-mono"
                          maxLength={7}
                        />
                      </div>
                      <Button className="w-full" onClick={enableTotp} disabled={totpBusy || !totpCode.trim()}>
                        {totpBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                        Confirm & Enable
                      </Button>
                    </>
                  ) : (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Authenticator app is active. Enter your current 6-digit code to disable it.
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="totp-disable-code">Current Code</Label>
                    <Input
                      id="totp-disable-code"
                      type="text"
                      inputMode="numeric"
                      placeholder="000 000"
                      value={totpDisableCode}
                      onChange={e => setTotpDisableCode(e.target.value)}
                      className="text-center tracking-widest font-mono"
                      maxLength={7}
                    />
                  </div>
                  <Button variant="destructive" className="w-full" onClick={disableTotp} disabled={totpBusy || !totpDisableCode.trim()}>
                    {totpBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                    Disable Authenticator App
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── SMS Verification ── */}
        <div className="border rounded-lg overflow-hidden">
          <button
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            onClick={() => setSmsOpen(!smsOpen)}
          >
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="text-sm font-medium">SMS Text Message</p>
                <p className="text-xs text-muted-foreground">Receive a one-time code by text message.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {status?.smsOtpEnabled
                ? <Badge variant="secondary" className="text-green-600 bg-green-50"><CheckCircle2 className="h-3 w-3 mr-1" />Active</Badge>
                : <Badge variant="outline" className="text-muted-foreground"><XCircle className="h-3 w-3 mr-1" />Off</Badge>}
              {smsOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </button>

          {smsOpen && (
            <div className="border-t p-4 bg-muted/20 space-y-4">
              {!status?.smsOtpEnabled ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Enter your mobile number and we'll send a verification code to confirm it.
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="sms-phone">Phone Number</Label>
                    <Input
                      id="sms-phone"
                      type="tel"
                      placeholder="+1 555 000 0000"
                      value={smsPhone}
                      onChange={e => setSmsPhone(e.target.value)}
                      disabled={smsSent}
                    />
                  </div>
                  {!smsSent ? (
                    <Button className="w-full" onClick={sendSmsCode} disabled={smsBusy || !smsPhone.trim()}>
                      {smsBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Smartphone className="h-4 w-4 mr-2" />}
                      Send Verification Code
                    </Button>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="sms-code">Verification Code</Label>
                        <Input
                          id="sms-code"
                          type="text"
                          inputMode="numeric"
                          placeholder="000000"
                          value={smsCode}
                          onChange={e => setSmsCode(e.target.value)}
                          className="text-center tracking-widest font-mono"
                          maxLength={6}
                        />
                      </div>
                      <Button className="w-full" onClick={enableSms} disabled={smsBusy || !smsCode.trim()}>
                        {smsBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                        Confirm & Enable
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full" onClick={() => setSmsSent(false)}>
                        Change number
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    SMS 2FA is active for <strong>{status.phone}</strong>.
                  </p>
                  <Button variant="destructive" className="w-full" onClick={disableSms} disabled={smsBusy}>
                    {smsBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                    Disable SMS Verification
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
