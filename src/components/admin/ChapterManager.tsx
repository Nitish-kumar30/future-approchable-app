import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Loader2, Plus, Trash2, Pencil, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Chapter {
  id: string;
  session_id: string;
  title: string;
  description: string | null;
  hls_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  chapter_order: number;
  is_preview: boolean;
  is_content_unlocked: boolean;
}

interface ChapterManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  sessionTitle: string;
}

async function callManageChapters(payload: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const { data, error } = await supabase.functions.invoke('manage-chapters', {
    body: payload,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

const EMPTY_DRAFT: Omit<Chapter, 'id'> = {
  session_id: '',
  title: '',
  description: '',
  hls_url: '',
  thumbnail_url: '',
  duration_seconds: null,
  chapter_order: 0,
  is_preview: false,
  is_content_unlocked: true,
};

export function ChapterManager({ open, onOpenChange, sessionId, sessionTitle }: ChapterManagerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<Chapter, 'id'> & { id?: string }>({ ...EMPTY_DRAFT });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open || !sessionId) return;
    (async () => {
      setLoading(true);
      try {
        const data = await callManageChapters({ action: 'list', session_id: sessionId });
        setChapters(data.chapters ?? []);
      } catch (e: any) {
        toast({ title: 'Failed to load chapters', description: e.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [open, sessionId, toast]);

  const startCreate = () => {
    setEditingId(null);
    setCreating(true);
    setDraft({ ...EMPTY_DRAFT, session_id: sessionId, chapter_order: chapters.length + 1 });
  };

  const startEdit = (c: Chapter) => {
    setCreating(false);
    setEditingId(c.id);
    setDraft({ ...c });
  };

  const cancel = () => {
    setEditingId(null);
    setCreating(false);
    setDraft({ ...EMPTY_DRAFT });
  };

  const save = async () => {
    if (!draft.title?.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    try {
      if (creating) {
        const data = await callManageChapters({
          action: 'create',
          chapter: { ...draft, session_id: sessionId },
        });
        setChapters((p) => [...p, data.chapter]);
      } else if (editingId) {
        const patch = { ...draft };
        delete (patch as any).id;
        const data = await callManageChapters({ action: 'update', id: editingId, patch });
        setChapters((p) => p.map((c) => (c.id === editingId ? data.chapter : c)));
      }
      cancel();
    } catch (e: any) {
      toast({ title: 'Failed to save chapter', description: e.message, variant: 'destructive' });
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this chapter?')) return;
    try {
      await callManageChapters({ action: 'delete', id });
      setChapters((p) => p.filter((c) => c.id !== id));
    } catch (e: any) {
      toast({ title: 'Failed to delete', description: e.message, variant: 'destructive' });
    }
  };

  const editingActive = creating || editingId !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chapters — {sessionTitle}</DialogTitle>
          <DialogDescription>
            Add optional chapters to break this session into shorter videos. Toggle "Preview" to allow anyone (even non-enrolled) to watch it.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              {!editingActive && (
                <Button size="sm" onClick={startCreate}><Plus className="h-4 w-4 mr-1" /> Add Chapter</Button>
              )}
            </div>

            {chapters.length === 0 && !editingActive && (
              <p className="text-center text-muted-foreground py-8">No chapters yet.</p>
            )}

            {chapters.map((c) => (
              editingId === c.id ? (
                <ChapterEditor key={c.id} draft={draft} setDraft={setDraft} onSave={save} onCancel={cancel} />
              ) : (
                <Card key={c.id} className="p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">#{c.chapter_order}</span>
                      <h4 className="font-medium truncate">{c.title}</h4>
                      {c.is_preview && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-medium">Preview</span>
                      )}
                      {!c.is_content_unlocked && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Locked</span>
                      )}
                    </div>
                    {c.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.description}</p>}
                    {c.hls_url && <p className="text-xs text-muted-foreground mt-1 truncate">HLS: {c.hls_url}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </Card>
              )
            ))}

            {creating && (
              <ChapterEditor draft={draft} setDraft={setDraft} onSave={save} onCancel={cancel} />
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChapterEditor({
  draft, setDraft, onSave, onCancel,
}: {
  draft: any;
  setDraft: (d: any) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <Card className="p-4 space-y-3 border-primary/40">
      <div>
        <Label>Title *</Label>
        <Input value={draft.title ?? ''} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
      </div>
      <div>
        <Label>Description (Markdown supported)</Label>
        <Textarea rows={3} value={draft.description ?? ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Gumlet HLS URL (.m3u8)</Label>
          <Input value={draft.hls_url ?? ''} onChange={(e) => setDraft({ ...draft, hls_url: e.target.value })} placeholder="https://video.gumlet.io/.../main.m3u8" />
        </div>
        <div>
          <Label>Thumbnail URL</Label>
          <Input value={draft.thumbnail_url ?? ''} onChange={(e) => setDraft({ ...draft, thumbnail_url: e.target.value })} />
        </div>
        <div>
          <Label>Order</Label>
          <Input type="number" value={draft.chapter_order ?? 0} onChange={(e) => setDraft({ ...draft, chapter_order: Number(e.target.value) })} />
        </div>
        <div>
          <Label>Duration (seconds)</Label>
          <Input type="number" value={draft.duration_seconds ?? ''} onChange={(e) => setDraft({ ...draft, duration_seconds: e.target.value ? Number(e.target.value) : null })} />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch checked={!!draft.is_preview} onCheckedChange={(v) => setDraft({ ...draft, is_preview: v })} />
          <Label>Preview (anyone can watch)</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={!!draft.is_content_unlocked} onCheckedChange={(v) => setDraft({ ...draft, is_content_unlocked: v })} />
          <Label>Content unlocked</Label>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}><X className="h-4 w-4 mr-1" /> Cancel</Button>
        <Button size="sm" onClick={onSave}><Save className="h-4 w-4 mr-1" /> Save</Button>
      </div>
    </Card>
  );
}
