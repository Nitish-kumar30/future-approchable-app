import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildVerifyUrl,
  DEFAULT_INSTRUCTOR,
  generateCertificateId,
  type CertificateTier,
} from "./certificates.ts";
import { buildCertificateHtml, renderCertificatePdf } from "./render-certificate-pdf.ts";

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

export type IssueCertificateResult = {
  certificate?: Record<string, unknown>;
  error?: { message: string; status: number };
};

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

  let programName = "AI Program";
  if (request.cohort_id) {
    const { data: cohort } = await supabase.from("cohorts").select("name").eq("id", request.cohort_id).single();
    programName = cohort?.name ?? programName;
  } else if (request.course_id) {
    const { data: course } = await supabase.from("courses").select("title").eq("id", request.course_id).single();
    programName = course?.title ?? programName;
  }

  let resolvedRecipientName = opts.recipientName;
  if (!resolvedRecipientName) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", request.user_id)
      .maybeSingle();
    resolvedRecipientName = profile?.full_name ?? "Certificate Recipient";
  }

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
