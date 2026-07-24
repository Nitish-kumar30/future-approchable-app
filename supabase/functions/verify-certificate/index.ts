import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase-clients.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "GET") return jsonResponse({ error: "Method not allowed" }, 405);

  const url = new URL(req.url);
  const certificateId = url.searchParams.get("certificate_id");
  if (!certificateId) {
    return jsonResponse({ error: "certificate_id is required" }, 400);
  }

  const supabase = getServiceClient();
  const { data: cert, error } = await supabase
    .from("certificates")
    .select("certificate_id, recipient_name, tier, program_name, completion_date, issued_at, verify_url")
    .eq("certificate_id", certificateId)
    .maybeSingle();

  if (error) {
    console.error(error);
    return jsonResponse({ error: "Verification failed" }, 500);
  }

  if (!cert) {
    return jsonResponse({ valid: false, message: "Certificate not found" }, 404);
  }

  return jsonResponse({
    valid: true,
    certificate: {
      certificate_id: cert.certificate_id,
      recipient_name: cert.recipient_name,
      tier: cert.tier,
      program_name: cert.program_name,
      completion_date: cert.completion_date,
      issued_at: cert.issued_at,
      verify_url: cert.verify_url,
    },
  });
});
