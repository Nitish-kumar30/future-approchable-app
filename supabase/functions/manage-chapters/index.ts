import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Admin-only chapter CRUD.
 * POST body: { action: "list"|"create"|"update"|"delete"|"reorder", ...payload }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: userData } = await admin.auth.getUser(auth.slice(7));
    const userId = userData.user?.id;
    if (!userId) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json();
    const action = String(body.action ?? "");

    if (action === "list") {
      const session_id = String(body.session_id ?? "");
      if (!session_id) return json({ error: "session_id required" }, 400);
      const { data } = await admin
        .from("chapters")
        .select("*")
        .eq("session_id", session_id)
        .order("chapter_order", { ascending: true });
      return json({ chapters: data ?? [] });
    }

    if (action === "create") {
      const c = body.chapter ?? {};
      const { data, error } = await admin
        .from("chapters")
        .insert({
          session_id: c.session_id,
          title: c.title,
          description: c.description ?? null,
          hls_url: c.hls_url ?? null,
          thumbnail_url: c.thumbnail_url ?? null,
          duration_seconds: c.duration_seconds ?? null,
          chapter_order: c.chapter_order ?? 0,
          is_preview: !!c.is_preview,
          is_content_unlocked: c.is_content_unlocked ?? true,
        })
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      return json({ chapter: data });
    }

    if (action === "update") {
      const id = String(body.id ?? "");
      if (!id) return json({ error: "id required" }, 400);
      const patch = body.patch ?? {};
      const { data, error } = await admin
        .from("chapters")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      return json({ chapter: data });
    }

    if (action === "delete") {
      const id = String(body.id ?? "");
      if (!id) return json({ error: "id required" }, 400);
      const { error } = await admin.from("chapters").delete().eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error(err);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
