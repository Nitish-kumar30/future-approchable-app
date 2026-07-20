import { Button } from '@/components/ui/button';
import { COHORT_FORM_URL, COHORT_CONFIG, localizedCohortPrice } from '@/lib/constants';
import { usePricingCurrency } from '@/hooks/usePricingCurrency';

export default function PromoBanner() {
  const c = COHORT_CONFIG;
  const { currency } = usePricingCurrency();

  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 px-4">
      <div className="container flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center">
        <span className="text-sm font-medium">
          🔥 Next live cohort on &apos;Master the Claude ecosystem&apos; with {c.mentorName} starts July 23rd · {localizedCohortPrice(currency)}
        </span>
          
        <a href={COHORT_FORM_URL} target="_blank" rel="noopener noreferrer">
          <Button size="sm" className="bg-white/15 border border-white/30 text-white hover:bg-white/25 whitespace-nowrap">
            Reserve Your Seat →
          </Button>
        </a>
      </div>
    </div>
  );
}
