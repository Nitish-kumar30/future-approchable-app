import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface Cohort {
  id?: string;
  name: string;
  description: string;
  mentor_name: string;
  mentor_info: string;
  start_date: string;
  end_date: string;
  max_seats: number | null;
  session_time: string;
  meeting_link: string;
  group_link: string;
  is_published: boolean;
}

interface CohortFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cohort?: Cohort | null;
  onSave: (cohort: Cohort) => Promise<void>;
}

const defaultCohort: Cohort = {
  name: '',
  description: '',
  mentor_name: '',
  mentor_info: '',
  start_date: '',
  end_date: '',
  max_seats: null,
  session_time: '',
  meeting_link: '',
  group_link: '',
  is_published: false,
};

export function CohortForm({ open, onOpenChange, cohort, onSave }: CohortFormProps) {
  const [formData, setFormData] = useState<Cohort>(defaultCohort);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (cohort) {
      setFormData({
        ...cohort,
        start_date: cohort.start_date || '',
        end_date: cohort.end_date || '',
      });
    } else {
      setFormData(defaultCohort);
    }
  }, [cohort, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
    onOpenChange(false);
  };

  const isEditing = !!cohort?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Cohort' : 'Create New Cohort'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update cohort details below.' : 'Fill in the details to create a new cohort.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Cohort Name *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Web Development Bootcamp - Spring 2024"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what learners will gain from this cohort..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mentor_name">Mentor Name</Label>
              <Input
                id="mentor_name"
                value={formData.mentor_name}
                onChange={(e) => setFormData({ ...formData, mentor_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_seats">Max Seats</Label>
              <Input
                id="max_seats"
                type="number"
                value={formData.max_seats || ''}
                onChange={(e) => setFormData({ ...formData, max_seats: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="session_time">Session Time</Label>
              <Input
                id="session_time"
                value={formData.session_time}
                onChange={(e) => setFormData({ ...formData, session_time: e.target.value })}
                placeholder="e.g., 7:30PM IST"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="mentor_info">Mentor Bio</Label>
              <Textarea
                id="mentor_info"
                value={formData.mentor_info}
                onChange={(e) => setFormData({ ...formData, mentor_info: e.target.value })}
                placeholder="Brief introduction about the mentor..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting_link">Meeting Link (for enrolled learners)</Label>
              <Input
                id="meeting_link"
                type="url"
                value={formData.meeting_link}
                onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                placeholder="https://zoom.us/j/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group_link">Group Link (for enrolled learners)</Label>
              <Input
                id="group_link"
                type="url"
                value={formData.group_link}
                onChange={(e) => setFormData({ ...formData, group_link: e.target.value })}
                placeholder="https://discord.gg/..."
              />
            </div>

            <div className="flex items-center space-x-2 md:col-span-2">
              <Switch
                id="is_published"
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
              />
              <Label htmlFor="is_published">Publish cohort (visible to learners)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? 'Update Cohort' : 'Create Cohort'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
