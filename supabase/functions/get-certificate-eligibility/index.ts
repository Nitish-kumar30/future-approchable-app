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

  if (!cohortId && !courseId) {
    return jsonResponse({ error: "cohort_id or course_id is required" }, 400);
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc("get_certificate_eligibility", {
    p_user_id: auth.user.userId,
    p_cohort_id: cohortId || null,
    p_course_id: courseId || null,
  });

  if (error) {
    console.error("get_certificate_eligibility error:", error);
    return jsonResponse({ error: "Failed to fetch eligibility" }, 500);
  }

  return jsonResponse(data);
});
