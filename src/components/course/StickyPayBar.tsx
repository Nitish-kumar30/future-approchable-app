import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useSyncStickyPayBarHeight } from '@/hooks/useSyncStickyPayBarHeight';

type StickyPayBarProps = {
  courseName: string;
  subtitle?: string;
  heroRef: RefObject<HTMLElement>;
  ctaSlot: ReactNode;
};

// Fixed bottom pay/enroll bar. Appears after the hero scrolls out of view.
export default function StickyPayBar({
  courseName,
  subtitle = 'One-time payment · Lifetime access',
  heroRef,
  ctaSlot,
}: StickyPayBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useSyncStickyPayBarHeight(barRef);

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

  return (
    <div
      ref={barRef}
      className={`fixed z-40 border-t bg-background md:bg-background/95 md:backdrop-blur md:supports-[backdrop-filter]:bg-background/80 transition-transform duration-300 bottom-[var(--mobile-nav-height)] md:bottom-0 md:pb-[env(safe-area-inset-bottom)] left-0 right-0 md:left-[var(--sidebar-width)] md:group-data-[state=collapsed]/sidebar-wrapper:left-[var(--sidebar-width-icon)] ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      aria-hidden={!visible}
    >
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{courseName}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {ctaSlot}
      </div>
    </div>
  );
}
