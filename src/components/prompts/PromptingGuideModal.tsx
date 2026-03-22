import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { promptingGuideData } from '@/data/promptingGuide';
import PromptFlipCard from './PromptFlipCard';

interface PromptingGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PromptingGuideModal({ open, onOpenChange }: PromptingGuideModalProps) {
  const [activeCategory, setActiveCategory] = useState(promptingGuideData[0].id);
  const [stepIndices, setStepIndices] = useState<Record<string, number>>(
    () => Object.fromEntries(promptingGuideData.map(c => [c.id, 0]))
  );

  const category = promptingGuideData.find(c => c.id === activeCategory)!;
  const currentStep = stepIndices[activeCategory] ?? 0;
  const totalSteps = category.steps.length;
  const step = category.steps[currentStep];

  const goTo = (delta: number) => {
    const newStep = (stepIndices[activeCategory] ?? 0) + delta;
    if (newStep >= totalSteps) {
      // Move to next category
      const currentIndex = promptingGuideData.findIndex(c => c.id === activeCategory);
      if (currentIndex < promptingGuideData.length - 1) {
        const nextCat = promptingGuideData[currentIndex + 1];
        setActiveCategory(nextCat.id);
        setStepIndices(prev => ({ ...prev, [nextCat.id]: 0 }));
      }
      return;
    }
    if (newStep < 0) {
      // Move to previous category's last step
      const currentIndex = promptingGuideData.findIndex(c => c.id === activeCategory);
      if (currentIndex > 0) {
        const prevCat = promptingGuideData[currentIndex - 1];
        setActiveCategory(prevCat.id);
        setStepIndices(prev => ({ ...prev, [prevCat.id]: prevCat.steps.length - 1 }));
      }
      return;
    }
    setStepIndices(prev => ({ ...prev, [activeCategory]: newStep }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-screen h-screen max-w-none max-h-none rounded-none overflow-y-auto p-4 sm:p-6 gap-2">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Prompting Guide</DialogTitle>
        </DialogHeader>

        <Tabs value={activeCategory} onValueChange={val => setActiveCategory(val)}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            {promptingGuideData.map(cat => (
              <TabsTrigger key={cat.id} value={cat.id} className="text-xs sm:text-sm">
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {promptingGuideData.map(cat => (
            <TabsContent key={cat.id} value={cat.id} className="space-y-4 mt-2">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Step {(stepIndices[cat.id] ?? 0) + 1} of {cat.steps.length}
                  </span>
                  <Badge variant="secondary">{cat.label}</Badge>
                </div>
                <Progress
                  value={((stepIndices[cat.id] ?? 0) + 1) / cat.steps.length * 100}
                  className="h-2"
                />
              </div>

              {/* Step Content */}
              {cat.id === activeCategory && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{step.explanation}</p>
                  </div>

                  <PromptFlipCard
                    key={`${cat.id}-${currentStep}`}
                    badPrompt={step.badPrompt}
                    goodPrompt={step.goodPrompt}
                    whyBetter={step.whyBetter}
                    additionalTips={step.additionalTips}
                  />

                  {/* Navigation */}
                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="outline"
                      onClick={() => goTo(-1)}
                      disabled={currentStep === 0 && promptingGuideData.findIndex(c => c.id === activeCategory) === 0}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button
                      onClick={() => goTo(1)}
                      disabled={currentStep === totalSteps - 1 && promptingGuideData.findIndex(c => c.id === activeCategory) === promptingGuideData.length - 1}
                      className="gap-1"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
