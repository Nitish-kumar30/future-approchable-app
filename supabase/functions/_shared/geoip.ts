export type PricingCurrency = "INR" | "USD";

export type GeoCurrencyResult = {
  currency: PricingCurrency;
  countryCode: string | null;
  source: "cloudflare" | "ip-api" | "fallback";
};

function isPrivateIp(ip: string): boolean {
  return (
    ip === "::1" ||
    ip.startsWith("127.") ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  );
}

export function extractClientIp(req: Request): string | null {
  const candidates = [
    req.headers.get("cf-connecting-ip"),
    req.headers.get("x-real-ip"),
    req.headers.get("x-forwarded-for")?.split(",")[0],
  ];

  for (const value of candidates) {
    const ip = value?.trim();
    if (ip && !isPrivateIp(ip)) return ip;
  }

  return null;
}

export function currencyFromCountryCode(countryCode: string | null | undefined): PricingCurrency {
  return countryCode?.toUpperCase() === "IN" ? "INR" : countryCode ? "USD" : "INR";
}

async function lookupCountryCode(ip: string): Promise<string | null> {
  const res = await fetch(
    `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,countryCode`,
    { signal: AbortSignal.timeout(3000) },
  );
  if (!res.ok) return null;

  const data = await res.json() as { status?: string; countryCode?: string };
  return data.status === "success" ? data.countryCode ?? null : null;
}

export async function resolveCurrencyFromRequest(req: Request): Promise<GeoCurrencyResult> {
  const cfCountry = req.headers.get("cf-ipcountry")?.trim();
  if (cfCountry && cfCountry !== "XX" && cfCountry !== "T1") {
    return {
      currency: currencyFromCountryCode(cfCountry),
      countryCode: cfCountry.toUpperCase(),
      source: "cloudflare",
    };
  }

  const ip = extractClientIp(req);
  if (!ip) {
    return { currency: "INR", countryCode: null, source: "fallback" };
  }

  try {
    const countryCode = await lookupCountryCode(ip);
    if (!countryCode) {
      return { currency: "INR", countryCode: null, source: "fallback" };
    }

    return {
      currency: currencyFromCountryCode(countryCode),
      countryCode: countryCode.toUpperCase(),
      source: "ip-api",
    };
  } catch (error) {
    console.error("Geo IP lookup failed:", error);
    return { currency: "INR", countryCode: null, source: "fallback" };
  }
}
