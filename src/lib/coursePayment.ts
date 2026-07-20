import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

export type CoursePricing = {
  price_inr_paise?: number | null;
  price_usd_cents?: number | null;
};

export function isPaidCourse(course: CoursePricing): boolean {
  return (course.price_inr_paise ?? 0) > 0 || (course.price_usd_cents ?? 0) > 0;
}

/** Paid courses require payments.status = paid before client enroll is allowed. */
export async function canEnrollInCourse(
  supabase: SupabaseClient<Database>,
  userId: string,
  course: CoursePricing & { id: string },
): Promise<boolean> {
  if (!isPaidCourse(course)) return true;
  const { data } = await supabase
    .from('payments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', course.id)
    .eq('status', 'paid')
    .maybeSingle();
  return !!data;
}

export function formatInrPrice(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
}

export function formatUsdPrice(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`;
}

export type PaymentCurrency = 'INR' | 'USD';

export function priceLabel(course: CoursePricing, currency: PaymentCurrency): string {
  if (currency === 'INR' && (course.price_inr_paise ?? 0) > 0) {
    return formatInrPrice(course.price_inr_paise!);
  }
  if (currency === 'USD' && (course.price_usd_cents ?? 0) > 0) {
    return formatUsdPrice(course.price_usd_cents!);
  }
  return '';
}
