import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface PreReadingMaterial {
  id?: string;
  title: string;
  link: string;
  display_order: number;
}

interface PreReadingMaterialFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  sessionTitle: string;
  materials: PreReadingMaterial[];
  onSave: (materials: PreReadingMaterial[]) => Promise<void>;
}

export function PreReadingMaterialForm({ 
  open, 
  onOpenChange, 
  sessionTitle,
  materials: initialMaterials,
  onSave 
}: PreReadingMaterialFormProps) {
  const [materials, setMaterials] = useState<PreReadingMaterial[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setMaterials(initialMaterials.length > 0 ? initialMaterials : [{ title: '', link: '', display_order: 0 }]);
    }
  }, [open, initialMaterials]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validMaterials = materials.filter(m => m.title.trim() && m.link.trim());
    setIsSaving(true);
    await onSave(validMaterials);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pre-Reading Materials</DialogTitle>
          <DialogDescription>
            Add pre-reading materials for: {sessionTitle}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {materials.map((material, index) => (
            <Card key={index} className="relative">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Material {index + 1}</span>
                  {materials.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMaterial(index)}
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
                      value={material.title}
                      onChange={(e) => updateMaterial(index, 'title', e.target.value)}
                      placeholder="e.g., Introduction to React"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`order-${index}`}>Order</Label>
                    <Input
                      id={`order-${index}`}
                      type="number"
                      min={0}
                      value={material.display_order}
                      onChange={(e) => updateMaterial(index, 'display_order', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`link-${index}`}>Link (URL)</Label>
                  <Input
                    id={`link-${index}`}
                    type="url"
                    value={material.link}
                    onChange={(e) => updateMaterial(index, 'link', e.target.value)}
                    placeholder="https://example.com/article"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
          
          <Button type="button" variant="outline" onClick={addMaterial} className="w-full gap-2">
            <Plus className="h-4 w-4" /> Add Another Material
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
              ) : 'Save Materials'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
