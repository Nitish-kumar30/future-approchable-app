import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from("payments")
      .select(
        "id, user_id, course_id, razorpay_order_id, razorpay_payment_id, amount, currency, status, created_at, updated_at",
      )
      .order("created_at", { ascending: false });

    if (paymentsError) {
      return jsonResponse({ error: paymentsError.message }, 500);
    }

    if (!payments?.length) {
      return jsonResponse({ payments: [] });
    }

    const userIds = [...new Set(payments.map((p) => p.user_id))];
    const courseIds = [...new Set(payments.map((p) => p.course_id))];

    const { data: courses } = await supabaseAdmin
      .from("courses")
      .select("id, name, slug")
      .in("id", courseIds);

    const courseMap = new Map((courses || []).map((c) => [c.id, c]));

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

    const enriched = payments.map((payment) => {
      const course = courseMap.get(payment.course_id);
      return {
        ...payment,
        user_email: emailMap.get(payment.user_id) || "Unknown",
        user_name: profileMap.get(payment.user_id) || null,
        course_name: course?.name || "Unknown",
        course_slug: course?.slug || null,
      };
    });

    return jsonResponse({ payments: enriched });
  } catch (err) {
    console.error("get-payments error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
