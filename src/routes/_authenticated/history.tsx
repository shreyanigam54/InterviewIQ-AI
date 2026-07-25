import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Row {
  id: string; role: string; interview_type: string; difficulty: string;
  overall_score: number | null; status: string; created_at: string; duration_seconds: number | null;
}

const historyOpts = queryOptions({
  queryKey: ["history"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("interviews")
      .select("id, role, interview_type, difficulty, overall_score, status, created_at, duration_seconds")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Row[];
  },
});

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "History — InterviewIQ AI" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <Suspense fallback={<div className="glass rounded-2xl p-8 text-muted-foreground">Loading…</div>}>
      <History />
    </Suspense>
  ),
});

function fmtDur(sec: number | null) {
  if (!sec) return "—";
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}m ${s}s`;
}

function History() {
  const { data } = useSuspenseQuery(historyOpts);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Interview history</h1>
        <p className="text-sm text-muted-foreground">Everything you've practiced. Click any row to review the AI report.</p>
      </header>

      <div className="glass overflow-hidden rounded-2xl shadow-card">
        {data.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No interviews yet. <Link to="/interview/new" className="text-accent hover:underline">Start one →</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Role</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Difficulty</th>
                <th className="p-3 text-left">Duration</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id} className="border-b border-border/40 last:border-none hover:bg-secondary/40">
                  <td className="p-3">
                    <Link to="/interview/$id" params={{ id: r.id }} className="text-foreground hover:text-accent">
                      {new Date(r.created_at).toLocaleDateString()}
                    </Link>
                  </td>
                  <td className="p-3">{r.role}</td>
                  <td className="p-3 capitalize">{r.interview_type}</td>
                  <td className="p-3 capitalize">{r.difficulty}</td>
                  <td className="p-3">{fmtDur(r.duration_seconds)}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${r.status === "completed" ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3 text-right font-semibold">
                    {r.overall_score != null ? Number(r.overall_score).toFixed(1) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
