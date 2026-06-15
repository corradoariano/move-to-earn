import { createFileRoute } from "@tanstack/react-router";
import { useAuth, useRequireAuth } from "@/lib/auth";
import AppLayout, { useCreditBalance } from "@/components/AppLayout";
import LogActivityDialog from "@/components/LogActivityDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity as ActivityIcon, Clock, Flame, TrendingUp, Wallet } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/activities")({
  head: () => ({ meta: [{ title: "Activity — ActiveCircle" }] }),
  component: ActivitiesPage,
});

function ActivitiesPage() {
  const { loading } = useRequireAuth();
  const { user } = useAuth();
  const { data: balance } = useCreditBalance();
  const { data: activities } = useQuery({
    enabled: !!user,
    queryKey: ["activities", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities").select("*").eq("user_id", user!.id)
        .order("performed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (loading || !user) return null;

  return (
    <AppLayout>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
          <p className="text-sm text-muted-foreground">Track workouts and earn credits.</p>
        </div>
        <LogActivityDialog />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Available" value={balance?.available ?? 0} icon={Wallet} highlight />
        <StatCard label="Earned (total)" value={balance?.earned ?? 0} icon={TrendingUp} />
        <StatCard label="Spent" value={balance?.spent ?? 0} icon={Flame} />
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">History</h2>
      <div className="space-y-3">
        {activities && activities.length === 0 && (
          <Card className="flex flex-col items-center gap-2 p-10 text-center">
            <ActivityIcon className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No activity yet</p>
            <p className="text-sm text-muted-foreground">Upload your first workout screenshot to start earning.</p>
          </Card>
        )}
        {activities?.map((a) => (
          <Card key={a.id} className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                <ActivityIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{a.activity_type}</span>
                  <Badge variant="secondary" className="capitalize">{a.intensity}</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{a.duration_minutes} min</span>
                  <span>{format(new Date(a.performed_at), "MMM d, p")}</span>
                  {a.source_app && <span>· {a.source_app}</span>}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-primary">+{a.credits_earned}</div>
              <div className="text-xs text-muted-foreground">credits</div>
            </div>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}

function StatCard({ label, value, icon: Icon, highlight }: { label: string; value: number; icon: React.ElementType; highlight?: boolean }) {
  return (
    <Card className={`p-5 ${highlight ? "bg-gradient-to-br from-primary to-primary-glow text-primary-foreground" : ""}`}>
      <div className={`flex items-center justify-between text-xs uppercase tracking-wide ${highlight ? "opacity-90" : "text-muted-foreground"}`}>
        {label}<Icon className="h-4 w-4" />
      </div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      <div className={`text-xs ${highlight ? "opacity-90" : "text-muted-foreground"}`}>credits</div>
    </Card>
  );
}