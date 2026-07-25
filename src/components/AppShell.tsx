import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Brain, LayoutDashboard, PlayCircle, History, User, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ReactNode } from "react";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/interview/new", label: "New Interview", icon: PlayCircle },
  { to: "/history", label: "History", icon: History },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen gradient-hero">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 md:px-6">
        <aside className="glass sticky top-6 hidden h-[calc(100vh-3rem)] w-56 flex-col rounded-2xl p-4 shadow-card md:flex">
          <Link to="/dashboard" className="mb-8 flex items-center gap-2 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-glow">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold">InterviewIQ</span>
          </Link>
          <nav className="flex-1 space-y-1">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = pathname === to || (to !== "/dashboard" && pathname.startsWith(to));
              return (
                <Link
                  key={to} to={to}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                    active ? "gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </Link>
              );
            })}
          </nav>
          <button
            onClick={signOut}
            className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </aside>

        <main className="min-w-0 flex-1">
          {/* Mobile top bar */}
          <div className="glass mb-4 flex items-center justify-between rounded-2xl p-3 md:hidden">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
                <Brain className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">InterviewIQ</span>
            </Link>
            <nav className="flex items-center gap-1">
              {NAV.map(({ to, icon: Icon }) => (
                <Link key={to} to={to} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
                  <Icon className="h-4 w-4" />
                </Link>
              ))}
              <button onClick={signOut} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
                <LogOut className="h-4 w-4" />
              </button>
            </nav>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
