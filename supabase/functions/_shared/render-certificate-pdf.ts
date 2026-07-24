import type { CertificateTier } from "./certificates.ts";
import { formatCompletionDate } from "./certificates.ts";
import { logoIconDataUri } from "./certificate-assets/logo-icon.base64.ts";
import { certificateBaseCss } from "./certificate-assets/certificate-base.css.ts";
import { certificateDarkThemeCss } from "./certificate-assets/certificate-dark-theme.css.ts";
import { certificateDarkV2Css } from "./certificate-assets/certificate-dark-v2.css.ts";
import { expertCertificateHtml } from "./certificate-assets/expert-certificate.html.ts";
import { foundationCertificateHtml } from "./certificate-assets/foundation-certificate.html.ts";
import { practitionerCertificateHtml } from "./certificate-assets/practitioner-certificate.html.ts";

export type CertificateRenderData = {
  tier: CertificateTier;
  recipientName: string;
  programName: string;
  completionDate: string;
  certificateId: string;
  verifyUrl: string;
  instructorName: string;
  instructorTitle: string;
  logoUrl?: string;
};

const TIER_TAG: Record<CertificateTier, string> = {
  foundation: "FOUNDATION",
  practitioner: "PRACTITIONER",
  expert: "EXPERT",
};

const TIER_TEMPLATE: Record<CertificateTier, string> = {
  foundation: foundationCertificateHtml,
  practitioner: practitionerCertificateHtml,
  expert: expertCertificateHtml,
};

export async function buildCertificateHtml(data: CertificateRenderData): Promise<string> {
  let html = TIER_TEMPLATE[data.tier];

  const logoUrl = data.logoUrl ??
    Deno.env.get("CERTIFICATE_LOGO_URL") ??
    logoIconDataUri;

  html = html
    .replace(
      /<link rel="stylesheet" href="\.\/shared\/certificate-base\.css" \/>/,
      `<style>${certificateBaseCss}</style>`,
    )
    .replace(
      /<link rel="stylesheet" href="\.\/shared\/certificate-dark-theme\.css" \/>/,
      `<style>${certificateDarkThemeCss}</style>`,
    )
    .replace(
      /<link rel="stylesheet" href="\.\/shared\/certificate-dark-v2\.css" \/>/,
      `<style>${certificateDarkV2Css}</style>`,
    )
    .replace('src="./shared/assets/logo-icon.png"', `src="${logoUrl}"`)
    .replaceAll("{{RECIPIENT_NAME}}", escapeHtml(data.recipientName))
    .replaceAll("{{COHORT_NAME}}", escapeHtml(data.programName))
    .replaceAll("{{COMPLETION_DATE}}", escapeHtml(formatCompletionDate(data.completionDate)))
    .replaceAll("{{INSTRUCTOR_SIGNATURE}}", escapeHtml(data.instructorName))
    .replaceAll("{{INSTRUCTOR_NAME}}", escapeHtml(data.instructorName))
    .replaceAll("{{INSTRUCTOR_TITLE}}", escapeHtml(data.instructorTitle))
    .replaceAll("{{CERTIFICATE_ID}}", escapeHtml(data.certificateId))
    .replaceAll("{{VERIFY_URL}}", escapeHtml(data.verifyUrl))
    .replace(/<div class="ribbon-tag">[A-Z]+<\/div>/, `<div class="ribbon-tag">${TIER_TAG[data.tier]}</div>`);

  return html;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function renderCertificatePdf(html: string): Promise<Uint8Array> {
  const apiKey = Deno.env.get("BROWSERLESS_API_KEY");
  const browserlessUrl = Deno.env.get("BROWSERLESS_URL") ?? "https://chrome.browserless.io";

  if (!apiKey) {
    throw new Error("BROWSERLESS_API_KEY is not configured");
  }

  const response = await fetch(`${browserlessUrl}/pdf?token=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      html,
      options: {
        // The certificate card is 1040px wide with 40px body padding on
        // each side; height is generous to avoid clipping/pagination since
        // actual rendered content height varies slightly per tier.
        width: "1200px",
        height: "1000px",
        printBackground: true,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PDF render failed: ${response.status} ${text}`);
  }

  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}
