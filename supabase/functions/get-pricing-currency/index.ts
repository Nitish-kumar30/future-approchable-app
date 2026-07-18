import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { resolveCurrencyFromRequest } from "../_shared/geoip.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return optionsResponse();
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const result = await resolveCurrencyFromRequest(req);
    return jsonResponse({
      currency: result.currency,
      country_code: result.countryCode,
      source: result.source,
    });
  } catch (error) {
    console.error("get-pricing-currency error:", error);
    return jsonResponse({ currency: "INR", country_code: null, source: "fallback" });
  }
});
