import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const token = auth.slice(7);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: userData } = await admin.auth.getUser(token);
    const userId = userData.user?.id;
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const chapter_id = String(body.chapter_id ?? "");
    const watched_seconds = Number(body.watched_seconds ?? 0);
    const is_completed = Boolean(body.is_completed ?? false);
    if (!chapter_id) return json({ error: "chapter_id required" }, 400);

    // Confirm chapter exists and user is allowed (enrolled or preview)
    const { data: chapter } = await admin
      .from("chapters")
      .select("id, session_id, is_preview, sessions:sessions(course_id, cohort_id)")
      .eq("id", chapter_id)
      .maybeSingle();
    if (!chapter) return json({ error: "Chapter not found" }, 404);

    const s: any = (chapter as any).sessions;
    let allowed = chapter.is_preview;
    if (!allowed && s) {
      const { data: enr } = await admin
        .from("enrollments")
        .select("id")
        .eq("user_id", userId)
        .or(
          [
            s.course_id ? `course_id.eq.${s.course_id}` : null,
            s.cohort_id ? `cohort_id.eq.${s.cohort_id}` : null,
          ]
            .filter(Boolean)
            .join(",")
        )
        .maybeSingle();
      allowed = !!enr;
    }
    if (!allowed) return json({ error: "Forbidden" }, 403);

    const { data: existing } = await admin
      .from("chapter_progress")
      .select("is_completed, watched_seconds, completed_at")
      .eq("user_id", userId)
      .eq("chapter_id", chapter_id)
      .maybeSingle();

    const finalCompleted = existing?.is_completed || is_completed;
    const finalWatched = Math.max(existing?.watched_seconds ?? 0, Math.max(0, Math.floor(watched_seconds)));

    const { error } = await admin
      .from("chapter_progress")
      .upsert(
        {
          user_id: userId,
          chapter_id,
          watched_seconds: finalWatched,
          is_completed: finalCompleted,
          completed_at: finalCompleted
            ? existing?.completed_at ?? new Date().toISOString()
            : null,
        },
        { onConflict: "user_id,chapter_id" }
      );
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
