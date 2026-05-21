export const COHORT_FORM_URL =
  typeof window !== "undefined" && window.location.hostname.includes("approachable")
    ? "https://learn.approachable.dev/registration"
    : "/registration";

export const COHORT_CONFIG = {
  date: "",
  mentorName: "Ranbeer",
  totalSeats: 20,
  priceIndia: "-",
  priceInternational: "-",
  previousCohortDate: "Apr 23",
  socialProof: "Alumni from Adobe, Microsoft, Deloitte",
};
