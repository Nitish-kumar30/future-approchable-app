import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2 } from 'lucide-react';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId?: string;
  cohortId?: string;
  entityName: string;
}

export default function FeedbackDialog({ open, onOpenChange, courseId, cohortId, entityName }: FeedbackDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      fetchExisting();
    }
    if (!open) {
      setRating(0);
      setHoveredRating(0);
      setComment('');
      setExistingId(null);
    }
  }, [open, user]);

  const fetchExisting = async () => {
    if (!user) return;
    setIsLoading(true);
    let query = supabase.from('feedback').select('*').eq('user_id', user.id);
    if (courseId) query = query.eq('course_id', courseId);
    if (cohortId) query = query.eq('cohort_id', cohortId);

    const { data } = await query.maybeSingle();
    if (data) {
      setRating((data as any).rating);
      setComment((data as any).comment || '');
      setExistingId((data as any).id);
    }
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!user || rating === 0) return;
    setIsSubmitting(true);

    const payload: any = {
      user_id: user.id,
      rating,
      comment: comment.trim() || null,
    };
    if (courseId) payload.course_id = courseId;
    if (cohortId) payload.cohort_id = cohortId;

    const onConflict = courseId ? 'user_id,course_id' : 'user_id,cohort_id';

    const { error } = await supabase.from('feedback').upsert(payload, { onConflict });

    setIsSubmitting(false);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: existingId ? 'Feedback updated!' : 'Thank you for your feedback!' });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Leave feedback for {entityName}</DialogTitle>
          <DialogDescription>Rate your experience and optionally leave a comment.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Star rating – supports half stars */}
            <div className="flex items-center gap-0 justify-center">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = hoveredRating || rating;
                const isFull = active >= star;
                const isHalf = !isFull && active >= star - 0.5;
                return (
                  <div key={star} className="relative h-9 w-9 cursor-pointer">
                    {/* Left half – sets x.5 */}
                    <button
                      type="button"
                      className="absolute inset-y-0 left-0 w-1/2 z-10"
                      onClick={() => setRating(star - 0.5)}
                      onMouseEnter={() => setHoveredRating(star - 0.5)}
                      onMouseLeave={() => setHoveredRating(0)}
                      aria-label={`${star - 0.5} stars`}
                    />
                    {/* Right half – sets x */}
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 w-1/2 z-10"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      aria-label={`${star} stars`}
                    />
                    {/* Render star – always use raw SVG to prevent layout shift */}
                    <div className="pointer-events-none flex items-center justify-center h-full w-full">
                      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {isHalf ? (
                          <>
                            <defs>
                              <clipPath id={`half-l-${star}`}><rect x="0" y="0" width="12" height="24" /></clipPath>
                              <clipPath id={`half-r-${star}`}><rect x="12" y="0" width="12" height="24" /></clipPath>
                            </defs>
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#facc15" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" clipPath={`url(#half-l-${star})`} />
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="none" stroke="#d4d4d8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" clipPath={`url(#half-r-${star})`} />
                          </>
                        ) : (
                          <path
                            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                            fill={isFull ? '#facc15' : 'none'}
                            stroke={isFull ? '#facc15' : '#d4d4d8'}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}
                      </svg>
                    </div>
                  </div>
                );
              })}
              {(hoveredRating || rating) > 0 && (
                <span className="ml-2 text-sm text-muted-foreground font-medium">
                  {hoveredRating || rating}/5
                </span>
              )}
            </div>

            <Textarea
              placeholder="Any thoughts you'd like to share? (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={rating === 0 || isSubmitting || isLoading}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingId ? 'Update' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
