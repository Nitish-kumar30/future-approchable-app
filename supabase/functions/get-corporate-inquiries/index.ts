import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BLOB_API_BASE = "https://blob.vercel-storage.com";
// Matches @vercel/blob@0.27.1 — the API rejects requests without this header.
const BLOB_API_VERSION = "8";

const CONTACT_FORM_TYPE = "contact-inquiry";
const CORPORATE_FORM_TYPE = "corporate-training-inquiry";

const VALID_ENQUIRY_TYPES = new Set([
  "team-training",
  "cohort",
  "courses",
  "general",
]);

function blobHeaders(token: string): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "x-api-version": BLOB_API_VERSION,
  };
  const storeId = Deno.env.get("BLOB_STORE_ID");
  if (storeId) headers["x-store-id"] = storeId;
  return headers;
}

type InquiryMeta = {
  source: string;
  userAgent?: string;
};

type ContactInquiryRecord = {
  id: string;
  formType: typeof CONTACT_FORM_TYPE;
  submittedAt: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  enquiryType: string;
  message: string;
  meta: InquiryMeta;
};

type CorporateInquiryRecord = {
  id: string;
  formType: typeof CORPORATE_FORM_TYPE;
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
  meta: InquiryMeta;
};

type InquiryRecord = ContactInquiryRecord | CorporateInquiryRecord;

type BlobListItem = {
  pathname: string;
  downloadUrl: string;
  uploadedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeMeta(value: unknown): InquiryMeta {
  if (!isRecord(value)) return { source: "unknown" };
  return {
    source: asString(value.source) || "unknown",
    userAgent: typeof value.userAgent === "string" ? value.userAgent : undefined,
  };
}

function inferFormType(pathname: string, raw: Record<string, unknown>): string {
  const explicit = asString(raw.formType);
  if (explicit) return explicit;

  if (pathname.startsWith("submissions/contact/")) return CONTACT_FORM_TYPE;
  if (pathname.startsWith("submissions/corporate/")) return CORPORATE_FORM_TYPE;

  // Legacy flat files and records without formType default to corporate.
  return CORPORATE_FORM_TYPE;
}

function parseContactInquiry(
  raw: Record<string, unknown>,
  fallbackSubmittedAt: string,
): ContactInquiryRecord | null {
  const enquiryType = asString(raw.enquiryType);
  if (!VALID_ENQUIRY_TYPES.has(enquiryType)) return null;

  const id = asString(raw.id);
  const submittedAt = asString(raw.submittedAt) || fallbackSubmittedAt;
  const name = asString(raw.name);
  const email = asString(raw.email);
  const message = asString(raw.message);

  if (!id || !submittedAt || !name || !email || !message) return null;

  return {
    id,
    formType: CONTACT_FORM_TYPE,
    submittedAt,
    name,
    email,
    phone: asString(raw.phone),
    organization: asString(raw.organization),
    enquiryType,
    message,
    meta: normalizeMeta(raw.meta),
  };
}

function parseCorporateInquiry(
  raw: Record<string, unknown>,
  fallbackSubmittedAt: string,
): CorporateInquiryRecord | null {
  const id = asString(raw.id);
  const submittedAt = asString(raw.submittedAt) || fallbackSubmittedAt;
  const company = asString(raw.company);
  const contactName = asString(raw.contactName);
  const email = asString(raw.email);

  if (!id || !submittedAt || !company || !contactName || !email) return null;

  const tiers = Array.isArray(raw.tiers)
    ? raw.tiers.filter((tier): tier is string => typeof tier === "string")
    : [];

  return {
    id,
    formType: CORPORATE_FORM_TYPE,
    submittedAt,
    company,
    contactName,
    email,
    phone: asString(raw.phone),
    teamSize: asString(raw.teamSize),
    tiers,
    industry: asString(raw.industry),
    timing: asString(raw.timing),
    requirements: asString(raw.requirements),
    meta: normalizeMeta(raw.meta),
  };
}

function parseSubmission(blob: BlobListItem, raw: unknown): InquiryRecord | null {
  if (!isRecord(raw)) {
    console.warn(`Skipping ${blob.pathname}: payload is not an object`);
    return null;
  }

  const formType = inferFormType(blob.pathname, raw);

  if (formType === CONTACT_FORM_TYPE) {
    const contact = parseContactInquiry(raw, blob.uploadedAt);
    if (!contact) {
      console.warn(`Skipping ${blob.pathname}: invalid contact inquiry shape`);
    }
    return contact;
  }

  if (formType === CORPORATE_FORM_TYPE) {
    const corporate = parseCorporateInquiry(raw, blob.uploadedAt);
    if (!corporate) {
      console.warn(`Skipping ${blob.pathname}: invalid corporate inquiry shape`);
    }
    return corporate;
  }

  console.warn(`Skipping ${blob.pathname}: unknown formType "${formType}"`);
  return null;
}

function sortBySubmittedAt<T extends { submittedAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt));
}

function isContactInquiry(record: InquiryRecord): record is ContactInquiryRecord {
  return record.formType === CONTACT_FORM_TYPE;
}

function isCorporateInquiry(record: InquiryRecord): record is CorporateInquiryRecord {
  return record.formType === CORPORATE_FORM_TYPE;
}

async function listSubmissions(token: string): Promise<BlobListItem[]> {
  const items: BlobListItem[] = [];
  let cursor: string | undefined;

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

  return items.filter((blob) => blob.pathname.endsWith(".json"));
}

async function readSubmission(
  blob: BlobListItem,
  token: string,
): Promise<InquiryRecord | null> {
  try {
    const res = await fetch(blob.downloadUrl, {
      headers: blobHeaders(token),
    });
    if (!res.ok) {
      console.warn(`Skipping ${blob.pathname}: blob fetch failed with ${res.status}`);
      return null;
    }

    const raw = await res.json();
    return parseSubmission(blob, raw);
  } catch (err) {
    console.warn(`Skipping ${blob.pathname}: ${err instanceof Error ? err.message : "read failed"}`);
    return null;
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

    const token = rawToken.trim().replace(/^["']+|["']+$/g, "");

    const blobs = await listSubmissions(token);
    const parsed = await Promise.all(blobs.map((blob) => readSubmission(blob, token)));
    const inquiries = sortBySubmittedAt(
      parsed.filter((item): item is InquiryRecord => item !== null),
    );
    const contact = inquiries.filter(isContactInquiry);
    const corporate = inquiries.filter(isCorporateInquiry);

    return new Response(JSON.stringify({ inquiries, contact, corporate }), {
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
