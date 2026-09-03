import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingRow {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface CourseReviewsProps {
  courseId: string;
}

function StarRow({ value, size = 'h-4 w-4' }: { value: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            size,
            n <= Math.round(value) ? 'fill-warning text-warning' : 'fill-transparent text-muted-foreground/30',
          )}
        />
      ))}
    </div>
  );
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const day = 24 * 60 * 60 * 1000;
  const days = Math.floor(diffMs / day);
  if (days < 1) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';
}

export default function CourseReviews({ courseId }: CourseReviewsProps) {
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('course_ratings')
        .select('id, user_id, rating, comment, created_at')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (cancelled) return;
      const rows = data || [];
      setRatings(rows);

      const userIds = [...new Set(rows.map((r) => r.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        if (!cancelled && profiles) {
          setNames(
            Object.fromEntries(profiles.map((p) => [p.user_id, p.full_name || 'Learner'])),
          );
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const { avg, count, distribution, withComments } = useMemo(() => {
    const count = ratings.length;
    const avg = count > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / count : 0;
    const distribution = [5, 4, 3, 2, 1].map((star) => {
      const n = ratings.filter((r) => Math.round(r.rating) === star).length;
      return { star, n, pct: count > 0 ? Math.round((n / count) * 100) : 0 };
    });
    const withComments = ratings.filter((r) => r.comment?.trim());
    return { avg, count, distribution, withComments };
  }, [ratings]);

  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold">Student Reviews</h2>
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (count === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl sm:text-2xl font-semibold">Student Reviews</h2>
      <Card className="card-elevated">
        <CardContent className="p-5 flex flex-col sm:flex-row gap-6">
          <div className="flex flex-col items-center justify-center shrink-0 sm:w-40">
            <p className="text-4xl font-display font-bold text-foreground">{avg.toFixed(1)}</p>
            <StarRow value={avg} />
            <p className="text-xs text-muted-foreground mt-1">
              {count} {count === 1 ? 'review' : 'reviews'}
            </p>
          </div>
          <div className="flex-1 space-y-1.5 min-w-0">
            {distribution.map(({ star, n, pct }) => (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 shrink-0 text-muted-foreground tabular-nums">{star}</span>
                <Star className="h-3 w-3 shrink-0 fill-warning text-warning" />
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-warning rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-6 shrink-0 text-right text-muted-foreground tabular-nums">{n}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {withComments.length > 0 && (
        <div className="space-y-3">
          {withComments.slice(0, 6).map((r) => {
            const name = names[r.user_id] || 'Learner';
            return (
              <Card key={r.id} className="card-elevated">
                <CardContent className="p-4 flex gap-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-semibold">
                      {initials(name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground">{name}</p>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {relativeTime(r.created_at)}
                      </span>
                    </div>
                    <StarRow value={r.rating} size="h-3.5 w-3.5" />
                    <p className="text-sm text-foreground/90 whitespace-pre-line">{r.comment}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
