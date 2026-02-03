import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface MiniProject {
  id?: string;
  title: string;
  description: string;
  display_order: number;
}

interface MiniProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  sessionTitle: string;
  projects: MiniProject[];
  onSave: (projects: MiniProject[]) => Promise<void>;
}

export function MiniProjectForm({ 
  open, 
  onOpenChange, 
  sessionTitle,
  projects: initialProjects,
  onSave 
}: MiniProjectFormProps) {
  const [projects, setProjects] = useState<MiniProject[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setProjects(initialProjects.length > 0 ? initialProjects : [{ title: '', description: '', display_order: 0 }]);
    }
  }, [open, initialProjects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validProjects = projects.filter(p => p.title.trim());
    setIsSaving(true);
    await onSave(validProjects);
    setIsSaving(false);
    onOpenChange(false);
  };

  const addProject = () => {
    setProjects([...projects, { title: '', description: '', display_order: projects.length }]);
  };

  const removeProject = (index: number) => {
    setProjects(projects.filter((_, i) => i !== index));
  };

  const updateProject = (index: number, field: keyof MiniProject, value: string | number) => {
    const updated = [...projects];
    updated[index] = { ...updated[index], [field]: value };
    setProjects(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mini Projects</DialogTitle>
          <DialogDescription>
            Add mini projects for: {sessionTitle}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {projects.map((project, index) => (
            <Card key={index} className="relative">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Project {index + 1}</span>
                  {projects.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProject(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`title-${index}`}>Title</Label>
                    <Input
                      id={`title-${index}`}
                      value={project.title}
                      onChange={(e) => updateProject(index, 'title', e.target.value)}
                      placeholder="e.g., Build a Todo App"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`order-${index}`}>Order</Label>
                    <Input
                      id={`order-${index}`}
                      type="number"
                      min={0}
                      value={project.display_order}
                      onChange={(e) => updateProject(index, 'display_order', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`description-${index}`}>Description</Label>
                  <Textarea
                    id={`description-${index}`}
                    value={project.description}
                    onChange={(e) => updateProject(index, 'description', e.target.value)}
                    placeholder="Brief description of the mini project..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
          
          <Button type="button" variant="outline" onClick={addProject} className="w-full gap-2">
            <Plus className="h-4 w-4" /> Add Another Project
          </Button>

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
              ) : 'Save Projects'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
