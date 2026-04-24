import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2 } from 'lucide-react';

type QuestionType = 'mcq' | 'mcq_ungraded' | 'subjective';

interface Question {
  id: string;
  type?: QuestionType;
  question: string;
  options: string[];
  correctAnswer: number;
}

interface Quiz {
  id?: string;
  title: string;
  questions: Question[];
}

interface QuizFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quiz?: Quiz | null;
  onSave: (quiz: Quiz) => Promise<void>;
}

const createEmptyQuestion = (): Question => ({
  id: crypto.randomUUID(),
  type: 'mcq',
  question: '',
  options: ['', '', '', ''],
  correctAnswer: 0,
});

const defaultQuiz: Quiz = {
  title: '',
  questions: [createEmptyQuestion()],
};

export function QuizForm({ open, onOpenChange, quiz, onSave }: QuizFormProps) {
  const [formData, setFormData] = useState<Quiz>(defaultQuiz);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (quiz) {
      // Backfill `type` for legacy questions saved before type field existed
      const normalized = quiz.questions.map(q => ({
        ...q,
        type: (q.type ?? 'mcq') as QuestionType,
        options: q.options ?? ['', '', '', ''],
        correctAnswer: q.correctAnswer ?? 0,
      }));
      setFormData({
        ...quiz,
        questions: normalized.length > 0 ? normalized : [createEmptyQuestion()],
      });
    } else {
      setFormData({ ...defaultQuiz, questions: [createEmptyQuestion()] });
    }
  }, [quiz, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    // Strip options/correctAnswer for subjective questions before saving
    const cleaned: Quiz = {
      ...formData,
      questions: formData.questions.map(q => {
        if (q.type === 'subjective') {
          return { id: q.id, type: q.type, question: q.question, options: [], correctAnswer: 0 };
        }
        return q;
      }),
    };
    await onSave(cleaned);
    setIsSaving(false);
    onOpenChange(false);
  };

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [...formData.questions, createEmptyQuestion()],
    });
  };

  const removeQuestion = (index: number) => {
    if (formData.questions.length === 1) return;
    setFormData({
      ...formData,
      questions: formData.questions.filter((_, i) => i !== index),
    });
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    const newQuestions = [...formData.questions];
    newQuestions[index] = { ...newQuestions[index], ...updates };
    setFormData({ ...formData, questions: newQuestions });
  };

  const updateQuestionType = (index: number, type: QuestionType) => {
    const newQuestions = [...formData.questions];
    const current = newQuestions[index];
    // Ensure options exist when switching back to an MCQ type
    const needsOptions = type === 'mcq' || type === 'mcq_ungraded';
    newQuestions[index] = {
      ...current,
      type,
      options: needsOptions && (!current.options || current.options.length === 0)
        ? ['', '', '', '']
        : current.options,
    };
    setFormData({ ...formData, questions: newQuestions });
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const newQuestions = [...formData.questions];
    newQuestions[questionIndex].options[optionIndex] = value;
    setFormData({ ...formData, questions: newQuestions });
  };

  const isEditing = !!quiz?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Quiz' : 'Create New Quiz'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update quiz details and questions.' : 'Create a reusable quiz with multiple-choice or subjective questions. You can assign it to sessions later.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Quiz Title *</Label>
            <Input
              id="title"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Week 1 Quiz"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Questions</Label>
              <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                <Plus className="mr-2 h-4 w-4" /> Add Question
              </Button>
            </div>

            {formData.questions.map((question, qIndex) => (
              <Card key={question.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-sm font-medium">Question {qIndex + 1}</CardTitle>
                      {question.type === 'mcq_ungraded' && (
                        <Badge variant="secondary" className="text-xs">Ungraded</Badge>
                      )}
                      {question.type === 'subjective' && (
                        <Badge variant="secondary" className="text-xs">Subjective · Not graded</Badge>
                      )}
                    </div>
                    {formData.questions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(qIndex)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Question Type</Label>
                    <Select
                      value={question.type}
                      onValueChange={(v) => updateQuestionType(qIndex, v as QuestionType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mcq">Multiple choice (graded)</SelectItem>
                        <SelectItem value="mcq_ungraded">Multiple choice (ungraded)</SelectItem>
                        <SelectItem value="subjective">Subjective / free text</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Question Text *</Label>
                    <Input
                      required
                      value={question.question}
                      onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
                      placeholder="Enter your question..."
                    />
                  </div>

                  {question.type === 'subjective' ? (
                    <p className="text-xs text-muted-foreground">
                      Learners will answer in a text box (max 1000 characters). This question is not graded.
                    </p>
                  ) : question.type === 'mcq_ungraded' ? (
                    <div className="space-y-3">
                      <Label>Options (no correct answer — responses captured but not graded)</Label>
                      <div className="space-y-2">
                        {question.options.map((option, oIndex) => (
                          <div key={oIndex} className="flex items-center space-x-3">
                            <span className="text-xs text-muted-foreground w-6 text-center">
                              {oIndex + 1}.
                            </span>
                            <Input
                              value={option}
                              onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                              placeholder={`Option ${oIndex + 1}`}
                              className="flex-1"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Label>Options (select the correct answer)</Label>
                      <RadioGroup
                        value={question.correctAnswer.toString()}
                        onValueChange={(v) => updateQuestion(qIndex, { correctAnswer: parseInt(v) })}
                      >
                        {question.options.map((option, oIndex) => (
                          <div key={oIndex} className="flex items-center space-x-3">
                            <RadioGroupItem value={oIndex.toString()} id={`${question.id}-${oIndex}`} />
                            <Input
                              value={option}
                              onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                              placeholder={`Option ${oIndex + 1}`}
                              className="flex-1"
                            />
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? 'Update Quiz' : 'Create Quiz'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
