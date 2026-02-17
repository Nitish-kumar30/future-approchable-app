import { useEffect, useState, useCallback } from 'react';
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
import { Markdown } from '@/components/ui/markdown';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SessionQuizList, SessionQuiz, QuizSubmission } from '@/components/session/SessionQuizList';
import { formatCohortDateRange, formatShortDate } from '@/lib/formatCohortDate';
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
  BookOpen,
  FolderKanban,
  Trophy,
  Lock
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
  session_time: string | null;
  meeting_link: string | null;
  group_link: string | null;
  enrollment_disabled: boolean;
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

interface MiniProject {
  id: string;
  session_id: string;
  title: string;
  description: string | null;
  display_order: number;
}

interface LeaderboardEntry {
  user_id: string;
  user_name: string | null;
  user_email: string;
  avg_quiz_score: number;
  quizzes_attempted: number;
  sessions_completed: number;
  total_sessions: number;
  completion_percentage: number;
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
  const [miniProjects, setMiniProjects] = useState<MiniProject[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [leaderboardFetched, setLeaderboardFetched] = useState(false);

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
    const { data } = await supabase.rpc('get_cohort_enrollment_count', { _cohort_id: id });
    setEnrollmentCount(data || 0);
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
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('*')
      .eq('cohort_id', id)
      .order('session_order', { ascending: true });

    if (sessionsData) {
      setSessions(sessionsData);
      
      const sessionIds = sessionsData.map(s => s.id);
      if (sessionIds.length > 0) {
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

          if (quizIds.length > 0) {
            const { data: submissionsData } = await supabase
              .from('quiz_submissions')
              .select('quiz_id, score, submitted_at')
              .eq('user_id', user?.id)
              .in('quiz_id', quizIds)
              .order('submitted_at', { ascending: false });
            
            if (submissionsData) {
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

        const { data: materialsData } = await supabase
          .from('pre_reading_materials')
          .select('*')
          .in('session_id', sessionIds)
          .order('display_order', { ascending: true });
        
        if (materialsData) {
          setPreReadingMaterials(materialsData);
        }

        const { data: projectsData } = await supabase
          .from('mini_projects')
          .select('*')
          .in('session_id', sessionIds)
          .order('display_order', { ascending: true });
        
        if (projectsData) {
          setMiniProjects(projectsData);
        }

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

  const fetchLeaderboard = useCallback(async () => {
    if (!user || !id || leaderboardFetched) return;
    setIsLeaderboardLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-leaderboard?cohort_id=${id}&allow_enrolled=true`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setLeaderboardData(data.leaderboard || []);
      }
    } catch (e) {
      console.error('Failed to fetch leaderboard:', e);
    } finally {
      setIsLeaderboardLoading(false);
      setLeaderboardFetched(true);
    }
  }, [user, id, leaderboardFetched]);

  const handleTabChange = (value: string) => {
    if (value === 'leaderboard' && isEnrolled && !leaderboardFetched) {
      fetchLeaderboard();
    }
  };

  const getQuizzesForSession = (sessionId: string): SessionQuiz[] => 
    sessionQuizzes[sessionId] || [];

  const getMaterialsForSession = (sessionId: string) => 
    preReadingMaterials.filter(m => m.session_id === sessionId);

  const getProjectsForSession = (sessionId: string) => 
    miniProjects.filter(p => p.session_id === sessionId);

  const isSessionCompleted = (sessionId: string) =>
    sessionProgress.find(p => p.session_id === sessionId)?.is_completed || false;

  const completedSessions = sessions.filter(s => isSessionCompleted(s.id)).length;
  const overallProgress = sessions.length > 0 ? (completedSessions / sessions.length) * 100 : 0;

  const averageScore = quizSubmissions.length > 0
    ? Math.round(quizSubmissions.reduce((sum, s) => sum + s.score, 0) / quizSubmissions.length)
    : null;

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
                <div className="flex items-center gap-3">
                  <Badge 
                    variant={overallProgress === 100 ? "default" : "secondary"} 
                    className="text-base px-4 py-2"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" /> 
                    {overallProgress === 100 ? 'Completed' : 'Enrolled'}
                  </Badge>
                  {averageScore !== null && (
                    <Badge variant="outline" className="text-base px-4 py-2">
                      Avg Score: {averageScore}%
                    </Badge>
                  )}
                </div>
              ) : cohort.enrollment_disabled ? (
                <Badge variant="secondary" className="text-base px-4 py-2">
                  Enrollment Closed
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
            {(cohort.start_date || cohort.session_time) && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {formatCohortDateRange(cohort.start_date, cohort.end_date, cohort.session_time)}
              </div>
            )}
            {seatsLeft !== null && !cohort.enrollment_disabled && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                {seatsLeft > 0 ? `${seatsLeft} seats left` : 'Fully booked'}
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Tabbed Content */}
        <Tabs defaultValue="about" onValueChange={handleTabChange}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="mentor">Mentor</TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-1.5">
              <Trophy className="h-4 w-4" /> Leaderboard
            </TabsTrigger>
          </TabsList>

          {/* About Tab */}
          <TabsContent value="about" className="space-y-6">
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

            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>About this Cohort</CardTitle>
              </CardHeader>
              <CardContent>
                <Markdown content={cohort.description || 'No description available.'} />
              </CardContent>
            </Card>

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
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-4">
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
                  const sessionProjects = getProjectsForSession(session.id);
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
                                  {formatShortDate(session.session_date)}
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
                          <Markdown content={session.description} className="text-sm" />
                        )}
                      </CardHeader>
                      
                      {isEnrolled ? (
                        <CardContent className="space-y-4">
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

                          {sessionQuizzesList.length > 0 && (
                            <SessionQuizList
                              quizzes={sessionQuizzesList}
                              submissions={quizSubmissions}
                              sessionTitle={session.title}
                            />
                          )}

                          {sessionProjects.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <FolderKanban className="h-4 w-4" />
                                Mini Projects
                              </div>
                              <div className="pl-6 space-y-3">
                                {sessionProjects.map((project) => (
                                  <div key={project.id} className="p-3 rounded-lg bg-muted/50 border">
                                    <h4 className="font-medium text-sm">{project.title}</h4>
                                    {project.description && (
                                      <Markdown content={project.description} className="text-xs" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
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
          </TabsContent>

          {/* Mentor Tab */}
          <TabsContent value="mentor">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  {cohort.mentor_name || 'Mentor'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cohort.mentor_info ? (
                  <Markdown content={cohort.mentor_info} />
                ) : (
                  <p className="text-muted-foreground">No mentor information available.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard">
            {isEnrolled ? (
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" /> Leaderboard
                  </CardTitle>
                  <CardDescription>See how you compare with other learners</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLeaderboardLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : leaderboardData.length === 0 ? (
                    <p className="text-muted-foreground text-center py-6">No leaderboard data available yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Rank</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-center">Avg Score</TableHead>
                          <TableHead className="text-center">Quizzes</TableHead>
                          <TableHead className="text-center">Sessions</TableHead>
                          <TableHead className="text-center">Completion</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaderboardData.map((entry, index) => (
                          <TableRow key={entry.user_id} className={entry.user_id === user?.id ? 'bg-primary/5' : ''}>
                            <TableCell className="font-medium">
                              {index + 1 <= 3 ? (
                                <span className="text-lg">{['🥇', '🥈', '🥉'][index]}</span>
                              ) : (
                                index + 1
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {entry.user_name || entry.user_email.split('@')[0]}
                              {entry.user_id === user?.id && (
                                <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">{entry.avg_quiz_score}%</TableCell>
                            <TableCell className="text-center">{entry.quizzes_attempted}</TableCell>
                            <TableCell className="text-center">{entry.sessions_completed}/{entry.total_sessions}</TableCell>
                            <TableCell className="text-center">{entry.completion_percentage}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="card-elevated">
                <CardContent className="py-12 text-center space-y-4">
                  <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold">Enroll to View the Leaderboard</h3>
                    <p className="text-muted-foreground mt-1">
                      Join this cohort to see how learners are performing and track your progress.
                    </p>
                  </div>
                  {cohort.enrollment_disabled ? (
                    <Badge variant="secondary" className="text-base px-4 py-2">
                      Enrollment Closed
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
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
