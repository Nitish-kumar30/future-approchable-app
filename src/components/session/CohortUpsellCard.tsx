import { Button } from '@/components/ui/button';
import { COHORT_FORM_URL, COHORT_CONFIG, localizedCohortPrice } from '@/lib/constants';
import { usePricingCurrency } from '@/hooks/usePricingCurrency';
import { Sparkles, Users, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CohortUpsellCardProps {
  variant: 'mid-course' | 'quiz-high' | 'quiz-low';
  /** Force a light card surface (e.g. mentorship modal in midnight theme). */
  tone?: 'light' | 'default';
}

const variantContent = {
  'mid-course': {
    icon: Sparkles,
    heading: 'Enjoying this course? Go deeper with live mentorship on Claude ecosystem',
    subtext: 'Get real-time feedback, group exercises, and direct access to the mentor.',
  },
  'quiz-high': {
    icon: Sparkles,
    heading: 'Great score! Imagine what you could achieve with live guidance',
    subtext: "You're clearly picking this up fast — a live cohort will take you even further.",
  },
  'quiz-low': {
    icon: Users,
    heading: 'Want personalized help? Join a live cohort',
    subtext: 'Get hands-on mentorship, ask questions in real-time, and learn with a group.',
  },
};

export default function CohortUpsellCard({ variant, tone = 'default' }: CohortUpsellCardProps) {
  const { icon: Icon, heading, subtext } = variantContent[variant];
  const c = COHORT_CONFIG;
  const { currency } = usePricingCurrency();
  const isLight = tone === 'light';

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 p-4 space-y-3 overflow-hidden',
        isLight
          ? 'border-indigo-300/60 bg-gradient-to-br from-indigo-50 via-white to-purple-50'
          : 'border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 dark:border-indigo-400/35 dark:from-indigo-950/70 dark:to-purple-950/55',
      )}
    >
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
          <h4
            className={cn(
              'font-semibold text-xs leading-snug',
              isLight ? 'text-slate-900' : 'text-slate-900 dark:text-indigo-50',
            )}
          >
            {heading}
          </h4>
          <p
            className={cn(
              'text-[11px] mt-0.5',
              isLight ? 'text-slate-600' : 'text-slate-600 dark:text-indigo-200/85',
            )}
          >
            {subtext}
          </p>
        </div>
      </div>

      <div
        className={cn(
          'flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]',
          isLight ? 'text-slate-600' : 'text-slate-600 dark:text-indigo-200/75',
        )}
      >
        <div className="flex items-center gap-1">
          <CalendarDays className="h-3 w-3" />
          <span>{c.date}</span>
        </div>
        <span>·</span>
        <span>{localizedCohortPrice(currency)}</span>
      </div>

      <p
        className={cn(
          'text-[11px] italic leading-snug',
          isLight ? 'text-slate-500' : 'text-slate-500 dark:text-indigo-200/70',
        )}
      >
        Our {c.previousCohortDate} cohort filled all {c.totalSeats} seats · {c.socialProof}
      </p>

      <a href={COHORT_FORM_URL} target="_blank" rel="noopener noreferrer">
        <Button size="sm" className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 gap-1 h-7 text-xs">
          Reserve Your Seat →
        </Button>
      </a>
    </div>
  );
}
