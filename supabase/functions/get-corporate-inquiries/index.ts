import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { get, list } from "npm:@vercel/blob@0.27.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CorporateInquiryRecord = {
  id: string;
  formType: string;
  submittedAt: string;
  company: string;
  contactName: string;
  email: string;
  phone: string;
  teamSize: string;
  tiers: string[];
  industry: string;
  timing: string;
  requirements: string;
  meta: {
    source: string;
    userAgent?: string;
  };
};

async function readSubmission(
  pathname: string,
  token: string,
  uploadedAt: Date,
): Promise<CorporateInquiryRecord | null> {
  try {
    const result = await get(pathname, { access: "private", token });

    if (!result || result.statusCode !== 200 || !result.stream) {
      return null;
    }

    const text = await new Response(result.stream).text();
    return JSON.parse(text) as CorporateInquiryRecord;
  } catch {
    return {
      id: pathname,
      formType: "corporate-training-inquiry",
      submittedAt: uploadedAt.toISOString(),
      company: "",
      contactName: "",
      email: "",
      phone: "",
      teamSize: "",
      tiers: [],
      industry: "",
      timing: "",
      requirements: "",
      meta: { source: "unknown" },
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = Deno.env.get("BLOB_READ_WRITE_TOKEN");
    if (!token) {
      return new Response(
        JSON.stringify({
          error: "Could not load inquiries. Check BLOB_READ_WRITE_TOKEN in Supabase secrets.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { blobs } = await list({ prefix: "submissions/", token });

    const inquiries = await Promise.all(
      blobs.map((blob) => readSubmission(blob.pathname, token, blob.uploadedAt)),
    );

    const validInquiries = inquiries
      .filter((item): item is CorporateInquiryRecord => item !== null)
      .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt));

    return new Response(JSON.stringify({ inquiries: validInquiries }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("get-corporate-inquiries error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
