import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  BookOpen,
  ChevronLeft,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { GuideCourseForm, type GuideCourse } from "@/components/admin/GuideCourseForm";
import { GuideChapterManager } from "@/components/admin/GuideChapterManager";

interface GuideCourseRow extends GuideCourse {
  id: string;
  chapter_count?: number;
}

export default function GuidesAdminTab() {
  const { toast } = useToast();
  const [guides, setGuides] = useState<GuideCourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<GuideCourse | null>(null);
  const [managingCourse, setManagingCourse] = useState<GuideCourseRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadGuides = useCallback(async () => {
    setLoading(true);
    const { data: courses, error } = await supabase
      .from("courses")
      .select("id, name, slug, description, mentor_name, mentor_info, duration, image_url, is_published")
      .eq("is_text_course", true)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Failed to load guides", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const withCounts = await Promise.all(
      (courses || []).map(async (course) => {
        const { count } = await supabase
          .from("guide_chapters")
          .select("id", { count: "exact", head: true })
          .eq("course_id", course.id);
        return { ...course, chapter_count: count || 0 };
      }),
    );

    setGuides(withCounts);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    loadGuides();
  }, [loadGuides]);

  const handleSave = async (course: GuideCourse) => {
    const payload = {
      name: course.name,
      slug: course.slug,
      description: course.description || null,
      mentor_name: course.mentor_name || null,
      mentor_info: course.mentor_info || null,
      duration: course.duration || null,
      image_url: course.image_url || null,
      is_published: course.is_published,
      is_text_course: true,
      is_on_demand: false,
      enrollment_disabled: false,
    };

    if (course.id) {
      const { error } = await supabase.from("courses").update(payload).eq("id", course.id);
      if (error) throw new Error(error.message);
      toast({ title: "Guide updated" });
    } else {
      const { error } = await supabase.from("courses").insert(payload);
      if (error) throw new Error(error.message);
      toast({ title: "Guide created" });
    }
    loadGuides();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from("courses").delete().eq("id", id);
    setDeletingId(null);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Guide deleted" });
    if (managingCourse?.id === id) setManagingCourse(null);
    loadGuides();
  };

  const togglePublish = async (course: GuideCourseRow) => {
    const { error } = await supabase
      .from("courses")
      .update({ is_published: !course.is_published })
      .eq("id", course.id);
    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      return;
    }
    loadGuides();
  };

  if (managingCourse) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setManagingCourse(null)} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Back to Guides
        </Button>
        <GuideChapterManager courseId={managingCourse.id} courseName={managingCourse.name} />
      </div>
    );
  }

  return (
    <Card className="card-elevated">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" /> Manage Guides
          </CardTitle>
          <CardDescription>Create and manage text-based guide courses with markdown chapters</CardDescription>
        </div>
        <Button
          onClick={() => {
            setEditingCourse(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> New Guide
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : guides.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No guides yet. Create your first text-based guide course.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Cover</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Chapters</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guides.map((guide) => (
                <TableRow key={guide.id}>
                  <TableCell>
                    {guide.image_url ? (
                      <img src={guide.image_url} alt="" className="h-10 w-14 object-cover rounded" />
                    ) : (
                      <div className="h-10 w-14 bg-muted rounded flex items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{guide.name}</div>
                    {guide.mentor_name && (
                      <div className="text-xs text-muted-foreground">{guide.mentor_name}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{guide.slug}</TableCell>
                  <TableCell>{guide.chapter_count ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant={guide.is_published ? "default" : "secondary"}>
                      {guide.is_published ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => setManagingCourse(guide)}>
                        Chapters
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => togglePublish(guide)}
                      >
                        {guide.is_published ? "Unpublish" : "Publish"}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingCourse(guide);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete guide?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete &quot;{guide.name}&quot; and all its chapters.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(guide.id)}
                              disabled={deletingId === guide.id}
                            >
                              {deletingId === guide.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Delete"
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <GuideCourseForm
        open={formOpen}
        onOpenChange={setFormOpen}
        course={editingCourse}
        onSave={handleSave}
      />
    </Card>
  );
}
