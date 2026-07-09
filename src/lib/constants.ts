export const COHORT_FORM_URL =
  typeof window !== "undefined" && window.location.hostname.includes("approachable")
    ? "https://learn.approachable.dev/registration"
    : "/registration";

export const COHORT_CONFIG = {
  date: "July 23rd",
  mentorName: "Ranbeer",
  totalSeats: 20,
  priceIndia: "Rs 2999",
  priceInternational: "$ 99",
  previousCohortDate: "Apr 23",
  socialProof: "Alumni from Adobe, Microsoft, Deloitte",
};
