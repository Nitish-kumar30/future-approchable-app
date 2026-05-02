import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RawQuestion {
  id: string;
  type?: "mcq" | "mcq_ungraded" | "subjective";
  question: string;
  options?: string[];
  correctAnswer?: number;
}

const isUngraded = (q: RawQuestion) => {
  const t = q.type ?? "mcq";
  return t === "mcq_ungraded" || t === "subjective";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const quizId = url.searchParams.get("quiz_id");
    const cohortId = url.searchParams.get("cohort_id");
    const courseId = url.searchParams.get("course_id");

    // Helper to enrich users with name + email
    const enrichUsers = async (userIds: string[]) => {
      const profileMap = new Map<string, string | null>();
      const emailMap = new Map<string, string>();
      if (userIds.length === 0) return { profileMap, emailMap };

      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      (profiles || []).forEach((p) => profileMap.set(p.user_id, p.full_name));

      await Promise.all(
        userIds.map(async (uid) => {
          try {
            const { data: userData } = await supabaseAdmin.auth.admin.getUserById(uid);
            if (userData?.user?.email) emailMap.set(uid, userData.user.email);
          } catch (e) {
            console.error(`email fetch failed for ${uid}`, e);
          }
        })
      );

      return { profileMap, emailMap };
    };

    // ============= COHORT / COURSE MODE =============
    if (cohortId || courseId) {
      const id = cohortId || courseId!;
      if (!UUID_RE.test(id)) {
        return new Response(
          JSON.stringify({ error: "Bad Request - valid cohort_id or course_id required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 1. Enrolled users
      const enrollmentQuery = supabaseAdmin.from("enrollments").select("user_id");
      const { data: enrollments } = cohortId
        ? await enrollmentQuery.eq("cohort_id", cohortId)
        : await enrollmentQuery.eq("course_id", courseId);
      const userIds = Array.from(new Set((enrollments || []).map((e) => e.user_id)));

      // 2. Sessions for cohort/course
      const sessionsQuery = supabaseAdmin
        .from("sessions")
        .select("id, title, session_order");
      const { data: sessionsData } = cohortId
        ? await sessionsQuery.eq("cohort_id", cohortId)
        : await sessionsQuery.eq("course_id", courseId);
      const sessionList = (sessionsData || []).sort(
        (a, b) => (a.session_order ?? 0) - (b.session_order ?? 0)
      );
      const sessionIds = sessionList.map((s) => s.id);

      // 3. session_quizzes
      let sessionQuizzes: Array<{ session_id: string; quiz_id: string; display_order: number }> = [];
      if (sessionIds.length > 0) {
        const { data: sq } = await supabaseAdmin
          .from("session_quizzes")
          .select("session_id, quiz_id, display_order")
          .in("session_id", sessionIds)
          .order("display_order", { ascending: true });
        sessionQuizzes = sq || [];
      }
      const quizIds = Array.from(new Set(sessionQuizzes.map((sq) => sq.quiz_id)));

      // 4. Quizzes
      let quizzesData: Array<{ id: string; title: string; questions: RawQuestion[] }> = [];
      if (quizIds.length > 0) {
        const { data: qz } = await supabaseAdmin
          .from("quizzes")
          .select("id, title, questions")
          .in("id", quizIds);
        quizzesData = (qz || []).map((q) => ({
          id: q.id,
          title: q.title,
          questions: Array.isArray(q.questions) ? (q.questions as unknown as RawQuestion[]) : [],
        }));
      }
      const quizMap = new Map(quizzesData.map((q) => [q.id, q]));

      // 5. Submissions for these quizzes by enrolled users (latest per user/quiz)
      const submissionMap = new Map<string, Array<{ user_id: string; submitted_at: string; answers: Record<string, unknown> }>>();
      if (quizIds.length > 0 && userIds.length > 0) {
        const { data: subs } = await supabaseAdmin
          .from("quiz_submissions")
          .select("quiz_id, user_id, answers, submitted_at")
          .in("quiz_id", quizIds)
          .in("user_id", userIds)
          .order("submitted_at", { ascending: false });

        const seen = new Set<string>();
        (subs || []).forEach((s) => {
          const key = `${s.quiz_id}:${s.user_id}`;
          if (seen.has(key)) return;
          seen.add(key);
          const arr = submissionMap.get(s.quiz_id) || [];
          arr.push({
            user_id: s.user_id,
            submitted_at: s.submitted_at,
            answers: (s.answers as Record<string, unknown>) || {},
          });
          submissionMap.set(s.quiz_id, arr);
        });
      }

      // 6. Enrich enrolled users
      const { profileMap, emailMap } = await enrichUsers(userIds);
      const enrolled = userIds
        .map((uid) => ({
          user_id: uid,
          name: profileMap.get(uid) || null,
          email: emailMap.get(uid) || "Unknown",
        }))
        .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));

      // 7. Build sessions → quizzes structure (only ungraded questions)
      const sessionsOut = sessionList
        .map((s) => {
          const sQuizIds = sessionQuizzes
            .filter((sq) => sq.session_id === s.id)
            .map((sq) => sq.quiz_id);
          const quizzesOut = sQuizIds
            .map((qid) => {
              const q = quizMap.get(qid);
              if (!q) return null;
              const ungradedQs = (q.questions || []).filter(isUngraded);
              if (ungradedQs.length === 0) return null;
              return {
                id: q.id,
                title: q.title,
                questions: ungradedQs,
                submissions: submissionMap.get(q.id) || [],
              };
            })
            .filter((x): x is NonNullable<typeof x> => !!x);
          if (quizzesOut.length === 0) return null;
          return {
            id: s.id,
            title: s.title,
            session_order: s.session_order,
            quizzes: quizzesOut,
          };
        })
        .filter((x): x is NonNullable<typeof x> => !!x);

      return new Response(
        JSON.stringify({ enrolled, sessions: sessionsOut }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============= LEGACY QUIZ MODE =============
    if (!quizId || !UUID_RE.test(quizId)) {
      return new Response(
        JSON.stringify({ error: "Bad Request - quiz_id, cohort_id, or course_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: quiz, error: quizError } = await supabaseAdmin
      .from("quizzes")
      .select("id, title, questions")
      .eq("id", quizId)
      .maybeSingle();

    if (quizError || !quiz) {
      return new Response(JSON.stringify({ error: "Quiz not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const questions: RawQuestion[] = Array.isArray(quiz.questions)
      ? (quiz.questions as unknown as RawQuestion[])
      : [];

    const { data: submissions, error: subError } = await supabaseAdmin
      .from("quiz_submissions")
      .select("id, user_id, answers, submitted_at, score")
      .eq("quiz_id", quizId)
      .order("submitted_at", { ascending: false });

    if (subError) {
      return new Response(JSON.stringify({ error: "Failed to fetch submissions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const seen = new Set<string>();
    const latest = (submissions || []).filter((s) => {
      if (seen.has(s.user_id)) return false;
      seen.add(s.user_id);
      return true;
    });
    const userIds = [...seen];

    const { profileMap, emailMap } = await enrichUsers(userIds);

    const enriched = latest.map((s) => ({
      user_id: s.user_id,
      name: profileMap.get(s.user_id) || null,
      email: emailMap.get(s.user_id) || "Unknown",
      submitted_at: s.submitted_at,
      score: s.score,
      answers: s.answers,
    }));

    return new Response(
      JSON.stringify({
        quiz: { id: quiz.id, title: quiz.title, questions },
        submissions: enriched,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("get-quiz-responses error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
