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
            {/* Star rating */}
            <div className="flex items-center gap-1 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className="h-8 w-8 transition-colors"
                    fill={(hoveredRating || rating) >= star ? '#facc15' : 'none'}
                    stroke={(hoveredRating || rating) >= star ? '#facc15' : 'currentColor'}
                  />
                </button>
              ))}
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
