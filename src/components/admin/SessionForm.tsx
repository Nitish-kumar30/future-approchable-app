import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Plus, Trash2, BookOpen, ClipboardList, FolderKanban, FileText, Upload, ImagePlus, Eye, EyeOff } from 'lucide-react';
import { Markdown } from '@/components/ui/markdown';
import { uploadContentImage } from '@/lib/uploadContentImage';

interface PreReadingMaterial {
  id?: string;
  title: string;
  link: string;
  display_order: number;
}

interface MiniProject {
  id?: string;
  title: string;
  description: string;
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
  is_content_unlocked: boolean;
  text_content: string;
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
  miniProjects?: MiniProject[];
  onSave: (session: Session, materials: PreReadingMaterial[], quizIds: string[], projects: MiniProject[]) => Promise<void>;
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
  is_content_unlocked: false,
  text_content: '',
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
  miniProjects: initialMiniProjects = [],
  onSave 
}: SessionFormProps) {
  const [formData, setFormData] = useState<Session>(defaultSession);
  const [materials, setMaterials] = useState<PreReadingMaterial[]>([]);
  const [selectedQuizzes, setSelectedQuizzes] = useState<string[]>([]);
  const [miniProjects, setMiniProjects] = useState<MiniProject[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [parentType, setParentType] = useState<'cohort' | 'course'>('cohort');
  const [showPreview, setShowPreview] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const textContentRef = useRef<HTMLTextAreaElement>(null);
  const mdFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (session) {
        setFormData({
          ...session,
          text_content: session.text_content || '',
          session_date: session.session_date ? new Date(session.session_date).toISOString().slice(0, 16) : '',
        });
        setParentType(session.cohort_id ? 'cohort' : 'course');
      } else {
        setFormData(defaultSession);
        setParentType('cohort');
        setMaterials([]);
        setSelectedQuizzes([]);
        setMiniProjects([]);
      }
    }
  }, [session, open]);

  // Update materials when props change (separate effect to handle async data loading)
  useEffect(() => {
    if (open && session) {
      setMaterials(preReadingMaterials.length > 0 ? [...preReadingMaterials] : []);
    }
  }, [open, session, preReadingMaterials]);

  // Update selected quizzes when props change
  useEffect(() => {
    if (open && session) {
      setSelectedQuizzes([...selectedQuizIds]);
    }
  }, [open, session, selectedQuizIds]);

  // Update mini projects when props change
  useEffect(() => {
    if (open && session) {
      setMiniProjects(initialMiniProjects.length > 0 ? [...initialMiniProjects] : []);
    }
  }, [open, session, initialMiniProjects]);

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
    const validProjects = miniProjects.filter(p => p.title.trim());
    
    await onSave(dataToSave as Session, validMaterials, selectedQuizzes, validProjects);
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

  const addProject = () => {
    setMiniProjects([...miniProjects, { title: '', description: '', display_order: miniProjects.length }]);
  };

  const removeProject = (index: number) => {
    setMiniProjects(miniProjects.filter((_, i) => i !== index));
  };

  const updateProject = (index: number, field: keyof MiniProject, value: string | number) => {
    const updated = [...miniProjects];
    updated[index] = { ...updated[index], [field]: value };
    setMiniProjects(updated);
  };

  const insertAtCursor = (text: string) => {
    const textarea = textContentRef.current;
    if (!textarea) {
      setFormData((prev) => ({
        ...prev,
        text_content: prev.text_content ? `${prev.text_content}\n\n${text}` : text,
      }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = formData.text_content;
    const before = current.slice(0, start);
    const after = current.slice(end);
    const needsLeadingNewline = before.length > 0 && !before.endsWith('\n');
    const needsTrailingNewline = after.length > 0 && !after.startsWith('\n');
    const insertion = `${needsLeadingNewline ? '\n\n' : ''}${text}${needsTrailingNewline ? '\n\n' : ''}`;
    const updated = before + insertion + after;

    setFormData((prev) => ({ ...prev, text_content: updated }));

    requestAnimationFrame(() => {
      textarea.focus();
      const cursorPos = before.length + insertion.length;
      textarea.setSelectionRange(cursorPos, cursorPos);
    });
  };

  const handleMdFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      if (formData.text_content.trim() && !window.confirm('Replace existing text content with the uploaded file?')) {
        if (mdFileInputRef.current) mdFileInputRef.current.value = '';
        return;
      }
      setFormData((prev) => ({ ...prev, text_content: content }));
      setContentError(null);
      if (mdFileInputRef.current) mdFileInputRef.current.value = '';
    };
    reader.onerror = () => {
      setContentError('Failed to read the markdown file.');
      if (mdFileInputRef.current) mdFileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setContentError(null);
    try {
      const url = await uploadContentImage(file, session?.id);
      const alt = file.name.replace(/\.[^.]+$/, '') || 'image';
      insertAtCursor(`![${alt}](${url})`);
    } catch (err) {
      setContentError(err instanceof Error ? err.message : 'Failed to upload image.');
    } finally {
      setIsUploadingImage(false);
      if (imageFileInputRef.current) imageFileInputRef.current.value = '';
    }
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
                placeholder="YouTube, Vimeo, or https://gumlet.tv/watch/..."
              />
              <p className="text-xs text-muted-foreground">
                Paste a YouTube, Vimeo, or Gumlet link. The player is chosen automatically.
              </p>
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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Text Lesson Content (Markdown)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Optional. Supports Markdown. Use with or without a video — shown below the video when both are present.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => mdFileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload .md file
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={isUploadingImage}
                  onClick={() => imageFileInputRef.current?.click()}
                >
                  {isUploadingImage ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-3.5 w-3.5" />
                  )}
                  Insert image
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setShowPreview((v) => !v)}
                >
                  {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {showPreview ? 'Hide preview' : 'Show preview'}
                </Button>
              </div>
              <input
                ref={mdFileInputRef}
                type="file"
                accept=".md,.markdown,.txt,text/markdown,text/plain"
                className="hidden"
                onChange={handleMdFileUpload}
              />
              <input
                ref={imageFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageUpload}
              />
              <Textarea
                ref={textContentRef}
                id="text_content"
                value={formData.text_content}
                onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
                placeholder="Write markdown here, or upload a .md file..."
                rows={12}
                className="font-mono text-sm"
              />
              {contentError && (
                <p className="text-xs text-destructive">{contentError}</p>
              )}
              {showPreview && formData.text_content.trim() && (
                <div className="rounded-lg border p-4 bg-muted/20">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Preview</p>
                  <Markdown content={formData.text_content} />
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is_content_unlocked" className="text-sm font-medium">Unlock content for learners</Label>
              <p className="text-xs text-muted-foreground">When enabled, learners can see quizzes, materials, and projects for this session</p>
            </div>
            <Switch
              id="is_content_unlocked"
              checked={formData.is_content_unlocked}
              onCheckedChange={(checked) => setFormData({ ...formData, is_content_unlocked: checked })}
            />
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
                <>
                  <p className="text-xs text-muted-foreground">
                    {quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''} available
                  </p>
                  <ScrollArea className="h-48 border rounded-md p-2">
                    <div className="space-y-1">
                      {quizzes.map((quiz) => (
                        <div key={quiz.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
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
                  </ScrollArea>
                </>
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

          <Separator />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FolderKanban className="h-4 w-4" />
                Mini Projects
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {miniProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No mini projects added yet.
                </p>
              ) : (
                miniProjects.map((project, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Project {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProject(index)}
                        className="text-destructive hover:text-destructive h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`project-title-${index}`}>Title</Label>
                        <Input
                          id={`project-title-${index}`}
                          value={project.title}
                          onChange={(e) => updateProject(index, 'title', e.target.value)}
                          placeholder="e.g., Build a Todo App"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`project-order-${index}`}>Order</Label>
                        <Input
                          id={`project-order-${index}`}
                          type="number"
                          min={0}
                          value={project.display_order}
                          onChange={(e) => updateProject(index, 'display_order', parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`project-description-${index}`}>Description</Label>
                      <Textarea
                        id={`project-description-${index}`}
                        value={project.description}
                        onChange={(e) => updateProject(index, 'description', e.target.value)}
                        placeholder="Brief description of the mini project..."
                        rows={2}
                      />
                    </div>
                  </div>
                ))
              )}
              
              <Button type="button" variant="outline" onClick={addProject} className="w-full gap-2">
                <Plus className="h-4 w-4" /> Add Mini Project
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
