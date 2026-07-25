import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, Sparkles, LineChart, Mic, Code2, Target, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InterviewIQ AI — Land Your Next Software Job" },
      { name: "description", content: "Practice technical, HR, behavioral & coding interviews with an AI coach. Instant scoring, tailored feedback, and progress analytics." },
      { property: "og:title", content: "InterviewIQ AI — AI Interview Coach" },
      { property: "og:description", content: "Practice mock interviews with AI. Get scored on communication, technical accuracy, confidence, and more." },
    ],
  }),
  component: Landing,
});

function Feature({ icon: Icon, title, desc }: { icon: typeof Brain; title: string; desc: string }) {
  return (
    <div className="glass group rounded-2xl p-6 shadow-card transition hover:-translate-y-1 hover:shadow-glow">
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl gradient-primary shadow-glow">
        <Icon className="h-5 w-5 text-primary-foreground" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Landing() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  return (
    <div className="min-h-screen gradient-hero">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-glow">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">InterviewIQ<span className="text-gradient"> AI</span></span>
        </Link>
        <nav className="flex items-center gap-3">
          {signedIn ? (
            <Link to="/dashboard" className="rounded-lg gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow">
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
              <Link to="/auth" search={{ mode: "signup" }} className="rounded-lg gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow">
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-16 pb-24 text-center">
        <div className="glass mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-accent" /> Powered by frontier LLMs
        </div>
        <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-[1.05] md:text-6xl">
          Ace your next interview with an <span className="text-gradient">AI coach</span> in your corner.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Practice real technical, HR, and behavioral interviews. Get instant, brutally honest AI feedback
          on communication, technical depth, confidence, and problem solving.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to={signedIn ? "/dashboard" : "/auth"} search={signedIn ? undefined : { mode: "signup" }} className="inline-flex items-center gap-2 rounded-xl gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90">
            Start practicing free <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#features" className="rounded-xl border border-border bg-card/50 px-6 py-3 text-sm font-medium backdrop-blur">
            See features
          </a>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Feature icon={Brain} title="AI-generated questions" desc="Dynamic, role-aware questions that adapt to your skills, difficulty, and interview type." />
          <Feature icon={Sparkles} title="Detailed AI feedback" desc="Communication, confidence, technical accuracy, professionalism — each answer scored and explained." />
          <Feature icon={LineChart} title="Progress analytics" desc="Weekly trends, weak topics, skill graphs, and streaks that keep you improving." />
          <Feature icon={Mic} title="Voice interviews" desc="Speak your answers. We transcribe, evaluate, and reply — just like a real interview loop." />
          <Feature icon={Code2} title="Coding rounds" desc="In-browser editor with AI code review, complexity analysis, and test cases." />
          <Feature icon={Target} title="Role-specific prep" desc="Software Engineer, Frontend, Backend, Full Stack, Data Scientist, AI/ML Engineer." />
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} InterviewIQ AI · Built for interview success.
      </footer>
    </div>
  );
}
