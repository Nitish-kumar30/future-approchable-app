import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAuthUser } from "../_shared/auth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { verifyRazorpaySignature } from "../_shared/razorpay.ts";

// TEMP: paid courses still allow free Enroll Now — lock before prod.
// This function only marks payments as paid; enrollment is not created here yet.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await getAuthUser(req);
    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return jsonResponse(
        { error: "razorpay_order_id, razorpay_payment_id, and razorpay_signature are required" },
        400,
      );
    }

    if (
      !verifyRazorpaySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      )
    ) {
      return jsonResponse({ error: "Invalid payment signature" }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .select("id, user_id, course_id, status")
      .eq("razorpay_order_id", razorpay_order_id)
      .maybeSingle();

    if (paymentError || !payment) {
      return jsonResponse({ error: "Order not found" }, 404);
    }
    if (payment.user_id !== user.userId) {
      return jsonResponse({ error: "Order does not belong to user" }, 403);
    }
    if (payment.status === "paid") {
      return jsonResponse({ success: true, course_id: payment.course_id });
    }

    const { error: updateError } = await supabaseAdmin
      .from("payments")
      .update({
        status: "paid",
        razorpay_payment_id,
      })
      .eq("id", payment.id);

    if (updateError) {
      console.error("Payment update error:", updateError);
      return jsonResponse({ error: "Failed to confirm payment" }, 500);
    }

    return jsonResponse({
      success: true,
      course_id: payment.course_id,
    });
  } catch (err) {
    console.error("verify-razorpay-payment error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
