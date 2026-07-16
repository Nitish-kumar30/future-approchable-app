import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    const body = await req.json();
    const course_id = String(body.course_id ?? "");
    const rating = Number(body.rating);
    const comment = body.comment ? String(body.comment).slice(0, 2000) : null;
    if (!course_id) return json({ error: "course_id required" }, 400);
    if (!(rating >= 0.5 && rating <= 5 && (rating * 2) % 1 === 0)) {
      return json({ error: "rating must be 0.5..5 in 0.5 steps" }, 400);
    }

    // Must be enrolled to rate
    const { data: enr } = await admin
      .from("enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", course_id)
      .maybeSingle();
    if (!enr) return json({ error: "Not enrolled" }, 403);

    const { error } = await admin
      .from("course_ratings")
      .upsert(
        { user_id: userId, course_id, rating, comment },
        { onConflict: "user_id,course_id" }
      );
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
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
