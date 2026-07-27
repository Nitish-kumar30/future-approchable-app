import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import type { CertificateTier } from "../_shared/certificates.ts";
import { issueCertificateForRequest } from "../_shared/issue-certificate-core.ts";
import { getServiceClient, requireAuth } from "../_shared/supabase-clients.ts";

const TIERS: CertificateTier[] = ["foundation", "practitioner", "expert"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const auth = await requireAuth(req);
  if ("error" in auth) return jsonResponse({ error: auth.error }, auth.status);

  const body = await req.json();
  const { cohort_id, course_id, tier, linkedin_post_url, learner_note } = body ?? {};

  if (!cohort_id && !course_id) {
    return jsonResponse({ error: "cohort_id or course_id is required" }, 400);
  }
  if (!tier || !TIERS.includes(tier)) {
    return jsonResponse({ error: "Valid tier is required" }, 400);
  }

  const supabase = getServiceClient();
  const userId = auth.user.userId;

  if (course_id) {
    const { data: isPaid, error: paidError } = await supabase.rpc("is_paid_course", {
      _course_id: course_id,
    });
    if (paidError) {
      console.error(paidError);
      return jsonResponse({ error: "Failed to verify course" }, 500);
    }
    if (!isPaid) {
      return jsonResponse({ error: "Certificates are not available for free courses" }, 403);
    }
    if (tier !== "foundation") {
      return jsonResponse({ error: "Only Foundation certificates are available for courses" }, 400);
    }
  }

  const { data: eligibility, error: eligError } = await supabase.rpc("get_certificate_eligibility", {
    p_user_id: userId,
    p_cohort_id: cohort_id ?? null,
    p_course_id: course_id ?? null,
  });

  if (eligError) {
    console.error(eligError);
    return jsonResponse({ error: "Failed to check eligibility" }, 500);
  }

  if (!eligibility?.enrolled) {
    return jsonResponse({ error: "You are not enrolled in this program" }, 403);
  }

  const existing = (eligibility.existing_certificates ?? []) as Array<{ tier: string }>;
  if (existing.some((c) => c.tier === tier)) {
    return jsonResponse({ error: "Certificate for this tier already issued" }, 409);
  }

  const pending = (eligibility.pending_requests ?? []) as Array<{ tier: string }>;
  if (pending.some((r) => r.tier === tier)) {
    return jsonResponse({ error: "A request for this tier is already pending" }, 409);
  }

  if (cohort_id) {
    if (!linkedin_post_url || typeof linkedin_post_url !== "string" || !linkedin_post_url.trim()) {
      return jsonResponse({ error: "LinkedIn post URL is required for certificate requests" }, 400);
    }
  }

  if (tier === "foundation") {
    if (!eligibility.foundation_requestable) {
      return jsonResponse({ error: "Complete 100% of the program before requesting a Foundation certificate" }, 400);
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from("certificate_requests")
    .insert({
      user_id: userId,
      cohort_id: cohort_id ?? null,
      course_id: course_id ?? null,
      tier,
      status: "pending",
      linkedin_post_url: cohort_id ? linkedin_post_url.trim() : null,
      learner_note: learner_note ?? null,
    })
    .select("id, tier, status, created_at")
    .single();

  if (insertError) {
    console.error(insertError);
    return jsonResponse({ error: "Failed to submit certificate request" }, 500);
  }

  // Foundation is self-serve: at 100% progress the learner has already met the
  // bar, so issue immediately instead of waiting on admin review.
  if (tier === "foundation") {
    const result = await issueCertificateForRequest(
      supabase,
      {
        id: inserted.id,
        user_id: userId,
        tier: "foundation",
        cohort_id: cohort_id ?? null,
        course_id: course_id ?? null,
      },
      { issuedBy: null },
    );

    if (result.error) {
      // Let the learner retry cleanly instead of getting stuck behind a
      // "pending" row that will never be issued.
      await supabase.from("certificate_requests").delete().eq("id", inserted.id);
      return jsonResponse({ error: result.error.message }, result.error.status);
    }

    return jsonResponse({ success: true, certificate: result.certificate });
  }

  return jsonResponse({ success: true, request: inserted });
});
