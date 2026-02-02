import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ClipboardList, 
  CheckCircle2, 
  Trophy,
  ChevronRight,
  Clock
} from 'lucide-react';

export interface SessionQuiz {
  id: string;
  title: string;
  questionCount: number;
  displayOrder: number;
}

export interface QuizSubmission {
  quizId: string;
  score: number;
  submittedAt: string;
}

interface SessionQuizListProps {
  quizzes: SessionQuiz[];
  submissions: QuizSubmission[];
  sessionTitle?: string;
}

export function SessionQuizList({ quizzes, submissions, sessionTitle }: SessionQuizListProps) {
  const navigate = useNavigate();

  if (quizzes.length === 0) {
    return null;
  }

  const getSubmission = (quizId: string) => 
    submissions.find(s => s.quizId === quizId);

  const completedCount = quizzes.filter(q => getSubmission(q.id)).length;
  const progressPercent = (completedCount / quizzes.length) * 100;
  const allCompleted = completedCount === quizzes.length;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            Quizzes
          </CardTitle>
          <Badge 
            variant={allCompleted ? "default" : "secondary"} 
            className={allCompleted ? "bg-success text-success-foreground" : ""}
          >
            {completedCount}/{quizzes.length} completed
          </Badge>
        </div>
        
        {/* Progress Bar */}
        <div className="pt-2">
          <Progress value={progressPercent} className="h-2" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {quizzes
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((quiz) => {
            const submission = getSubmission(quiz.id);
            const isCompleted = !!submission;
            const scoreColor = submission 
              ? submission.score >= 80 
                ? 'text-success' 
                : submission.score >= 60 
                  ? 'text-warning' 
                  : 'text-destructive'
              : '';

            return (
              <div
                key={quiz.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                  isCompleted ? 'bg-success/5 border-success/20' : 'bg-background border-border'
                }`}
                onClick={() => navigate(`/quiz/${quiz.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-success/20' : 'bg-muted'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{quiz.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {quiz.questionCount} question{quiz.questionCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isCompleted && submission && (
                    <div className="flex items-center gap-2">
                      <Trophy className={`h-4 w-4 ${scoreColor}`} />
                      <span className={`text-sm font-bold ${scoreColor}`}>
                        {submission.score}%
                      </span>
                    </div>
                  )}
                  {!isCompleted && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            );
          })}

        {allCompleted && (
          <div className="flex items-center justify-center gap-2 pt-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            <span>All quizzes completed!</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
