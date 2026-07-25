import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PlayCircle, Trophy, Flame, Target, TrendingUp, Award } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface Interview {
  id: string;
  role: string;
  interview_type: string;
  difficulty: string;
  overall_score: number | null;
  status: string;
  created_at: string;
}

const dashOpts = queryOptions({
  queryKey: ["dashboard"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("interviews")
      .select("id, role, interview_type, difficulty, overall_score, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []) as Interview[];
  },
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — InterviewIQ AI" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <Suspense fallback={<div className="glass rounded-2xl p-8 text-muted-foreground">Loading…</div>}>
      <Dashboard />
    </Suspense>
  ),
});

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Trophy; label: string; value: string; hint?: string }) {
  return (
    <div className="glass rounded-2xl p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-accent" />
      </div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Dashboard() {
  const { data: interviews } = useSuspenseQuery(dashOpts);
  const completed = interviews.filter((i) => i.status === "completed" && i.overall_score != null);
  const avg = completed.length ? completed.reduce((s, i) => s + (i.overall_score ?? 0), 0) / completed.length : 0;
  const chart = [...completed].reverse().slice(-10).map((i, idx) => ({ idx: idx + 1, score: Number(i.overall_score) }));
  const weak = [...completed].sort((a, b) => (a.overall_score ?? 0) - (b.overall_score ?? 0)).slice(0, 3);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Your dashboard</h1>
          <p className="text-sm text-muted-foreground">Track your progress and jump into another round.</p>
        </div>
        <Link to="/interview/new" className="inline-flex items-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">
          <PlayCircle className="h-4 w-4" /> Start new interview
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Trophy} label="Total Interviews" value={String(interviews.length)} />
        <Stat icon={Target} label="Average Score" value={completed.length ? `${avg.toFixed(1)}/10` : "—"} hint={`${completed.length} completed`} />
        <Stat icon={Flame} label="Best Score" value={completed.length ? `${Math.max(...completed.map((i) => Number(i.overall_score))).toFixed(1)}` : "—"} />
        <Stat icon={Award} label="Rank" value={completed.length >= 10 ? "Pro" : completed.length >= 3 ? "Rising" : "Rookie"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass rounded-2xl p-6 shadow-card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Score progress</h2>
            <TrendingUp className="h-4 w-4 text-accent" />
          </div>
          {chart.length >= 2 ? (
            <div className="h-56">
              <ResponsiveContainer>
                <LineChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="idx" tick={{ fill: "var(--muted-foreground)" }} />
                  <YAxis domain={[0, 10]} tick={{ fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Line type="monotone" dataKey="score" stroke="oklch(0.78 0.18 295)" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Complete at least 2 interviews to see your progress chart.</p>
          )}
        </div>

        <div className="glass rounded-2xl p-6 shadow-card">
          <h2 className="mb-4 font-semibold">Weak areas</h2>
          {weak.length === 0 ? (
            <p className="text-sm text-muted-foreground">Finish a few interviews to spot your weak spots.</p>
          ) : (
            <ul className="space-y-3">
              {weak.map((i) => (
                <li key={i.id} className="flex items-center justify-between rounded-lg bg-secondary/50 p-3">
                  <div>
                    <div className="text-sm font-medium">{i.role}</div>
                    <div className="text-xs text-muted-foreground">{i.interview_type} · {i.difficulty}</div>
                  </div>
                  <span className="text-sm font-semibold text-destructive">{Number(i.overall_score).toFixed(1)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Recent interviews</h2>
          <Link to="/history" className="text-sm text-accent hover:underline">See all</Link>
        </div>
        {interviews.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No interviews yet. <Link to="/interview/new" className="text-accent hover:underline">Start your first →</Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {interviews.slice(0, 5).map((i) => (
              <li key={i.id}>
                <Link
                  to="/interview/$id" params={{ id: i.id }}
                  className="flex items-center justify-between rounded-lg bg-secondary/40 p-3 transition hover:bg-secondary"
                >
                  <div>
                    <div className="text-sm font-medium">{i.role}</div>
                    <div className="text-xs text-muted-foreground">
                      {i.interview_type} · {i.difficulty} · {new Date(i.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${i.status === "completed" ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}>
                      {i.status}
                    </span>
                    <span className="text-sm font-semibold">
                      {i.overall_score != null ? `${Number(i.overall_score).toFixed(1)}` : "—"}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
