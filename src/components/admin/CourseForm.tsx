import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Upload, X, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Course {
  id?: string;
  name: string;
  slug: string;
  description: string;
  mentor_name: string;
  mentor_info: string;
  duration: string;
  image_url: string;
  start_date: string;
  is_published: boolean;
  enrollment_disabled: boolean;
  is_on_demand: boolean;
}

interface CourseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: Course | null;
  onSave: (course: Course) => Promise<void>;
}

const defaultCourse: Course = {
  name: '',
  slug: '',
  description: '',
  mentor_name: '',
  mentor_info: '',
  duration: '',
  image_url: '',
  start_date: '',
  is_published: false,
  enrollment_disabled: false,
  is_on_demand: false,
};

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function CourseForm({ open, onOpenChange, course, onSave }: CourseFormProps) {
  const [formData, setFormData] = useState<Course>(defaultCourse);
  const [isSaving, setIsSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (course) {
      setFormData(course);
      setImagePreview(course.image_url || null);
    } else {
      setFormData(defaultCourse);
      setImagePreview(null);
    }
    setImageFile(null);
    setImageError(null);
  }, [course, open]);

  // Cleanup blob URL on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload a JPEG, PNG, or WEBP image.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is 5MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`;
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImageError(null);

    if (!file) {
      return;
    }

    const error = validateFile(file);
    if (error) {
      setImageError(error);
      setImageFile(null);
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Revoke previous blob URL if exists
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const handleRemoveImage = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(null);
    setFormData({ ...formData, image_url: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `courses/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('course-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('course-images')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let imageUrl = formData.image_url;

      // Upload new image if selected
      if (imageFile) {
        setIsUploading(true);
        imageUrl = await uploadImage(imageFile);
        setIsUploading(false);
      }

      await onSave({ ...formData, image_url: imageUrl });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving course:', error);
      setImageError(error instanceof Error ? error.message : 'Failed to save course');
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  const isEditing = !!course?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Course' : 'Create New Course'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update course details below.' : 'Fill in the details to create a new course.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Course Name *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => {
                  const newName = e.target.value;
                  const autoSlug = !formData.slug || formData.slug === formData.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
                  setFormData({
                    ...formData,
                    name: newName,
                    ...(autoSlug ? { slug: newName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-') } : {}),
                  });
                }}
                placeholder="e.g., Introduction to Machine Learning"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                placeholder="e.g., intro-to-machine-learning"
              />
              <p className="text-xs text-muted-foreground">Used in the URL. Auto-generated from name if left empty.</p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what learners will gain from this course..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mentor_name">Instructor Name</Label>
              <Input
                id="mentor_name"
                value={formData.mentor_name}
                onChange={(e) => setFormData({ ...formData, mentor_name: e.target.value })}
                placeholder="Jane Smith"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="e.g., 8 weeks, 20 hours"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date & Time</Label>
              <Input
                id="start_date"
                type="datetime-local"
                value={formData.start_date ? formData.start_date.slice(0, 16) : ''}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value ? new Date(e.target.value).toISOString() : '' })}
              />
            </div>

            {/* Course Image Upload */}
            <div className="space-y-2 md:col-span-2">
              <Label>Course Image</Label>
              <div className="space-y-3">
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Course preview"
                      className="h-32 w-48 object-cover rounded-md border border-border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 w-48 border-2 border-dashed border-muted-foreground/25 rounded-md bg-muted/50">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                    id="course-image"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSaving}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {imagePreview ? 'Change Image' : 'Upload Image'}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    JPEG, PNG, or WEBP (max 5MB)
                  </span>
                </div>

                {imageError && (
                  <p className="text-sm font-medium text-destructive">{imageError}</p>
                )}
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="mentor_info">Instructor Bio</Label>
              <Textarea
                id="mentor_info"
                value={formData.mentor_info}
                onChange={(e) => setFormData({ ...formData, mentor_info: e.target.value })}
                placeholder="Brief introduction about the instructor..."
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2 md:col-span-2">
              <Switch
                id="is_on_demand"
                checked={formData.is_on_demand}
                onCheckedChange={(checked) => setFormData({ ...formData, is_on_demand: checked, enrollment_disabled: checked ? false : formData.enrollment_disabled })}
              />
              <Label htmlFor="is_on_demand">On-demand course (no enrollment required, content gated by login)</Label>
            </div>

            <div className="flex items-center space-x-2 md:col-span-2">
              <Switch
                id="is_published"
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
              />
              <Label htmlFor="is_published">Publish course (visible to learners)</Label>
            </div>

            {!formData.is_on_demand && (
              <div className="flex items-center space-x-2 md:col-span-2">
                <Switch
                  id="enrollment_disabled"
                  checked={formData.enrollment_disabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, enrollment_disabled: checked })}
                />
                <Label htmlFor="enrollment_disabled">Disable enrollment (new learners will see "Closed")</Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isUploading ? 'Uploading...' : 'Saving...'}
                </>
              ) : isEditing ? 'Update Course' : 'Create Course'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
