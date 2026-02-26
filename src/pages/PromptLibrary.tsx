import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Copy, Check, Plus, Pencil, Trash2, X, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Prompt {
  id: string;
  title: string;
  content: string;
  display_order: number;
  user_id: string | null;
}

export default function PromptLibrary() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPrompts(data as Prompt[]);
    }
    setIsLoading(false);
  };

  const handleCopy = async (prompt: Prompt) => {
    try {
      await navigator.clipboard.writeText(prompt.content);
      setCopiedId(prompt.id);
      toast({ title: 'Copied!', description: `"${prompt.title}" copied to clipboard.` });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
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
      const { error } = await supabase
        .from('prompts')
        .update({ title: title.trim(), content: content.trim() })
        .eq('id', editingPrompt.id);
      if (error) {
        toast({ title: 'Failed to update prompt', variant: 'destructive' });
      } else {
        toast({ title: 'Prompt updated' });
      }
    } else {
      const { error } = await supabase
        .from('prompts')
        .insert({ title: title.trim(), content: content.trim(), user_id: user?.id });
      if (error) {
        toast({ title: 'Failed to add prompt', variant: 'destructive' });
      } else {
        toast({ title: 'Prompt added' });
      }
    }

    setSaving(false);
    setDialogOpen(false);
    fetchPrompts();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('prompts').delete().eq('id', deleteId);
    if (error) {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    } else {
      toast({ title: 'Prompt deleted' });
      fetchPrompts();
    }
    setDeleteId(null);
  };

  const adminPrompts = prompts.filter(p => p.user_id === null);
  const myPrompts = prompts.filter(p => p.user_id === user?.id);

  const PromptCard = ({ prompt, canEdit }: { prompt: Prompt; canEdit: boolean }) => (
    <Card key={prompt.id} className="card-elevated">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <CardTitle className="text-lg">{prompt.title}</CardTitle>
        <div className="flex shrink-0 gap-1">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => handleCopy(prompt)}>
            {copiedId === prompt.id ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
          </Button>
          {canEdit && (
            <>
              <Button variant="ghost" size="sm" onClick={() => openEditDialog(prompt)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDeleteId(prompt.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-mono bg-muted/50 rounded-md p-4">
          {prompt.content}
        </pre>
      </CardContent>
    </Card>
  );

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-display font-bold text-foreground">Prompt Library</h1>
            <p className="text-muted-foreground">Browse shared prompts and manage your own collection</p>
          </div>
          <Button onClick={openNewDialog} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Add Prompt
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* My Prompts */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">My Prompts</h2>
              {myPrompts.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    You haven't added any prompts yet. Click "Add Prompt" to get started.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {myPrompts.map(p => <PromptCard key={p.id} prompt={p} canEdit />)}
                </div>
              )}
            </section>

            {/* Shared Prompts */}
            {adminPrompts.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Shared Prompts</h2>
                <div className="grid gap-4">
                  {adminPrompts.map(p => <PromptCard key={p.id} prompt={p} canEdit={false} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPrompt ? 'Edit Prompt' : 'Add Prompt'}</DialogTitle>
          </DialogHeader>
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

      {/* Delete Confirmation */}
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
    </MainLayout>
  );
}
