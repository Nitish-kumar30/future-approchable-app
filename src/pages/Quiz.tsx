import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Trophy,
  RotateCcw
} from 'lucide-react';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

interface Quiz {
  id: string;
  title: string;
  questions: Question[];
  session_id: string;
}

interface Submission {
  id: string;
  score: number;
  submitted_at: string;
}

export default function QuizPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [latestSubmission, setLatestSubmission] = useState<Submission | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (id && user) {
      fetchQuiz();
      fetchLatestSubmission();
    }
  }, [id, user]);

  const fetchQuiz = async () => {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      setQuiz({
        ...data,
        questions: (data.questions as unknown as Question[]) || []
      });
    }
    setIsLoading(false);
  };

  const fetchLatestSubmission = async () => {
    const { data } = await supabase
      .from('quiz_submissions')
      .select('id, score, submitted_at')
      .eq('quiz_id', id)
      .eq('user_id', user?.id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setLatestSubmission(data);
      setShowResults(true);
    }
  };

  const handleAnswerChange = (questionId: string, answerIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  const calculateScore = (): number => {
    if (!quiz) return 0;
    let correct = 0;
    quiz.questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) {
        correct++;
      }
    });
    return Math.round((correct / quiz.questions.length) * 100);
  };

  const handleSubmit = async () => {
    if (!quiz || !user) return;

    const unanswered = quiz.questions.filter(q => answers[q.id] === undefined);
    if (unanswered.length > 0) {
      toast({
        title: 'Please answer all questions',
        description: `You have ${unanswered.length} unanswered question(s).`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const score = calculateScore();

    const { error } = await supabase
      .from('quiz_submissions')
      .insert({
        quiz_id: id,
        user_id: user.id,
        answers: answers,
        score: score,
      });

    setIsSubmitting(false);

    if (error) {
      toast({
        title: 'Submission failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setLatestSubmission({
        id: '',
        score,
        submitted_at: new Date().toISOString(),
      });
      setShowResults(true);
      toast({
        title: 'Quiz submitted!',
        description: `You scored ${score}%`,
      });
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setShowResults(false);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-48 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!quiz) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-2">Quiz not found</h2>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
        {/* Back Button */}
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-display font-bold text-foreground">
            {quiz.title}
          </h1>
          <p className="text-muted-foreground">
            {quiz.questions.length} questions
          </p>
        </div>

        {/* Results Banner */}
        {showResults && latestSubmission && (
          <Card className={`card-elevated ${latestSubmission.score >= 70 ? 'border-success/50 bg-success/5' : 'border-warning/50 bg-warning/5'}`}>
            <CardContent className="flex items-center justify-between py-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${latestSubmission.score >= 70 ? 'bg-success/20' : 'bg-warning/20'}`}>
                  <Trophy className={`h-6 w-6 ${latestSubmission.score >= 70 ? 'text-success' : 'text-warning'}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Your latest score</p>
                  <p className="text-3xl font-bold">{latestSubmission.score}%</p>
                </div>
              </div>
              <Button variant="outline" onClick={handleRetake} className="gap-2">
                <RotateCcw className="h-4 w-4" /> Retake Quiz
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Questions */}
        {!showResults && (
          <div className="space-y-6">
            {quiz.questions.map((question, index) => (
              <Card key={question.id} className="card-elevated">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">Question {index + 1}</Badge>
                    {answers[question.id] !== undefined && (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    )}
                  </div>
                  <CardTitle className="text-lg font-medium">
                    {question.question}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={answers[question.id]?.toString()}
                    onValueChange={(value) => handleAnswerChange(question.id, parseInt(value))}
                  >
                    {question.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center space-x-3 py-2">
                        <RadioGroupItem 
                          value={optionIndex.toString()} 
                          id={`${question.id}-${optionIndex}`} 
                        />
                        <Label 
                          htmlFor={`${question.id}-${optionIndex}`}
                          className="text-base cursor-pointer flex-1"
                        >
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            ))}

            <div className="flex justify-end pt-4">
              <Button size="lg" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Quiz'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
