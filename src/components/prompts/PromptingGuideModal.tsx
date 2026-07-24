import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
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
      <DialogContent className="fixed inset-0 left-0 top-0 z-50 flex h-[100dvh] w-screen max-w-none max-h-none translate-x-0 translate-y-0 flex-col rounded-none border-0 p-0 sm:rounded-none [&>button]:top-[max(1rem,env(safe-area-inset-top))]">
        <div className="shrink-0 space-y-2 px-4 pb-0 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pt-6">
          <DialogHeader className="pr-10 text-left">
            <DialogTitle className="text-xl font-display">Prompting Guide</DialogTitle>
            <DialogDescription className="sr-only">Interactive prompting guide with tips and exercises</DialogDescription>
          </DialogHeader>

          <Tabs value={activeCategory} onValueChange={val => setActiveCategory(val)}>
            <TabsList className="flex flex-wrap h-auto gap-1">
              {promptingGuideData.map(cat => (
                <TabsTrigger key={cat.id} value={cat.id} className="text-xs sm:text-sm">
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Guide {currentStep + 1} of {totalSteps}</span>
              <Badge variant="secondary">{category.label}</Badge>
            </div>
            <Progress value={(currentStep + 1) / totalSteps * 100} className="h-2" />
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:px-6">
          <PromptFlipCard
            key={`${activeCategory}-${currentStep}`}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
