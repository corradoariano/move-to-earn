import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Activity, Sparkles, Ticket, Trophy } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ActiveCircle — Move More. Unlock More." },
      { name: "description", content: "Earn credits for your workouts. Unlock unique events." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/activities" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary to-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold tracking-tight">ActiveCircle</span>
        </div>
        <Link to="/auth">
          <Button variant="ghost">Sign in</Button>
        </Link>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-4 pb-16 pt-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" /> Move-to-earn for real-world events
          </span>
          <h1 className="mt-6 text-5xl font-bold tracking-tight md:text-6xl">
            Move More.<br />
            <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Unlock More.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Log your workouts from Strava, Nike Run Club or any tracker. ActiveCircle turns minutes
            into credits — spend them on yoga rooftops, live music, art nights, and more.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
                Start earning credits
              </Button>
            </Link>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-4 px-4 pb-20 md:grid-cols-3">
          {[
            { icon: Activity, title: "Track Activity", body: "Upload a screenshot from any fitness app. AI reads the time, type, and intensity." },
            { icon: Trophy, title: "Earn Credits", body: "Intensity × minutes converts to ActiveCircle credits on your balance." },
            { icon: Ticket, title: "Unlock Events", body: "Browse curated events and spend credits to reserve your spot." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-sm">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}