import { createFileRoute, Link } from "@tanstack/react-router";
import AppLayout, { useCreditBalance } from "@/components/AppLayout";
import { useRequireAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Sparkles } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/events")({
  head: () => ({ meta: [{ title: "Events — ActiveCircle" }] }),
  component: EventsPage,
});

function EventsPage() {
  const { loading, user } = useRequireAuth();
  const { data: balance } = useCreditBalance();
  const { data: events } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events").select("*")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  if (loading || !user) return null;
  const avail = balance?.available ?? 0;

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Events</h1>
        <p className="text-sm text-muted-foreground">
          You have <span className="font-semibold text-primary">{avail} credits</span> available.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events?.map((e) => {
          const canUnlock = avail >= e.credits_required;
          return (
            <Link key={e.id} to="/events/$eventId" params={{ eventId: e.id }}>
              <Card className="group h-full overflow-hidden p-0 transition hover:shadow-lg">
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  {e.image_url && (
                    <img src={e.image_url} alt={e.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                  )}
                  <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold backdrop-blur">
                    <Sparkles className="h-3 w-3 text-primary" />
                    {e.credits_required} credits
                  </div>
                  {!canUnlock && (
                    <div className="absolute left-2 top-2 rounded-full bg-destructive/90 px-2 py-1 text-xs font-medium text-destructive-foreground">
                      Locked
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-tight">{e.name}</h3>
                    {e.category && <Badge variant="secondary">{e.category}</Badge>}
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(e.starts_at), "EEE, MMM d · p")}</div>
                    <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{e.venue}</div>
                  </div>
                  <div className="mt-3 text-sm font-semibold">
                    {e.price_cents === 0 ? "Free" : `$${(e.price_cents / 100).toFixed(2)}`}
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </AppLayout>
  );
}