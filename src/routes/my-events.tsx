import { createFileRoute, Link } from "@tanstack/react-router";
import AppLayout from "@/components/AppLayout";
import { useAuth, useRequireAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, MapPin, Sparkles, Star } from "lucide-react";
import { format, isPast } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/my-events")({
  head: () => ({ meta: [{ title: "My Events — ActiveCircle" }] }),
  component: MyEventsPage,
});

type AttendanceRow = {
  id: string; event_id: string; status: string;
  credits_spent: number; amount_paid_cents: number;
  events: { id: string; name: string; venue: string; image_url: string | null; starts_at: string; category: string | null } | null;
  reviews: { id: string; rating: number; comment: string | null }[];
};

function MyEventsPage() {
  const { loading, user } = useRequireAuth();
  const { user: u } = useAuth();

  const { data } = useQuery({
    enabled: !!u,
    queryKey: ["my-attendances", u?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_attendances")
        .select("id, event_id, status, credits_spent, amount_paid_cents, events(id,name,venue,image_url,starts_at,category), reviews:reviews!reviews_event_id_fkey(id,rating,comment,user_id)")
        .eq("user_id", u!.id)
        .order("reserved_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as unknown as Array<AttendanceRow & { reviews: Array<AttendanceRow["reviews"][number] & { user_id: string }> }>;
      return rows.map((r) => ({ ...r, reviews: r.reviews.filter((rv) => rv.user_id === u!.id) }));
    },
  });

  if (loading || !user) return null;

  const upcoming = (data ?? []).filter((r) => r.events && !isPast(new Date(r.events.starts_at)));
  const past = (data ?? []).filter((r) => r.events && isPast(new Date(r.events.starts_at)));

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">My Events</h1>
        <p className="text-sm text-muted-foreground">Your reservations, attendance and reviews.</p>
      </div>

      <Section title="Upcoming" rows={upcoming} mode="upcoming" />
      <Section title="Past" rows={past} mode="past" />
    </AppLayout>
  );
}

function Section({ title, rows, mode }: { title: string; rows: AttendanceRow[]; mode: "upcoming" | "past" }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => <AttendanceCard key={r.id} row={r} mode={mode} />)}
        </div>
      )}
    </section>
  );
}

function AttendanceCard({ row, mode }: { row: AttendanceRow; mode: "upcoming" | "past" }) {
  if (!row.events) return null;
  const ev = row.events;
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-col gap-0 sm:flex-row">
        {ev.image_url && (
          <div className="aspect-video w-full overflow-hidden bg-muted sm:aspect-square sm:w-40">
            <img src={ev.image_url} alt={ev.name} className="h-full w-full object-cover" />
          </div>
        )}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <Link to="/events/$eventId" params={{ eventId: ev.id }} className="font-semibold hover:underline">
              {ev.name}
            </Link>
            <Badge variant={row.status === "paid" ? "default" : "secondary"} className="capitalize">{row.status}</Badge>
          </div>
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(ev.starts_at), "EEE, MMM d · p")}</div>
            <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ev.venue}</div>
            <div className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" />{row.credits_spent} credits spent</div>
          </div>
          {mode === "past" && <ReviewBlock eventId={ev.id} existing={row.reviews?.[0] ?? null} />}
        </div>
      </div>
    </Card>
  );
}

function ReviewBlock({ eventId, existing }: { eventId: string; existing: { id: string; rating: number; comment: string | null } | null }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [busy, setBusy] = useState(false);

  if (existing && !open) {
    return (
      <div className="mt-3 rounded-md border bg-secondary/40 p-3">
        <div className="flex items-center gap-1 text-amber-500">
          {Array.from({ length: existing.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
        </div>
        {existing.comment && <p className="mt-1 text-sm">{existing.comment}</p>}
        <button onClick={() => setOpen(true)} className="mt-2 text-xs text-muted-foreground underline">Edit</button>
      </div>
    );
  }

  if (!open) {
    return <Button variant="outline" size="sm" className="mt-3" onClick={() => setOpen(true)}>Leave a review</Button>;
  }

  const save = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("reviews").upsert(
        { user_id: user.id, event_id: eventId, rating, comment: comment || null },
        { onConflict: "user_id,event_id" }
      );
      if (error) throw error;
      toast.success("Thanks for the review!");
      qc.invalidateQueries({ queryKey: ["my-attendances"] });
      qc.invalidateQueries({ queryKey: ["reviews", eventId] });
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save review");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 space-y-2 rounded-md border p-3">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} type="button">
            <Star className={`h-5 w-5 ${n <= rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground"}`} />
          </button>
        ))}
      </div>
      <Textarea rows={2} placeholder="How was it?" value={comment} onChange={(e) => setComment(e.target.value)} />
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={save}>Save</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}