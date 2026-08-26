import { useEffect, useState, useCallback, useRef } from "react";
import confetti from "canvas-confetti";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { buildLoginUrl } from "@/lib/authRedirect";
import { useToast } from "@/hooks/use-toast";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import CertificatePanel from "@/components/certificate/CertificatePanel";
import { Markdown } from "@/components/ui/markdown";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  SessionQuizList,
  SessionQuiz,
  QuizSubmission,
} from "@/components/session/SessionQuizList";
import { formatCohortDateRange, formatShortDate } from "@/lib/formatCohortDate";
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
  Lock,
  MessageSquare,
} from "lucide-react";
import FeedbackDialog from "@/components/FeedbackDialog";

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
  is_content_unlocked?: boolean;
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
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const enrolledContentLoadedRef = useRef(false);

  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionQuizzes, setSessionQuizzes] = useState<
    Record<string, SessionQuiz[]>
  >({});
  const [quizSubmissions, setQuizSubmissions] = useState<QuizSubmission[]>([]);
  const [sessionProgress, setSessionProgress] = useState<SessionProgress[]>([]);
  const [preReadingMaterials, setPreReadingMaterials] = useState<
    PreReadingMaterial[]
  >([]);
  const [miniProjects, setMiniProjects] = useState<MiniProject[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(
    [],
  );
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [leaderboardFetched, setLeaderboardFetched] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [showPaymentGateDialog, setShowPaymentGateDialog] = useState(false);

  useEffect(() => {
    if (id) {
      enrolledContentLoadedRef.current = false;
      fetchCohort();
      fetchSessions(); // Always fetch public sessions as baseline
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
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      };
      // Pass auth token if available so enrolled users get full data
      if (user) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }
      }
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-cohort-detail?cohort_id=${id}`,
        { headers },
      );
      if (res.ok) {
        const data = await res.json();
        if (data.cohort) {
          setCohort(data.cohort);
        }
      }
    } catch (e) {
      console.error("Failed to fetch cohort:", e);
    }
    setIsLoading(false);
  };

  const fetchEnrollmentCount = async () => {
    const { data } = await supabase.rpc("get_cohort_enrollment_count", {
      _cohort_id: id,
    });
    setEnrollmentCount(data || 0);
  };

  const checkEnrollment = async () => {
    const { data } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", user?.id)
      .eq("cohort_id", id)
      .maybeSingle();

    setIsEnrolled(!!data);
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-public-sessions?cohort_id=${id}`,
        {
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        },
      );
      if (res.ok) {
        const data = await res.json();
        // Only set public sessions if enrolled content hasn't loaded yet
        if (!enrolledContentLoadedRef.current) {
          setSessions((data.sessions || []) as Session[]);
        }
      }
    } catch (e) {
      console.error("Failed to fetch public sessions:", e);
    }
  };

  const fetchEnrolledContent = async () => {
    const { data: sessionsData } = await supabase
      .from("sessions")
      .select("*")
      .eq("cohort_id", id)
      .order("session_order", { ascending: true });

    if (sessionsData) {
      enrolledContentLoadedRef.current = true;
      setSessions(sessionsData);

      const sessionIds = sessionsData.map((s) => s.id);
      if (sessionIds.length > 0) {
        const { data: sessionQuizzesData } = await supabase
          .from("session_quizzes")
          .select(
            `
            session_id,
            display_order,
            quiz:quizzes (
              id,
              title,
              questions
            )
          `,
          )
          .in("session_id", sessionIds)
          .order("display_order", { ascending: true });

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

              const questions = Array.isArray(quiz.questions)
                ? quiz.questions
                : [];
              quizzesMap[sq.session_id].push({
                id: quiz.id,
                title: quiz.title,
                questionCount: questions.length,
                displayOrder: sq.display_order,
              });
            }
          });

          setSessionQuizzes(quizzesMap);

          if (quizIds.length > 0) {
            const { data: submissionsData } = await supabase
              .from("quiz_submissions")
              .select("quiz_id, score, submitted_at")
              .eq("user_id", user?.id)
              .in("quiz_id", quizIds)
              .order("submitted_at", { ascending: false });

            if (submissionsData) {
              const latestSubmissions = new Map<string, QuizSubmission>();
              submissionsData.forEach((s: any) => {
                if (!latestSubmissions.has(s.quiz_id)) {
                  latestSubmissions.set(s.quiz_id, {
                    quizId: s.quiz_id,
                    score: s.score || 0,
                    submittedAt: s.submitted_at,
                  });
                }
              });
              setQuizSubmissions(Array.from(latestSubmissions.values()));
            }
          }
        }

        const { data: materialsData } = await supabase
          .from("pre_reading_materials")
          .select("*")
          .in("session_id", sessionIds)
          .order("display_order", { ascending: true });

        if (materialsData) {
          setPreReadingMaterials(materialsData);
        }

        const { data: projectsData } = await supabase
          .from("mini_projects")
          .select("*")
          .in("session_id", sessionIds)
          .order("display_order", { ascending: true });

        if (projectsData) {
          setMiniProjects(projectsData);
        }

        const { data: progressData } = await supabase
          .from("session_progress")
          .select("session_id, is_completed")
          .eq("user_id", user?.id)
          .in("session_id", sessionIds);

        if (progressData) {
          setSessionProgress(progressData);
        }
      }
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      navigate(buildLoginUrl(location.pathname + location.search));
      return;
    }

    setIsEnrolling(true);

    // Check registration approval before enrolling
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { data, error: fnError } = await supabase.functions.invoke(
        "check-registration-status",
        {
          body: { cohort_id: id },
        },
      );

      // Distinguish transient errors (network / edge-function failure) from a
      // genuine "not approved" response. A transient failure should surface a
      // retry toast, not the payment gate — otherwise an already-paid,
      // already-approved learner sees the misleading "Enrollment Requires
      // Payment" dialog on any hiccup.
      if (fnError) {
        setIsEnrolling(false);
        toast({
          title: "Couldn't verify your registration",
          description:
            "Something went wrong checking your approval status. Please try again in a moment.",
          variant: "destructive",
        });
        return;
      }

      if (!data?.approved) {
        setIsEnrolling(false);
        setShowPaymentGateDialog(true);
        return;
      }
    } catch {
      setIsEnrolling(false);
      toast({
        title: "Couldn't verify your registration",
        description:
          "Something went wrong checking your approval status. Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }

    // LINT (BUG-09): seat cap is only enforced client-side via the disabled
    // state of the Enroll button. This insert has no server-side check; two
    // learners clicking with 1 seat left can both succeed. Move the seat
    // check into a Postgres RPC / trigger.
    const { error } = await supabase.from("enrollments").insert({
      user_id: user.id,
      cohort_id: id,
    });

    setIsEnrolling(false);

    if (error) {
      toast({
        title: "Enrollment failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setIsEnrolled(true);
      setEnrollmentCount((prev) => prev + 1);
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ffffff"],
      });
      toast({
        title: "Successfully enrolled!",
        description: `You're now part of ${cohort?.name}`,
      });
    }
  };

  // LINT (BUG-17): leaderboard is fetched at most once per mount. If the
  // learner completes a session/quiz and comes back to this tab, they see
  // stale rankings. Consider refetching on tab focus or a soft TTL.
  const fetchLeaderboard = useCallback(async () => {
    if (!user || !id || leaderboardFetched) return;
    setIsLeaderboardLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-leaderboard?cohort_id=${id}&allow_enrolled=true`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setLeaderboardData(data.leaderboard || []);
      }
    } catch (e) {
      console.error("Failed to fetch leaderboard:", e);
    } finally {
      setIsLeaderboardLoading(false);
      setLeaderboardFetched(true);
    }
  }, [user, id, leaderboardFetched]);

  const handleTabChange = (value: string) => {
    if (value === "leaderboard" && isEnrolled && !leaderboardFetched) {
      fetchLeaderboard();
    }
  };

  const getQuizzesForSession = (sessionId: string): SessionQuiz[] =>
    sessionQuizzes[sessionId] || [];

  const getMaterialsForSession = (sessionId: string) =>
    preReadingMaterials.filter((m) => m.session_id === sessionId);

  const getProjectsForSession = (sessionId: string) =>
    miniProjects.filter((p) => p.session_id === sessionId);

  const isSessionCompleted = (sessionId: string) =>
    sessionProgress.find((p) => p.session_id === sessionId)?.is_completed ||
    false;

  const completedSessions = sessions.filter((s) =>
    isSessionCompleted(s.id),
  ).length;
  // LINT (BUG-13): overallProgress is computed differently here than in
  // Cohorts.tsx / ContinueLearningRow (which call the RPC
  // `compute_enrollment_progress_percent`). Numbers can disagree if the RPC
  // weights quizzes. Pick one source of truth.
  const overallProgress =
    sessions.length > 0 ? (completedSessions / sessions.length) * 100 : 0;

  // LINT (BUG-14): denominator is `quizSubmissions.length` (attempted only),
  // not the total number of quizzes in the cohort. A learner who tries one
  // quiz and gets 100% shows Avg Score: 100%.
  const averageScore =
    quizSubmissions.length > 0
      ? Math.round(
          quizSubmissions.reduce((sum, s) => sum + s.score, 0) /
            quizSubmissions.length,
        )
      : null;

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </AppShell>
    );
  }

  if (!cohort) {
    return (
      <AppShell>
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-2">Cohort not found</h2>
          <Button onClick={() => navigate("/cohorts")}>Back to Cohorts</Button>
        </div>
      </AppShell>
    );
  }

  const seatsLeft = cohort.max_seats
    ? cohort.max_seats - enrollmentCount
    : null;

  // A cohort whose dates have fully passed shouldn't offer "Enroll Now" even
  // if the admin never flipped enrollment_disabled — registering for
  // something that already happened doesn't make sense to a new learner.
  // LINT (BUG-01): this "past" definition disagrees with Cohorts.tsx and
  // CohortSpotlightRow, which treat a null end_date + past start_date as
  // Ongoing forever. Result: the list surfaces a "Register" button that
  // dead-ends here on "Registration Ended".
  const todayIso = new Date().toISOString().slice(0, 10);
  const isPastDated = cohort.end_date
    ? cohort.end_date < todayIso
    : cohort.start_date
      ? cohort.start_date < todayIso
      : false;
  const isRegistrationClosed = cohort.enrollment_disabled || isPastDated;
  const registrationClosedLabel = cohort.enrollment_disabled
    ? "Enrollment Closed"
    : "Registration Ended";

  return (
    <>
      <AppShell>
        <div className="space-y-5 animate-fade-in">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/cohorts")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Cohorts
          </Button>

          {/* Header */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl font-display font-bold text-foreground">
                  {cohort.name}
                </h1>
                {cohort.mentor_name && (
                  <p className="text-base text-muted-foreground flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Mentored by {cohort.mentor_name}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {isEnrolled ? (
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        overallProgress === 100 ? "default" : "secondary"
                      }
                      className="text-sm px-3 py-1"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {overallProgress === 100 ? "Completed" : "Enrolled"}
                    </Badge>
                    {averageScore !== null && (
                      <Badge variant="outline" className="text-sm px-3 py-1">
                        Avg Score: {averageScore}%
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFeedbackOpen(true)}
                      className="gap-2"
                    >
                      <MessageSquare className="h-4 w-4" /> Feedback
                    </Button>
                  </div>
                ) : isRegistrationClosed ? (
                  <Badge variant="secondary" className="text-base px-4 py-2">
                    {registrationClosedLabel}
                  </Badge>
                ) : (
                  <Button
                    size="lg"
                    onClick={handleEnroll}
                    disabled={
                      isEnrolling || (seatsLeft !== null && seatsLeft <= 0)
                    }
                  >
                    {isEnrolling ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enrolling...
                      </>
                    ) : (
                      "Enroll Now"
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-3 text-xs">
              {(cohort.start_date || cohort.session_time) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {formatCohortDateRange(
                    cohort.start_date,
                    cohort.end_date,
                    cohort.session_time,
                  )}
                </div>
              )}
              {seatsLeft !== null && !isRegistrationClosed && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {seatsLeft > 0 ? `${seatsLeft} seats left` : "Fully booked"}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Tabbed Content */}
          <Tabs defaultValue="about" onValueChange={handleTabChange}>
            <div className="-mx-8 overflow-x-auto md:mx-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TabsList className="inline-flex h-9 w-max min-w-full flex-nowrap justify-start gap-1 bg-muted/70 p-1 px-3 md:w-full md:px-1">
                <TabsTrigger value="about" className="h-7 shrink-0 rounded-md px-3 data-[state=active]:shadow-sm">
                  About
                </TabsTrigger>
                <TabsTrigger value="sessions" className="h-7 shrink-0 rounded-md px-3 data-[state=active]:shadow-sm">
                  Sessions
                </TabsTrigger>
                <TabsTrigger value="mentor" className="h-7 shrink-0 rounded-md px-3 data-[state=active]:shadow-sm">
                  Mentor
                </TabsTrigger>
                <TabsTrigger
                  value="leaderboard"
                  className="h-7 shrink-0 gap-1.5 rounded-md px-3 data-[state=active]:shadow-sm"
                >
                  <Trophy className="h-4 w-4" /> Leaderboard
                </TabsTrigger>
              </TabsList>
            </div>

            {/* About Tab */}
            <TabsContent value="about" className="space-y-6">
              {isEnrolled && sessions.length > 0 && (
                <Card className="card-elevated border-primary/20 bg-primary/5">
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold shrink-0">
                        Your Progress
                      </span>
                      <Progress value={overallProgress} className="h-2 flex-1" />
                      <span className="text-sm font-medium tabular-nums shrink-0">
                        {Math.round(overallProgress)}%
                      </span>
                    </div>
                    {isEnrolled && cohort && (
                      <CertificatePanel cohortId={cohort.id} programName={cohort.name} />
                    )}
                  </CardContent>
                </Card>
              )}

              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle>About this Cohort</CardTitle>
                </CardHeader>
                <CardContent>
                  <Markdown
                    content={cohort.description || "No description available."}
                  />
                </CardContent>
              </Card>

              {isEnrolled && (cohort.meeting_link || cohort.group_link) && (
                <Card className="card-elevated border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Links</CardTitle>
                    <CardDescription>
                      Resources for enrolled learners only
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-3">
                    {cohort.meeting_link && (
                      <Button variant="outline" asChild>
                        <a
                          href={cohort.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Video className="mr-2 h-4 w-4" /> Join Meeting
                          <ExternalLink className="ml-2 h-3 w-3" />
                        </a>
                      </Button>
                    )}
                    {cohort.group_link && (
                      <Button variant="outline" asChild>
                        <a
                          href={cohort.group_link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
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
                      <Card
                        key={session.id}
                        className={`card-elevated ${completed ? "border-success/30 bg-success/5" : ""}`}
                      >
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
                                  <Badge
                                    variant="secondary"
                                    className="text-xs bg-success/20 text-success border-success/30"
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1" />{" "}
                                    Completed
                                  </Badge>
                                )}
                              </div>
                              <CardTitle className="text-lg">
                                {session.title}
                              </CardTitle>
                            </div>
                          </div>
                          {session.description && (
                            <Markdown
                              content={session.description}
                              className="text-sm"
                            />
                          )}
                        </CardHeader>

                        {isEnrolled ? (
                          <CardContent className="space-y-4">
                            {session.is_content_unlocked ? (
                              <>
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
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      asChild
                                    >
                                      <a
                                        href={session.recording_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <Video className="mr-2 h-4 w-4" />{" "}
                                        Recording
                                      </a>
                                    </Button>
                                  )}
                                  {session.presentation_url && (
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      asChild
                                    >
                                      <a
                                        href={session.presentation_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <FileText className="mr-2 h-4 w-4" />{" "}
                                        Slides
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
                                        <div
                                          key={project.id}
                                          className="p-3 rounded-lg bg-muted/50 border"
                                        >
                                          <h4 className="font-medium text-sm">
                                            {project.title}
                                          </h4>
                                          {project.description && (
                                            <Markdown
                                              content={project.description}
                                              className="text-xs"
                                            />
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <p className="text-sm text-muted-foreground flex items-center gap-2">
                                <Lock className="h-4 w-4" /> This session's
                                content will be available soon.
                              </p>
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
                    {cohort.mentor_name || "Mentor"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {cohort.mentor_info ? (
                    <Markdown content={cohort.mentor_info} />
                  ) : (
                    <p className="text-muted-foreground">
                      No mentor information available.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Leaderboard Tab */}
            <TabsContent value="leaderboard" className="min-w-0">
              {isEnrolled ? (
                <Card className="card-elevated -mx-8 overflow-hidden rounded-none border-x-0 md:mx-0 md:rounded-lg md:border-x">
                  <CardHeader className="px-3 md:px-6">
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" /> Leaderboard
                    </CardTitle>
                    <CardDescription>
                      See how you compare with other learners
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-0 md:px-6">
                    {isLeaderboardLoading ? (
                      <div className="space-y-3 px-3 md:px-0">
                        {[...Array(5)].map((_, i) => (
                          <Skeleton key={i} className="h-10 w-full" />
                        ))}
                      </div>
                    ) : leaderboardData.length === 0 ? (
                      <p className="text-muted-foreground text-center py-6 px-3 md:px-0">
                        No leaderboard data available yet.
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10 px-2 md:w-16 md:px-4">
                              #
                            </TableHead>
                            <TableHead className="min-w-0 px-2 md:px-4">
                              Name
                            </TableHead>
                            <TableHead className="whitespace-nowrap px-2 text-center md:px-4">
                              <span className="md:hidden">Score</span>
                              <span className="hidden md:inline">Avg Score</span>
                            </TableHead>
                            <TableHead className="hidden text-center md:table-cell">
                              Quizzes
                            </TableHead>
                            <TableHead className="hidden text-center md:table-cell">
                              Sessions
                            </TableHead>
                            <TableHead className="whitespace-nowrap px-2 text-center md:px-4">
                              <span className="md:hidden">Done</span>
                              <span className="hidden md:inline">
                                Completion
                              </span>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {leaderboardData.map((entry, index) => (
                            <TableRow
                              key={entry.user_id}
                              className={
                                entry.user_id === user?.id ? "bg-primary/5" : ""
                              }
                            >
                              <TableCell className="px-2 font-medium md:px-4">
                                {index + 1 <= 3 ? (
                                  <span className="text-lg">
                                    {["🥇", "🥈", "🥉"][index]}
                                  </span>
                                ) : (
                                  index + 1
                                )}
                              </TableCell>
                              <TableCell className="min-w-0 max-w-0 px-2 font-medium md:max-w-none md:px-4">
                                <div className="flex min-w-0 items-center gap-1">
                                  <span className="truncate">
                                    {entry.user_name ||
                                      entry.user_email.split("@")[0]}
                                  </span>
                                  {entry.user_id === user?.id && (
                                    <Badge
                                      variant="outline"
                                      className="shrink-0 text-xs"
                                    >
                                      You
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="whitespace-nowrap px-2 text-center md:px-4">
                                {entry.avg_quiz_score}%
                              </TableCell>
                              <TableCell className="hidden text-center md:table-cell">
                                {entry.quizzes_attempted}
                              </TableCell>
                              <TableCell className="hidden text-center md:table-cell">
                                {entry.sessions_completed}/
                                {entry.total_sessions}
                              </TableCell>
                              <TableCell className="whitespace-nowrap px-2 text-center md:px-4">
                                {entry.completion_percentage}%
                              </TableCell>
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
                      <h3 className="text-lg font-semibold">
                        Enroll to View the Leaderboard
                      </h3>
                      <p className="text-muted-foreground mt-1">
                        Join this cohort to see how learners are performing and
                        track your progress.
                      </p>
                    </div>
                    {isRegistrationClosed ? (
                      <Badge
                        variant="secondary"
                        className="text-base px-4 py-2"
                      >
                        {registrationClosedLabel}
                      </Badge>
                    ) : (
                      <Button
                        size="lg"
                        onClick={handleEnroll}
                        disabled={
                          isEnrolling || (seatsLeft !== null && seatsLeft <= 0)
                        }
                      >
                        {isEnrolling ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enrolling...
                          </>
                        ) : (
                          "Enroll Now"
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </AppShell>

      {isEnrolled && cohort && (
        <FeedbackDialog
          open={feedbackOpen}
          onOpenChange={setFeedbackOpen}
          cohortId={cohort.id}
          entityName={cohort.name}
        />
      )}

      {/* LINT (BUG-19): user-facing copy mentions "commitment fee" with no
          amount, currency, or link to the actual price — inconsistent with
          the localized pricing surface elsewhere in the app. */}
      <Dialog
        open={showPaymentGateDialog}
        onOpenChange={setShowPaymentGateDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enrollment Requires Payment</DialogTitle>
            <DialogDescription>
              Your enrollment is subject to the commitment fee. If you've
              already paid, please allow 24-48 hours for your registration to be
              approved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPaymentGateDialog(false)}
            >
              Close
            </Button>
            <Button asChild>
              <Link to="/registration">Register Now</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
