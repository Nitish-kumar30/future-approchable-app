import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AppShell from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Copy, Check, Plus, Pencil, Trash2, Save, ChevronDown, BookOpen, User, GraduationCap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import PromptingGuideModal from '@/components/prompts/PromptingGuideModal';

interface Prompt {
  id: string;
  title: string;
  content: string;
  display_order: number;
  user_id: string | null;
}

function PromptCard({ prompt, canEdit, onEdit, onDelete }: {
  prompt: Prompt;
  canEdit: boolean;
  onEdit: (p: Prompt) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(prompt.content);
      setCopied(true);
      toast({ title: 'Copied!', description: `"${prompt.title}" copied to clipboard.` });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  return (
    <Card
      className={cn(
        "min-w-0 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md border-border/60",
        expanded && "ring-1 ring-primary/20"
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between p-4 gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <ChevronDown className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            expanded && "rotate-180"
          )} />
          <h3 className="font-medium text-foreground truncate">{prompt.title}</h3>
        </div>
        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
          </Button>
          {canEdit && (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(prompt)}>
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(prompt.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          )}
        </div>
      </div>
      {expanded && (
        <CardContent className="pt-0 pb-4 px-4">
          <pre className="whitespace-pre-wrap break-words text-sm text-muted-foreground font-mono bg-muted/50 rounded-md p-4 max-w-full overflow-x-auto">
            {prompt.content}
          </pre>
        </CardContent>
      )}
    </Card>
  );
}

export default function PromptLibrary() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => { fetchPrompts(); }, []);

  const fetchPrompts = async () => {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (!error && data) setPrompts(data as Prompt[]);
    setIsLoading(false);
  };

  const openNewDialog = () => {
    setEditingPrompt(null);
    setTitle('');
    setContent('');
    setDialogOpen(true);
  };

  const openEditDialog = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setTitle(prompt.title);
    setContent(prompt.content);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast({ title: 'Title and content are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    if (editingPrompt) {
      const { error } = await supabase.from('prompts').update({ title: title.trim(), content: content.trim() }).eq('id', editingPrompt.id);
      toast({ title: error ? 'Failed to update prompt' : 'Prompt updated', variant: error ? 'destructive' : 'default' });
    } else {
      const { error } = await supabase.from('prompts').insert({ title: title.trim(), content: content.trim(), user_id: user?.id });
      toast({ title: error ? 'Failed to add prompt' : 'Prompt added', variant: error ? 'destructive' : 'default' });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchPrompts();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('prompts').delete().eq('id', deleteId);
    toast({ title: error ? 'Failed to delete' : 'Prompt deleted', variant: error ? 'destructive' : 'default' });
    if (!error) fetchPrompts();
    setDeleteId(null);
  };

  const publishedPrompts = prompts.filter(p => p.user_id === null);
  const myPrompts = prompts.filter(p => p.user_id === user?.id);

  return (
    <AppShell>
      <div className="space-y-8 animate-fade-in min-w-0 max-w-full">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <h2 className="text-xl font-display font-bold text-foreground">Prompt Library</h2>
            <p className="text-sm text-muted-foreground">Browse shared prompts and manage your own collection</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:w-auto">
            <Button variant="outline" onClick={() => setGuideOpen(true)} className="gap-2">
              <GraduationCap className="h-4 w-4" /> Prompting Guide
            </Button>
            <Button onClick={openNewDialog} className="gap-2">
              <Plus className="h-4 w-4" /> Add Prompt
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-10 min-w-0">
            {/* Published Prompts */}
            <section className="space-y-4 min-w-0">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">Published Prompts</h2>
                <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{publishedPrompts.length}</span>
              </div>
              {publishedPrompts.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">No published prompts yet.</CardContent></Card>
              ) : (
                <div className="grid gap-2 min-w-0">
                  {publishedPrompts.map(p => (
                    <PromptCard key={p.id} prompt={p} canEdit={false} onEdit={openEditDialog} onDelete={setDeleteId} />
                  ))}
                </div>
              )}
            </section>

            {/* My Prompts */}
            <section className="space-y-4 min-w-0">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">My Prompts</h2>
                <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{myPrompts.length}</span>
              </div>
              {myPrompts.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">You haven't added any prompts yet. Click "Add Prompt" to get started.</CardContent></Card>
              ) : (
                <div className="grid gap-2 min-w-0">
                  {myPrompts.map(p => (
                    <PromptCard key={p.id} prompt={p} canEdit onEdit={openEditDialog} onDelete={setDeleteId} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingPrompt ? 'Edit Prompt' : 'Add Prompt'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Ticket Classification" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Content</label>
              <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Paste your prompt here..." rows={8} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingPrompt ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete prompt?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <PromptingGuideModal open={guideOpen} onOpenChange={setGuideOpen} />
    </AppShell>
  );
}
