export const COHORT_FORM_URL =
  typeof window !== "undefined" && window.location.hostname.includes("approachable")
    ? "https://learn.approachable.dev/registration"
    : "/registration";

export const COHORT_CONFIG = {
  date: "Aug 27th",
  mentorName: "Ranbeer",
  totalSeats: 20,
  priceIndia: "Rs 3499",
  priceInternational: "$ 99",
  /** Commitment fee in the smallest currency unit (must match the edge function). */
  priceIndiaPaise: 349900,
  priceInternationalCents: 9900,
  previousCohortDate: "Jul 23",
  socialProof: "Alumni from Adobe, Microsoft, Deloitte",
};

export function localizedCohortPrice(currency: "INR" | "USD"): string {
  return currency === "INR" ? COHORT_CONFIG.priceIndia : COHORT_CONFIG.priceInternational;
}
