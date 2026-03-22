import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, RotateCcw, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PromptFlipCardProps {
  badPrompt: string;
  goodPrompt: string;
  whyBetter: string;
  additionalTips?: string[];
}

export default function PromptFlipCard({ badPrompt, goodPrompt, whyBetter }: PromptFlipCardProps) {
  const [userAttempt, setUserAttempt] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [copiedGood, setCopiedGood] = useState(false);
  const { toast } = useToast();

  const handleReveal = () => setIsFlipped(true);
  const handleReset = () => {
    setIsFlipped(false);
    setUserAttempt('');
  };

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
    <div className="space-y-4">
      {/* Bad Prompt */}
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

      {/* User Input / Flip Area */}
      <div className="relative" style={{ perspective: '1200px' }}>
        <div
          className={cn(
            "transition-transform duration-600 relative",
            "[transform-style:preserve-3d]",
          )}
          style={{
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transition: 'transform 0.6s ease-in-out',
          }}
        >
          {/* Front — User's attempt */}
          <div
            className="[backface-visibility:hidden]"
            style={{ display: isFlipped ? 'none' : 'block' }}
          >
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
                <Button onClick={handleReveal} className="w-full gap-2">
                  <RotateCcw className="h-4 w-4" /> Reveal Suggested Answer
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Back — Good prompt */}
          <div
            className="[backface-visibility:hidden]"
            style={{
              display: isFlipped ? 'block' : 'none',
              transform: 'rotateY(180deg)',
            }}
          >
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
          </div>
        </div>
      </div>

      {/* After flip: show user's attempt for comparison + why better */}
      {isFlipped && (
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

          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
