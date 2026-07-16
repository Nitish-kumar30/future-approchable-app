export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
};

// Calls Razorpay Orders API — amount must come from DB, never from client
export async function createRazorpayOrder(params: {
  amount: number;
  currency: string;
  receipt: string;
  notes: Record<string, string>;
}): Promise<RazorpayOrder> {
  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials not configured");
  }

  const auth = btoa(`${keyId}:${keySecret}`);
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency,
      receipt: params.receipt,
      notes: params.notes,
    }),
  });

  if (!res.ok) {
    throw new Error(`Razorpay order failed: ${await res.text()}`);
  }

  return res.json();
}

// HMAC-SHA256(order_id|payment_id) must match razorpay_signature (Web Crypto — Deno-safe)
export async function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
): Promise<boolean> {
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!keySecret) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(keySecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${orderId}|${paymentId}`),
  );

  const expected = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (signature.length !== expected.length) return false;

  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

export function getRazorpayKeyId(): string {
  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  if (!keyId) throw new Error("Razorpay credentials not configured");
  return keyId;
}
