export const COHORT_FORM_URL = typeof window !== 'undefined' && window.location.hostname.includes('approachable')
  ? 'https://learn.approachable.dev/registration'
  : '/registration';

export const COHORT_CONFIG = {
  date: 'Apr 23, 2026',
  mentorName: 'Ranbeer',
  totalSeats: 20,
  priceIndia: '₹3,999',
  priceInternational: '$199',
  previousCohortDate: 'Mar 19',
  socialProof: 'Alumni from Adobe, Microsoft, Deloitte',
};
