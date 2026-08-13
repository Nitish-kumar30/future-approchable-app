import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookMarked, FileText, ArrowRight } from 'lucide-react';
import PromptingGuideModal from '@/components/prompts/PromptingGuideModal';

export default function Resources() {
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <AppShell>
      <div className="space-y-4 animate-fade-in max-w-2xl">
        <div className="space-y-1">
          <h2 className="text-xl font-display font-bold text-foreground">Resources</h2>
          <p className="text-sm text-muted-foreground">
            Tools and guides to sharpen your prompting skills.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="card-elevated group hover:shadow-md transition-all duration-200">
            <CardContent className="p-5 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                <BookMarked className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Prompt Library</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Browse, search, and copy curated prompts for every use case.
                </p>
              </div>
              <Button size="sm" className="h-8 text-xs" asChild>
                <Link to="/prompts">
                  Open library <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="card-elevated group hover:shadow-md transition-all duration-200">
            <CardContent className="p-5 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Prompting Guide</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  A structured guide to writing effective prompts from first principles.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setGuideOpen(true)}
              >
                Read guide <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <PromptingGuideModal open={guideOpen} onOpenChange={setGuideOpen} />
    </AppShell>
  );
}
