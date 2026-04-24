import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Circle } from 'lucide-react';

type QuestionType = 'mcq' | 'mcq_ungraded' | 'subjective';

export interface ResponseQuestion {
  id: string;
  type?: QuestionType;
  question: string;
  options?: string[];
  correctAnswer?: number;
}

interface QuizResponseListProps {
  questions: ResponseQuestion[];
  answers: Record<string, number | string>;
  compact?: boolean;
}

export default function QuizResponseList({
  questions,
  answers,
  compact = false,
}: QuizResponseListProps) {
  if (!questions || questions.length === 0) return null;

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <h3 className={compact ? 'text-sm font-semibold' : 'text-base font-semibold'}>
        Your responses
      </h3>
      {questions.map((q, index) => {
        const type = q.type ?? 'mcq';
        const answer = answers?.[q.id];
        const hasAnswer = answer !== undefined && answer !== null && answer !== '';

        return (
          <div
            key={q.id}
            className="rounded-lg border border-border bg-card p-3 space-y-2"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                Q{index + 1}
              </Badge>
              {type === 'subjective' && (
                <Badge variant="secondary" className="text-xs">
                  Subjective · Not graded
                </Badge>
              )}
              {type === 'mcq_ungraded' && (
                <Badge variant="secondary" className="text-xs">
                  Not graded
                </Badge>
              )}
              {type === 'mcq' && (
                <Badge variant="outline" className="text-xs">
                  Graded
                </Badge>
              )}
            </div>

            <p className={compact ? 'text-sm font-medium' : 'text-base font-medium'}>
              {q.question}
            </p>

            {!hasAnswer ? (
              <p className="text-xs text-muted-foreground italic">No response</p>
            ) : type === 'subjective' ? (
              <div className="rounded-md bg-muted/60 p-3">
                <p className="text-xs text-muted-foreground mb-1">Your answer</p>
                <p className="text-sm whitespace-pre-wrap break-words">
                  {answer as string}
                </p>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {(q.options ?? []).map((option, oi) => {
                  const selected = (answer as number) === oi;
                  const isCorrect =
                    type === 'mcq' &&
                    typeof q.correctAnswer === 'number' &&
                    q.correctAnswer === oi;
                  const wrongPick = type === 'mcq' && selected && !isCorrect;

                  let icon = (
                    <Circle className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
                  );
                  let textClass = 'text-muted-foreground';

                  if (type === 'mcq') {
                    if (isCorrect) {
                      icon = (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                      );
                      textClass = selected
                        ? 'text-foreground font-medium'
                        : 'text-foreground';
                    } else if (wrongPick) {
                      icon = (
                        <XCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                      );
                      textClass = 'text-foreground';
                    }
                  } else if (selected) {
                    // mcq_ungraded — neutral selection
                    icon = (
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    );
                    textClass = 'text-foreground font-medium';
                  }

                  return (
                    <li
                      key={oi}
                      className={`flex items-start gap-2 text-sm ${textClass}`}
                    >
                      {icon}
                      <span className="flex-1">{option}</span>
                      {selected && (
                        <span className="text-xs text-muted-foreground">
                          Your pick
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
