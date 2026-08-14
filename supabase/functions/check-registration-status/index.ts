import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cohort_id } = await req.json();
    if (!cohort_id) {
      return new Response(
        JSON.stringify({ error: "cohort_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    // Registrations are inserted with email.trim().toLowerCase(), so the JWT
    // email must be normalized the same way before comparing.
    const userEmail = String(claimsData.claims.email ?? "").trim().toLowerCase();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if user is admin — admins always bypass
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (adminRole) {
      return new Response(
        JSON.stringify({ approved: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get cohort name
    const { data: cohort } = await supabaseAdmin
      .from("cohorts")
      .select("name")
      .eq("id", cohort_id)
      .single();

    if (!cohort) {
      return new Response(
        JSON.stringify({ error: "Cohort not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Whitespace-insensitive, case-insensitive matching. We cannot do this
    // reliably in SQL because ilike does not collapse internal whitespace, and
    // real cohort names in the DB have been observed with stray/double spaces
    // (e.g. " cohort  6 "). Fetch this user's approved registrations and
    // compare normalized strings in code.
    const normalize = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
    const nameNorm = normalize(cohort.name);
    const nameTokenMatch = nameNorm.match(/cohort\s+\d+/);
    const nameToken = nameTokenMatch ? nameTokenMatch[0] : nameNorm;

    const { data: registrations } = await supabaseAdmin
      .from("cohort_registrations")
      .select("id, cohort")
      .eq("email", userEmail)
      .eq("status", "approved");

    const approved = (registrations || []).some((r) => {
      const regNorm = normalize(String(r.cohort || ""));
      const regTokenMatch = regNorm.match(/cohort\s+\d+/);
      const regToken = regTokenMatch ? regTokenMatch[0] : null;
      // Match if the Cohort-N tokens agree, or if either normalized string
      // contains the other (handles cohorts named without the "Cohort N"
      // pattern by falling back to the full name).
      if (regToken && regToken === nameToken) return true;
      return regNorm.includes(nameToken) || nameNorm.includes(regNorm);
    });

    return new Response(
      JSON.stringify({ approved }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
