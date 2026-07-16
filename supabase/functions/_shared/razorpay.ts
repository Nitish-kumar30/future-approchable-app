import { createHmac, timingSafeEqual } from "node:crypto";

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

// HMAC-SHA256(order_id|payment_id) must match razorpay_signature
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!keySecret) return false;

  const expected = createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function getRazorpayKeyId(): string {
  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  if (!keyId) throw new Error("Razorpay credentials not configured");
  return keyId;
}
