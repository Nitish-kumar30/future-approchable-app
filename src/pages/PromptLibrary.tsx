import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Prompt {
  id: string;
  title: string;
  content: string;
  display_order: number;
}

export default function PromptLibrary() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

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

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-3xl font-display font-bold text-foreground">Prompt Library</h1>
          <p className="text-muted-foreground">Browse and copy useful prompts for your learning journey</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : prompts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No prompts available yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {prompts.map((prompt) => (
              <Card key={prompt.id} className="card-elevated">
                <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                  <CardTitle className="text-lg">{prompt.title}</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-2"
                    onClick={() => handleCopy(prompt)}
                  >
                    {copiedId === prompt.id ? (
                      <><Check className="h-4 w-4" /> Copied</>
                    ) : (
                      <><Copy className="h-4 w-4" /> Copy</>
                    )}
                  </Button>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-mono bg-muted/50 rounded-md p-4">
                    {prompt.content}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
