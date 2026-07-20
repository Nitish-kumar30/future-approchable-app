import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  priceLabel,
  type CoursePricing,
  type PaymentCurrency,
} from '@/lib/coursePayment';

const CACHE_KEY = 'pricing-currency';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FALLBACK_CURRENCY: PaymentCurrency = 'INR';

type CacheEntry = { currency: PaymentCurrency; expiresAt: number };

type PricingCurrencyContextType = {
  currency: PaymentCurrency;
  isLoading: boolean;
  coursePriceLabel: (course: CoursePricing) => string;
};

const PricingCurrencyContext = createContext<PricingCurrencyContextType | undefined>(undefined);

function readCache(): PaymentCurrency | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (Date.now() > entry.expiresAt) return null;
    return entry.currency;
  } catch {
    return null;
  }
}

function writeCache(currency: PaymentCurrency) {
  const entry: CacheEntry = { currency, expiresAt: Date.now() + CACHE_TTL_MS };
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
}

function parseCurrency(value: unknown): PaymentCurrency {
  return value === 'USD' ? 'USD' : 'INR';
}

export function PricingCurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<PaymentCurrency>(() => readCache() ?? FALLBACK_CURRENCY);
  const [isLoading, setIsLoading] = useState(() => readCache() === null);

  useEffect(() => {
    let cancelled = false;

    async function fetchCurrency() {
      const cached = readCache();
      if (cached) {
        setCurrency(cached);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('get-pricing-currency');

      if (cancelled) return;

      const resolved = !error && data?.currency
        ? parseCurrency(data.currency)
        : FALLBACK_CURRENCY;

      writeCache(resolved);
      setCurrency(resolved);
      setIsLoading(false);
    }

    fetchCurrency();
    return () => { cancelled = true; };
  }, []);

  const coursePriceLabel = (course: CoursePricing) => priceLabel(course, currency);

  return (
    <PricingCurrencyContext.Provider value={{ currency, isLoading, coursePriceLabel }}>
      {children}
    </PricingCurrencyContext.Provider>
  );
}

export function usePricingCurrency() {
  const context = useContext(PricingCurrencyContext);
  if (!context) {
    throw new Error('usePricingCurrency must be used within PricingCurrencyProvider');
  }
  return context;
}
