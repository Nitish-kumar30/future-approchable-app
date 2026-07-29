export type CertificateTier = "foundation" | "practitioner" | "expert";

const TIER_PREFIX: Record<CertificateTier, string> = {
  foundation: "AIF",
  practitioner: "AIP",
  expert: "AIE",
};

export function generateCertificateId(tier: CertificateTier): string {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `${TIER_PREFIX[tier]}-${year}-${random}`;
}

export function formatCompletionDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function getVerifyBaseUrl(): string {
  return Deno.env.get("CERTIFICATE_VERIFY_BASE_URL") ?? "https://learn.approachable.dev/verify";
}

export function buildVerifyUrl(certificateId: string): string {
  return `${getVerifyBaseUrl()}/${certificateId}`;
}

export const DEFAULT_INSTRUCTOR = {
  name: "Ranbeer Makin",
  title: "Instructor & Founder",
};
