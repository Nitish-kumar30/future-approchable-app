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
import { 
  Clock, 
  GraduationCap, 
  ArrowLeft,
  Video,
  FileText,
  CheckCircle2,
  Loader2,
  ClipboardList,
  BookOpen,
  ExternalLink,
  Image as ImageIcon
} from 'lucide-react';

interface Course {
  id: string;
  name: string;
  description: string | null;
  mentor_name: string | null;
  mentor_info: string | null;
  duration: string | null;
  image_url: string | null;
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

interface Quiz {
  id: string;
  title: string;
  session_id: string | null;
  course_id: string | null;
}

interface PreReadingMaterial {
  id: string;
  session_id: string;
  title: string;
  link: string;
  display_order: number;
}

interface SessionProgress {
  session_id: string;
  is_completed: boolean;
}

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [preReadingMaterials, setPreReadingMaterials] = useState<PreReadingMaterial[]>([]);
  const [sessionProgress, setSessionProgress] = useState<SessionProgress[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCourse();
      fetchSessions(); // Always fetch sessions for public view
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

  const fetchCourse = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      setCourse(data);
    }
    setIsLoading(false);
  };

  const checkEnrollment = async () => {
    const { data } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user?.id)
      .eq('course_id', id)
      .maybeSingle();

    setIsEnrolled(!!data);
  };

  const fetchSessions = async () => {
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('id, title, description, session_date, session_order')
      .eq('course_id', id)
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
      .eq('course_id', id)
      .order('session_order', { ascending: true });

    if (sessionsData) {
      setSessions(sessionsData);
      
      const sessionIds = sessionsData.map(s => s.id);
      
      // Fetch quizzes for sessions and course-level quizzes
      const { data: quizzesData } = await supabase
        .from('quizzes')
        .select('id, title, session_id, course_id')
        .or(`session_id.in.(${sessionIds.join(',')}),course_id.eq.${id}`);
      
      if (quizzesData) {
        setQuizzes(quizzesData);
      }

      // Fetch pre-reading materials
      if (sessionIds.length > 0) {
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
        course_id: id,
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
      toast({
        title: 'Successfully enrolled!',
        description: `You're now enrolled in ${course?.name}`,
      });
      fetchSessions();
    }
  };

  const getQuizzesForSession = (sessionId: string) => 
    quizzes.filter(q => q.session_id === sessionId);

  const getCourseQuizzes = () => 
    quizzes.filter(q => q.course_id === id && !q.session_id);

  const getMaterialsForSession = (sessionId: string) => 
    preReadingMaterials.filter(m => m.session_id === sessionId);

  const isSessionCompleted = (sessionId: string) =>
    sessionProgress.find(p => p.session_id === sessionId)?.is_completed || false;

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

  if (!course) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-2">Course not found</h2>
          <Button onClick={() => navigate('/courses')}>Back to Courses</Button>
        </div>
      </MainLayout>
    );
  }

  const courseQuizzes = getCourseQuizzes();

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Back Button */}
        <Button variant="ghost" size="sm" onClick={() => navigate('/courses')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Courses
        </Button>

        {/* Course Image */}
        {course.image_url && (
          <div className="relative h-64 md:h-80 rounded-xl overflow-hidden bg-muted">
            <img 
              src={course.image_url} 
              alt={course.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Header */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-display font-bold text-foreground">
                {course.name}
              </h1>
              {course.mentor_name && (
                <p className="text-lg text-muted-foreground flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  By {course.mentor_name}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isEnrolled ? (
                <Badge variant="secondary" className="text-base px-4 py-2">
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Enrolled
                </Badge>
              ) : (
                <Button size="lg" onClick={handleEnroll} disabled={isEnrolling}>
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
          {course.duration && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {course.duration}
            </div>
          )}
        </div>

        <Separator />

        {/* Description */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>About this Course</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none text-foreground">
            <p>{course.description || 'No description available.'}</p>
            {course.mentor_info && (
              <>
                <h4 className="text-foreground font-semibold mt-4">About the Instructor</h4>
                <p>{course.mentor_info}</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Course-Level Quizzes */}
        {isEnrolled && courseQuizzes.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Course Assessments</h2>
            <div className="flex flex-wrap gap-2">
              {courseQuizzes.map(quiz => (
                <Button 
                  key={quiz.id} 
                  variant="outline"
                  onClick={() => navigate(`/quiz/${quiz.id}`)}
                  className="gap-2"
                >
                  <ClipboardList className="h-4 w-4" />
                  {quiz.title}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Sessions - Always Visible */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Course Content</h2>
          {sessions.length === 0 ? (
            <Card className="card-elevated border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                No content available yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sessions.map((session, index) => {
                const sessionQuizzes = getQuizzesForSession(session.id);
                const sessionMaterials = getMaterialsForSession(session.id);
                const completed = isSessionCompleted(session.id);
                
                return (
                  <Card key={session.id} className={`card-elevated ${completed ? 'border-success/30 bg-success/5' : ''}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Lesson {index + 1}
                            </Badge>
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
                        
                        {/* Session Actions */}
                        <div className="flex flex-wrap gap-2">
                          {session.recording_url && (
                            <Button variant="secondary" size="sm" asChild>
                              <a href={session.recording_url} target="_blank" rel="noopener noreferrer">
                                <Video className="mr-2 h-4 w-4" /> Watch Video
                              </a>
                            </Button>
                          )}
                          {session.presentation_url && (
                            <Button variant="secondary" size="sm" asChild>
                              <a href={session.presentation_url} target="_blank" rel="noopener noreferrer">
                                <FileText className="mr-2 h-4 w-4" /> Resources
                              </a>
                            </Button>
                          )}
                          {sessionQuizzes.map(quiz => (
                            <Button 
                              key={quiz.id} 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/quiz/${quiz.id}`)}
                            >
                              <ClipboardList className="mr-2 h-4 w-4" />
                              {quiz.title}
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    ) : (
                      <CardContent>
                        <p className="text-sm text-muted-foreground italic">
                          Enroll to access lesson materials and quizzes
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
