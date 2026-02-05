 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
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
 
     // Check if user has admin role
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
 
     // Parse query params - require either cohort_id or course_id
     const url = new URL(req.url);
     const cohortId = url.searchParams.get("cohort_id");
     const courseId = url.searchParams.get("course_id");
 
     if (!cohortId && !courseId) {
       console.log("Missing required filter parameter");
       return new Response(
         JSON.stringify({ error: "Bad Request - Either cohort_id or course_id is required" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     console.log("Fetching enrollments with filter:", { cohortId, courseId });
 
     // Fetch enrollments based on filter
     let query = supabaseAdmin.from("enrollments").select("*");
     
     if (cohortId) {
       query = query.eq("cohort_id", cohortId);
     } else if (courseId) {
       query = query.eq("course_id", courseId);
     }
 
     const { data: enrollments, error: enrollmentsError } = await query.order("enrolled_at", { ascending: false });
 
     if (enrollmentsError) {
       console.error("Error fetching enrollments:", enrollmentsError.message);
       return new Response(
         JSON.stringify({ error: "Failed to fetch enrollments" }),
         { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     console.log(`Found ${enrollments?.length || 0} enrollments`);
 
     if (!enrollments || enrollments.length === 0) {
       return new Response(
         JSON.stringify({ enrollments: [] }),
         { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Get unique user IDs
     const userIds = [...new Set(enrollments.map((e) => e.user_id))];
     console.log(`Fetching data for ${userIds.length} unique users`);
 
     // Fetch profiles for full_name
     const { data: profiles, error: profilesError } = await supabaseAdmin
       .from("profiles")
       .select("user_id, full_name")
       .in("user_id", userIds);
 
     if (profilesError) {
       console.error("Error fetching profiles:", profilesError.message);
     }
 
     const profileMap = new Map(
       (profiles || []).map((p) => [p.user_id, p.full_name])
     );
 
     // Fetch emails from auth.users using admin API
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
 
     console.log(`Retrieved ${emailMap.size} user emails`);
 
     // Combine data
     const enrichedEnrollments = enrollments.map((enrollment) => ({
       id: enrollment.id,
       user_id: enrollment.user_id,
       cohort_id: enrollment.cohort_id,
       course_id: enrollment.course_id,
       enrolled_at: enrollment.enrolled_at,
       user_email: emailMap.get(enrollment.user_id) || "Unknown",
       user_name: profileMap.get(enrollment.user_id) || null,
     }));
 
     console.log("Returning enriched enrollments");
 
     return new Response(
       JSON.stringify({ enrollments: enrichedEnrollments }),
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