import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { getServiceClient, requireAuth } from "../_shared/supabase-clients.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "GET") return jsonResponse({ error: "Method not allowed" }, 405);

  const auth = await requireAuth(req);
  if ("error" in auth) return jsonResponse({ error: auth.error }, auth.status);

  const url = new URL(req.url);
  const cohortId = url.searchParams.get("cohort_id");
  const courseId = url.searchParams.get("course_id");

  const supabase = getServiceClient();
  let query = supabase
    .from("certificates")
    .select("id, certificate_id, tier, program_name, completion_date, verify_url, issued_at, cohort_id, course_id")
    .eq("user_id", auth.user.userId)
    .order("issued_at", { ascending: false });

  if (cohortId) query = query.eq("cohort_id", cohortId);
  if (courseId) query = query.eq("course_id", courseId);

  const { data, error } = await query;

  if (error) {
    console.error(error);
    return jsonResponse({ error: "Failed to fetch certificates" }, 500);
  }

  return jsonResponse({ certificates: data ?? [] });
});
