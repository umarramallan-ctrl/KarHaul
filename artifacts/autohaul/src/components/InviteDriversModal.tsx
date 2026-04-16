import { Star } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { UseMutationResult } from "@tanstack/react-query";

type SavedDriver = {
  driver: {
    id: string;
    firstName: string;
    lastName: string;
    averageRating?: number;
    completedJobs?: number;
  };
};

type InviteDriversModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savedDrivers: SavedDriver[];
  selectedDriverIds: string[];
  setSelectedDriverIds: React.Dispatch<React.SetStateAction<string[]>>;
  inviteMutation: UseMutationResult<unknown, unknown, { shipmentId: string; driverIds: string[] }, unknown>;
  postedShipmentId: string | null;
  onNavigate: (shipmentId: string) => void;
};

export function InviteDriversModal({
  open,
  onOpenChange,
  savedDrivers,
  selectedDriverIds,
  setSelectedDriverIds,
  inviteMutation,
  postedShipmentId,
  onNavigate,
}: InviteDriversModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && postedShipmentId) onNavigate(postedShipmentId);
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>⭐ Invite Saved Drivers — First Look</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Select saved drivers to receive a private 2-hour exclusive window before your load goes public on the board.</p>
          <div className="divide-y rounded-xl border overflow-hidden">
            {savedDrivers.map(({ driver }) => (
              <label key={driver.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <Checkbox
                  checked={selectedDriverIds.includes(driver.id)}
                  onCheckedChange={(checked) =>
                    setSelectedDriverIds((ids) =>
                      checked ? [...ids, driver.id] : ids.filter((id) => id !== driver.id)
                    )
                  }
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{driver.firstName} {driver.lastName}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    {(driver.averageRating ?? 0) > 0 && (
                      <span>
                        <Star className="inline h-3 w-3 text-amber-400 fill-amber-400 mr-0.5" />
                        {driver.averageRating?.toFixed(1)}
                      </span>
                    )}
                    <span>{driver.completedJobs ?? 0} hauls</span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <button
            className="text-sm text-muted-foreground hover:text-foreground px-4"
            onClick={() => {
              onOpenChange(false);
              if (postedShipmentId) onNavigate(postedShipmentId);
            }}
          >
            Skip — post publicly
          </button>
          <button
            disabled={selectedDriverIds.length === 0 || inviteMutation.isPending}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
            onClick={() =>
              postedShipmentId &&
              inviteMutation.mutate({ shipmentId: postedShipmentId, driverIds: selectedDriverIds })
            }
          >
            {inviteMutation.isPending
              ? "Sending…"
              : `Invite ${selectedDriverIds.length > 0 ? selectedDriverIds.length : ""} Driver${selectedDriverIds.length !== 1 ? "s" : ""}`}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
