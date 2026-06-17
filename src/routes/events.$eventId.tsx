import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import AppLayout, { useCreditBalance } from "@/components/AppLayout";
import { useAuth, useRequireAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, CheckCircle2, MapPin, Sparkles, Star } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/events/$eventId")({
  head: () => ({ meta: [{ title: "Event — ActiveCircle" }] }),
  component: EventDetailPage,
});

function EventDetailPage() {
  const { eventId } = Route.useParams();
  const { loading, user } = useRequireAuth();
  const { user: u } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: balance } = useCreditBalance();
  const [paying, setPaying] = useState(false);

  const { data: event } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: attendance } = useQuery({
    enabled: !!u,
    queryKey: ["attendance", eventId, u?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_attendances").select("*").eq("event_id", eventId).eq("user_id", u!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["reviews", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews").select("*").eq("event_id", eventId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (loading || !user || !event) return null;

  const avail = balance?.available ?? 0;
  const canUnlock = avail >= event.credits_required;

  const reserveAndPay = async () => {
    if (!u) return;
    setPaying(true);
    try {
      const { error: rpcErr } = await supabase.rpc("reserve_event_paid", {
        _event_id: event.id,
      });
      if (rpcErr) throw rpcErr;
      toast.success("Payment confirmed — you're in!");
      qc.invalidateQueries({ queryKey: ["attendance", eventId] });
      qc.invalidateQueries({ queryKey: ["credit-balance"] });
      qc.invalidateQueries({ queryKey: ["my-attendances"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  const isPaid = attendance?.status === "paid" || attendance?.status === "attended";

  return (
    <AppLayout>
      <Link to="/events" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to events
      </Link>

      <Card className="overflow-hidden p-0">
        {event.image_url && (
          <div className="relative aspect-[21/9] bg-muted">
            <img src={event.image_url} alt={event.name} className="h-full w-full object-cover" />
          </div>
        )}
        <div className="grid gap-6 p-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="flex flex-wrap items-center gap-2">
              {event.category && <Badge variant="secondary">{event.category}</Badge>}
              <Badge className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
                <Sparkles className="mr-1 h-3 w-3" />{event.credits_required} credits
              </Badge>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">{event.name}</h1>
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4" />{format(new Date(event.starts_at), "EEEE, MMMM d · p")}</div>
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4" />{event.venue}</div>
            </div>
            {event.description && <p className="mt-4 text-sm leading-relaxed">{event.description}</p>}
          </div>

          <div className="rounded-xl border bg-secondary/40 p-5">
            <div className="text-sm text-muted-foreground">Ticket price</div>
            <div className="text-3xl font-bold">{event.price_cents === 0 ? "Free" : `£${(event.price_cents / 100).toFixed(2)}`}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              + {event.credits_required} credits from your balance ({avail} available)
            </div>

            {isPaid ? (
              <div className="mt-5 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-3 text-sm font-medium text-primary">
                <CheckCircle2 className="h-4 w-4" /> You're confirmed for this event
              </div>
            ) : !canUnlock ? (
              <Button disabled className="mt-5 w-full">Need {event.credits_required - avail} more credits</Button>
            ) : (
              <Button
                disabled={paying}
                onClick={reserveAndPay}
                className="mt-5 w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
              >
                {paying ? "Processing…" : event.price_cents === 0 ? "Confirm attendance" : "Pay & confirm"}
              </Button>
            )}
            <p className="mt-3 text-[10px] text-muted-foreground">
              Demo payment — no real charge is made.
            </p>
          </div>
        </div>
      </Card>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Reviews</h2>
        {reviews && reviews.length === 0 && (
          <p className="text-sm text-muted-foreground">No reviews yet.</p>
        )}
        <div className="space-y-3">
          {reviews?.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center gap-1 text-amber-500">
                {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
              </div>
              {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
            </Card>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}