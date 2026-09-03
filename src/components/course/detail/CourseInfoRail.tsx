import { type ReactNode, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import ProgressRing from '@/components/dashboard/ProgressRing';
import { CheckCircle2, Share2, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { buildIncludesLabels } from './courseIncludes';

interface CourseInfoRailProps {
  priceLabel: string;
  isPaid: boolean;
  isFree: boolean;
  chapterCount: number;
  quizCount: number;
  preReadingCount: number;
  isEnrolled: boolean;
  overallProgress?: number;
  completedItems?: number;
  totalItems?: number;
  ctaSlot: ReactNode;
  courseName: string;
}

export default function CourseInfoRail({
  priceLabel,
  isPaid,
  isFree,
  chapterCount,
  quizCount,
  preReadingCount,
  isEnrolled,
  overallProgress,
  completedItems,
  totalItems,
  ctaSlot,
  courseName,
}: CourseInfoRailProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const includes = buildIncludesLabels({ chapterCount, quizCount, preReadingCount, isPaid });

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: courseName, url });
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: 'Link copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Could not copy link', variant: 'destructive' });
    }
  };

  return (
    <Card className="card-elevated overflow-hidden">
      <CardContent className="p-5 space-y-5">
        {isEnrolled && totalItems != null && totalItems > 0 ? (
          <div className="flex flex-col items-center gap-2 pb-1">
            <ProgressRing percent={overallProgress ?? 0} size={96} label="Complete" />
            <p className="text-xs text-muted-foreground">
              {completedItems} of {totalItems} lessons &amp; quizzes done
            </p>
          </div>
        ) : (
          !isFree && (
            <p className="text-3xl font-display font-bold text-foreground">{priceLabel}</p>
          )
        )}

        <div>{ctaSlot}</div>

        <Separator />

        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            This course includes
          </p>
          <ul className="space-y-2">
            {includes.map((label, idx) => (
              <li key={idx} className="flex items-center gap-2.5 text-sm text-foreground">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={handleShare}
        >
          {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
          {copied ? 'Link copied' : 'Share this course'}
        </Button>
      </CardContent>
    </Card>
  );
}
