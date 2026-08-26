import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BLOB_API_BASE = "https://blob.vercel-storage.com";
// Matches @vercel/blob@0.27.1 — the API rejects requests without this header.
const BLOB_API_VERSION = "8";

function blobHeaders(token: string): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "x-api-version": BLOB_API_VERSION,
  };
  const storeId = Deno.env.get("BLOB_STORE_ID");
  if (storeId) headers["x-store-id"] = storeId;
  return headers;
}

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

type BlobListItem = {
  pathname: string;
  downloadUrl: string;
  uploadedAt: string;
};

async function listSubmissions(token: string): Promise<BlobListItem[]> {
  const items: BlobListItem[] = [];
  let cursor: string | undefined;

  // Paginate through all blobs under submissions/
  do {
    const url = new URL(BLOB_API_BASE);
    url.searchParams.set("prefix", "submissions/");
    url.searchParams.set("limit", "1000");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url.toString(), {
      headers: blobHeaders(token),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Blob list failed: ${res.status} ${detail.slice(0, 300)}`);
    }
    const data = await res.json();
    items.push(...(data.blobs ?? []));
    cursor = data.hasMore ? data.cursor : undefined;
  } while (cursor);

  return items;
}

async function readSubmission(
  blob: BlobListItem,
  token: string,
): Promise<CorporateInquiryRecord | null> {
  try {
    const res = await fetch(blob.downloadUrl, {
      headers: blobHeaders(token),
    });
    if (!res.ok) return null;
    return (await res.json()) as CorporateInquiryRecord;
  } catch {
    return {
      id: blob.pathname,
      formType: "corporate-training-inquiry",
      submittedAt: blob.uploadedAt,
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

    const rawToken = Deno.env.get("BLOB_READ_WRITE_TOKEN");
    if (!rawToken) {
      return new Response(
        JSON.stringify({
          error: "Could not load inquiries. Check BLOB_READ_WRITE_TOKEN in secrets.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    // Tolerate quotes/whitespace accidentally pasted with the token.
    const token = rawToken.trim().replace(/^["']+|["']+$/g, "");
    // Structural diagnostics only — never log/return the token itself.
    const tokenInfo = {
      hasVercelPrefix: token.startsWith("vercel_blob_rw_"),
      segments: token.split("_").length,
      hasWhitespace: /\s/.test(rawToken),
      storeIdSet: !!Deno.env.get("BLOB_STORE_ID"),
    };

    let blobs: BlobListItem[];
    try {
      blobs = await listSubmissions(token);
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: err instanceof Error ? err.message : "Blob list failed",
          tokenInfo,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const inquiries = await Promise.all(blobs.map((blob) => readSubmission(blob, token)));

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
