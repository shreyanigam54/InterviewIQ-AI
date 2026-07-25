import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import { Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ArrowRight, Flag } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { submitAnswer, finishInterview } from "@/lib/interview.functions";

interface Interview {
  id: string; role: string; difficulty: string; interview_type: string;
  status: string; overall_score: number | null; created_at: string;
  strengths: string[] | null; weaknesses: string[] | null; suggestions: string[] | null;
  communication_score: number | null; technical_score: number | null; confidence_score: number | null;
  problem_solving_score: number | null; professionalism_score: number | null;
}
interface Question {
  id: string; position: number; question: string;
  answer: string | null; ai_score: number | null; ai_feedback: string | null;
}

const interviewOpts = (id: string) =>
  queryOptions({
    queryKey: ["interview", id],
    queryFn: async () => {
      const [{ data: iv, error: e1 }, { data: qs, error: e2 }] = await Promise.all([
        supabase.from("interviews").select("*").eq("id", id).single(),
        supabase.from("interview_questions").select("*").eq("interview_id", id).order("position"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      return { interview: iv as unknown as Interview, questions: (qs ?? []) as unknown as Question[] };
    },
  });

export const Route = createFileRoute("/_authenticated/interview/$id")({
  head: () => ({ meta: [{ title: "Interview — InterviewIQ AI" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <Suspense fallback={<div className="glass rounded-2xl p-8 text-muted-foreground">Loading interview…</div>}>
      <InterviewPage />
    </Suspense>
  ),
});

function InterviewPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(interviewOpts(id));
  const submit = useServerFn(submitAnswer);
  const finish = useServerFn(finishInterview);

  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [startedAt] = useState(() => Date.now());

  const isDone = data.interview.status === "completed";
  const total = data.questions.length;
  const q = data.questions[current];

  useEffect(() => { setAnswer(q?.answer ?? ""); }, [q?.id]);

  const allAnswered = useMemo(() => data.questions.every((x) => x.answer && x.ai_score != null), [data.questions]);

  async function handleSubmit() {
    if (!q || !answer.trim()) return;
    setSubmitting(true);
    try {
      await submit({ data: { question_id: q.id, answer: answer.trim() } });
      await qc.invalidateQueries({ queryKey: ["interview", id] });
      toast.success("Answer scored");
      if (current < total - 1) setCurrent(current + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFinish() {
    setFinishing(true);
    try {
      const duration = Math.floor((Date.now() - startedAt) / 1000);
      await finish({ data: { interview_id: id, duration_seconds: duration } });
      await qc.invalidateQueries({ queryKey: ["interview", id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["history"] });
      toast.success("Interview complete!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to finish");
    } finally {
      setFinishing(false);
    }
  }

  if (isDone) return <Report data={data} />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {data.interview.role} · {data.interview.interview_type} · {data.interview.difficulty}
        </div>
        <h1 className="mt-1 text-2xl font-bold">Question {current + 1} of {total}</h1>
      </header>

      <div className="flex gap-1">
        {data.questions.map((qi, i) => (
          <button key={qi.id} onClick={() => setCurrent(i)}
            className={`h-1.5 flex-1 rounded-full transition ${
              i === current ? "bg-primary" : qi.ai_score != null ? "bg-success/70" : "bg-secondary"
            }`}
            aria-label={`Go to question ${i + 1}`}
          />
        ))}
      </div>

      <div className="glass space-y-4 rounded-2xl p-6 shadow-card">
        <p className="text-lg font-medium">{q?.question}</p>

        <textarea
          value={answer} onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer here…" rows={8}
          className="w-full resize-y rounded-lg border border-border bg-input/40 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        <div className="flex flex-wrap gap-2">
          <button onClick={handleSubmit} disabled={submitting || !answer.trim()}
            className="inline-flex items-center gap-2 rounded-lg gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {q?.ai_score != null ? "Resubmit" : "Submit answer"}
          </button>
          {current < total - 1 && (
            <button onClick={() => setCurrent(current + 1)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-2.5 text-sm hover:bg-secondary">
              Skip <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {q?.ai_score != null && (
          <div className="rounded-lg border border-border bg-secondary/40 p-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">AI Feedback</span>
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                {Number(q.ai_score).toFixed(1)}/10
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{q.ai_feedback}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {data.questions.filter((x) => x.ai_score != null).length} of {total} answered
        </span>
        <button onClick={handleFinish} disabled={!allAnswered || finishing}
          className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary/10 px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-primary/20 disabled:opacity-60">
          {finishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
          Finish & get report
        </button>
      </div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const v = Number(value ?? 0);
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{v.toFixed(1)}/10</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div className="h-full gradient-primary" style={{ width: `${(v / 10) * 100}%` }} />
      </div>
    </div>
  );
}

function Report({ data }: { data: { interview: Interview; questions: Question[] } }) {
  const iv = data.interview;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Report</div>
          <h1 className="text-3xl font-bold">{iv.role}</h1>
          <p className="text-sm text-muted-foreground">{iv.interview_type} · {iv.difficulty}</p>
        </div>
        <div className="glass rounded-2xl px-5 py-3 text-center shadow-glow">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Overall</div>
          <div className="text-4xl font-bold text-gradient">{Number(iv.overall_score ?? 0).toFixed(1)}</div>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="glass space-y-3 rounded-2xl p-6 shadow-card">
          <h2 className="mb-1 font-semibold">Skills breakdown</h2>
          <ScoreBar label="Communication" value={iv.communication_score} />
          <ScoreBar label="Technical" value={iv.technical_score} />
          <ScoreBar label="Confidence" value={iv.confidence_score} />
          <ScoreBar label="Problem Solving" value={iv.problem_solving_score} />
          <ScoreBar label="Professionalism" value={iv.professionalism_score} />
        </div>
        <div className="glass space-y-4 rounded-2xl p-6 shadow-card">
          {iv.strengths?.length ? (
            <div><h3 className="mb-2 text-sm font-semibold text-success">Strengths</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{iv.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          ) : null}
          {iv.weaknesses?.length ? (
            <div><h3 className="mb-2 text-sm font-semibold text-destructive">Weaknesses</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{iv.weaknesses.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          ) : null}
          {iv.suggestions?.length ? (
            <div><h3 className="mb-2 text-sm font-semibold text-accent">Suggestions</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{iv.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          ) : null}
        </div>
      </div>

      <div className="glass rounded-2xl p-6 shadow-card">
        <h2 className="mb-4 font-semibold">Question-by-question</h2>
        <ol className="space-y-4">
          {data.questions.map((q, i) => (
            <li key={q.id} className="rounded-lg border border-border bg-secondary/30 p-4">
              <div className="mb-1 flex items-start justify-between gap-3">
                <div className="text-sm font-medium">Q{i + 1}. {q.question}</div>
                {q.ai_score != null && (
                  <span className="shrink-0 rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold">{Number(q.ai_score).toFixed(1)}/10</span>
                )}
              </div>
              <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{q.answer ?? "(skipped)"}</div>
              {q.ai_feedback && <div className="mt-2 border-l-2 border-accent pl-3 text-xs text-muted-foreground">{q.ai_feedback}</div>}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex gap-3">
        <Link to="/interview/new" className="rounded-lg gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">Practice again</Link>
        <Link to="/dashboard" className="rounded-lg border border-border bg-secondary/40 px-5 py-2.5 text-sm">Back to dashboard</Link>
      </div>
    </div>
  );
}
