import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string; full_name: string | null; email: string | null;
  college: string | null; graduation_year: number | null;
  skills: string[] | null; preferred_role: string | null;
  github_url: string | null; linkedin_url: string | null;
}

const profileOpts = queryOptions({
  queryKey: ["profile"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new Error("Not signed in");
    const { data, error } = await supabase.from("profiles").select("*").eq("id", u.user.id).single();
    if (error) throw error;
    return data as unknown as Profile;
  },
});

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — InterviewIQ AI" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <Suspense fallback={<div className="glass rounded-2xl p-8 text-muted-foreground">Loading…</div>}>
      <ProfilePage />
    </Suspense>
  ),
});

function ProfilePage() {
  const { data } = useSuspenseQuery(profileOpts);
  const qc = useQueryClient();
  const [form, setForm] = useState<Profile>(data);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(data), [data]);

  async function save() {
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        full_name: form.full_name,
        college: form.college,
        graduation_year: form.graduation_year,
        skills: form.skills,
        preferred_role: form.preferred_role,
        github_url: form.github_url,
        linkedin_url: form.linkedin_url,
      }).eq("id", form.id);
      if (error) throw error;
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally { setSaving(false); }
  }

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setForm((f) => ({ ...f, [k]: v }));
  const inp = "w-full rounded-lg border border-border bg-input/40 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground">Personalize your interviews with your background.</p>
      </header>

      <div className="glass space-y-4 rounded-2xl p-6 shadow-card">
        <div>
          <label className="text-xs uppercase text-muted-foreground">Full name</label>
          <input className={inp} value={form.full_name ?? ""} onChange={(e) => set("full_name", e.target.value)} />
        </div>
        <div>
          <label className="text-xs uppercase text-muted-foreground">Email</label>
          <input className={inp} value={form.email ?? ""} disabled />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase text-muted-foreground">College</label>
            <input className={inp} value={form.college ?? ""} onChange={(e) => set("college", e.target.value)} />
          </div>
          <div>
            <label className="text-xs uppercase text-muted-foreground">Graduation year</label>
            <input className={inp} type="number" value={form.graduation_year ?? ""} onChange={(e) => set("graduation_year", e.target.value ? Number(e.target.value) : null)} />
          </div>
        </div>
        <div>
          <label className="text-xs uppercase text-muted-foreground">Preferred role</label>
          <input className={inp} value={form.preferred_role ?? ""} onChange={(e) => set("preferred_role", e.target.value)} />
        </div>
        <div>
          <label className="text-xs uppercase text-muted-foreground">Skills (comma-separated)</label>
          <input className={inp} value={(form.skills ?? []).join(", ")}
            onChange={(e) => set("skills", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase text-muted-foreground">GitHub</label>
            <input className={inp} value={form.github_url ?? ""} onChange={(e) => set("github_url", e.target.value)} />
          </div>
          <div>
            <label className="text-xs uppercase text-muted-foreground">LinkedIn</label>
            <input className={inp} value={form.linkedin_url ?? ""} onChange={(e) => set("linkedin_url", e.target.value)} />
          </div>
        </div>

        <button onClick={save} disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save profile
        </button>
      </div>
    </div>
  );
}
