import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LeaderboardEntry {
  user_id: string;
  user_name: string | null;
  user_email: string;
  avg_quiz_score: number;
  quizzes_attempted: number;
  sessions_completed: number;
  total_sessions: number;
  completion_percentage: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Extract JWT from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Create authenticated client to verify user
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.log("Failed to verify token:", claimsError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;
    console.log("User authenticated:", userId);

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Parse query params early to check allow_enrolled flag
    const url = new URL(req.url);
    const cohortId = url.searchParams.get("cohort_id");
    const allowEnrolled = url.searchParams.get("allow_enrolled") === "true";

    // If allow_enrolled is set and cohort_id is provided, check enrollment instead of admin role
    if (allowEnrolled && cohortId) {
      // Verify user is enrolled in this cohort
      const { data: enrollmentData, error: enrollmentError } = await supabaseAdmin
        .from("enrollments")
        .select("id")
        .eq("user_id", userId)
        .eq("cohort_id", cohortId)
        .maybeSingle();

      if (enrollmentError || !enrollmentData) {
        console.log("User is not enrolled in cohort:", userId, cohortId);
        return new Response(
          JSON.stringify({ error: "Forbidden - You must be enrolled in this cohort" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("Enrolled user access verified for user:", userId);
    } else {
      // Default: require admin role
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError || !roleData) {
        console.log("User is not an admin:", userId);
        return new Response(
          JSON.stringify({ error: "Forbidden - Admin access required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("Admin access verified for user:", userId);
    }

    // cohortId and url already parsed above
    const courseId = url.searchParams.get("course_id");

    if (!cohortId && !courseId) {
      console.log("Missing required filter parameter");
      return new Response(
        JSON.stringify({ error: "Bad Request - Either cohort_id or course_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching leaderboard with filter:", { cohortId, courseId });

    // Fetch enrollments based on filter
    let enrollmentQuery = supabaseAdmin.from("enrollments").select("user_id");
    if (cohortId) {
      enrollmentQuery = enrollmentQuery.eq("cohort_id", cohortId);
    } else if (courseId) {
      enrollmentQuery = enrollmentQuery.eq("course_id", courseId);
    }

    const { data: enrollments, error: enrollmentsError } = await enrollmentQuery;

    if (enrollmentsError) {
      console.error("Error fetching enrollments:", enrollmentsError.message);
      return new Response(
        JSON.stringify({ error: "Failed to fetch enrollments" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!enrollments || enrollments.length === 0) {
      console.log("No enrollments found");
      return new Response(
        JSON.stringify({ leaderboard: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userIds = [...new Set(enrollments.map((e) => e.user_id))];
    console.log(`Processing ${userIds.length} enrolled users`);

    // Fetch all sessions for the cohort/course
    let sessionsQuery = supabaseAdmin.from("sessions").select("id");
    if (cohortId) {
      sessionsQuery = sessionsQuery.eq("cohort_id", cohortId);
    } else if (courseId) {
      sessionsQuery = sessionsQuery.eq("course_id", courseId);
    }

    const { data: sessions } = await sessionsQuery;
    const sessionIds = sessions?.map((s) => s.id) || [];
    const totalSessions = sessionIds.length;

    console.log(`Found ${totalSessions} sessions`);

    // Fetch all session_quizzes to get quiz IDs linked to these sessions
    let quizIds: string[] = [];
    if (sessionIds.length > 0) {
      const { data: sessionQuizzes } = await supabaseAdmin
        .from("session_quizzes")
        .select("quiz_id")
        .in("session_id", sessionIds);
      quizIds = [...new Set((sessionQuizzes || []).map((sq) => sq.quiz_id))];
    }

    console.log(`Found ${quizIds.length} quizzes linked to sessions`);

    // Fetch all quiz submissions for these quizzes
    let allSubmissions: { user_id: string; score: number | null }[] = [];
    if (quizIds.length > 0) {
      const { data: submissions } = await supabaseAdmin
        .from("quiz_submissions")
        .select("user_id, score")
        .in("quiz_id", quizIds)
        .in("user_id", userIds);
      allSubmissions = submissions || [];
    }

    // Fetch all session progress for these sessions
    let allProgress: { user_id: string; session_id: string; is_completed: boolean }[] = [];
    if (sessionIds.length > 0) {
      const { data: progress } = await supabaseAdmin
        .from("session_progress")
        .select("user_id, session_id, is_completed")
        .in("session_id", sessionIds)
        .in("user_id", userIds);
      allProgress = progress || [];
    }

    // Fetch profiles for names
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));

    // Fetch emails from auth.users
    const emailMap = new Map<string, string>();
    for (const uid of userIds) {
      try {
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(uid);
        if (!userError && userData?.user?.email) {
          emailMap.set(uid, userData.user.email);
        }
      } catch (e) {
        console.error(`Error fetching email for user ${uid}:`, e);
      }
    }

    // Calculate leaderboard data for each user
    const leaderboard: LeaderboardEntry[] = userIds.map((uid) => {
      // Calculate quiz stats
      const userSubmissions = allSubmissions.filter((s) => s.user_id === uid);
      const validScores = userSubmissions.filter((s) => s.score !== null).map((s) => s.score!);
      const avgQuizScore = validScores.length > 0
        ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
        : 0;
      const quizzesAttempted = userSubmissions.length;

      // Calculate session completion
      const userProgress = allProgress.filter((p) => p.user_id === uid && p.is_completed);
      const sessionsCompleted = userProgress.length;
      const completionPercentage = totalSessions > 0
        ? Math.round((sessionsCompleted / totalSessions) * 100)
        : 0;

      return {
        user_id: uid,
        user_name: profileMap.get(uid) || null,
        user_email: emailMap.get(uid) || "Unknown",
        avg_quiz_score: avgQuizScore,
        quizzes_attempted: quizzesAttempted,
        sessions_completed: sessionsCompleted,
        total_sessions: totalSessions,
        completion_percentage: completionPercentage,
      };
    });

    // Sort by avg_quiz_score descending, then by sessions_completed descending
    leaderboard.sort((a, b) => {
      if (b.avg_quiz_score !== a.avg_quiz_score) {
        return b.avg_quiz_score - a.avg_quiz_score;
      }
      return b.sessions_completed - a.sessions_completed;
    });

    console.log(`Returning leaderboard with ${leaderboard.length} entries`);

    return new Response(
      JSON.stringify({ leaderboard }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
