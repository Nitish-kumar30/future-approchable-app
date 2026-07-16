export function isPaidCourse(course: {
  price_inr_paise?: number | null;
  price_usd_cents?: number | null;
}): boolean {
  return (course.price_inr_paise ?? 0) > 0 || (course.price_usd_cents ?? 0) > 0;
}

export function formatInrPrice(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
}

export function formatUsdPrice(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`;
}

export type PaymentCurrency = 'INR' | 'USD';

export function defaultCurrency(course: {
  price_inr_paise?: number | null;
  price_usd_cents?: number | null;
}): PaymentCurrency {
  if ((course.price_inr_paise ?? 0) > 0) return 'INR';
  return 'USD';
}

export function priceLabel(
  course: { price_inr_paise?: number | null; price_usd_cents?: number | null },
  currency: PaymentCurrency,
): string {
  if (currency === 'INR' && (course.price_inr_paise ?? 0) > 0) {
    return formatInrPrice(course.price_inr_paise!);
  }
  if (currency === 'USD' && (course.price_usd_cents ?? 0) > 0) {
    return formatUsdPrice(course.price_usd_cents!);
  }
  return '';
}
