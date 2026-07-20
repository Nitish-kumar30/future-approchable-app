import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAuthUser } from "../_shared/auth.ts";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { resolveCurrencyFromRequest } from "../_shared/geoip.ts";
import { createRazorpayOrder, getRazorpayKeyId } from "../_shared/razorpay.ts";

type CourseRow = {
  id: string;
  name: string;
  price_inr_paise: number | null;
  price_usd_cents: number | null;
};

function getAmountForCurrency(course: CourseRow, currency: string): number {
  if (currency === "INR") {
    const amount = course.price_inr_paise ?? 0;
    if (amount <= 0) throw new Error("Course not available in INR");
    return amount;
  }
  if (currency === "USD") {
    const amount = course.price_usd_cents ?? 0;
    if (amount <= 0) throw new Error("Course not available in USD");
    return amount;
  }
  throw new Error("currency must be INR or USD");
}

function isPaidCourse(course: CourseRow): boolean {
  return (course.price_inr_paise ?? 0) > 0 || (course.price_usd_cents ?? 0) > 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return optionsResponse();
  }

  try {
    const user = await getAuthUser(req);
    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const course_id = body?.course_id;
    if (!course_id || typeof course_id !== "string") {
      return jsonResponse({ error: "course_id is required" }, 400);
    }

    const { currency } = await resolveCurrencyFromRequest(req);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: course, error: courseError } = await supabaseAdmin
      .from("courses")
      .select("id, name, price_inr_paise, price_usd_cents")
      .eq("id", course_id)
      .maybeSingle();

    if (courseError || !course) {
      return jsonResponse({ error: "Course not found" }, 404);
    }
    if (!isPaidCourse(course)) {
      return jsonResponse({ error: "Course is not a paid course" }, 400);
    }

    const { data: existingPayment } = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("user_id", user.userId)
      .eq("course_id", course_id)
      .eq("status", "paid")
      .maybeSingle();

    if (existingPayment) {
      return jsonResponse({ error: "Already purchased" }, 400);
    }

    const amount = getAmountForCurrency(course, currency);
    const receipt = `c_${course.id.slice(0, 8)}_${Date.now()}`.slice(0, 40);

    const razorpayOrder = await createRazorpayOrder({
      amount,
      currency,
      receipt,
      notes: {
        course_id: course.id,
        user_id: user.userId,
      },
    });

    const { error: insertError } = await supabaseAdmin.from("payments").insert({
      user_id: user.userId,
      course_id: course.id,
      razorpay_order_id: razorpayOrder.id,
      amount,
      currency,
      status: "created",
    });

    if (insertError) {
      console.error("Payment insert error:", insertError);
      return jsonResponse({ error: "Failed to save order" }, 500);
    }

    return jsonResponse({
      success: true,
      razorpay_order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key_id: getRazorpayKeyId(),
      course_name: course.name,
    });
  } catch (err) {
    console.error("create-razorpay-order error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonResponse({ error: message }, 500);
  }
});
