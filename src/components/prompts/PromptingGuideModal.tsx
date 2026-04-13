import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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
  const catIndex = promptingGuideData.findIndex(c => c.id === activeCategory);

  const goTo = (delta: number) => {
    const newStep = currentStep + delta;
    if (newStep >= totalSteps) {
      if (catIndex < promptingGuideData.length - 1) {
        const nextCat = promptingGuideData[catIndex + 1];
        setActiveCategory(nextCat.id);
        setStepIndices(prev => ({ ...prev, [nextCat.id]: 0 }));
      }
      return;
    }
    if (newStep < 0) {
      if (catIndex > 0) {
        const prevCat = promptingGuideData[catIndex - 1];
        setActiveCategory(prevCat.id);
        setStepIndices(prev => ({ ...prev, [prevCat.id]: prevCat.steps.length - 1 }));
      }
      return;
    }
    setStepIndices(prev => ({ ...prev, [activeCategory]: newStep }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-screen h-screen max-w-none max-h-none rounded-none p-4 sm:p-6 flex flex-col gap-2 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Prompting Guide</DialogTitle>
        </DialogHeader>

        <Tabs value={activeCategory} onValueChange={val => setActiveCategory(val)} className="flex flex-col flex-1 min-h-0">
          <TabsList className="flex flex-wrap h-auto gap-1">
            {promptingGuideData.map(cat => (
              <TabsTrigger key={cat.id} value={cat.id} className="text-xs sm:text-sm">
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {promptingGuideData.map(cat => (
            <TabsContent key={cat.id} value={cat.id} className="flex flex-col flex-1 min-h-0 mt-2 overflow-hidden">
              {/* Progress */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Step {(stepIndices[cat.id] ?? 0) + 1} of {cat.steps.length}</span>
                  <Badge variant="secondary">{cat.label}</Badge>
                </div>
                <Progress
                  value={((stepIndices[cat.id] ?? 0) + 1) / cat.steps.length * 100}
                  className="h-2"
                />
              </div>

              {/* Content — only render active */}
              {cat.id === activeCategory && (
                <PromptFlipCard
                  key={`${cat.id}-${currentStep}`}
                  badPrompt={step.badPrompt}
                  goodPrompt={step.goodPrompt}
                  whyBetter={step.whyBetter}
                  additionalTips={step.additionalTips}
                  stepTitle={step.title}
                  stepExplanation={step.explanation}
                  onBack={() => goTo(-1)}
                  onNext={() => goTo(1)}
                  onCancel={() => onOpenChange(false)}
                  backDisabled={currentStep === 0 && catIndex === 0}
                  nextDisabled={currentStep === totalSteps - 1 && catIndex === promptingGuideData.length - 1}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
