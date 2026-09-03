import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BLOB_API_BASE = "https://blob.vercel-storage.com";
const BLOB_API_VERSION = "8";
const SUBSCRIBERS_BLOB_PATH = "subscribers/emails.json";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type BlobListItem = {
  pathname: string;
  url?: string;
  downloadUrl: string;
};

type BlogSubscriber = {
  email: string;
  subscribedAt: string;
};

function blobHeaders(token: string, contentType = "application/json"): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "x-api-version": BLOB_API_VERSION,
    "Content-Type": contentType,
  };
  const storeId = Deno.env.get("BLOB_STORE_ID");
  if (storeId) headers["x-store-id"] = storeId;
  return headers;
}

function putBlobHeaders(token: string): HeadersInit {
  const headers = blobHeaders(token, "application/json") as Record<string, string>;
  headers["x-vercel-blob-access"] = "public";
  headers["x-content-type"] = "application/json";
  headers["x-add-random-suffix"] = "0";
  headers["x-allow-overwrite"] = "1";
  return headers;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseBlogSubscriber(raw: unknown): BlogSubscriber | null {
  if (!isRecord(raw)) return null;
  const email = asString(raw.email);
  const subscribedAt = asString(raw.subscribedAt);
  if (!email || !subscribedAt) return null;
  return { email, subscribedAt };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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

async function fetchSubscribers(token: string): Promise<{ blob: BlobListItem | null; subscribers: BlogSubscriber[] }> {
  const blobs = await listBlobsWithPrefix(token, "subscribers/");
  const blob = blobs.find((item) => item.pathname === SUBSCRIBERS_BLOB_PATH) ?? null;
  if (!blob) {
    return { blob: null, subscribers: [] };
  }

  const res = await fetch(blob.downloadUrl, { headers: blobHeaders(token) });
  if (!res.ok) {
    throw new Error(`Failed to read subscribers blob: ${res.status}`);
  }

  const raw = await res.json();
  if (!Array.isArray(raw)) {
    return { blob, subscribers: [] };
  }

  const subscribers = raw
    .map(parseBlogSubscriber)
    .filter((item): item is BlogSubscriber => item !== null);

  return { blob, subscribers };
}

async function writeSubscribers(token: string, subscribers: BlogSubscriber[]): Promise<void> {
  const url = new URL(BLOB_API_BASE);
  url.searchParams.set("pathname", SUBSCRIBERS_BLOB_PATH);

  const res = await fetch(url.toString(), {
    method: "PUT",
    headers: putBlobHeaders(token),
    body: JSON.stringify(subscribers),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Failed to update subscribers blob: ${res.status} ${detail.slice(0, 300)}`);
  }
}

async function deleteBlogSubscriber(token: string, email: string): Promise<void> {
  const normalizedTarget = normalizeEmail(email);
  const { blob, subscribers } = await fetchSubscribers(token);

  if (!blob) {
    throw new Error("Subscriber not found");
  }

  const updated = subscribers.filter((subscriber) => normalizeEmail(subscriber.email) !== normalizedTarget);
  if (updated.length === subscribers.length) {
    throw new Error("Subscriber not found");
  }

  await writeSubscribers(token, updated);
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

    const supabaseAuth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

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
    const email = typeof body?.email === "string" ? body.email.trim() : "";

    if (!email || !EMAIL_RE.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawToken = Deno.env.get("BLOB_READ_WRITE_TOKEN");
    if (!rawToken) {
      return new Response(
        JSON.stringify({
          error: "Could not delete subscriber. Check BLOB_READ_WRITE_TOKEN in secrets.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = rawToken.trim().replace(/^["']+|["']+$/g, "");

    try {
      await deleteBlogSubscriber(token, email);
      return new Response(JSON.stringify({ success: true, email }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Subscriber not found";
      if (message === "Subscriber not found") {
        return new Response(JSON.stringify({ error: message }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw err;
    }
  } catch (err) {
    console.error("delete-blog-subscriber error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
