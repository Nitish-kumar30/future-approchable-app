import { Button } from "@/components/ui/button";
import { COHORT_FORM_URL, COHORT_CONFIG, localizedCohortPrice } from "@/lib/constants";
import { usePricingCurrency } from "@/hooks/usePricingCurrency";

export default function PromoBanner() {
  const c = COHORT_CONFIG;
  const { currency } = usePricingCurrency();

  const showAIMasteryPromo = c.showAIMasteryPromo;

  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 px-4">
      <div className="container flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center">
        <span className="text-sm font-medium">
          {showAIMasteryPromo
            ? "🔥 Master AI for Work — On-Demand Course for Professionals"
            : `🔥 Next live cohort on 'Master the Claude ecosystem' with ${c.mentorName} starts ${c.date}· ${localizedCohortPrice(currency)}`}
        </span>

        <a
          href={showAIMasteryPromo ? "/courses/ai-mastery-for-working-professionals" : COHORT_FORM_URL}
          target={showAIMasteryPromo ? "_self" : "_blank"}
          rel={showAIMasteryPromo ? undefined : "noopener noreferrer"}
        >
          <Button
            size="sm"
            className="bg-white/15 border border-white/30 text-white hover:bg-white/25 whitespace-nowrap"
          >
            {showAIMasteryPromo ? "Start Learning" : "Reserve Your Seat →"}
          </Button>
        </a>
      </div>
    </div>
  );
}
