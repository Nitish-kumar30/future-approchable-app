import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type AuthUser = {
  userId: string;
  email?: string;
};

export async function isAdminUser(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  return !error && !!data;
}

// Validates Bearer JWT and returns user id from claims
export async function getAuthUser(req: Request): Promise<AuthUser | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabaseAuth.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;

  return {
    userId: data.claims.sub as string,
    email: data.claims.email as string | undefined,
  };
}
