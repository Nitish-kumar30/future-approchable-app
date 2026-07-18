import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.slice(7);
    const { data: userRes } = await admin.auth.getUser(token);
    const userId = userRes.user?.id;
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const quizId = typeof body?.quiz_id === "string" ? body.quiz_id : null;
    if (!quizId) return json({ error: "quiz_id is required" }, 400);

    const { data: original, error: fetchErr } = await admin
      .from("quizzes")
      .select("title, questions")
      .eq("id", quizId)
      .maybeSingle();
    if (fetchErr || !original) return json({ error: "Quiz not found" }, 404);

    const { data: inserted, error: insertErr } = await admin
      .from("quizzes")
      .insert({
        title: `${original.title} (Copy)`,
        questions: original.questions,
      })
      .select("id, title")
      .single();
    if (insertErr) return json({ error: insertErr.message }, 500);

    return json({ quiz: inserted }, 200);
  } catch (err) {
    console.error(err);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
