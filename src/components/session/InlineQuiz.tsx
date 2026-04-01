import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle2,
  Loader2,
  Trophy,
  RotateCcw,
  ClipboardList,
} from 'lucide-react';
import CohortUpsellCard from '@/components/session/CohortUpsellCard';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

interface InlineQuizProps {
  quizId: string;
  quizTitle: string;
  onCompleted?: () => void;
}

export default function InlineQuiz({ quizId, quizTitle, onCompleted }: InlineQuizProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [latestScore, setLatestScore] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);

  useEffect(() => {
    if (user && quizId) {
      fetchData();
    }
  }, [quizId, user]);

  const fetchData = async () => {
    setIsLoading(true);
    const [quizRes, subRes] = await Promise.all([
      supabase.from('quizzes').select('questions').eq('id', quizId).single(),
      supabase
        .from('quiz_submissions')
        .select('score')
        .eq('quiz_id', quizId)
        .eq('user_id', user!.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (quizRes.data) {
      setQuestions((quizRes.data.questions as unknown as Question[]) || []);
    }
    if (subRes.data) {
      setLatestScore(subRes.data.score);
      setShowResults(true);
    }
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!user) return;

    const unanswered = questions.filter(q => answers[q.id] === undefined);
    if (unanswered.length > 0) {
      toast({
        title: 'Please answer all questions',
        description: `You have ${unanswered.length} unanswered question(s).`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await supabase.rpc('submit_quiz_answers', {
      p_quiz_id: quizId,
      p_answers: answers,
    });
    setIsSubmitting(false);

    if (error) {
      toast({ title: 'Submission failed', description: 'Please try again.', variant: 'destructive' });
    } else if (data && data.length > 0) {
      const result = data[0];
      setLatestScore(result.score);
      setShowResults(true);
      setShowUpsell(true);
      toast({ title: 'Quiz submitted!', description: `You scored ${result.score}%` });

      onCompleted?.();
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setShowResults(false);
    setIsExpanded(true);
  };

  if (isLoading) {
    return <Skeleton className="h-16 w-full rounded-lg" />;
  }

  // Collapsed card view
  if (!isExpanded && !showResults) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
      >
        <ClipboardList className="h-5 w-5 text-primary shrink-0" />
        <span className="font-medium text-sm flex-1">{quizTitle}</span>
        <Badge variant="secondary">Take Quiz</Badge>
      </button>
    );
  }

  // Results view
  if (showResults && latestScore !== null) {
    return (
      <Card className={`${latestScore >= 70 ? 'border-green-500/50 bg-green-500/5' : 'border-yellow-500/50 bg-yellow-500/5'}`}>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${latestScore >= 70 ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
              <Trophy className={`h-5 w-5 ${latestScore >= 70 ? 'text-green-600' : 'text-yellow-600'}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{quizTitle}</p>
              <p className="text-xl font-bold">{latestScore}%</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRetake} className="gap-2">
            <RotateCcw className="h-3 w-3" /> Retake
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Expanded quiz form
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          {quizTitle}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{questions.length} questions</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {questions.map((question, index) => (
          <div key={question.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Q{index + 1}</Badge>
              {answers[question.id] !== undefined && (
                <CheckCircle2 className="h-3.5 w-3.5" style={{ color: 'hsl(142 71% 45%)' }} />
              )}
            </div>
            <p className="text-sm font-medium">{question.question}</p>
            <RadioGroup
              value={answers[question.id]?.toString()}
              onValueChange={(value) => setAnswers(prev => ({ ...prev, [question.id]: parseInt(value) }))}
            >
              {question.options.map((option, oi) => (
                <div key={oi} className="flex items-center space-x-2 py-1">
                  <RadioGroupItem value={oi.toString()} id={`${quizId}-${question.id}-${oi}`} />
                  <Label htmlFor={`${quizId}-${question.id}-${oi}`} className="text-sm cursor-pointer flex-1">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}

        <div className="flex justify-end pt-2">
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Submitting...</>
            ) : (
              'Submit Quiz'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
