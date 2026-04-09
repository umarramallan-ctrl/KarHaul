import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Truck, ShieldCheck, MessageSquare, Flag } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiBase } from "@/lib/api";
import { Link } from "wouter";
import { ReportModal } from "@/components/ReportModal";

async function fetchPublicProfile(userId: string) {
  const res = await fetch(`${apiBase}/users/${userId}`, { credentials: "include" });
  if (!res.ok) return null;
  return res.json();
}

interface UserProfileModalProps {
  userId: string;
  children: React.ReactNode;
}

export function UserProfileModal({ userId, children }: UserProfileModalProps) {
  const [open, setOpen] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ["public-profile", userId],
    queryFn: () => fetchPublicProfile(userId),
    enabled: open && !!userId,
  });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-left hover:opacity-80 transition-opacity">
        {children}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Profile</DialogTitle>
          </DialogHeader>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : !user ? (
            <p className="text-sm text-muted-foreground text-center py-4">Profile not available.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-primary/20">
                  <AvatarImage src={user.profileImageUrl} />
                  <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                    {user.firstName?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{user.firstName} {user.lastName}</h3>
                    {user.isVerified && <ShieldCheck className="h-4 w-4 text-primary" />}
                  </div>
                  <Badge variant="outline" className="uppercase text-[10px] mt-1">{user.role}</Badge>
                </div>
              </div>

              {user.bio && (
                <p className="text-sm text-muted-foreground italic">"{user.bio}"</p>
              )}

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-muted/50 rounded-xl p-3">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                    <span className="font-bold text-lg">{user.averageRating?.toFixed(1) || "—"}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Rating</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <div className="font-bold text-lg mb-1">{user.totalReviews ?? 0}</div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Reviews</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Truck className="h-4 w-4 text-primary" />
                    <span className="font-bold text-lg">{user.completedJobs ?? 0}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Hauls</p>
                </div>
              </div>

              {user.role === "driver" && (user.dotNumber || user.truckType) && (
                <div className="bg-muted/30 rounded-xl p-3 space-y-1 text-sm">
                  {user.truckType && <div className="flex justify-between"><span className="text-muted-foreground">Equipment</span><span className="font-medium">{user.truckType}</span></div>}
                  {user.dotNumber && <div className="flex justify-between"><span className="text-muted-foreground">DOT #</span><span className="font-medium">{user.dotNumber}</span></div>}
                </div>
              )}

              <Button className="w-full gap-2" asChild onClick={() => setOpen(false)}>
                <Link href={`/messages?to=${userId}`}>
                  <MessageSquare className="h-4 w-4" /> Send Message
                </Link>
              </Button>
              <ReportModal
                reportedUserId={userId}
                reportedUserName={`${user.firstName || ""} ${user.lastName || ""}`.trim() || "this user"}
                trigger={
                  <div className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-destructive transition-colors py-1 cursor-pointer">
                    <Flag className="h-3.5 w-3.5" /> Report this user
                  </div>
                }
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
