import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { startInterview } from "@/lib/interview.functions";

const ROLES = ["Software Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer", "Data Scientist", "AI Engineer", "ML Engineer"];
const TYPES = [
  { v: "hr", l: "HR" }, { v: "technical", l: "Technical" }, { v: "behavioral", l: "Behavioral" },
  { v: "coding", l: "Coding" }, { v: "aptitude", l: "Aptitude" }, { v: "mixed", l: "Mixed" },
] as const;
const DIFF = [{ v: "easy", l: "Easy" }, { v: "medium", l: "Medium" }, { v: "hard", l: "Hard" }] as const;

export const Route = createFileRoute("/_authenticated/interview/new")({
  head: () => ({ meta: [{ title: "New Interview — InterviewIQ AI" }, { name: "robots", content: "noindex" }] }),
  component: NewInterview,
});

function NewInterview() {
  const navigate = useNavigate();
  const start = useServerFn(startInterview);
  const [role, setRole] = useState(ROLES[0]);
  const [difficulty, setDifficulty] = useState<(typeof DIFF)[number]["v"]>("medium");
  const [type, setType] = useState<(typeof TYPES)[number]["v"]>("technical");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    setLoading(true);
    try {
      const res = await start({ data: { role, difficulty, interview_type: type, question_count: count } });
      navigate({ to: "/interview/$id", params: { id: res.interviewId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start interview");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Start a new interview</h1>
        <p className="text-sm text-muted-foreground">Pick a role, difficulty, and type. AI will generate the questions.</p>
      </div>

      <div className="glass space-y-6 rounded-2xl p-6 shadow-card">
        <div>
          <label className="text-xs uppercase tracking-wide text-muted-foreground">Role</label>
          <select
            value={role} onChange={(e) => setRole(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-input/40 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-muted-foreground">Interview type</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button key={t.v} onClick={() => setType(t.v)}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${type === t.v ? "gradient-primary text-primary-foreground shadow-glow" : "border border-border bg-secondary/40 hover:bg-secondary"}`}>
                {t.l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-muted-foreground">Difficulty</label>
          <div className="mt-2 flex gap-2">
            {DIFF.map((d) => (
              <button key={d.v} onClick={() => setDifficulty(d.v)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm transition ${difficulty === d.v ? "gradient-primary text-primary-foreground shadow-glow" : "border border-border bg-secondary/40 hover:bg-secondary"}`}>
                {d.l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-muted-foreground">Number of questions: {count}</label>
          <input type="range" min={3} max={10} value={count} onChange={(e) => setCount(Number(e.target.value))} className="mt-2 w-full accent-primary" />
        </div>

        <button
          onClick={handleStart} disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Generating questions…" : "Generate & start"}
        </button>
      </div>
    </div>
  );
}
