import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Upload, X, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface GuideCourse {
  id?: string;
  name: string;
  slug: string;
  description: string;
  mentor_name: string;
  mentor_info: string;
  duration: string;
  image_url: string;
  is_published: boolean;
}

interface GuideCourseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: GuideCourse | null;
  onSave: (course: GuideCourse) => Promise<void>;
}

const defaultCourse: GuideCourse = {
  name: "",
  slug: "",
  description: "",
  mentor_name: "",
  mentor_info: "",
  duration: "",
  image_url: "",
  is_published: false,
};

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

export function GuideCourseForm({ open, onOpenChange, course, onSave }: GuideCourseFormProps) {
  const [formData, setFormData] = useState<GuideCourse>(defaultCourse);
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

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Invalid file type. Please upload a JPEG, PNG, or WEBP image.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File too large. Maximum size is 5MB.";
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImageError(null);
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setImageError(error);
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setFormData({ ...formData, image_url: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `guides/covers/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("course-images")
      .upload(filePath, file, { cacheControl: "3600", upsert: false });

    if (uploadError) throw new Error(`Failed to upload image: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from("course-images").getPublicUrl(filePath);
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let imageUrl = formData.image_url;
      if (imageFile) {
        setIsUploading(true);
        imageUrl = await uploadImage(imageFile);
        setIsUploading(false);
      }
      await onSave({ ...formData, image_url: imageUrl });
      onOpenChange(false);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Failed to save guide");
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
          <DialogTitle>{isEditing ? "Edit Guide" : "Create New Guide"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update guide course details." : "Fill in details for a new text-based guide course."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="guide-name">Guide Name *</Label>
              <Input
                id="guide-name"
                required
                value={formData.name}
                onChange={(e) => {
                  const newName = e.target.value;
                  const autoSlug = !formData.slug || formData.slug === slugify(formData.name);
                  setFormData({
                    ...formData,
                    name: newName,
                    ...(autoSlug ? { slug: slugify(newName) } : {}),
                  });
                }}
                placeholder="e.g., Claude 101 — Sub Agents & Hooks"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="guide-slug">URL Slug</Label>
              <Input
                id="guide-slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })
                }
                placeholder="e.g., claude-101-sub-agents"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="guide-description">Description</Label>
              <Textarea
                id="guide-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description shown on the course card..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guide-mentor">Author / Instructor</Label>
              <Input
                id="guide-mentor"
                value={formData.mentor_name}
                onChange={(e) => setFormData({ ...formData, mentor_name: e.target.value })}
                placeholder="Ava (Approachable Virtual Assistant)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guide-duration">Reading Time</Label>
              <Input
                id="guide-duration"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="e.g., 30 min read"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Cover Image</Label>
              <div className="space-y-3">
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Cover preview"
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
                    id="guide-cover-image"
                  />
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSaving}>
                    <Upload className="mr-2 h-4 w-4" />
                    {imagePreview ? "Change Image" : "Upload Image"}
                  </Button>
                  <span className="text-sm text-muted-foreground">JPEG, PNG, or WEBP (max 5MB)</span>
                </div>
                {imageError && <p className="text-sm font-medium text-destructive">{imageError}</p>}
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="guide-mentor-info">Author Bio</Label>
              <Textarea
                id="guide-mentor-info"
                value={formData.mentor_info}
                onChange={(e) => setFormData({ ...formData, mentor_info: e.target.value })}
                placeholder="Optional author bio..."
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2 md:col-span-2">
              <Switch
                id="guide-published"
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
              />
              <Label htmlFor="guide-published">Publish guide (visible to learners)</Label>
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
                  {isUploading ? "Uploading..." : "Saving..."}
                </>
              ) : isEditing ? (
                "Update Guide"
              ) : (
                "Create Guide"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
