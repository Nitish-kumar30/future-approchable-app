export const CONTACT_FORM_TYPE = "contact-inquiry" as const;
export const CORPORATE_FORM_TYPE = "corporate-training-inquiry" as const;

export const ENQUIRY_TYPES = [
  { value: "team-training", label: "Team Training" },
  { value: "cohort", label: "Live AI Cohort" },
  { value: "courses", label: "Courses" },
  { value: "general", label: "General Enquiry" },
] as const;

export type EnquiryType = (typeof ENQUIRY_TYPES)[number]["value"];

export type ContactInquiry = {
  id: string;
  formType: typeof CONTACT_FORM_TYPE;
  submittedAt: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  enquiryType: EnquiryType;
  message: string;
  meta: {
    source: string;
    userAgent?: string;
  };
};

export type CorporateInquiry = {
  id: string;
  formType: typeof CORPORATE_FORM_TYPE;
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

export type Inquiry = ContactInquiry | CorporateInquiry;

export type BlogSubscriber = {
  email: string;
  subscribedAt: string;
};

export function isContactInquiry(record: Inquiry): record is ContactInquiry {
  return record.formType === CONTACT_FORM_TYPE;
}

export function isCorporateInquiry(record: Inquiry): record is CorporateInquiry {
  return record.formType === CORPORATE_FORM_TYPE;
}

export function enquiryTypeLabel(value: EnquiryType): string {
  return ENQUIRY_TYPES.find((t) => t.value === value)?.label ?? value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasStringField(record: Record<string, unknown>, key: string): boolean {
  return typeof record[key] === "string";
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeMeta(value: unknown): { source: string; userAgent?: string } {
  if (!isRecord(value)) return { source: "unknown" };
  return {
    source: asString(value.source) || "unknown",
    userAgent: typeof value.userAgent === "string" ? value.userAgent : undefined,
  };
}

function normalizeTiers(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((tier): tier is string => typeof tier === "string");
}

function normalizeContactInquiry(raw: Record<string, unknown>): ContactInquiry {
  return {
    id: asString(raw.id),
    formType: CONTACT_FORM_TYPE,
    submittedAt: asString(raw.submittedAt),
    name: asString(raw.name),
    email: asString(raw.email),
    phone: asString(raw.phone),
    organization: asString(raw.organization),
    enquiryType: asString(raw.enquiryType) as EnquiryType,
    message: asString(raw.message),
    meta: normalizeMeta(raw.meta),
  };
}

function normalizeCorporateInquiry(raw: Record<string, unknown>): CorporateInquiry {
  return {
    id: asString(raw.id),
    formType: CORPORATE_FORM_TYPE,
    submittedAt: asString(raw.submittedAt),
    company: asString(raw.company),
    contactName: asString(raw.contactName),
    email: asString(raw.email),
    phone: asString(raw.phone),
    teamSize: asString(raw.teamSize),
    tiers: normalizeTiers(raw.tiers),
    industry: asString(raw.industry),
    timing: asString(raw.timing),
    requirements: asString(raw.requirements),
    meta: normalizeMeta(raw.meta),
  };
}

export function isContactInquiryShape(value: unknown): value is ContactInquiry {
  if (!isRecord(value) || value.formType !== CONTACT_FORM_TYPE) return false;

  return (
    hasStringField(value, "id") &&
    hasStringField(value, "submittedAt") &&
    hasStringField(value, "name") &&
    hasStringField(value, "email") &&
    hasStringField(value, "enquiryType") &&
    hasStringField(value, "message")
  );
}

export function isCorporateInquiryShape(value: unknown): value is CorporateInquiry {
  if (!isRecord(value) || value.formType !== CORPORATE_FORM_TYPE) return false;

  return (
    hasStringField(value, "id") &&
    hasStringField(value, "submittedAt") &&
    hasStringField(value, "company") &&
    hasStringField(value, "contactName") &&
    hasStringField(value, "email")
  );
}

export function isInquiry(value: unknown): value is Inquiry {
  return isContactInquiryShape(value) || isCorporateInquiryShape(value);
}

export function parseInquiry(value: unknown): Inquiry | null {
  if (!isRecord(value)) return null;

  if (isContactInquiryShape(value)) {
    return normalizeContactInquiry(value);
  }

  if (isCorporateInquiryShape(value)) {
    return normalizeCorporateInquiry(value);
  }

  return null;
}

export function parseInquiries(values: unknown[]): Inquiry[] {
  return values.map(parseInquiry).filter((item): item is Inquiry => item !== null);
}

export function filterContactInquiries(inquiries: Inquiry[]): ContactInquiry[] {
  return inquiries.filter(isContactInquiry);
}

export function filterCorporateInquiries(inquiries: Inquiry[]): CorporateInquiry[] {
  return inquiries.filter(isCorporateInquiry);
}

export function parseBlogSubscriber(value: unknown): BlogSubscriber | null {
  if (!isRecord(value)) return null;
  const email = asString(value.email);
  const subscribedAt = asString(value.subscribedAt);
  if (!email || !subscribedAt) return null;
  return { email, subscribedAt };
}

export function parseBlogSubscribers(values: unknown[]): BlogSubscriber[] {
  return values
    .map(parseBlogSubscriber)
    .filter((item): item is BlogSubscriber => item !== null)
    .sort((a, b) => Date.parse(b.subscribedAt) - Date.parse(a.subscribedAt));
}
