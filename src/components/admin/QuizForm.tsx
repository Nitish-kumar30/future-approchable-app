import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Plus, Trash2 } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

interface Quiz {
  id?: string;
  title: string;
  session_id: string;
  questions: Question[];
}

interface Session {
  id: string;
  title: string;
  cohort_id: string | null;
  course_id: string | null;
}

interface QuizFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quiz?: Quiz | null;
  sessions: Session[];
  onSave: (quiz: Quiz) => Promise<void>;
}

const createEmptyQuestion = (): Question => ({
  id: crypto.randomUUID(),
  question: '',
  options: ['', '', '', ''],
  correctAnswer: 0,
});

const defaultQuiz: Quiz = {
  title: '',
  session_id: '',
  questions: [createEmptyQuestion()],
};

export function QuizForm({ open, onOpenChange, quiz, sessions, onSave }: QuizFormProps) {
  const [formData, setFormData] = useState<Quiz>(defaultQuiz);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (quiz) {
      setFormData({
        ...quiz,
        questions: quiz.questions.length > 0 ? quiz.questions : [createEmptyQuestion()],
      });
    } else {
      setFormData({ ...defaultQuiz, questions: [createEmptyQuestion()] });
    }
  }, [quiz, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(formData);
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
            {isEditing ? 'Update quiz details and questions.' : 'Create a quiz with multiple-choice questions.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
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

            <div className="space-y-2">
              <Label>Assign to Session *</Label>
              <Select 
                value={formData.session_id} 
                onValueChange={(v) => setFormData({ ...formData, session_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm font-medium">Question {qIndex + 1}</CardTitle>
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
                    <Label>Question Text *</Label>
                    <Input
                      required
                      value={question.question}
                      onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
                      placeholder="Enter your question..."
                    />
                  </div>

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
                </CardContent>
              </Card>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !formData.session_id}>
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
