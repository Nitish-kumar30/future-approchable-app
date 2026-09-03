import { type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Clock,
  GraduationCap,
  BookOpen,
  Layers,
  Star,
  Award,
  Image as ImageIcon,
} from 'lucide-react';
import { formatDuration } from '@/lib/formatDuration';
import { cn } from '@/lib/utils';

interface CourseHeroProps {
  heroRef: RefObject<HTMLDivElement>;
  imageUrl: string | null;
  name: string;
  mentorName: string | null;
  duration: string | null;
  sessionCount: number;
  chapterCount: number;
  isPaid: boolean;
  priceLabel: string;
  rating?: { avg: number; count: number } | null;
  backTo?: string;
}

export default function CourseHero({
  heroRef,
  imageUrl,
  name,
  mentorName,
  duration,
  sessionCount,
  chapterCount,
  isPaid,
  priceLabel,
  rating,
  backTo = '/courses',
}: CourseHeroProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate(backTo)} className="gap-2 -ml-2">
        <ArrowLeft className="h-4 w-4" /> Back to Courses
      </Button>

      <div
        ref={heroRef}
        className="relative w-full aspect-[16/9] sm:aspect-[5/2] md:aspect-[8/3] rounded-xl overflow-hidden bg-muted"
      >
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover object-center" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 space-y-2">
          <Badge
            className={cn(
              'text-xs font-semibold',
              !isPaid ? 'bg-success text-success-foreground border-transparent' : '',
            )}
            variant={!isPaid ? undefined : 'secondary'}
          >
            {!isPaid ? 'Free' : priceLabel}
          </Badge>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-white drop-shadow-sm">
            {name}
          </h1>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
        {mentorName && (
          <span className="flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4" />
            By {mentorName}
          </span>
        )}
        {rating && rating.count > 0 && (
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <Star className="h-4 w-4 fill-warning text-warning" />
            {rating.avg.toFixed(1)}
            <span className="text-muted-foreground font-normal">({rating.count} reviews)</span>
          </span>
        )}
        {duration && (
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {formatDuration(duration)}
          </span>
        )}
        {sessionCount > 0 && (
          <span className="flex items-center gap-1.5">
            <Layers className="h-4 w-4" />
            {sessionCount} {sessionCount === 1 ? 'session' : 'sessions'}
          </span>
        )}
        {chapterCount > 0 && (
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" />
            {chapterCount} {chapterCount === 1 ? 'lesson' : 'lessons'}
          </span>
        )}
        {isPaid && (
          <span className="flex items-center gap-1.5">
            <Award className="h-4 w-4" />
            Certificate included
          </span>
        )}
      </div>
    </div>
  );
}
