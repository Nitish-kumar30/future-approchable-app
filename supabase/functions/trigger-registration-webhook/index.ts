import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createRazorpayOrder, getRazorpayKeyId } from "../_shared/razorpay.ts";

// Commitment fee (smallest currency unit) — keep in sync with COHORT_CONFIG in src/lib/constants.ts
const COMMITMENT_FEE_INR_PAISE = 499900;
const COMMITMENT_FEE_USD_CENTS = 12900;

// CORS origin whitelist
const ALLOWED_ORIGINS = [
  "https://approachable.lovable.app",
  "https://id-preview--f23e6c6f-1b0f-4f1f-b278-b82852cb6004.lovable.app",
  "https://learn.approachable.dev",
];

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Allow Lovable preview domains
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

// In-memory rate limiting: IP -> { count, windowStart }
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

// Input validation helpers
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?\d{7,15}$/;

// Waitlist cohorts don't collect a commitment fee
function isWaitlistCohort(cohort: unknown): boolean {
  return typeof cohort === "string" && /waitlist/i.test(cohort);
}

function validateString(val: unknown, maxLen: number, fieldName: string): string | null {
  if (typeof val !== "string") return `${fieldName} must be a string`;
  if (val.trim().length === 0) return `${fieldName} is required`;
  if (val.length > maxLen) return `${fieldName} must be ${maxLen} characters or less`;
  return null;
}

function validateInput(body: Record<string, unknown>): string | null {
  const checks: [unknown, number, string][] = [
    [body.name, 100, "name"],
    [body.email, 255, "email"],
    [body.whatsapp_number, 20, "whatsapp_number"],
    [body.country, 100, "country"],
    [body.cohort, 100, "cohort"],
    [body.company, 100, "company"],
    [body.role, 100, "role"],
    [body.reason, 1000, "reason"],
  ];

  for (const [val, max, name] of checks) {
    const err = validateString(val, max, name);
    if (err) return err;
  }

  if (!EMAIL_REGEX.test(body.email as string)) return "Invalid email format";
  if (!PHONE_REGEX.test((body.whatsapp_number as string).trim())) {
    return "Enter a valid WhatsApp number with country code, digits only";
  }

  // State required if India
  if (body.country === "India") {
    const stateErr = validateString(body.state, 100, "state");
    if (stateErr) return stateErr;
  }

  // Optional fields
  if (body.additional_info != null && body.additional_info !== "") {
    const err = validateString(body.additional_info, 1000, "additional_info");
    if (err) return err;
  }
  if (body.other_interest != null && body.other_interest !== "") {
    const err = validateString(body.other_interest, 200, "other_interest");
    if (err) return err;
  }

  // Interests array
  if (body.interests != null) {
    if (!Array.isArray(body.interests)) return "interests must be an array";
    if (body.interests.length > 10) return "interests can have at most 10 items";
    for (const item of body.interests) {
      if (typeof item !== "string" || item.length > 100) return "Each interest must be a string of 100 chars or less";
    }
  }

  return null;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Block non-whitelisted origins
  if (origin && !isAllowedOrigin(origin)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Rate limiting by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();

    // Validate input
    const validationError = validateInput(body);
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      name,
      email,
      whatsapp_number,
      country,
      state,
      cohort,
      interests,
      other_interest,
      capstone_office_hours,
      company,
      role,
      reason,
      additional_info,
      price_india,
      price_international,
    } = body;

    // Use service role to insert (bypasses RLS)
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Commitment fee — server-side source of truth, never trusted from the client
    const waitlist = isWaitlistCohort(cohort);
    const isIndia = country === "India";
    const currency = isIndia ? "INR" : "USD";
    const amount = isIndia ? COMMITMENT_FEE_INR_PAISE : COMMITMENT_FEE_USD_CENTS;

    const { data: inserted, error: dbError } = await supabase
      .from("cohort_registrations")
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        whatsapp_number: whatsapp_number.trim(),
        country: country.trim(),
        state: state || null,
        cohort,
        interests: interests || [],
        other_interest: other_interest || null,
        capstone_office_hours: capstone_office_hours ?? true,
        company: company.trim(),
        role: role.trim(),
        reason: reason.trim(),
        additional_info: additional_info || null,
        payment_status: waitlist ? "waitlist" : "pending",
        amount: waitlist ? null : amount,
        currency: waitlist ? null : currency,
      })
      .select("id")
      .single();

    if (dbError || !inserted) {
      console.error("DB insert error:", dbError);
      return new Response(JSON.stringify({ error: "Failed to save registration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Trigger n8n webhook (fire-and-forget, don't block response)
    const webhookUrl = "https://bigintsolutions-dev.app.n8n.cloud/webhook-test/a08ddc13-2299-43c7-bfe6-df8b6053ad07";
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Name: name,
        Email: email,
        Cohort: cohort,
        Country: country,
        State: state,
        CapstoneOfficeHours: capstone_office_hours ?? true,
        priceInd: price_india,
        priceIntl: price_international,
      }),
    })
      .then((r) => r.text())
      .catch((err) => console.error("Webhook trigger failed:", err));

    // Waitlist cohorts: no payment collected
    if (waitlist) {
      return new Response(JSON.stringify({ success: true, skip_payment: true, registration_id: inserted.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the Razorpay order for the commitment fee

    let order;
    try {
      order = await createRazorpayOrder({
        amount,
        currency,
        receipt: `reg_${inserted.id.slice(0, 30)}`,
        notes: { registration_id: inserted.id, email: String(email), cohort: String(cohort) },
      });
    } catch (orderErr) {
      console.error("Razorpay order error:", orderErr);
      return new Response(
        JSON.stringify({ error: "Registration saved but payment could not be started", registration_id: inserted.id }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await supabase.from("cohort_registrations").update({ razorpay_order_id: order.id }).eq("id", inserted.id);

    return new Response(
      JSON.stringify({
        success: true,
        registration_id: inserted.id,
        razorpay_order_id: order.id,
        key_id: getRazorpayKeyId(),
        amount: order.amount,
        currency: order.currency,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
