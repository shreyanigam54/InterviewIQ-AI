import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const StartInput = z.object({
  role: z.string().min(1).max(80),
  difficulty: z.enum(["easy", "medium", "hard"]),
  interview_type: z.enum(["hr", "technical", "coding", "behavioral", "aptitude", "mixed"]),
  question_count: z.number().int().min(3).max(10).default(5),
});

interface GeneratedQuestions { questions: string[] }

export const startInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => StartInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { chatJSON } = await import("./ai.server");
    const { supabase, userId } = context;

    const gen = await chatJSON<GeneratedQuestions>({
      messages: [
        { role: "system", content: `You are a senior interviewer generating realistic ${data.interview_type} interview questions. Return strict JSON: {"questions": string[]}. No numbering, no markdown.` },
        { role: "user", content: `Generate exactly ${data.question_count} ${data.difficulty} difficulty ${data.interview_type} interview questions for the role of "${data.role}". Vary topics. Return ONLY JSON.` },
      ],
      temperature: 0.8,
    });

    const questions = (gen.questions ?? []).slice(0, data.question_count).filter((q) => typeof q === "string" && q.trim());
    if (questions.length === 0) throw new Error("AI failed to generate questions. Please try again.");

    const { data: interview, error: iErr } = await supabase
      .from("interviews")
      .insert({
        user_id: userId,
        role: data.role,
        difficulty: data.difficulty,
        interview_type: data.interview_type,
        status: "in_progress",
      })
      .select("id")
      .single();
    if (iErr || !interview) throw new Error(iErr?.message ?? "Failed to create interview");

    const rows = questions.map((q, i) => ({
      interview_id: interview.id,
      user_id: userId,
      position: i,
      question: q,
    }));
    const { error: qErr } = await supabase.from("interview_questions").insert(rows);
    if (qErr) throw new Error(qErr.message);

    return { interviewId: interview.id as string };
  });

const AnswerInput = z.object({
  question_id: z.string().uuid(),
  answer: z.string().min(1).max(4000),
});

interface QuestionFeedback {
  score: number;
  feedback: string;
}

export const submitAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => AnswerInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { chatJSON } = await import("./ai.server");
    const { supabase, userId } = context;

    const { data: q, error: qErr } = await supabase
      .from("interview_questions")
      .select("id, question, interview_id, interviews!inner(role, difficulty, interview_type, user_id)")
      .eq("id", data.question_id)
      .eq("user_id", userId)
      .single();
    if (qErr || !q) throw new Error("Question not found");

    const meta = (q as unknown as { interviews: { role: string; difficulty: string; interview_type: string } }).interviews;

    const evalResult = await chatJSON<QuestionFeedback>({
      messages: [
        { role: "system", content: `You are a strict but fair senior interviewer evaluating a candidate answer. Return strict JSON: {"score": number 0-10, "feedback": string (2-3 sentences of specific, actionable feedback)}.` },
        { role: "user", content: `Role: ${meta.role}\nDifficulty: ${meta.difficulty}\nType: ${meta.interview_type}\n\nQuestion: ${q.question}\n\nCandidate answer:\n${data.answer}\n\nEvaluate. Return ONLY JSON.` },
      ],
      temperature: 0.3,
    });

    const score = Math.max(0, Math.min(10, Number(evalResult.score) || 0));
    const feedback = String(evalResult.feedback ?? "").slice(0, 1200);

    const { error: uErr } = await supabase
      .from("interview_questions")
      .update({ answer: data.answer, ai_score: score, ai_feedback: feedback })
      .eq("id", data.question_id);
    if (uErr) throw new Error(uErr.message);

    return { score, feedback };
  });

const FinishInput = z.object({
  interview_id: z.string().uuid(),
  duration_seconds: z.number().int().min(0).max(24 * 3600),
});

interface OverallFeedback {
  overall_score: number;
  communication: number;
  technical: number;
  confidence: number;
  problem_solving: number;
  professionalism: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export const finishInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => FinishInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { chatJSON } = await import("./ai.server");
    const { supabase, userId } = context;

    const { data: iv, error: ivErr } = await supabase
      .from("interviews")
      .select("id, role, difficulty, interview_type")
      .eq("id", data.interview_id)
      .eq("user_id", userId)
      .single();
    if (ivErr || !iv) throw new Error("Interview not found");

    const { data: qs, error: qsErr } = await supabase
      .from("interview_questions")
      .select("question, answer, ai_score, ai_feedback")
      .eq("interview_id", data.interview_id)
      .order("position");
    if (qsErr) throw new Error(qsErr.message);

    const transcript = (qs ?? []).map((q, i) =>
      `Q${i + 1}: ${q.question}\nA: ${q.answer ?? "(skipped)"}\nScore: ${q.ai_score ?? "?"}/10`
    ).join("\n\n");

    const overall = await chatJSON<OverallFeedback>({
      messages: [
        { role: "system", content: `You are a senior interviewer producing a final interview report. Return strict JSON with keys: overall_score (0-10), communication (0-10), technical (0-10), confidence (0-10), problem_solving (0-10), professionalism (0-10), strengths (string[] 3 items), weaknesses (string[] 3 items), suggestions (string[] 3 concrete actions).` },
        { role: "user", content: `Role: ${iv.role}\nDifficulty: ${iv.difficulty}\nType: ${iv.interview_type}\n\nFull transcript:\n${transcript}\n\nProduce the JSON report ONLY.` },
      ],
      temperature: 0.4,
    });

    const clamp = (v: unknown) => Math.max(0, Math.min(10, Number(v) || 0));
    const patch = {
      status: "completed" as const,
      duration_seconds: data.duration_seconds,
      completed_at: new Date().toISOString(),
      overall_score: clamp(overall.overall_score),
      communication_score: clamp(overall.communication),
      technical_score: clamp(overall.technical),
      confidence_score: clamp(overall.confidence),
      problem_solving_score: clamp(overall.problem_solving),
      professionalism_score: clamp(overall.professionalism),
      strengths: (overall.strengths ?? []).slice(0, 5).map(String),
      weaknesses: (overall.weaknesses ?? []).slice(0, 5).map(String),
      suggestions: (overall.suggestions ?? []).slice(0, 5).map(String),
    };

    const { error: uErr } = await supabase.from("interviews").update(patch).eq("id", data.interview_id);
    if (uErr) throw new Error(uErr.message);

    // First-interview badge
    await supabase.from("badges").insert({ user_id: userId, code: "first_interview", label: "First Interview" }).select();

    return { ok: true, overall_score: patch.overall_score };
  });
