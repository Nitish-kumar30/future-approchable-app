import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { SessionQuizList, SessionQuiz, QuizSubmission } from '@/components/session/SessionQuizList';
import { 
  Calendar, 
  GraduationCap, 
  Users, 
  ArrowLeft,
  Video,
  FileText,
  ExternalLink,
  CheckCircle2,
  Loader2,
  BookOpen
} from 'lucide-react';

interface Cohort {
  id: string;
  name: string;
  description: string | null;
  mentor_name: string | null;
  mentor_info: string | null;
  start_date: string | null;
  end_date: string | null;
  max_seats: number | null;
  meeting_link: string | null;
  group_link: string | null;
}

interface Session {
  id: string;
  title: string;
  description: string | null;
  session_date: string | null;
  recording_url: string | null;
  presentation_url: string | null;
  session_order: number;
}

interface SessionProgress {
  session_id: string;
  is_completed: boolean;
}

interface PreReadingMaterial {
  id: string;
  session_id: string;
  title: string;
  link: string;
  display_order: number;
}

export default function CohortDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionQuizzes, setSessionQuizzes] = useState<Record<string, SessionQuiz[]>>({});
  const [quizSubmissions, setQuizSubmissions] = useState<QuizSubmission[]>([]);
  const [sessionProgress, setSessionProgress] = useState<SessionProgress[]>([]);
  const [preReadingMaterials, setPreReadingMaterials] = useState<PreReadingMaterial[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentCount, setEnrollmentCount] = useState(0);

  useEffect(() => {
    if (id) {
      fetchCohort();
      fetchSessions();
      fetchEnrollmentCount();
      if (user) {
        checkEnrollment();
      }
    }
  }, [id, user]);

  useEffect(() => {
    if (isEnrolled && id && user) {
      fetchEnrolledContent();
    }
  }, [isEnrolled, id, user]);

  const fetchCohort = async () => {
    const { data, error } = await supabase
      .from('cohorts')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      setCohort(data);
    }
    setIsLoading(false);
  };

  const fetchEnrollmentCount = async () => {
    const { count } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('cohort_id', id);
    
    setEnrollmentCount(count || 0);
  };

  const checkEnrollment = async () => {
    const { data } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user?.id)
      .eq('cohort_id', id)
      .maybeSingle();

    setIsEnrolled(!!data);
  };

  const fetchSessions = async () => {
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('id, title, description, session_date, session_order')
      .eq('cohort_id', id)
      .order('session_order', { ascending: true });

    if (sessionsData) {
      setSessions(sessionsData as Session[]);
    }
  };

  const fetchEnrolledContent = async () => {
    // Re-fetch sessions with full data for enrolled users
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('*')
      .eq('cohort_id', id)
      .order('session_order', { ascending: true });

    if (sessionsData) {
      setSessions(sessionsData);
      
      const sessionIds = sessionsData.map(s => s.id);
      if (sessionIds.length > 0) {
        // Fetch quizzes via session_quizzes junction table
        const { data: sessionQuizzesData } = await supabase
          .from('session_quizzes')
          .select(`
            session_id,
            display_order,
            quiz:quizzes (
              id,
              title,
              questions
            )
          `)
          .in('session_id', sessionIds)
          .order('display_order', { ascending: true });
        
        if (sessionQuizzesData) {
          const quizzesMap: Record<string, SessionQuiz[]> = {};
          const quizIds: string[] = [];
          
          sessionQuizzesData.forEach((sq: any) => {
            if (sq.quiz) {
              const quiz = sq.quiz;
              quizIds.push(quiz.id);
              
              if (!quizzesMap[sq.session_id]) {
                quizzesMap[sq.session_id] = [];
              }
              
              const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
              quizzesMap[sq.session_id].push({
                id: quiz.id,
                title: quiz.title,
                questionCount: questions.length,
                displayOrder: sq.display_order
              });
            }
          });
          
          setSessionQuizzes(quizzesMap);

          // Fetch quiz submissions for the user
          if (quizIds.length > 0) {
            const { data: submissionsData } = await supabase
              .from('quiz_submissions')
              .select('quiz_id, score, submitted_at')
              .eq('user_id', user?.id)
              .in('quiz_id', quizIds)
              .order('submitted_at', { ascending: false });
            
            if (submissionsData) {
              // Keep only latest submission per quiz
              const latestSubmissions = new Map<string, QuizSubmission>();
              submissionsData.forEach((s: any) => {
                if (!latestSubmissions.has(s.quiz_id)) {
                  latestSubmissions.set(s.quiz_id, {
                    quizId: s.quiz_id,
                    score: s.score || 0,
                    submittedAt: s.submitted_at
                  });
                }
              });
              setQuizSubmissions(Array.from(latestSubmissions.values()));
            }
          }
        }

        // Fetch pre-reading materials
        const { data: materialsData } = await supabase
          .from('pre_reading_materials')
          .select('*')
          .in('session_id', sessionIds)
          .order('display_order', { ascending: true });
        
        if (materialsData) {
          setPreReadingMaterials(materialsData);
        }

        // Fetch session progress
        const { data: progressData } = await supabase
          .from('session_progress')
          .select('session_id, is_completed')
          .eq('user_id', user?.id)
          .in('session_id', sessionIds);
        
        if (progressData) {
          setSessionProgress(progressData);
        }
      }
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setIsEnrolling(true);
    const { error } = await supabase
      .from('enrollments')
      .insert({
        user_id: user.id,
        cohort_id: id,
      });

    setIsEnrolling(false);

    if (error) {
      toast({
        title: 'Enrollment failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setIsEnrolled(true);
      setEnrollmentCount(prev => prev + 1);
      toast({
        title: 'Successfully enrolled!',
        description: `You're now part of ${cohort?.name}`,
      });
      fetchSessions();
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getQuizzesForSession = (sessionId: string): SessionQuiz[] => 
    sessionQuizzes[sessionId] || [];

  const getMaterialsForSession = (sessionId: string) => 
    preReadingMaterials.filter(m => m.session_id === sessionId);

  const isSessionCompleted = (sessionId: string) =>
    sessionProgress.find(p => p.session_id === sessionId)?.is_completed || false;

  // Calculate overall progress
  const completedSessions = sessions.filter(s => isSessionCompleted(s.id)).length;
  const overallProgress = sessions.length > 0 ? (completedSessions / sessions.length) * 100 : 0;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!cohort) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-2">Cohort not found</h2>
          <Button onClick={() => navigate('/cohorts')}>Back to Cohorts</Button>
        </div>
      </MainLayout>
    );
  }

  const seatsLeft = cohort.max_seats ? cohort.max_seats - enrollmentCount : null;

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Back Button */}
        <Button variant="ghost" size="sm" onClick={() => navigate('/cohorts')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Cohorts
        </Button>

        {/* Header */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-display font-bold text-foreground">
                {cohort.name}
              </h1>
              {cohort.mentor_name && (
                <p className="text-lg text-muted-foreground flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Mentored by {cohort.mentor_name}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isEnrolled ? (
                <Badge variant="secondary" className="text-base px-4 py-2">
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Enrolled
                </Badge>
              ) : (
                <Button size="lg" onClick={handleEnroll} disabled={isEnrolling || (seatsLeft !== null && seatsLeft <= 0)}>
                  {isEnrolling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enrolling...
                    </>
                  ) : (
                    'Enroll Now'
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Meta Info */}
          <div className="flex flex-wrap gap-4 text-sm">
            {cohort.start_date && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {formatDate(cohort.start_date)}
                {cohort.end_date && ` - ${formatDate(cohort.end_date)}`}
              </div>
            )}
            {seatsLeft !== null && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                {seatsLeft > 0 ? `${seatsLeft} seats left` : 'Fully booked'}
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Overall Progress - Only for enrolled users */}
        {isEnrolled && sessions.length > 0 && (
          <Card className="card-elevated border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Your Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {completedSessions} of {sessions.length} sessions completed
                  </span>
                  <span className="font-medium">{Math.round(overallProgress)}%</span>
                </div>
                <Progress value={overallProgress} className="h-3" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Description */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>About this Cohort</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none text-foreground">
            <p>{cohort.description || 'No description available.'}</p>
            {cohort.mentor_info && (
              <>
                <h4 className="text-foreground font-semibold mt-4">About the Mentor</h4>
                <p>{cohort.mentor_info}</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Enrolled Content - Quick Links */}
        {isEnrolled && (cohort.meeting_link || cohort.group_link) && (
          <Card className="card-elevated border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Quick Links</CardTitle>
              <CardDescription>Resources for enrolled learners only</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {cohort.meeting_link && (
                <Button variant="outline" asChild>
                  <a href={cohort.meeting_link} target="_blank" rel="noopener noreferrer">
                    <Video className="mr-2 h-4 w-4" /> Join Meeting
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </a>
                </Button>
              )}
              {cohort.group_link && (
                <Button variant="outline" asChild>
                  <a href={cohort.group_link} target="_blank" rel="noopener noreferrer">
                    <Users className="mr-2 h-4 w-4" /> Join Group
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sessions - Always Visible */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Sessions</h2>
          {sessions.length === 0 ? (
            <Card className="card-elevated border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                No sessions available yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sessions.map((session, index) => {
                const sessionQuizzesList = getQuizzesForSession(session.id);
                const sessionMaterials = getMaterialsForSession(session.id);
                const completed = isSessionCompleted(session.id);
                
                return (
                  <Card key={session.id} className={`card-elevated ${completed ? 'border-success/30 bg-success/5' : ''}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Session {index + 1}
                            </Badge>
                            {session.session_date && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(session.session_date).toLocaleDateString()}
                              </span>
                            )}
                            {completed && (
                              <Badge variant="secondary" className="text-xs bg-success/20 text-success border-success/30">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-lg">{session.title}</CardTitle>
                        </div>
                      </div>
                      {session.description && (
                        <CardDescription>{session.description}</CardDescription>
                      )}
                    </CardHeader>
                    
                    {/* Show content only if enrolled */}
                    {isEnrolled ? (
                      <CardContent className="space-y-4">
                        {/* Pre-Reading Materials */}
                        {sessionMaterials.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                              <BookOpen className="h-4 w-4" />
                              Pre-Reading Materials
                            </div>
                            <div className="pl-6 space-y-1">
                              {sessionMaterials.map((material) => (
                                <a
                                  key={material.id}
                                  href={material.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  {material.title}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Session Resources */}
                        <div className="flex flex-wrap gap-2">
                          {session.recording_url && (
                            <Button variant="secondary" size="sm" asChild>
                              <a href={session.recording_url} target="_blank" rel="noopener noreferrer">
                                <Video className="mr-2 h-4 w-4" /> Recording
                              </a>
                            </Button>
                          )}
                          {session.presentation_url && (
                            <Button variant="secondary" size="sm" asChild>
                              <a href={session.presentation_url} target="_blank" rel="noopener noreferrer">
                                <FileText className="mr-2 h-4 w-4" /> Slides
                              </a>
                            </Button>
                          )}
                        </div>

                        {/* Quizzes Section */}
                        {sessionQuizzesList.length > 0 && (
                          <SessionQuizList
                            quizzes={sessionQuizzesList}
                            submissions={quizSubmissions}
                            sessionTitle={session.title}
                          />
                        )}
                      </CardContent>
                    ) : (
                      <CardContent>
                        <p className="text-sm text-muted-foreground italic">
                          Enroll to access session materials and quizzes
                        </p>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
