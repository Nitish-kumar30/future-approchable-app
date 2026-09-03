import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Plus,
  Trash2,
  Pencil,
  Upload,
  ChevronUp,
  ChevronDown,
  Copy,
  Check,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Markdown } from "@/components/ui/markdown";
import { parseChapterTitle, stripLeadingH1 } from "@/lib/guideMarkdown";

export interface GuideChapter {
  id: string;
  course_id: string;
  title: string;
  content_markdown: string;
  chapter_order: number;
}

interface GuideChapterManagerProps {
  courseId: string;
  courseName: string;
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export function GuideChapterManager({ courseId, courseName }: GuideChapterManagerProps) {
  const { toast } = useToast();
  const [chapters, setChapters] = useState<GuideChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const mdInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const loadChapters = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("guide_chapters")
      .select("*")
      .eq("course_id", courseId)
      .order("chapter_order", { ascending: true });
    if (error) {
      toast({ title: "Failed to load chapters", description: error.message, variant: "destructive" });
    } else {
      setChapters(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadChapters();
  }, [courseId]);

  const startEdit = (chapter: GuideChapter) => {
    setEditingId(chapter.id);
    setDraftTitle(chapter.title);
    setDraftContent(chapter.content_markdown);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftTitle("");
    setDraftContent("");
  };

  const saveChapter = async () => {
    if (!editingId || !draftTitle.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("guide_chapters")
      .update({ title: draftTitle.trim(), content_markdown: draftContent })
      .eq("id", editingId);
    setSaving(false);
    if (error) {
      toast({ title: "Failed to save chapter", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Chapter saved" });
    cancelEdit();
    loadChapters();
  };

  const deleteChapter = async (id: string) => {
    if (!confirm("Delete this chapter?")) return;
    const { error } = await supabase.from("guide_chapters").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
      return;
    }
    if (editingId === id) cancelEdit();
    loadChapters();
  };

  const moveChapter = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= chapters.length) return;
    const reordered = [...chapters];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const withOrder = reordered.map((ch, i) => ({ ...ch, chapter_order: i + 1 }));
    setChapters(withOrder);
    await Promise.all(
      withOrder.map((ch) =>
        supabase.from("guide_chapters").update({ chapter_order: ch.chapter_order }).eq("id", ch.id),
      ),
    );
  };

  const handleMdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setSaving(true);
    const startOrder = chapters.length;
    const newChapters: GuideChapter[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const text = await file.text();
      const title = parseChapterTitle(text, file.name);
      const content = stripLeadingH1(text);

      const { data, error } = await supabase
        .from("guide_chapters")
        .insert({
          course_id: courseId,
          title,
          content_markdown: content,
          chapter_order: startOrder + i + 1,
        })
        .select()
        .single();

      if (error) {
        toast({ title: `Failed to upload ${file.name}`, description: error.message, variant: "destructive" });
      } else if (data) {
        newChapters.push(data);
      }
    }

    setSaving(false);
    if (newChapters.length) {
      toast({ title: `Uploaded ${newChapters.length} chapter(s)` });
      loadChapters();
    }
    if (mdInputRef.current) mdInputRef.current.value = "";
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Use JPEG, PNG, or WEBP.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast({ title: "File too large", description: "Maximum size is 5MB.", variant: "destructive" });
      return;
    }

    setUploadingImage(true);
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `guides/${courseId}/${crypto.randomUUID()}.${fileExt}`;

    const { error } = await supabase.storage.from("course-images").upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

    setUploadingImage(false);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return;
    }

    const { data: urlData } = supabase.storage.from("course-images").getPublicUrl(filePath);
    setUploadedUrls((prev) => [urlData.publicUrl, ...prev]);
    toast({ title: "Image uploaded", description: "Copy the URL to use in your markdown." });
    if (imgInputRef.current) imgInputRef.current.value = "";
  };

  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Chapters — {courseName}</h3>
          <p className="text-sm text-muted-foreground">{chapters.length} chapter(s)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            ref={mdInputRef}
            type="file"
            accept=".md,text/markdown"
            multiple
            className="hidden"
            onChange={handleMdUpload}
          />
          <Button size="sm" onClick={() => mdInputRef.current?.click()} disabled={saving}>
            <Upload className="h-4 w-4 mr-1" />
            Upload .md files
          </Button>
        </div>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Image Manager</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Upload images here, then copy the URL and paste into your markdown as{" "}
          <code className="bg-muted px-1 rounded">![alt](url)</code>. External image URLs also work.
        </p>
        <div className="flex gap-2">
          <Input
            ref={imgInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleImageUpload}
          />
          <Button size="sm" variant="outline" onClick={() => imgInputRef.current?.click()} disabled={uploadingImage}>
            {uploadingImage ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            Upload Image
          </Button>
        </div>
        {uploadedUrls.length > 0 && (
          <div className="space-y-2">
            {uploadedUrls.map((url) => (
              <div key={url} className="flex items-center gap-2 text-xs bg-muted/50 rounded p-2">
                <img src={url} alt="" className="h-8 w-8 object-cover rounded shrink-0" />
                <span className="flex-1 truncate font-mono">{url}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => copyUrl(url)}>
                  {copiedUrl === url ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {chapters.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No chapters yet. Upload .md files to get started.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {chapters.map((chapter, index) => (
            <Card key={chapter.id} className="p-4">
              {editingId === chapter.id ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Chapter Title</Label>
                    <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} />
                  </div>
                  <Tabs defaultValue="edit">
                    <TabsList>
                      <TabsTrigger value="edit">Edit</TabsTrigger>
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                    </TabsList>
                    <TabsContent value="edit" className="mt-3">
                      <Textarea
                        value={draftContent}
                        onChange={(e) => setDraftContent(e.target.value)}
                        rows={16}
                        className="font-mono text-sm"
                        placeholder="Write markdown content here..."
                      />
                    </TabsContent>
                    <TabsContent value="preview" className="mt-3 border rounded-md p-4 max-h-96 overflow-y-auto">
                      <Markdown content={draftContent} />
                    </TabsContent>
                  </Tabs>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveChapter} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      disabled={index === 0}
                      onClick={() => moveChapter(index, -1)}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      disabled={index === chapters.length - 1}
                      onClick={() => moveChapter(index, 1)}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5">Chapter {index + 1}</p>
                    <p className="font-medium">{chapter.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {chapter.content_markdown.slice(0, 120) || "Empty content"}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(chapter)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteChapter(chapter.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
