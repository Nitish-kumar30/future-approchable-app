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

    // Get all user IDs that have a cohort enrollment
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

    const enrolledUserIds = new Set((enrolledRows || []).map((e) => e.user_id));

    // List all users from auth
    const allUsers: Array<{ id: string; email: string; created_at: string }> = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });
      if (listError) {
        console.error("Error listing users:", listError.message);
        break;
      }
      if (!listData?.users || listData.users.length === 0) break;
      for (const u of listData.users) {
        allUsers.push({ id: u.id, email: u.email || "", created_at: u.created_at });
      }
      if (listData.users.length < perPage) break;
      page++;
    }

    // Filter to unenrolled
    const unenrolledUserIds = allUsers.filter((u) => !enrolledUserIds.has(u.id));

    if (unenrolledUserIds.length === 0) {
      return new Response(
        JSON.stringify({ users: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get profiles for names
    const ids = unenrolledUserIds.map((u) => u.id);
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", ids);

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));

    const users = unenrolledUserIds.map((u) => ({
      user_id: u.id,
      email: u.email,
      full_name: profileMap.get(u.id) || null,
      created_at: u.created_at,
    }));

    // Sort by signup date descending
    users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
