import { createFileRoute, Link } from "@tanstack/react-router";
import AppLayout from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Users, Sparkles, Trophy, MapPin, Dumbbell } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About us — ActiveCircle" },
      { name: "description", content: "ActiveCircle is a London-based startup rewarding every kind of movement with discounts to events curated to your taste." },
      { property: "og:title", content: "About ActiveCircle" },
      { property: "og:description", content: "A London startup making fitness social — earn credits for any activity, unlock discounts on events you'll actually love." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <AppLayout>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-background to-primary-glow/10 px-6 py-14 sm:px-12 sm:py-20">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl" aria-hidden />
        <div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-primary-glow/20 blur-3xl" aria-hidden />
        <div className="relative max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs font-medium backdrop-blur">
            <MapPin className="h-3.5 w-3.5 text-primary" /> Made in London
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
            Movement that <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">rewards you</span>
          </h1>
          <p className="mt-6 text-lg font-semibold sm:text-xl">
            Move more. Unlock more.
          </p>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
            We're a small, London-based startup on a mission to revolutionise health
            motivation and socialisation, because looking after your body shouldn't
            cost you your social life.
          </p>
          <p className="mt-3 text-base font-medium sm:text-lg">
            Actively expand your circle.
          </p>
          <Link to="/activities">
            <Button className="mt-6">Start now</Button>
          </Link>
        </div>
      </section>

      {/* Story */}
      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <Heart className="h-8 w-8 text-primary" />
          <h2 className="mt-4 text-xl font-semibold">We get it.</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            It can be hard to find the time to stay active, especially when you don't
            want to sacrifice your social life or the fun activities that make a week
            feel like yours.
          </p>
        </Card>
        <Card className="p-6">
          <Users className="h-8 w-8 text-primary" />
          <h2 className="mt-4 text-xl font-semibold">So we asked a question.</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            What if prioritising your fitness could actually help your social life,
            instead of competing with it? That question is where ActiveCircle began.
          </p>
        </Card>
      </section>

      {/* What we do */}
      <section className="mt-10 overflow-hidden rounded-3xl border bg-secondary/40 p-8 sm:p-12">
        <div className="max-w-2xl">
          <Sparkles className="h-8 w-8 text-primary" />
          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            The ActiveCircle Concept
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            We believe that an active lifestyle can work well with an active social life. That's why we offer discounts to events curated to your taste, for any level of activity you do—whether that be running, climbing, going to the gym, or just plain old walking.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Dumbbell, title: "Any activity counts", body: "Walks, lifts, swims, stretches - log it and earn credits." },
            { icon: Sparkles, title: "Curated to you", body: "Events matched to your taste, across the city you live in." },
            { icon: Trophy, title: "Treat yourself", body: "Spend credits on real perks - because you earned them." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl bg-background p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Belief */}
      <section className="my-12 text-center">
        <p className="mx-auto max-w-2xl text-xl font-medium leading-relaxed sm:text-2xl">
          At ActiveCircle, we believe that{" "}
          <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            all activity should be rewarded
          </span>
          {", "}because going out and helping your mind and body is worth treating yourself for.
        </p>
      </section>
    </AppLayout>
  );
}