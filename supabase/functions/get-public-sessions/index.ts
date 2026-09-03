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
    const courseId = url.searchParams.get("course_id");
    const cohortId = url.searchParams.get("cohort_id");

    if (!courseId && !cohortId) {
      return new Response(JSON.stringify({ error: "course_id or cohort_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Verify the course/cohort is published
    if (courseId) {
      const { data: course, error } = await supabaseAdmin
        .from("courses")
        .select("id, is_published")
        .eq("id", courseId)
        .single();

      if (error || !course || !course.is_published) {
        return new Response(JSON.stringify({ error: "Course not found or not published" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (cohortId) {
      const { data: cohort, error } = await supabaseAdmin
        .from("cohorts")
        .select("id, is_published")
        .eq("id", cohortId)
        .single();

      if (error || !cohort || !cohort.is_published) {
        return new Response(JSON.stringify({ error: "Cohort not found or not published" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch sessions - only safe fields (text_content used only to derive has_text_content)
    let query = supabaseAdmin
      .from("sessions")
      .select("id, title, description, session_date, session_order, text_content")
      .order("session_order", { ascending: true });

    if (courseId) {
      query = query.eq("course_id", courseId);
    } else if (cohortId) {
      query = query.eq("cohort_id", cohortId);
    }

    const { data: sessions, error: sessionsError } = await query;

    if (sessionsError) {
      return new Response(JSON.stringify({ error: "Failed to fetch sessions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeSessions = (sessions || []).map(({ text_content, ...session }) => ({
      ...session,
      has_text_content: !!text_content?.trim(),
    }));

    return new Response(JSON.stringify({ sessions: safeSessions }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
