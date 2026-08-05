import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyRazorpaySignature } from "../_shared/razorpay.ts";

const ALLOWED_ORIGINS = [
  "https://approachable.lovable.app",
  "https://id-preview--f23e6c6f-1b0f-4f1f-b278-b82852cb6004.lovable.app",
  "https://learn.approachable.dev",
];

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.endsWith(".lovableproject.com") || origin.endsWith(".lovable.app")) return true;
  return false;
}

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (origin && !isAllowedOrigin(origin)) {
    return json({ error: "Forbidden" }, 403);
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    if (
      typeof razorpay_order_id !== "string" ||
      typeof razorpay_payment_id !== "string" ||
      typeof razorpay_signature !== "string"
    ) {
      return json(
        { error: "razorpay_order_id, razorpay_payment_id and razorpay_signature are required" },
        400,
      );
    }

    const valid = await verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    );
    if (!valid) {
      return json({ error: "Invalid payment signature" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: registration, error: findError } = await supabase
      .from("cohort_registrations")
      .select("id, payment_status")
      .eq("razorpay_order_id", razorpay_order_id)
      .maybeSingle();

    if (findError || !registration) {
      return json({ error: "Registration for this order was not found" }, 404);
    }

    if (registration.payment_status !== "paid") {
      const { error: updateError } = await supabase
        .from("cohort_registrations")
        .update({ payment_status: "paid", razorpay_payment_id })
        .eq("id", registration.id);

      if (updateError) {
        console.error("Registration payment update error:", updateError);
        return json({ error: "Failed to confirm payment" }, 500);
      }
    }

    return json({ success: true, registration_id: registration.id });
  } catch (err) {
    console.error("verify-registration-payment error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
