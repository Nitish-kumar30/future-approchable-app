import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    if (!slug) {
      return new Response(JSON.stringify({ error: "slug is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Optional caller identity
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseAdmin.auth.getUser(token);
      userId = data.user?.id ?? null;
    }

    const { data: course, error: courseErr } = await supabaseAdmin
      .from("courses")
      .select("id, slug, name, is_published")
      .eq("slug", slug)
      .maybeSingle();

    if (courseErr || !course || !course.is_published) {
      return new Response(JSON.stringify({ error: "Course not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let isEnrolled = false;
    if (userId) {
      const { data: enroll } = await supabaseAdmin
        .from("enrollments")
        .select("id")
        .eq("user_id", userId)
        .eq("course_id", course.id)
        .maybeSingle();
      isEnrolled = !!enroll;
    }

    const { data: sessions, error: sessionsErr } = await supabaseAdmin
      .from("sessions")
      .select("id, title, session_order")
      .eq("course_id", course.id)
      .order("session_order", { ascending: true });

    if (sessionsErr) {
      return new Response(JSON.stringify({ error: "Failed to load sessions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionIds = (sessions ?? []).map((s) => s.id);
    const chaptersBySession: Record<string, any[]> = {};
    if (sessionIds.length > 0) {
      const { data: chapters } = await supabaseAdmin
        .from("chapters")
        .select("id, session_id, title, chapter_order, is_preview, hls_url")
        .in("session_id", sessionIds)
        .order("chapter_order", { ascending: true });

      for (const c of chapters ?? []) {
        const canWatch = isEnrolled || c.is_preview;
        (chaptersBySession[c.session_id] ||= []).push({
          id: c.id,
          title: c.title,
          chapter_order: c.chapter_order,
          is_preview: c.is_preview,
          hls_url: canWatch ? c.hls_url : null,
        });
      }
    }

    const quizzesBySession: Record<string, any[]> = {};
    if (sessionIds.length > 0 && isEnrolled) {
      const { data: sq } = await supabaseAdmin
        .from("session_quizzes")
        .select("session_id, display_order, quiz:quizzes ( id, title )")
        .in("session_id", sessionIds)
        .order("display_order", { ascending: true });
      for (const row of (sq ?? []) as any[]) {
        if (row.quiz) {
          (quizzesBySession[row.session_id] ||= []).push({
            id: row.quiz.id,
            title: row.quiz.title,
          });
        }
      }
    }

    const payload = {
      course: { id: course.id, slug: course.slug, title: course.name },
      is_enrolled: isEnrolled,
      sessions: (sessions ?? []).map((s) => ({
        id: s.id,
        title: s.title,
        session_order: s.session_order,
        chapters: chaptersBySession[s.id] ?? [],
        quizzes: quizzesBySession[s.id] ?? [],
      })),
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
