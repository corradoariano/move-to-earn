import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Activity, Calendar, LogOut, Sparkles, Ticket } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type ReactNode } from "react";

export function useCreditBalance() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["credit-balance", user?.id],
    queryFn: async () => {
      const [actsRes, attRes] = await Promise.all([
        supabase.from("activities").select("credits_earned").eq("user_id", user!.id),
        supabase.from("event_attendances").select("credits_spent").eq("user_id", user!.id).neq("status", "cancelled"),
      ]);
      const earned = (actsRes.data ?? []).reduce((s, r) => s + (r.credits_earned ?? 0), 0);
      const spent = (attRes.data ?? []).reduce((s, r) => s + (r.credits_spent ?? 0), 0);
      return { earned, spent, available: earned - spent };
    },
  });
}

const nav = [
  { to: "/activities", label: "Activity", icon: Activity },
  { to: "/events", label: "Events", icon: Ticket },
  { to: "/my-events", label: "My Events", icon: Calendar },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { data: balance } = useCreditBalance();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold tracking-tight">ActiveCircle</span>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {nav.map((n) => {
              const active = path.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <n.icon className="h-4 w-4" /> {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-full bg-gradient-to-r from-primary to-primary-glow px-3 py-1.5 text-xs font-semibold text-primary-foreground sm:block">
              {balance?.available ?? 0} credits
            </div>
            {user && (
              <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <nav className="flex justify-around border-t md:hidden">
          {nav.map((n) => {
            const active = path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex flex-1 flex-col items-center gap-1 py-2 text-xs ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}