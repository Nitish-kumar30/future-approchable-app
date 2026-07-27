import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildVerifyUrl,
  DEFAULT_INSTRUCTOR,
  generateCertificateId,
  type CertificateTier,
} from "./certificates.ts";
import { buildCertificateHtml, renderCertificatePdf } from "./render-certificate-pdf.ts";

const DEFAULT_PROGRAM_NAME = "AI Program";

export type CertificateRequestLike = {
  id: string;
  user_id: string;
  tier: CertificateTier;
  cohort_id: string | null;
  course_id: string | null;
};

export type IssueCertificateOpts = {
  issuedBy: string | null;
  recipientName?: string;
  completionDate?: string;
  instructorName?: string;
  instructorTitle?: string;
};

export type RegenerateCertificateOpts = {
  recipientName?: string;
  instructorName?: string;
  instructorTitle?: string;
};

export type IssueCertificateResult = {
  certificate?: Record<string, unknown>;
  error?: { message: string; status: number };
};

export async function resolveProgramName(
  supabase: SupabaseClient,
  cohortId: string | null,
  courseId: string | null,
): Promise<string> {
  if (cohortId) {
    const { data: cohort } = await supabase.from("cohorts").select("name").eq("id", cohortId).single();
    return cohort?.name ?? DEFAULT_PROGRAM_NAME;
  }
  if (courseId) {
    const { data: course } = await supabase.from("courses").select("name").eq("id", courseId).single();
    return course?.name ?? DEFAULT_PROGRAM_NAME;
  }
  return DEFAULT_PROGRAM_NAME;
}

async function resolveRecipientName(
  supabase: SupabaseClient,
  userId: string,
  override?: string,
): Promise<string> {
  if (override) return override;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", userId)
    .maybeSingle();
  return profile?.full_name ?? "Certificate Recipient";
}

export async function issueCertificateForRequest(
  supabase: SupabaseClient,
  request: CertificateRequestLike,
  opts: IssueCertificateOpts,
): Promise<IssueCertificateResult> {
  const { data: existingCert } = await supabase
    .from("certificates")
    .select("id")
    .eq("user_id", request.user_id)
    .eq("tier", request.tier)
    .eq(request.cohort_id ? "cohort_id" : "course_id", request.cohort_id ?? request.course_id)
    .maybeSingle();

  if (existingCert) {
    return { error: { message: "Certificate already exists for this tier", status: 409 } };
  }

  const programName = await resolveProgramName(supabase, request.cohort_id, request.course_id);
  const resolvedRecipientName = await resolveRecipientName(supabase, request.user_id, opts.recipientName);

  const tier = request.tier;
  const certificateId = generateCertificateId(tier);
  const verifyUrl = buildVerifyUrl(certificateId);
  const resolvedCompletionDate = opts.completionDate ?? new Date().toISOString().slice(0, 10);
  const resolvedInstructorName = opts.instructorName ?? DEFAULT_INSTRUCTOR.name;
  const resolvedInstructorTitle = opts.instructorTitle ?? DEFAULT_INSTRUCTOR.title;

  const html = await buildCertificateHtml({
    tier,
    recipientName: resolvedRecipientName,
    programName,
    completionDate: resolvedCompletionDate,
    certificateId,
    verifyUrl,
    instructorName: resolvedInstructorName,
    instructorTitle: resolvedInstructorTitle,
  });

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await renderCertificatePdf(html);
  } catch (err) {
    console.error("PDF render error:", err);
    return { error: { message: err instanceof Error ? err.message : "PDF generation failed", status: 500 } };
  }

  const storagePath = `${request.user_id}/${certificateId}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("certificates")
    .upload(storagePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    console.error(uploadError);
    return { error: { message: "Failed to store certificate PDF", status: 500 } };
  }

  const { data: certificate, error: certError } = await supabase
    .from("certificates")
    .insert({
      certificate_id: certificateId,
      user_id: request.user_id,
      cohort_id: request.cohort_id,
      course_id: request.course_id,
      tier,
      request_id: request.id,
      recipient_name: resolvedRecipientName,
      program_name: programName,
      completion_date: resolvedCompletionDate,
      instructor_name: resolvedInstructorName,
      instructor_title: resolvedInstructorTitle,
      pdf_storage_path: storagePath,
      verify_url: verifyUrl,
      issued_by: opts.issuedBy,
    })
    .select("id, certificate_id, tier, verify_url, issued_at")
    .single();

  if (certError) {
    console.error(certError);
    await supabase.storage.from("certificates").remove([storagePath]);
    return { error: { message: "Failed to save certificate record", status: 500 } };
  }

  await supabase
    .from("certificate_requests")
    .update({
      status: "issued",
      reviewed_by: opts.issuedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", request.id);

  return { certificate };
}

export async function regenerateCertificate(
  supabase: SupabaseClient,
  certificateId: string,
  opts: RegenerateCertificateOpts = {},
): Promise<IssueCertificateResult> {
  const { data: cert, error: certError } = await supabase
    .from("certificates")
    .select(
      "id, certificate_id, user_id, tier, cohort_id, course_id, recipient_name, completion_date, verify_url, pdf_storage_path, instructor_name, instructor_title",
    )
    .eq("certificate_id", certificateId)
    .maybeSingle();

  if (certError || !cert) {
    return { error: { message: "Certificate not found", status: 404 } };
  }

  const programName = await resolveProgramName(supabase, cert.cohort_id, cert.course_id);
  const resolvedRecipientName = await resolveRecipientName(supabase, cert.user_id, opts.recipientName);
  const resolvedInstructorName = opts.instructorName ?? cert.instructor_name ?? DEFAULT_INSTRUCTOR.name;
  const resolvedInstructorTitle = opts.instructorTitle ?? cert.instructor_title ?? DEFAULT_INSTRUCTOR.title;

  const html = await buildCertificateHtml({
    tier: cert.tier as CertificateTier,
    recipientName: resolvedRecipientName,
    programName,
    completionDate: cert.completion_date,
    certificateId: cert.certificate_id,
    verifyUrl: cert.verify_url,
    instructorName: resolvedInstructorName,
    instructorTitle: resolvedInstructorTitle,
  });

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await renderCertificatePdf(html);
  } catch (err) {
    console.error("PDF render error:", err);
    return { error: { message: err instanceof Error ? err.message : "PDF generation failed", status: 500 } };
  }

  const { error: uploadError } = await supabase.storage
    .from("certificates")
    .upload(cert.pdf_storage_path, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    console.error(uploadError);
    return { error: { message: "Failed to store certificate PDF", status: 500 } };
  }

  const { data: certificate, error: updateError } = await supabase
    .from("certificates")
    .update({
      program_name: programName,
      recipient_name: resolvedRecipientName,
      instructor_name: resolvedInstructorName,
      instructor_title: resolvedInstructorTitle,
    })
    .eq("id", cert.id)
    .select("id, certificate_id, tier, verify_url, issued_at, program_name")
    .single();

  if (updateError) {
    console.error(updateError);
    return { error: { message: "Failed to update certificate record", status: 500 } };
  }

  return { certificate };
}
