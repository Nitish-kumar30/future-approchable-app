import { supabase } from "@/integrations/supabase/client";

export type CertificateTier = "foundation" | "practitioner" | "expert";

export type CertificateEligibility = {
  enrolled: boolean;
  progress_percent: number;
  foundation_requestable: boolean;
  existing_certificates: Array<{
    tier: CertificateTier;
    certificate_id: string;
    issued_at: string;
  }>;
  pending_requests: Array<{
    id: string;
    tier: CertificateTier;
    status: string;
    created_at: string;
  }>;
};

export type IssuedCertificate = {
  id: string;
  certificate_id: string;
  tier: CertificateTier;
  program_name: string;
  completion_date: string;
  verify_url: string;
  issued_at: string;
  cohort_id?: string | null;
  course_id?: string | null;
};

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function callFunction<T>(name: string, options?: { method?: string; body?: unknown; query?: Record<string, string> }): Promise<T> {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`);
  if (options?.query) {
    Object.entries(options.query).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const response = await fetch(url.toString(), {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }
  return data as T;
}

export async function fetchCertificateEligibility(params: { cohortId?: string; courseId?: string }) {
  const query: Record<string, string> = {};
  if (params.cohortId) query.cohort_id = params.cohortId;
  if (params.courseId) query.course_id = params.courseId;
  return callFunction<CertificateEligibility>("get-certificate-eligibility", { query });
}

export type RequestCertificateResult = {
  success: boolean;
  request?: { id: string; tier: CertificateTier; status: string; created_at: string };
  certificate?: { id: string; certificate_id: string; tier: CertificateTier; verify_url: string; issued_at: string };
};

export async function requestCertificate(payload: {
  cohortId?: string;
  courseId?: string;
  tier: CertificateTier;
  linkedinPostUrl?: string;
  learnerNote?: string;
}) {
  return callFunction<RequestCertificateResult>("request-certificate", {
    method: "POST",
    body: {
      cohort_id: payload.cohortId,
      course_id: payload.courseId,
      tier: payload.tier,
      linkedin_post_url: payload.linkedinPostUrl,
      learner_note: payload.learnerNote,
    },
  });
}

export async function fetchMyCertificates(params?: { cohortId?: string; courseId?: string }) {
  const query: Record<string, string> = {};
  if (params?.cohortId) query.cohort_id = params.cohortId;
  if (params?.courseId) query.course_id = params.courseId;
  const data = await callFunction<{ certificates: IssuedCertificate[] }>("get-my-certificates", { query });
  return data.certificates;
}

export async function downloadCertificate(certificateId: string) {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-certificate`);
  url.searchParams.set("certificate_id", certificateId);

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Download failed");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = `${certificateId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

export type RegenerateCertificateResult = {
  success: boolean;
  certificate?: {
    id: string;
    certificate_id: string;
    tier: CertificateTier;
    verify_url: string;
    issued_at: string;
    program_name: string;
  };
};

export async function regenerateCertificate(certificateId: string) {
  return callFunction<RegenerateCertificateResult>("regenerate-certificate", {
    method: "POST",
    body: { certificate_id: certificateId },
  });
}

export async function verifyCertificatePublic(certificateId: string) {
  const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-certificate`);
  url.searchParams.set("certificate_id", certificateId);
  const response = await fetch(url.toString());
  return response.json();
}

export async function fetchCertificateRequests(params?: { status?: string; tier?: string }) {
  const query: Record<string, string> = {};
  if (params?.status) query.status = params.status;
  if (params?.tier) query.tier = params.tier;
  return callFunction<{ requests: CertificateRequestRow[] }>("get-certificate-requests", { query });
}

export async function reviewCertificateRequest(requestId: string, action: "approve" | "reject", adminNote?: string) {
  return callFunction("review-certificate-request", {
    method: "POST",
    body: { request_id: requestId, action, admin_note: adminNote },
  });
}

export async function issueCertificate(payload: {
  requestId: string;
  recipientName?: string;
  completionDate?: string;
}) {
  return callFunction("issue-certificate", {
    method: "POST",
    body: {
      request_id: payload.requestId,
      recipient_name: payload.recipientName,
      completion_date: payload.completionDate,
    },
  });
}

export type CertificateRequestRow = {
  id: string;
  user_id: string;
  cohort_id: string | null;
  course_id: string | null;
  tier: CertificateTier;
  status: string;
  linkedin_post_url: string | null;
  learner_note: string | null;
  admin_note: string | null;
  created_at: string;
  progress_percent: number;
  program_name?: string;
  learner_name?: string | null;
  learner_email?: string | null;
};

export function tierLabel(tier: CertificateTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}
