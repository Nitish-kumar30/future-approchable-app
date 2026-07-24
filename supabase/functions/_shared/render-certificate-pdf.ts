import type { CertificateTier } from "./certificates.ts";
import { formatCompletionDate } from "./certificates.ts";

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

const TEMPLATE_FILE: Record<CertificateTier, string> = {
  foundation: "foundation-certificate.html",
  practitioner: "practitioner-certificate.html",
  expert: "expert-certificate.html",
};

let cachedBaseCss: string | null = null;
let cachedDarkCss: string | null = null;

async function loadStyles(): Promise<{ base: string; dark: string }> {
  if (!cachedBaseCss || !cachedDarkCss) {
    const dir = new URL("./certificate-assets/", import.meta.url);
    cachedBaseCss = await Deno.readTextFile(new URL("certificate-base.css", dir));
    cachedDarkCss = await Deno.readTextFile(new URL("certificate-dark-theme.css", dir));
  }
  return { base: cachedBaseCss!, dark: cachedDarkCss! };
}

export async function buildCertificateHtml(data: CertificateRenderData): Promise<string> {
  const dir = new URL("./certificate-assets/", import.meta.url);
  const templatePath = new URL(TEMPLATE_FILE[data.tier], dir);
  let html = await Deno.readTextFile(templatePath);
  const { base, dark } = await loadStyles();

  const logoUrl = data.logoUrl ??
    Deno.env.get("CERTIFICATE_LOGO_URL") ??
    "https://approachable.dev/logo-icon.png";

  html = html
    .replace(
      /<link rel="stylesheet" href="\.\/shared\/certificate-base\.css" \/>/,
      `<style>${base}</style>`,
    )
    .replace(
      /<link rel="stylesheet" href="\.\/shared\/certificate-dark-theme\.css" \/>/,
      `<style>${dark}</style>`,
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
