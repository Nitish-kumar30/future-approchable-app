import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, Trash2, BookOpen, ClipboardList } from 'lucide-react';

interface PreReadingMaterial {
  id?: string;
  title: string;
  link: string;
  display_order: number;
}

interface Session {
  id?: string;
  title: string;
  description: string;
  cohort_id: string | null;
  course_id: string | null;
  session_date: string;
  recording_url: string;
  presentation_url: string;
  session_order: number;
}

interface Cohort {
  id: string;
  name: string;
}

interface Course {
  id: string;
  name: string;
}

interface Quiz {
  id: string;
  title: string;
}

interface SessionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session?: Session | null;
  cohorts: Cohort[];
  courses: Course[];
  quizzes: Quiz[];
  preReadingMaterials?: PreReadingMaterial[];
  selectedQuizIds?: string[];
  onSave: (session: Session, materials: PreReadingMaterial[], quizIds: string[]) => Promise<void>;
}

const defaultSession: Session = {
  title: '',
  description: '',
  cohort_id: null,
  course_id: null,
  session_date: '',
  recording_url: '',
  presentation_url: '',
  session_order: 0,
};

export function SessionForm({ 
  open, 
  onOpenChange, 
  session, 
  cohorts, 
  courses,
  quizzes,
  preReadingMaterials = [],
  selectedQuizIds = [],
  onSave 
}: SessionFormProps) {
  const [formData, setFormData] = useState<Session>(defaultSession);
  const [materials, setMaterials] = useState<PreReadingMaterial[]>([]);
  const [selectedQuizzes, setSelectedQuizzes] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [parentType, setParentType] = useState<'cohort' | 'course'>('cohort');

  useEffect(() => {
    if (open) {
      if (session) {
        setFormData({
          ...session,
          session_date: session.session_date ? new Date(session.session_date).toISOString().slice(0, 16) : '',
        });
        setParentType(session.cohort_id ? 'cohort' : 'course');
        setMaterials(preReadingMaterials.length > 0 ? preReadingMaterials : []);
        setSelectedQuizzes(selectedQuizIds);
      } else {
        setFormData(defaultSession);
        setParentType('cohort');
        setMaterials([]);
        setSelectedQuizzes([]);
      }
    }
  }, [session, open, preReadingMaterials, selectedQuizIds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const dataToSave = {
      ...formData,
      cohort_id: parentType === 'cohort' ? formData.cohort_id : null,
      course_id: parentType === 'course' ? formData.course_id : null,
      session_date: formData.session_date ? new Date(formData.session_date).toISOString() : null,
    };

    const validMaterials = materials.filter(m => m.title.trim() && m.link.trim());
    
    await onSave(dataToSave as Session, validMaterials, selectedQuizzes);
    setIsSaving(false);
    onOpenChange(false);
  };

  const addMaterial = () => {
    setMaterials([...materials, { title: '', link: '', display_order: materials.length }]);
  };

  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const updateMaterial = (index: number, field: keyof PreReadingMaterial, value: string | number) => {
    const updated = [...materials];
    updated[index] = { ...updated[index], [field]: value };
    setMaterials(updated);
  };

  const toggleQuiz = (quizId: string) => {
    setSelectedQuizzes(prev => 
      prev.includes(quizId) 
        ? prev.filter(id => id !== quizId)
        : [...prev, quizId]
    );
  };

  const isEditing = !!session?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Session' : 'Create New Session'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update session details below.' : 'Fill in the details to create a new session.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Session Title *</Label>
              <Input
                id="title"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Introduction to React Hooks"
              />
            </div>

            <div className="space-y-2">
              <Label>Belongs to</Label>
              <Select value={parentType} onValueChange={(v) => setParentType(v as 'cohort' | 'course')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cohort">Cohort</SelectItem>
                  <SelectItem value="course">Course</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {parentType === 'cohort' ? (
              <div className="space-y-2">
                <Label>Select Cohort *</Label>
                <Select 
                  value={formData.cohort_id || ''} 
                  onValueChange={(v) => setFormData({ ...formData, cohort_id: v, course_id: null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a cohort" />
                  </SelectTrigger>
                  <SelectContent>
                    {cohorts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Select Course *</Label>
                <Select 
                  value={formData.course_id || ''} 
                  onValueChange={(v) => setFormData({ ...formData, course_id: v, cohort_id: null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What will be covered in this session..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="session_date">Session Date & Time</Label>
              <Input
                id="session_date"
                type="datetime-local"
                value={formData.session_date}
                onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="session_order">Order</Label>
              <Input
                id="session_order"
                type="number"
                value={formData.session_order}
                onChange={(e) => setFormData({ ...formData, session_order: parseInt(e.target.value) || 0 })}
                placeholder="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recording_url">Recording URL</Label>
              <Input
                id="recording_url"
                type="url"
                value={formData.recording_url}
                onChange={(e) => setFormData({ ...formData, recording_url: e.target.value })}
                placeholder="https://youtube.com/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="presentation_url">Presentation/Slides URL</Label>
              <Input
                id="presentation_url"
                type="url"
                value={formData.presentation_url}
                onChange={(e) => setFormData({ ...formData, presentation_url: e.target.value })}
                placeholder="https://docs.google.com/..."
              />
            </div>
          </div>

          <Separator />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Assign Quizzes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quizzes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No quizzes available. Create quizzes first in the Quizzes tab.
                </p>
              ) : (
                <div className="space-y-2">
                  {quizzes.map((quiz) => (
                    <div key={quiz.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50">
                      <Checkbox
                        id={`quiz-${quiz.id}`}
                        checked={selectedQuizzes.includes(quiz.id)}
                        onCheckedChange={() => toggleQuiz(quiz.id)}
                      />
                      <label 
                        htmlFor={`quiz-${quiz.id}`}
                        className="text-sm font-medium leading-none cursor-pointer flex-1"
                      >
                        {quiz.title}
                      </label>
                    </div>
                  ))}
                </div>
              )}
              {selectedQuizzes.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedQuizzes.length} quiz{selectedQuizzes.length !== 1 ? 'zes' : ''} selected
                </p>
              )}
            </CardContent>
          </Card>

          <Separator />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Pre-Reading Materials
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {materials.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No pre-reading materials added yet.
                </p>
              ) : (
                materials.map((material, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Material {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMaterial(index)}
                        className="text-destructive hover:text-destructive h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`material-title-${index}`}>Title</Label>
                        <Input
                          id={`material-title-${index}`}
                          value={material.title}
                          onChange={(e) => updateMaterial(index, 'title', e.target.value)}
                          placeholder="e.g., Introduction to React"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`material-order-${index}`}>Order</Label>
                        <Input
                          id={`material-order-${index}`}
                          type="number"
                          min={0}
                          value={material.display_order}
                          onChange={(e) => updateMaterial(index, 'display_order', parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`material-link-${index}`}>Link (URL)</Label>
                      <Input
                        id={`material-link-${index}`}
                        type="url"
                        value={material.link}
                        onChange={(e) => updateMaterial(index, 'link', e.target.value)}
                        placeholder="https://example.com/article"
                      />
                    </div>
                  </div>
                ))
              )}
              
              <Button type="button" variant="outline" onClick={addMaterial} className="w-full gap-2">
                <Plus className="h-4 w-4" /> Add Pre-Reading Material
              </Button>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || (parentType === 'cohort' && !formData.cohort_id) || (parentType === 'course' && !formData.course_id)}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? 'Update Session' : 'Create Session'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
