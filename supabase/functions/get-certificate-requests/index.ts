import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { getServiceClient, requireAdmin } from "../_shared/supabase-clients.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "GET") return jsonResponse({ error: "Method not allowed" }, 405);

  const auth = await requireAdmin(req);
  if ("error" in auth) return jsonResponse({ error: auth.error }, auth.status);

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const tier = url.searchParams.get("tier");
  const cohortId = url.searchParams.get("cohort_id");
  const courseId = url.searchParams.get("course_id");

  const supabase = getServiceClient();
  let query = supabase
    .from("certificate_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (tier) query = query.eq("tier", tier);
  if (cohortId) query = query.eq("cohort_id", cohortId);
  if (courseId) query = query.eq("course_id", courseId);

  const { data: requests, error } = await query;

  if (error) {
    console.error(error);
    return jsonResponse({ error: "Failed to fetch certificate requests" }, 500);
  }

  const rows = requests ?? [];
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const cohortIds = [...new Set(rows.map((r) => r.cohort_id).filter(Boolean))] as string[];
  const courseIds = [...new Set(rows.map((r) => r.course_id).filter(Boolean))] as string[];

  const [{ data: profiles }, { data: cohorts }, { data: courses }] = await Promise.all([
    supabase.from("profiles").select("user_id, full_name").in("user_id", userIds),
    cohortIds.length ? supabase.from("cohorts").select("id, name").in("id", cohortIds) : Promise.resolve({ data: [] }),
    courseIds.length ? supabase.from("courses").select("id, title").in("id", courseIds) : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p.full_name]));
  const cohortMap = new Map((cohorts ?? []).map((c) => [c.id, c.name]));
  const courseMap = new Map((courses ?? []).map((c) => [c.id, c.title]));

  const emailMap = new Map<string, string>();
  for (const uid of userIds) {
    const { data: userData } = await supabase.auth.admin.getUserById(uid);
    if (userData?.user?.email) emailMap.set(uid, userData.user.email);
  }

  const progressCache = new Map<string, number>();
  const enriched = await Promise.all(rows.map(async (row) => {
    const cacheKey = `${row.user_id}:${row.cohort_id ?? row.course_id}`;
    if (!progressCache.has(cacheKey)) {
      const { data: progress } = await supabase.rpc("compute_enrollment_progress_percent", {
        p_user_id: row.user_id,
        p_cohort_id: row.cohort_id,
        p_course_id: row.course_id,
      });
      progressCache.set(cacheKey, progress ?? 0);
    }
    return {
      ...row,
      progress_percent: progressCache.get(cacheKey) ?? 0,
      program_name: row.cohort_id ? cohortMap.get(row.cohort_id) : courseMap.get(row.course_id!),
      learner_name: profileMap.get(row.user_id) ?? null,
      learner_email: emailMap.get(row.user_id) ?? null,
    };
  }));

  return jsonResponse({ requests: enriched });
});
