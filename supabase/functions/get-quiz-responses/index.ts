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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    if (!quizId || !UUID_RE.test(quizId)) {
      return new Response(
        JSON.stringify({ error: "Bad Request - valid quiz_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch quiz
    const { data: quiz, error: quizError } = await supabaseAdmin
      .from("quizzes")
      .select("id, title, questions")
      .eq("id", quizId)
      .maybeSingle();

    if (quizError || !quiz) {
      return new Response(
        JSON.stringify({ error: "Quiz not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const questions: RawQuestion[] = Array.isArray(quiz.questions)
      ? (quiz.questions as unknown as RawQuestion[])
      : [];

    // Fetch submissions (latest per user)
    const { data: submissions, error: subError } = await supabaseAdmin
      .from("quiz_submissions")
      .select("id, user_id, answers, submitted_at, score")
      .eq("quiz_id", quizId)
      .order("submitted_at", { ascending: false });

    if (subError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch submissions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Keep latest submission per user
    const seen = new Set<string>();
    const latest = (submissions || []).filter((s) => {
      if (seen.has(s.user_id)) return false;
      seen.add(s.user_id);
      return true;
    });

    const userIds = [...seen];

    let profileMap = new Map<string, string | null>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));
    }

    const emailMap = new Map<string, string>();
    for (const uid of userIds) {
      try {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(uid);
        if (userData?.user?.email) emailMap.set(uid, userData.user.email);
      } catch (e) {
        console.error(`email fetch failed for ${uid}`, e);
      }
    }

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
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
