import { useQuery } from "@tanstack/react-query";
import { Star, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DRIVER_CRITERIA: { key: string; label: string }[] = [
  { key: "timelyPickup",    label: "Pickup on Time" },
  { key: "deliveryOnTime",  label: "Delivery on Time" },
  { key: "vehicleCondition",label: "Vehicle Condition" },
  { key: "communication",   label: "Communication" },
  { key: "professionalism", label: "Professionalism" },
];

const SHIPPER_CRITERIA: { key: string; label: string }[] = [
  { key: "timelyPayment",             label: "Timely Payment" },
  { key: "accurateVehicleDescription",label: "Accurate Description" },
  { key: "easyAccess",                label: "Easy Access" },
  { key: "communication",             label: "Communication" },
];

function StarsRow({ rating, count }: { rating: number; count?: number }) {
  const filled = Math.round(rating);
  return (
    <span className="flex items-center gap-1">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={`h-4 w-4 ${s <= filled ? "fill-amber-400 text-amber-400" : "text-slate-600"}`} />
      ))}
      <span className="text-sm font-semibold ml-1">{rating.toFixed(1)}</span>
      {count !== undefined && <span className="text-xs text-muted-foreground">({count})</span>}
    </span>
  );
}

function CriteriaBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-40 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
      <span className="text-xs font-semibold w-6 text-right">{value.toFixed(1)}</span>
    </div>
  );
}

export function UserRatingsCard({ userId, role }: { userId: string; role?: string }) {
  const { data, isLoading } = useQuery<{
    reviews: any[];
    averageRating: number;
    total: number;
    criteriaAverages: Record<string, number>;
  }>({
    queryKey: ["/api/reviews/user", userId],
    queryFn: () => fetch(`/api/reviews/user/${userId}`).then(r => r.json()),
    enabled: !!userId,
    staleTime: 60_000,
  });

  if (isLoading || !data) return null;
  if (data.total === 0) return (
    <Card className="border-slate-800 bg-slate-900/40">
      <CardContent className="py-8 text-center text-slate-500 text-sm">No reviews yet.</CardContent>
    </Card>
  );

  const isDriver = role === "driver" || role === "both";
  const criteria = isDriver ? DRIVER_CRITERIA : SHIPPER_CRITERIA;
  const ca = data.criteriaAverages;

  return (
    <div className="space-y-6">
      {/* Overall score */}
      <Card className="border-slate-800 bg-slate-900/40">
        <CardContent className="pt-6 pb-5">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-5xl font-display font-bold text-white">{data.averageRating.toFixed(1)}</div>
              <div className="flex justify-center mt-1">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`h-5 w-5 ${s <= Math.round(data.averageRating) ? "fill-amber-400 text-amber-400" : "text-slate-600"}`} />
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1">{data.total} review{data.total !== 1 ? "s" : ""}</p>
            </div>
            <div className="flex-1 space-y-2">
              {criteria.map(c => ca[c.key] != null && (
                <CriteriaBar key={c.key} label={c.label} value={ca[c.key]} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Written reviews */}
      {data.reviews.filter(r => r.comment).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5" /> Written Reviews
          </h3>
          {data.reviews.filter(r => r.comment).map((r: any) => (
            <Card key={r.id} className="border-slate-800 bg-slate-900/40">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                      {r.reviewerName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{r.reviewerName}</p>
                      <p className="text-xs text-slate-500 capitalize">{r.reviewerRole === "driver" ? "Carrier" : "Shipper"}</p>
                    </div>
                  </div>
                  <StarsRow rating={r.rating} />
                </div>
                <p className="text-sm text-slate-300 italic">"{r.comment}"</p>
                {/* Criteria sub-scores */}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {(r.reviewerRole === "shipper" ? DRIVER_CRITERIA : SHIPPER_CRITERIA).map(c =>
                    r[c.key] != null && (
                      <span key={c.key} className="text-xs text-slate-500">
                        {c.label}: <span className="text-amber-400 font-semibold">{r[c.key]}/5</span>
                      </span>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
