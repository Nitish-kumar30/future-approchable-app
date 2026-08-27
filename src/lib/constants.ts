export const COHORT_FORM_URL =
  typeof window !== "undefined" && window.location.hostname.includes("approachable")
    ? "https://learn.approachable.dev/registration"
    : "/registration";

export const COHORT_CONFIG = {
  showAIMasteryPromo: true,
  date: "Aug 27th",
  mentorName: "Ranbeer",
  totalSeats: 20,
  priceIndia: "Rs 4999",
  priceInternational: "$ 129",
  /** Commitment fee in the smallest currency unit (must match the edge function). */
  priceIndiaPaise: 499900,
  priceInternationalCents: 12900,
  previousCohortDate: "Jul 23",
  socialProof: "Alumni from Adobe, Microsoft, Deloitte",
};

export function localizedCohortPrice(currency: "INR" | "USD"): string {
  return currency === "INR" ? COHORT_CONFIG.priceIndia : COHORT_CONFIG.priceInternational;
}
