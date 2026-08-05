import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse optional cohort filter from query params
    const url = new URL(req.url);
    const cohortFilter = url.searchParams.get("cohort");

    let query = supabaseAdmin
      .from("cohort_registrations")
      .select("id, name, email, whatsapp_number, country, state, cohort, company, role, interests, other_interest, reason, additional_info, capstone_office_hours, status, payment_status, amount, currency, created_at")
      .order("created_at", { ascending: false });

    if (cohortFilter && cohortFilter !== "all") {
      query = query.ilike("cohort", `%${cohortFilter}%`);
    }

    const { data: registrations, error: regError } = await query;

    if (regError) {
      return new Response(JSON.stringify({ error: regError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get distinct cohort values for filter dropdown
    const { data: allRegs } = await supabaseAdmin
      .from("cohort_registrations")
      .select("cohort");

    const cohorts = [...new Set((allRegs || []).map((r: any) => r.cohort))].sort();

    return new Response(
      JSON.stringify({ registrations: registrations || [], cohorts }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
