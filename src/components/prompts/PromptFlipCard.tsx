import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Copy, Check, RotateCcw, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PromptFlipCardProps {
  badPrompt: string;
  goodPrompt: string;
  whyBetter: string;
  additionalTips?: string[];
  stepTitle: string;
  stepExplanation: string;
  onBack: () => void;
  onNext: () => void;
  onCancel: () => void;
  backDisabled: boolean;
  nextDisabled: boolean;
}

export default function PromptFlipCard({
  badPrompt, goodPrompt, whyBetter, additionalTips,
  stepTitle, stepExplanation,
  onBack, onNext, onCancel, backDisabled, nextDisabled,
}: PromptFlipCardProps) {
  const [userAttempt, setUserAttempt] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [copiedGood, setCopiedGood] = useState(false);
  const { toast } = useToast();

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedGood(true);
      toast({ title: 'Copied to clipboard!' });
      setTimeout(() => setCopiedGood(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Step header */}
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-foreground">{stepTitle}</h3>
        <p className="text-sm text-muted-foreground mt-1">{stepExplanation}</p>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0 overflow-y-auto">
        {/* Left column: Bad Prompt + Tips */}
        <div className="space-y-4 md:sticky md:top-0 md:self-start">
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 space-y-2">
              <Badge variant="outline" className="border-destructive/50 text-destructive">
                ❌ Bad Prompt
              </Badge>
              <pre className="whitespace-pre-wrap text-sm font-mono text-foreground/80">
                {badPrompt}
              </pre>
            </CardContent>
          </Card>

          {additionalTips && additionalTips.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Lightbulb className="h-4 w-4 text-primary" />
                Tips
              </div>
              <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
                {additionalTips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right column: Attempt + Reveal */}
        <div className="space-y-4">
          {!isRevealed ? (
            <Card className="border-border">
              <CardContent className="p-4 space-y-3">
                <Badge variant="outline" className="border-primary/50 text-primary">
                  <Sparkles className="h-3 w-3 mr-1" /> Your Attempt
                </Badge>
                <Textarea
                  value={userAttempt}
                  onChange={e => setUserAttempt(e.target.value)}
                  placeholder="How would you improve this prompt? Type your version here..."
                  rows={5}
                  className="font-mono text-sm resize-none"
                />
                <Button onClick={() => setIsRevealed(true)} className="w-full gap-2">
                  <RotateCcw className="h-4 w-4" /> Reveal Suggested Answer
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 animate-fade-in">
              {userAttempt.trim() && (
                <Card className="border-muted">
                  <CardContent className="p-4 space-y-2">
                    <Badge variant="secondary">Your Version</Badge>
                    <pre className="whitespace-pre-wrap text-sm font-mono text-muted-foreground">
                      {userAttempt}
                    </pre>
                  </CardContent>
                </Card>
              )}

              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="border-primary/50 text-primary">
                      ✅ Good Prompt
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleCopy(goodPrompt)}
                    >
                      {copiedGood ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                  <pre className="whitespace-pre-wrap text-sm font-mono text-foreground/80">
                    {goodPrompt}
                  </pre>
                </CardContent>
              </Card>

              <Card className="border-accent/50 bg-accent/10">
                <CardContent className="p-4 space-y-2">
                  <Badge variant="outline" className="border-accent-foreground/30 text-accent-foreground">
                    💡 Why It's Better
                  </Badge>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {whyBetter}
                  </p>
                </CardContent>
              </Card>

              <Button variant="outline" size="sm" onClick={() => { setIsRevealed(false); setUserAttempt(''); }} className="gap-2">
                <RotateCcw className="h-4 w-4" /> Try Again
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation bar — pinned bottom */}
      <div className="flex items-center justify-between pt-4 mt-auto border-t border-border">
        <Button variant="outline" onClick={onBack} disabled={backDisabled} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button onClick={onNext} disabled={nextDisabled} className="gap-1">
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
