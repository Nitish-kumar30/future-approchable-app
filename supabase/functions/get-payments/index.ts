import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return optionsResponse();
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const url = new URL(req.url);
    const courseId = url.searchParams.get("course_id");
    const cohortLabel = url.searchParams.get("cohort");

    if (courseId && cohortLabel) {
      return jsonResponse({ error: "Provide either course_id or cohort, not both" }, 400);
    }

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (courseId && !UUID_RE.test(courseId)) {
      return jsonResponse({ error: "Invalid course_id" }, 400);
    }
    if (cohortLabel && cohortLabel.length > 300) {
      return jsonResponse({ error: "Invalid cohort" }, 400);
    }

    // Dropdown option lists (always returned, cheap)
    const [{ data: courseList }, { data: cohortRows }] = await Promise.all([
      supabaseAdmin.from("courses").select("id, name").order("name"),
      supabaseAdmin.from("cohort_registrations").select("cohort"),
    ]);

    const cohortOptions = [...new Set((cohortRows || []).map((r: { cohort: string }) => r.cohort))].sort();
    const courseOptions = (courseList || []).map((c: { id: string; name: string }) => ({
      id: c.id,
      name: c.name,
    }));

    // No selection -> return options only. Never load the full payments table.
    if (!courseId && !cohortLabel) {
      return jsonResponse({ payments: [], courses: courseOptions, cohorts: cohortOptions });
    }

    if (cohortLabel) {
      const { data: regs, error: regError } = await supabaseAdmin
        .from("cohort_registrations")
        .select(
          "id, name, email, cohort, amount, currency, payment_status, razorpay_order_id, razorpay_payment_id, created_at, updated_at",
        )
        .eq("cohort", cohortLabel)
        .not("razorpay_order_id", "is", null)
        .order("created_at", { ascending: false });

      if (regError) {
        return jsonResponse({ error: regError.message }, 500);
      }

      const payments = (regs || []).map((r) => ({
        id: r.id,
        type: "cohort" as const,
        user_id: null,
        user_email: r.email,
        user_name: r.name,
        course_id: null,
        course_name: r.cohort,
        course_slug: null,
        razorpay_order_id: r.razorpay_order_id,
        razorpay_payment_id: r.razorpay_payment_id,
        amount: r.amount ?? 0,
        currency: r.currency || "INR",
        status: r.payment_status || "pending",
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));

      return jsonResponse({ payments, courses: courseOptions, cohorts: cohortOptions });
    }

    const { data: rawPayments, error: paymentsError } = await supabaseAdmin
      .from("payments")
      .select(
        "id, user_id, course_id, razorpay_order_id, razorpay_payment_id, amount, currency, status, created_at, updated_at",
      )
      .eq("course_id", courseId!)
      .order("created_at", { ascending: false });

    if (paymentsError) {
      return jsonResponse({ error: paymentsError.message }, 500);
    }

    if (!rawPayments?.length) {
      return jsonResponse({ payments: [], courses: courseOptions, cohorts: cohortOptions });
    }

    const userIds = [...new Set(rawPayments.map((p) => p.user_id))];
    const courseName = courseOptions.find((c) => c.id === courseId)?.name || "Unknown";

    const { data: courseRow } = await supabaseAdmin
      .from("courses")
      .select("slug")
      .eq("id", courseId!)
      .maybeSingle();

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));

    const emailMap = new Map<string, string>();
    for (const uid of userIds) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(uid);
      if (userData?.user?.email) {
        emailMap.set(uid, userData.user.email);
      }
    }

    const enriched = rawPayments.map((payment) => ({
      ...payment,
      type: "course" as const,
      user_email: emailMap.get(payment.user_id) || "Unknown",
      user_name: profileMap.get(payment.user_id) || null,
      course_name: courseName,
      course_slug: courseRow?.slug || null,
    }));

    return jsonResponse({ payments: enriched, courses: courseOptions, cohorts: cohortOptions });
  } catch (err) {
    console.error("get-payments error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
