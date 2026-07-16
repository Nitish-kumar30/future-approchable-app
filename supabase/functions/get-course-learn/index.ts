import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    const courseId = url.searchParams.get("course_id");
    if (!slug && !courseId) {
      return json({ error: "slug or course_id required" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Identify caller (optional)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data } = await admin.auth.getUser(token);
      userId = data.user?.id ?? null;
    }

    const courseQuery = admin
      .from("courses")
      .select("*")
      .eq("is_published", true);
    const { data: course, error: courseErr } = slug
      ? await courseQuery.eq("slug", slug).maybeSingle()
      : await courseQuery.eq("id", courseId!).maybeSingle();
    if (courseErr || !course) return json({ error: "Course not found" }, 404);

    // Enrolled? Admin?
    let isEnrolled = false;
    let isAdmin = false;
    if (userId) {
      const { data: enr } = await admin
        .from("enrollments")
        .select("id")
        .eq("user_id", userId)
        .eq("course_id", course.id)
        .maybeSingle();
      isEnrolled = !!enr;

      const { data: roleRow } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      isAdmin = !!roleRow;
    }
    const canAccessPrivileged = isEnrolled || isAdmin;

    // Sessions
    const { data: sessions } = await admin
      .from("sessions")
      .select("*")
      .eq("course_id", course.id)
      .order("session_order", { ascending: true });

    const sessionIds = (sessions ?? []).map((s: any) => s.id);

    // Chapters
    const { data: chapters } = sessionIds.length
      ? await admin
          .from("chapters")
          .select("*")
          .in("session_id", sessionIds)
          .order("chapter_order", { ascending: true })
      : { data: [] as any[] };

    // Redact non-preview HLS urls if not enrolled
    const safeChapters = (chapters ?? []).map((c: any) => {
      const canWatch = isEnrolled || c.is_preview;
      return {
        ...c,
        hls_url: canWatch ? c.hls_url : null,
        can_watch: canWatch,
      };
    });

    // Session quizzes
    const { data: sessionQuizzes } = sessionIds.length
      ? await admin
          .from("session_quizzes")
          .select("session_id, display_order, quiz:quizzes(id, title, questions)")
          .in("session_id", sessionIds)
          .order("display_order", { ascending: true })
      : { data: [] as any[] };

    // User progress
    let chapterProgress: any[] = [];
    let sessionProgress: any[] = [];
    let quizSubmissions: any[] = [];
    let rating: any = null;
    if (userId && isEnrolled) {
      const chapterIds = safeChapters.map((c) => c.id);
      if (chapterIds.length) {
        const { data } = await admin
          .from("chapter_progress")
          .select("chapter_id, is_completed, watched_seconds, completed_at")
          .eq("user_id", userId)
          .in("chapter_id", chapterIds);
        chapterProgress = data ?? [];
      }
      if (sessionIds.length) {
        const { data } = await admin
          .from("session_progress")
          .select("session_id, is_completed, completed_at")
          .eq("user_id", userId)
          .in("session_id", sessionIds);
        sessionProgress = data ?? [];
      }
      const quizIds = (sessionQuizzes ?? []).map((sq: any) => sq.quiz?.id).filter(Boolean);
      if (quizIds.length) {
        const { data } = await admin
          .from("quiz_submissions")
          .select("quiz_id, score, submitted_at")
          .eq("user_id", userId)
          .in("quiz_id", quizIds)
          .order("submitted_at", { ascending: false });
        quizSubmissions = data ?? [];
      }
      const { data: r } = await admin
        .from("course_ratings")
        .select("rating, comment")
        .eq("user_id", userId)
        .eq("course_id", course.id)
        .maybeSingle();
      rating = r;
    }

    // Aggregate rating
    const { data: allRatings } = await admin
      .from("course_ratings")
      .select("rating")
      .eq("course_id", course.id);
    const ratingCount = allRatings?.length ?? 0;
    const ratingAvg = ratingCount
      ? (allRatings!.reduce((s: number, r: any) => s + Number(r.rating), 0) / ratingCount)
      : 0;

    return json({
      course,
      is_enrolled: isEnrolled,
      sessions: sessions ?? [],
      chapters: safeChapters,
      session_quizzes: sessionQuizzes ?? [],
      chapter_progress: chapterProgress,
      session_progress: sessionProgress,
      quiz_submissions: quizSubmissions,
      my_rating: rating,
      rating_avg: Math.round(ratingAvg * 10) / 10,
      rating_count: ratingCount,
    });
  } catch (err) {
    console.error(err);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
