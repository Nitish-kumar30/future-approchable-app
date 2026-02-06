import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  enrollment_disabled: boolean;
}

interface CohortFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cohort?: Cohort | null;
  onSave: (cohort: Cohort) => Promise<void>;
}

const TIMEZONES = ['IST', 'EST', 'PST', 'GMT', 'UTC', 'CST', 'MST', 'CET', 'AEST'];

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
  enrollment_disabled: false,
};

// Parse session_time string like "7:30PM IST" into components
function parseSessionTime(sessionTime: string): { time: string; timezone: string } {
  if (!sessionTime) return { time: '', timezone: 'IST' };
  const match = sessionTime.match(/^(\d{1,2}:\d{2}(?:AM|PM)?)\s*(.*)$/i);
  if (match) {
    return { time: match[1].toUpperCase(), timezone: match[2] || 'IST' };
  }
  return { time: '', timezone: 'IST' };
}

// Format time from 24h input to 12h display
function formatTo12Hour(time24: string): string {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')}${period}`;
}

// Parse 12h time to 24h for input value
function parseTo24Hour(time12: string): string {
  if (!time12) return '';
  const match = time12.match(/^(\d{1,2}):(\d{2})(AM|PM)$/i);
  if (!match) return '';
  let hours = parseInt(match[1]);
  const minutes = match[2];
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

export function CohortForm({ open, onOpenChange, cohort, onSave }: CohortFormProps) {
  const [formData, setFormData] = useState<Cohort>(defaultCohort);
  const [isSaving, setIsSaving] = useState(false);
  const [timeValue, setTimeValue] = useState('');
  const [timezone, setTimezone] = useState('IST');

  useEffect(() => {
    if (cohort) {
      setFormData({
        ...cohort,
        start_date: cohort.start_date || '',
        end_date: cohort.end_date || '',
      });
      const parsed = parseSessionTime(cohort.session_time || '');
      setTimeValue(parseTo24Hour(parsed.time));
      setTimezone(parsed.timezone || 'IST');
    } else {
      setFormData(defaultCohort);
      setTimeValue('');
      setTimezone('IST');
    }
  }, [cohort, open]);

  const handleTimeChange = (newTime: string) => {
    setTimeValue(newTime);
    const formatted = formatTo12Hour(newTime);
    setFormData({ ...formData, session_time: formatted ? `${formatted} ${timezone}` : '' });
  };

  const handleTimezoneChange = (newTz: string) => {
    setTimezone(newTz);
    const formatted = formatTo12Hour(timeValue);
    setFormData({ ...formData, session_time: formatted ? `${formatted} ${newTz}` : '' });
  };

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
              <div className="flex gap-2">
                <Input
                  id="session_time"
                  type="time"
                  value={timeValue}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="flex-1"
                />
                <Select value={timezone} onValueChange={handleTimezoneChange}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

            <div className="flex items-center space-x-2 md:col-span-2">
              <Switch
                id="enrollment_disabled"
                checked={formData.enrollment_disabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enrollment_disabled: checked })}
              />
              <Label htmlFor="enrollment_disabled">Disable enrollment (new learners will see "Closed")</Label>
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
