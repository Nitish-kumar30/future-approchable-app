import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { getServiceClient, requireAdmin } from "../_shared/supabase-clients.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const auth = await requireAdmin(req);
  if ("error" in auth) return jsonResponse({ error: auth.error }, auth.status);

  const { request_id, action, admin_note } = await req.json();
  if (!request_id || !["approve", "reject"].includes(action)) {
    return jsonResponse({ error: "request_id and action (approve|reject) are required" }, 400);
  }

  const supabase = getServiceClient();
  const newStatus = action === "approve" ? "approved" : "rejected";

  const { data, error } = await supabase
    .from("certificate_requests")
    .update({
      status: newStatus,
      admin_note: admin_note ?? null,
      reviewed_by: auth.user.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", request_id)
    .in("status", ["pending", "approved"])
    .select("id, status")
    .single();

  if (error || !data) {
    console.error(error);
    return jsonResponse({ error: "Failed to update certificate request" }, 500);
  }

  return jsonResponse({ success: true, request: data });
});
