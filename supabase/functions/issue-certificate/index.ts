import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import {
  buildVerifyUrl,
  DEFAULT_INSTRUCTOR,
  generateCertificateId,
  type CertificateTier,
} from "../_shared/certificates.ts";
import { buildCertificateHtml, renderCertificatePdf } from "../_shared/render-certificate-pdf.ts";
import { getServiceClient, requireAdmin } from "../_shared/supabase-clients.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const auth = await requireAdmin(req);
    if ("error" in auth) return jsonResponse({ error: auth.error }, auth.status);

    const {
      request_id,
      recipient_name,
      completion_date,
      instructor_name,
      instructor_title,
    } = await req.json();

    if (!request_id) {
      return jsonResponse({ error: "request_id is required" }, 400);
    }

    const supabase = getServiceClient();

    const { data: request, error: reqError } = await supabase
      .from("certificate_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    if (reqError || !request) {
      return jsonResponse({ error: "Certificate request not found" }, 404);
    }

    if (request.status === "issued") {
      return jsonResponse({ error: "Certificate already issued for this request" }, 409);
    }

    if (request.status === "rejected") {
      return jsonResponse({ error: "Cannot issue a rejected request" }, 400);
    }

    const { data: existingCert } = await supabase
      .from("certificates")
      .select("id")
      .eq("user_id", request.user_id)
      .eq("tier", request.tier)
      .eq(request.cohort_id ? "cohort_id" : "course_id", request.cohort_id ?? request.course_id)
      .maybeSingle();

    if (existingCert) {
      return jsonResponse({ error: "Certificate already exists for this tier" }, 409);
    }

    let programName = "AI Program";
    if (request.cohort_id) {
      const { data: cohort } = await supabase.from("cohorts").select("name").eq("id", request.cohort_id).single();
      programName = cohort?.name ?? programName;
    } else if (request.course_id) {
      const { data: course } = await supabase.from("courses").select("title").eq("id", request.course_id).single();
      programName = course?.title ?? programName;
    }

    let resolvedRecipientName = recipient_name;
    if (!resolvedRecipientName) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", request.user_id)
        .maybeSingle();
      resolvedRecipientName = profile?.full_name ?? "Certificate Recipient";
    }

    const tier = request.tier as CertificateTier;
    const certificateId = generateCertificateId(tier);
    const verifyUrl = buildVerifyUrl(certificateId);
    const resolvedCompletionDate = completion_date ?? new Date().toISOString().slice(0, 10);
    const resolvedInstructorName = instructor_name ?? DEFAULT_INSTRUCTOR.name;
    const resolvedInstructorTitle = instructor_title ?? DEFAULT_INSTRUCTOR.title;

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
      return jsonResponse({ error: err instanceof Error ? err.message : "PDF generation failed" }, 500);
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
      return jsonResponse({ error: "Failed to store certificate PDF" }, 500);
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
        issued_by: auth.user.userId,
      })
      .select("id, certificate_id, tier, verify_url, issued_at")
      .single();

    if (certError) {
      console.error(certError);
      await supabase.storage.from("certificates").remove([storagePath]);
      return jsonResponse({ error: "Failed to save certificate record" }, 500);
    }

    await supabase
      .from("certificate_requests")
      .update({
        status: "issued",
        reviewed_by: auth.user.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    return jsonResponse({ success: true, certificate });
  } catch (err) {
    console.error("issue-certificate error:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Internal server error" },
      500,
    );
  }
});
