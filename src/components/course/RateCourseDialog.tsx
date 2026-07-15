import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from '@/components/course/StarRating';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialRating: number;
  initialComment: string;
  onSubmit: (rating: number, comment: string) => Promise<void> | void;
}

export default function RateCourseDialog({ open, onOpenChange, initialRating, initialComment, onSubmit }: Props) {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    await onSubmit(rating, comment);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Rate this course</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <StarRating value={rating} onChange={setRating} />
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional feedback (max 2000 chars)"
            maxLength={2000}
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!rating || saving}>
            {saving ? 'Saving...' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
