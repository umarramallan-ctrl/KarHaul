import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DollarSign, Shield, Clock } from "lucide-react";

interface FeeLineItem {
  label: string;
  amount: number;
}

interface EscrowConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  fees: FeeLineItem[];
  commitmentText: string;
  confirmLabel?: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function EscrowConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  fees,
  commitmentText,
  confirmLabel = "Confirm & Proceed",
  onConfirm,
  isLoading = false,
}: EscrowConfirmModalProps) {
  const totalFee = fees.reduce((sum, f) => sum + f.amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Shield className="h-5 w-5 text-amber-400" />
            </div>
            <DialogTitle className="text-white text-lg">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-slate-400 text-sm leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>

        {fees.length > 0 && (
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fee Breakdown</span>
            </div>
            {fees.map((fee, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-slate-300">{fee.label}</span>
                <span className="font-bold text-white">${fee.amount.toFixed(2)}</span>
              </div>
            ))}
            {fees.length > 1 && (
              <div className="flex justify-between text-sm pt-2 border-t border-slate-700">
                <span className="text-slate-300 font-semibold">Total held in escrow</span>
                <span className="font-bold text-amber-400">${totalFee.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-2">
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-300 leading-relaxed">
              <strong>Cancellation policy:</strong> You have 2 hours after mutual acceptance to cancel penalty-free. After that, the cancelling party forfeits their escrow.
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold border-0"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Processing…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EscrowConfirmModal;
