import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BLOB_API_BASE = "https://blob.vercel-storage.com";
const BLOB_API_VERSION = "8";

const CONTACT_FORM_TYPE = "contact-inquiry";
const CORPORATE_FORM_TYPE = "corporate-training-inquiry";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type DeletableFormType = typeof CONTACT_FORM_TYPE | typeof CORPORATE_FORM_TYPE;

type BlobListItem = {
  pathname: string;
  url?: string;
  downloadUrl: string;
};

function blobHeaders(token: string): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "x-api-version": BLOB_API_VERSION,
    "Content-Type": "application/json",
  };
  const storeId = Deno.env.get("BLOB_STORE_ID");
  if (storeId) headers["x-store-id"] = storeId;
  return headers;
}

function isDeletableFormType(formType: string): formType is DeletableFormType {
  return formType === CONTACT_FORM_TYPE || formType === CORPORATE_FORM_TYPE;
}

function submissionDeleteCandidates(id: string, formType: DeletableFormType): string[] {
  const primary =
    formType === CONTACT_FORM_TYPE
      ? `submissions/contact/${id}.json`
      : `submissions/corporate/${id}.json`;
  const legacy = `submissions/${id}.json`;
  return primary === legacy ? [primary] : [primary, legacy];
}

function searchPrefixesForFormType(formType: DeletableFormType): string[] {
  if (formType === CONTACT_FORM_TYPE) {
    return ["submissions/contact/", "submissions/"];
  }
  return ["submissions/corporate/", "submissions/"];
}

async function listBlobsWithPrefix(token: string, prefix: string): Promise<BlobListItem[]> {
  const items: BlobListItem[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL(BLOB_API_BASE);
    url.searchParams.set("prefix", prefix);
    url.searchParams.set("limit", "1000");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url.toString(), { headers: blobHeaders(token) });
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

async function findSubmissionBlob(
  token: string,
  id: string,
  formType: DeletableFormType,
): Promise<BlobListItem | null> {
  const candidates = new Set(submissionDeleteCandidates(id, formType));

  for (const prefix of searchPrefixesForFormType(formType)) {
    const blobs = await listBlobsWithPrefix(token, prefix);
    const match = blobs.find((blob) => candidates.has(blob.pathname));
    if (match) return match;
  }

  return null;
}

async function deleteBlob(token: string, blob: BlobListItem): Promise<void> {
  const deleteUrls = [blob.url, blob.downloadUrl].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );

  let lastDetail = "";

  for (const blobUrl of deleteUrls) {
    const res = await fetch(`${BLOB_API_BASE}/delete`, {
      method: "POST",
      headers: blobHeaders(token),
      body: JSON.stringify({ urls: [blobUrl] }),
    });

    if (res.ok) return;

    lastDetail = await res.text().catch(() => "");
  }

  throw new Error(`Failed to delete blob${lastDetail ? `: ${lastDetail.slice(0, 200)}` : ""}`);
}

async function deleteSubmissionBlob(
  token: string,
  id: string,
  formType: DeletableFormType,
): Promise<string> {
  const blob = await findSubmissionBlob(token, id, formType);
  if (!blob) {
    throw new Error("Submission not found");
  }

  await deleteBlob(token, blob);
  return blob.pathname;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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

    const body = await req.json().catch(() => null);
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    const formType = typeof body?.formType === "string" ? body.formType.trim() : "";

    if (!UUID_RE.test(id)) {
      return new Response(JSON.stringify({ error: "Invalid submission id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isDeletableFormType(formType)) {
      return new Response(JSON.stringify({ error: "Invalid form type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawToken = Deno.env.get("BLOB_READ_WRITE_TOKEN");
    if (!rawToken) {
      return new Response(
        JSON.stringify({
          error: "Could not delete submission. Check BLOB_READ_WRITE_TOKEN in secrets.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = rawToken.trim().replace(/^["']+|["']+$/g, "");

    try {
      const deletedPath = await deleteSubmissionBlob(token, id, formType);
      return new Response(JSON.stringify({ success: true, deletedPath }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Submission not found";
      if (message === "Submission not found") {
        return new Response(JSON.stringify({ error: message }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw err;
    }
  } catch (err) {
    console.error("delete-submission error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
