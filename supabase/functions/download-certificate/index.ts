import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { isAdminUser } from "../_shared/auth.ts";
import { getServiceClient, requireAuth } from "../_shared/supabase-clients.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "GET") return jsonResponse({ error: "Method not allowed" }, 405);

  const auth = await requireAuth(req);
  if ("error" in auth) return jsonResponse({ error: auth.error }, auth.status);

  const url = new URL(req.url);
  const certificateId = url.searchParams.get("certificate_id");

  if (!certificateId) {
    return jsonResponse({ error: "certificate_id is required" }, 400);
  }

  const supabase = getServiceClient();
  const { data: cert, error } = await supabase
    .from("certificates")
    .select("id, certificate_id, user_id, pdf_storage_path")
    .eq("certificate_id", certificateId)
    .maybeSingle();

  if (error || !cert) {
    return jsonResponse({ error: "Certificate not found" }, 404);
  }

  if (cert.user_id !== auth.user.userId) {
    const admin = await isAdminUser(supabase, auth.user.userId);
    if (!admin) return jsonResponse({ error: "Forbidden" }, 403);
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("certificates")
    .createSignedUrl(cert.pdf_storage_path, 3600);

  if (signError || !signed?.signedUrl) {
    console.error(signError);
    return jsonResponse({ error: "Failed to generate download URL" }, 500);
  }

  return jsonResponse({ download_url: signed.signedUrl, expires_in: 3600 });
});
