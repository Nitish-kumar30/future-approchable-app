import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { isAdminUser } from "../_shared/auth.ts";
import { regenerateCertificate } from "../_shared/issue-certificate-core.ts";
import { getServiceClient, requireAuth } from "../_shared/supabase-clients.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const auth = await requireAuth(req);
  if ("error" in auth) return jsonResponse({ error: auth.error }, auth.status);

  const { certificate_id } = await req.json();
  if (!certificate_id || typeof certificate_id !== "string") {
    return jsonResponse({ error: "certificate_id is required" }, 400);
  }

  const supabase = getServiceClient();

  const { data: cert, error: certError } = await supabase
    .from("certificates")
    .select("user_id")
    .eq("certificate_id", certificate_id)
    .maybeSingle();

  if (certError || !cert) {
    return jsonResponse({ error: "Certificate not found" }, 404);
  }

  if (cert.user_id !== auth.user.userId) {
    const admin = await isAdminUser(supabase, auth.user.userId);
    if (!admin) return jsonResponse({ error: "Forbidden" }, 403);
  }

  const result = await regenerateCertificate(supabase, certificate_id);

  if (result.error) {
    return jsonResponse({ error: result.error.message }, result.error.status);
  }

  return jsonResponse({ success: true, certificate: result.certificate });
});
