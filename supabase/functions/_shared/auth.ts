import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type AuthUser = {
  userId: string;
  email?: string;
};

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
