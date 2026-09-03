import { supabase } from "@/integrations/supabase/client";
import {
  type CorporateInquiry,
  type ContactInquiry,
  type Inquiry,
  enquiryTypeLabel,
  filterCorporateInquiries,
  filterContactInquiries,
  isContactInquiry,
  isCorporateInquiry,
  parseInquiries,
} from "@/lib/inquiry-types";

export type { CorporateInquiry, ContactInquiry, Inquiry };
export { enquiryTypeLabel, filterCorporateInquiries, filterContactInquiries, isCorporateInquiry };

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function fetchInquiriesFromApi(): Promise<Inquiry[]> {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-corporate-inquiries`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to load inquiries");
  }

  if (Array.isArray(data.inquiries)) {
    return parseInquiries(data.inquiries);
  }

  return parseInquiries([...(data.contact ?? []), ...(data.corporate ?? [])]);
}

export async function fetchInquiries(): Promise<Inquiry[]> {
  return fetchInquiriesFromApi();
}

export async function fetchCorporateInquiries(): Promise<CorporateInquiry[]> {
  const inquiries = await fetchInquiriesFromApi();
  return filterCorporateInquiries(inquiries);
}

export async function fetchContactInquiries(): Promise<ContactInquiry[]> {
  const inquiries = await fetchInquiriesFromApi();
  return filterContactInquiries(inquiries);
}

export async function deleteInquiry(id: string, formType: Inquiry["formType"]): Promise<void> {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-submission`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ id, formType }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to delete inquiry");
  }
}

export function formatInquiryDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function escapeCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function corporateInquiriesToCsv(inquiries: CorporateInquiry[]): string {
  const headers = [
    "Submitted",
    "Company",
    "Contact",
    "Email",
    "Phone",
    "Team size",
    "Industry",
    "Tiers",
    "Timing",
    "Requirements",
  ];

  const rows = inquiries.map((inquiry) =>
    [
      inquiry.submittedAt,
      inquiry.company,
      inquiry.contactName,
      inquiry.email,
      inquiry.phone,
      inquiry.teamSize,
      inquiry.industry,
      (inquiry.tiers ?? []).join("; "),
      inquiry.timing,
      inquiry.requirements,
    ]
      .map((cell) => escapeCsvCell(cell ?? ""))
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}

export function contactInquiriesToCsv(inquiries: ContactInquiry[]): string {
  const headers = [
    "Submitted",
    "Name",
    "Email",
    "Phone",
    "Organization",
    "Enquiry type",
    "Message",
  ];

  const rows = inquiries.map((inquiry) =>
    [
      inquiry.submittedAt,
      inquiry.name,
      inquiry.email,
      inquiry.phone,
      inquiry.organization,
      enquiryTypeLabel(inquiry.enquiryType),
      inquiry.message,
    ]
      .map((cell) => escapeCsvCell(cell ?? ""))
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}

const COMBINED_CSV_HEADERS = [
  "Type",
  "Submitted",
  "Name/Company",
  "Contact",
  "Email",
  "Phone",
  "Enquiry Type",
  "Organization",
  "Team size",
  "Industry",
  "Timing",
  "Message/Requirements",
] as const;

function inquiryToCombinedCsvRow(inquiry: Inquiry): string {
  if (isContactInquiry(inquiry)) {
    return [
      "Contact Us",
      inquiry.submittedAt,
      inquiry.name,
      inquiry.name,
      inquiry.email,
      inquiry.phone,
      enquiryTypeLabel(inquiry.enquiryType),
      inquiry.organization,
      "",
      "",
      "",
      inquiry.message,
    ]
      .map((cell) => escapeCsvCell(cell ?? ""))
      .join(",");
  }

  return [
    "Team Training",
    inquiry.submittedAt,
    inquiry.company,
    inquiry.contactName,
    inquiry.email,
    inquiry.phone,
    "",
    "",
    inquiry.teamSize,
    inquiry.industry,
    inquiry.timing,
    inquiry.requirements,
  ]
    .map((cell) => escapeCsvCell(cell ?? ""))
    .join(",");
}

export function allInquiriesToCsv(inquiries: Inquiry[]): string {
  const sorted = [...inquiries].sort(
    (a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt),
  );
  const rows = sorted.map(inquiryToCombinedCsvRow);
  return [COMBINED_CSV_HEADERS.join(","), ...rows].join("\n");
}

/** @deprecated Use allInquiriesToCsv for combined exports. */
export function inquiriesToCsv(inquiries: CorporateInquiry[]): string {
  return corporateInquiriesToCsv(inquiries);
}
