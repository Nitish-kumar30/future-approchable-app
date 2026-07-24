import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAuthUser, isAdminUser } from "./auth.ts";

export function getServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export async function requireAuth(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return { error: "Unauthorized", status: 401 as const };
  return { user };
}

export async function requireAdmin(req: Request) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth;
  const admin = await isAdminUser(getServiceClient(), auth.user.userId);
  if (!admin) return { error: "Forbidden", status: 403 as const };
  return auth;
}
