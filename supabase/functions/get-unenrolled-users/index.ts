import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Verify admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all registrations from cohort_registrations
    const { data: registrations, error: regError } = await supabaseAdmin
      .from("cohort_registrations")
      .select("id, name, email, whatsapp_number, cohort, status, capstone_office_hours, created_at")
      .order("created_at", { ascending: false });

    if (regError) {
      console.error("Error fetching registrations:", regError.message);
      return new Response(
        JSON.stringify({ error: "Failed to fetch registrations" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!registrations || registrations.length === 0) {
      return new Response(
        JSON.stringify({ users: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all enrolled user emails by looking up auth.users for enrolled user_ids
    const { data: enrolledRows, error: enrolledError } = await supabaseAdmin
      .from("enrollments")
      .select("user_id")
      .not("cohort_id", "is", null);

    if (enrolledError) {
      console.error("Error fetching enrollments:", enrolledError.message);
      return new Response(
        JSON.stringify({ error: "Failed to fetch enrollments" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get emails of enrolled users
    const enrolledEmails = new Set<string>();
    if (enrolledRows && enrolledRows.length > 0) {
      const enrolledUserIds = [...new Set(enrolledRows.map((e) => e.user_id))];
      // Batch lookup emails from auth
      for (const uid of enrolledUserIds) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(uid);
        if (userData?.user?.email) {
          enrolledEmails.add(userData.user.email.toLowerCase());
        }
      }
    }

    // Filter registrations to only those NOT enrolled
    const unenrolled = registrations.filter(
      (r) => !enrolledEmails.has(r.email.toLowerCase())
    );

    const users = unenrolled.map((r: any) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      whatsapp_number: r.whatsapp_number,
      cohort: r.cohort,
      status: r.status,
      capstone_office_hours: r.capstone_office_hours,
      created_at: r.created_at,
    }));

    return new Response(
      JSON.stringify({ users }),
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
