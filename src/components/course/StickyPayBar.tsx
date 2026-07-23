import { useEffect, useState, type RefObject } from 'react';
import PaymentButton from '@/components/payment/PaymentButton';

type StickyPayBarProps = {
  courseId: string;
  courseName: string;
  priceInrPaise?: number | null;
  priceUsdCents?: number | null;
  hasPaid: boolean;
  heroRef: RefObject<HTMLElement>;
  onPaid?: () => void;
};

// Fixed bottom pay bar. Appears after the hero scrolls out of view.
export default function StickyPayBar({
  courseId,
  courseName,
  priceInrPaise,
  priceUsdCents,
  hasPaid,
  heroRef,
  onPaid,
}: StickyPayBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) {
      // No hero rendered — show immediately after mount
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [heroRef]);

  if (hasPaid) return null;

  return (
    <div
      className={`fixed inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 transition-transform duration-300 bottom-[var(--mobile-nav-height)] md:bottom-0 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-hidden={!visible}
    >
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {courseName}
          </p>
          <p className="text-xs text-muted-foreground">
            One-time payment · Lifetime access
          </p>
        </div>
        <PaymentButton
          courseId={courseId}
          courseName={courseName}
          priceInrPaise={priceInrPaise}
          priceUsdCents={priceUsdCents}
          hasPaid={hasPaid}
          onPaid={onPaid}
          size="default"
        />
      </div>
    </div>
  );
}
