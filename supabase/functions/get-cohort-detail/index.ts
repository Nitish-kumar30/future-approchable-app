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
    const cohortId = url.searchParams.get("cohort_id");

    if (!cohortId) {
      return new Response(
        JSON.stringify({ error: "cohort_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch the cohort
    const { data: cohort, error } = await supabaseAdmin
      .from("cohorts")
      .select("*")
      .eq("id", cohortId)
      .single();

    if (error || !cohort) {
      return new Response(
        JSON.stringify({ error: "Cohort not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only return published cohorts to non-admins
    if (!cohort.is_published) {
      // Check if user is admin
      const authHeader = req.headers.get("Authorization");
      let isAdmin = false;

      if (authHeader?.startsWith("Bearer ")) {
        const supabaseAuth = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const token = authHeader.replace("Bearer ", "");
        const { data: claimsData } = await supabaseAuth.auth.getClaims(token);
        if (claimsData?.claims?.sub) {
          const { data: roleData } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", claimsData.claims.sub)
            .eq("role", "admin")
            .maybeSingle();
          isAdmin = !!roleData;
        }
      }

      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: "Cohort not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if the requesting user is enrolled
    let isEnrolled = false;
    const authHeader = req.headers.get("Authorization");

    if (authHeader?.startsWith("Bearer ")) {
      const supabaseAuth = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData } = await supabaseAuth.auth.getClaims(token);

      if (claimsData?.claims?.sub) {
        const userId = claimsData.claims.sub;
        const { data: enrollment } = await supabaseAdmin
          .from("enrollments")
          .select("id")
          .eq("user_id", userId)
          .eq("cohort_id", cohortId)
          .maybeSingle();

        isEnrolled = !!enrollment;

        // Also check admin
        if (!isEnrolled) {
          const { data: roleData } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", userId)
            .eq("role", "admin")
            .maybeSingle();
          isEnrolled = !!roleData; // Admins get full access too
        }
      }
    }

    // Strip sensitive fields for non-enrolled users
    if (!isEnrolled) {
      const safeCohort = { ...cohort };
      delete safeCohort.meeting_link;
      delete safeCohort.group_link;
      return new Response(
        JSON.stringify({ cohort: safeCohort }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ cohort }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
