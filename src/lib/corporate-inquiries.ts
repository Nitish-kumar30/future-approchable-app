import { supabase } from "@/integrations/supabase/client";

export type CorporateInquiry = {
  id: string;
  formType: string;
  submittedAt: string;
  company: string;
  contactName: string;
  email: string;
  phone: string;
  teamSize: string;
  tiers: string[];
  industry: string;
  timing: string;
  requirements: string;
  meta: {
    source: string;
    userAgent?: string;
  };
};

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function fetchCorporateInquiries(): Promise<CorporateInquiry[]> {
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

  return (data.inquiries ?? []) as CorporateInquiry[];
}

export function formatInquiryDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function inquiriesToCsv(inquiries: CorporateInquiry[]): string {
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

  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;

  const rows = inquiries.map((inquiry) =>
    [
      inquiry.submittedAt,
      inquiry.company,
      inquiry.contactName,
      inquiry.email,
      inquiry.phone,
      inquiry.teamSize,
      inquiry.industry,
      inquiry.tiers.join("; "),
      inquiry.timing,
      inquiry.requirements,
    ]
      .map((cell) => escape(cell ?? ""))
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}
