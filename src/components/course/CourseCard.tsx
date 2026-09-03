import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Calendar,
  GraduationCap,
  ArrowRight,
  Image as ImageIcon,
  Star,
  BookOpen,
} from 'lucide-react';
import { formatDuration } from '@/lib/formatDuration';
import { usePricingCurrency } from '@/hooks/usePricingCurrency';
import { isPaidCourse } from '@/lib/coursePayment';
import { cn } from '@/lib/utils';

export interface CourseCardCourse {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  mentor_name: string | null;
  duration: string | null;
  image_url: string | null;
  start_date?: string | null;
  enrollment_disabled?: boolean;
  price_inr_paise?: number | null;
  price_usd_cents?: number | null;
}

export interface CourseCardRating {
  avg: number;
  count: number;
}

interface CourseCardProps {
  course: CourseCardCourse;
  enrolled?: boolean;
  percent?: number;
  /** Overrides the default details-page link, e.g. to jump straight into a lesson. */
  href?: string;
  /** Overrides the default "View details" ghost button with a primary CTA. */
  ctaLabel?: string;
  /** 'free' courses always show a Free badge regardless of price fields. */
  variant?: 'paid' | 'free';
  rating?: CourseCardRating | null;
  lessonCount?: number;
}

export default function CourseCard({
  course,
  enrolled = false,
  percent,
  href,
  ctaLabel,
  variant = 'paid',
  rating,
  lessonCount,
}: CourseCardProps) {
  const { coursePriceLabel } = usePricingCurrency();
  const isFree = variant === 'free' || !isPaidCourse(course);
  const price = isFree ? 'Free' : coursePriceLabel(course);

  return (
    <Link to={href ?? `/courses/${course.slug}`} className="block h-full group/card">
      <Card className="relative card-elevated hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden flex flex-col h-full">
        <div className="relative h-40 shrink-0 bg-muted overflow-hidden">
          {course.image_url ? (
            <img
              src={course.image_url}
              alt={course.name}
              className="w-full h-full object-cover object-top group-hover/card:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />

          {price && (
            <Badge
              className={cn(
                'absolute top-2 left-2 text-[11px] font-semibold shadow-sm',
                isFree ? 'bg-success text-success-foreground border-transparent' : '',
              )}
              variant={isFree ? undefined : 'secondary'}
            >
              {price}
            </Badge>
          )}

          {enrolled ? (
            <Badge className="absolute top-2 right-2 text-[11px]" variant="secondary">
              Enrolled
            </Badge>
          ) : course.enrollment_disabled ? (
            <Badge className="absolute top-2 right-2 text-[11px]" variant="secondary">
              Closed
            </Badge>
          ) : null}
        </div>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base group-hover/card:text-primary transition-colors line-clamp-2">
            {course.name}
          </CardTitle>
          <CardDescription className="line-clamp-2 text-sm">{course.description}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 pb-4 space-y-3 mt-auto">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {course.mentor_name && (
              <span className="flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5" />
                {course.mentor_name}
              </span>
            )}
            {course.start_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(course.start_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
            {course.duration && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDuration(course.duration)}
              </span>
            )}
            {typeof lessonCount === 'number' && lessonCount > 0 && (
              <span className="flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" />
                {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            {rating && rating.count > 0 ? (
              <span className="flex items-center gap-1 text-xs font-medium text-foreground">
                <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                {rating.avg.toFixed(1)}
                <span className="text-muted-foreground font-normal">({rating.count})</span>
              </span>
            ) : (
              <span />
            )}
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 text-sm font-medium h-9 shrink-0 transition-colors',
                ctaLabel
                  ? 'bg-primary text-primary-foreground group-hover/card:bg-primary/90'
                  : 'text-muted-foreground group-hover/card:text-foreground group-hover/card:bg-muted',
              )}
            >
              {ctaLabel ?? 'View details'}
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </CardContent>

        {/* Progress line at the true bottom edge of the card — only for enrolled courses with tracked progress */}
        {enrolled && percent != null && (
          <div className="h-1 bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
          </div>
        )}
      </Card>
    </Link>
  );
}
