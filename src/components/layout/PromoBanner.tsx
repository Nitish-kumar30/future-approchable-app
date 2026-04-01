import { Button } from '@/components/ui/button';

const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScKsweqhNvfnHdRpB-8AEK_riK9FI45ziPfSYk8yHXFpaWp-g/viewform?usp=dialog';

export default function PromoBanner() {
  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 px-4">
      <div className="container flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center">
        <span className="text-sm font-medium">
          🔥 Next live cohort with Ranbeer — Apr 23, 2026 · Only 20 seats · ₹2,999 (India) / $99 (International)
        </span>
        <a href={FORM_URL} target="_blank" rel="noopener noreferrer">
          <Button size="sm" className="bg-white/15 border border-white/30 text-white hover:bg-white/25 whitespace-nowrap">
            Reserve Your Seat →
          </Button>
        </a>
      </div>
    </div>
  );
}
