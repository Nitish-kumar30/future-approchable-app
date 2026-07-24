import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { issueCertificateForRequest } from "../_shared/issue-certificate-core.ts";
import type { CertificateTier } from "../_shared/certificates.ts";
import { getServiceClient, requireAdmin } from "../_shared/supabase-clients.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const auth = await requireAdmin(req);
    if ("error" in auth) return jsonResponse({ error: auth.error }, auth.status);

    const {
      request_id,
      recipient_name,
      completion_date,
      instructor_name,
      instructor_title,
    } = await req.json();

    if (!request_id) {
      return jsonResponse({ error: "request_id is required" }, 400);
    }

    const supabase = getServiceClient();

    const { data: request, error: reqError } = await supabase
      .from("certificate_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    if (reqError || !request) {
      return jsonResponse({ error: "Certificate request not found" }, 404);
    }

    if (request.status === "issued") {
      return jsonResponse({ error: "Certificate already issued for this request" }, 409);
    }

    if (request.status === "rejected") {
      return jsonResponse({ error: "Cannot issue a rejected request" }, 400);
    }

    const result = await issueCertificateForRequest(
      supabase,
      {
        id: request.id,
        user_id: request.user_id,
        tier: request.tier as CertificateTier,
        cohort_id: request.cohort_id,
        course_id: request.course_id,
      },
      {
        issuedBy: auth.user.userId,
        recipientName: recipient_name,
        completionDate: completion_date,
        instructorName: instructor_name,
        instructorTitle: instructor_title,
      },
    );

    if (result.error) {
      return jsonResponse({ error: result.error.message }, result.error.status);
    }

    return jsonResponse({ success: true, certificate: result.certificate });
  } catch (err) {
    console.error("issue-certificate error:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Internal server error" },
      500,
    );
  }
});
