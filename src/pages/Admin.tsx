import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import MainLayout from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, BookOpen, GraduationCap, ClipboardList, Plus, Pencil, Trash2, Loader2, Copy } from 'lucide-react';
import { CohortForm } from '@/components/admin/CohortForm';
import { CourseForm } from '@/components/admin/CourseForm';
import { SessionForm } from '@/components/admin/SessionForm';
import { QuizForm } from '@/components/admin/QuizForm';

interface Cohort {
  id: string;
  name: string;
  description: string;
  mentor_name: string;
  mentor_info: string;
  start_date: string;
  end_date: string;
  max_seats: number | null;
  session_time: string;
  meeting_link: string;
  group_link: string;
  is_published: boolean;
}

interface Course {
  id: string;
  name: string;
  description: string;
  mentor_name: string;
  mentor_info: string;
  duration: string;
  image_url: string;
  start_date: string;
  is_published: boolean;
}

interface Session {
  id: string;
  title: string;
  description: string;
  cohort_id: string | null;
  course_id: string | null;
  session_date: string;
  recording_url: string;
  presentation_url: string;
  session_order: number;
}

interface PreReadingMaterial {
  id?: string;
  title: string;
  link: string;
  display_order: number;
}

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
}

interface SessionQuiz {
  quiz_id: string;
}

export default function Admin() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [sessionMaterials, setSessionMaterials] = useState<PreReadingMaterial[]>([]);
  const [sessionQuizIds, setSessionQuizIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [cohortFormOpen, setCohortFormOpen] = useState(false);
  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [sessionFormOpen, setSessionFormOpen] = useState(false);
  const [quizFormOpen, setQuizFormOpen] = useState(false);

  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchAllData();
    }
  }, [isAdmin]);

  const fetchAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchCohorts(),
      fetchCourses(),
      fetchSessions(),
      fetchQuizzes(),
    ]);
    setIsLoading(false);
  };

  const fetchCohorts = async () => {
    const { data } = await supabase.from('cohorts').select('*').order('created_at', { ascending: false });
    if (data) setCohorts(data as Cohort[]);
  };

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
    if (data) setCourses(data as Course[]);
  };

  const fetchSessions = async () => {
    const { data } = await supabase.from('sessions').select('*').order('session_order', { ascending: true });
    if (data) setSessions(data as Session[]);
  };

  const fetchQuizzes = async () => {
    const { data } = await supabase.from('quizzes').select('*').order('created_at', { ascending: false });
    if (data) setQuizzes(data.map(q => ({ ...q, questions: (q.questions as unknown as Question[]) || [] })) as Quiz[]);
  };

  // Cohort CRUD
  const handleSaveCohort = async (cohort: Omit<Cohort, 'id'> & { id?: string }) => {
    const cohortData = {
      name: cohort.name,
      description: cohort.description || null,
      mentor_name: cohort.mentor_name || null,
      mentor_info: cohort.mentor_info || null,
      start_date: cohort.start_date || null,
      end_date: cohort.end_date || null,
      max_seats: cohort.max_seats || null,
      session_time: cohort.session_time || null,
      meeting_link: cohort.meeting_link || null,
      group_link: cohort.group_link || null,
      is_published: cohort.is_published,
    };
    
    if (cohort.id) {
      const { error } = await supabase.from('cohorts').update(cohortData).eq('id', cohort.id);
      if (error) {
        toast({ title: 'Error updating cohort', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Cohort updated successfully' });
        fetchCohorts();
      }
    } else {
      const { error } = await supabase.from('cohorts').insert(cohortData);
      if (error) {
        toast({ title: 'Error creating cohort', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Cohort created successfully' });
        fetchCohorts();
      }
    }
  };

  const handleDeleteCohort = async (id: string) => {
    const { error } = await supabase.from('cohorts').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error deleting cohort', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Cohort deleted successfully' });
      fetchCohorts();
    }
  };

  const handleDuplicateCohort = async (cohort: Cohort) => {
    try {
      // 1. Create new cohort (without URLs)
      const newCohortData = {
        name: `${cohort.name} (Copy)`,
        description: cohort.description || null,
        mentor_name: cohort.mentor_name || null,
        mentor_info: cohort.mentor_info || null,
        start_date: cohort.start_date || null,
        end_date: cohort.end_date || null,
        max_seats: cohort.max_seats || null,
        session_time: cohort.session_time || null,
        meeting_link: null, // Exclude URL
        group_link: null,   // Exclude URL
        is_published: false, // Always start as draft
      };

      const { data: newCohort, error: cohortError } = await supabase
        .from('cohorts')
        .insert(newCohortData)
        .select('id')
        .single();

      if (cohortError || !newCohort) {
        throw new Error(cohortError?.message || 'Failed to create cohort');
      }

      // 2. Fetch sessions for original cohort
      const { data: originalSessions } = await supabase
        .from('sessions')
        .select('*')
        .eq('cohort_id', cohort.id)
        .order('session_order', { ascending: true });

      if (originalSessions && originalSessions.length > 0) {
        for (const session of originalSessions) {
          // Create new session (without URLs)
          const newSessionData = {
            cohort_id: newCohort.id,
            title: session.title,
            description: session.description || null,
            session_date: session.session_date || null,
            session_order: session.session_order || 0,
            recording_url: null,      // Exclude URL
            presentation_url: null,   // Exclude URL
          };

          const { data: newSession, error: sessionError } = await supabase
            .from('sessions')
            .insert(newSessionData)
            .select('id')
            .single();

          if (sessionError || !newSession) continue;

          // 3. Copy pre-reading materials (without links)
          const { data: materials } = await supabase
            .from('pre_reading_materials')
            .select('*')
            .eq('session_id', session.id)
            .order('display_order', { ascending: true });

          if (materials && materials.length > 0) {
            const newMaterials = materials.map(m => ({
              session_id: newSession.id,
              title: m.title,
              link: '', // Clear link
              display_order: m.display_order,
            }));
            await supabase.from('pre_reading_materials').insert(newMaterials);
          }

          // 4. Copy session quiz assignments (quizzes are reused, not duplicated)
          const { data: sessionQuizzes } = await supabase
            .from('session_quizzes')
            .select('quiz_id, display_order')
            .eq('session_id', session.id)
            .order('display_order', { ascending: true });

          if (sessionQuizzes && sessionQuizzes.length > 0) {
            const newQuizAssignments = sessionQuizzes.map(sq => ({
              session_id: newSession.id,
              quiz_id: sq.quiz_id,
              display_order: sq.display_order,
            }));
            await supabase.from('session_quizzes').insert(newQuizAssignments);
          }
        }
      }

      toast({ title: 'Cohort duplicated successfully', description: 'All sessions and quizzes have been copied (URLs excluded)' });
      fetchCohorts();
      fetchSessions();
    } catch (error) {
      toast({ title: 'Error duplicating cohort', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    }
  };

  // Course CRUD
  const handleSaveCourse = async (course: Omit<Course, 'id'> & { id?: string }) => {
    const courseData = {
      name: course.name,
      description: course.description || null,
      mentor_name: course.mentor_name || null,
      mentor_info: course.mentor_info || null,
      duration: course.duration || null,
      image_url: course.image_url || null,
      start_date: course.start_date || null,
      is_published: course.is_published,
    };
    
    if (course.id) {
      const { error } = await supabase.from('courses').update(courseData).eq('id', course.id);
      if (error) {
        toast({ title: 'Error updating course', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Course updated successfully' });
        fetchCourses();
      }
    } else {
      const { error } = await supabase.from('courses').insert(courseData);
      if (error) {
        toast({ title: 'Error creating course', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Course created successfully' });
        fetchCourses();
      }
    }
  };

  const handleDeleteCourse = async (id: string) => {
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error deleting course', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Course deleted successfully' });
      fetchCourses();
    }
  };

  // Session CRUD
  const handleSaveSession = async (session: Omit<Session, 'id'> & { id?: string }, materials: PreReadingMaterial[], quizIds: string[]) => {
    const sessionData = {
      title: session.title,
      description: session.description || null,
      cohort_id: session.cohort_id || null,
      course_id: session.course_id || null,
      session_date: session.session_date || null,
      recording_url: session.recording_url || null,
      presentation_url: session.presentation_url || null,
      session_order: session.session_order || 0,
    };
    
    let sessionId = session.id;
    
    if (session.id) {
      const { error } = await supabase.from('sessions').update(sessionData).eq('id', session.id);
      if (error) {
        toast({ title: 'Error updating session', description: error.message, variant: 'destructive' });
        return;
      }
    } else {
      const { data, error } = await supabase.from('sessions').insert(sessionData).select('id').single();
      if (error) {
        toast({ title: 'Error creating session', description: error.message, variant: 'destructive' });
        return;
      }
      sessionId = data.id;
    }

    if (sessionId) {
      // Handle pre-reading materials
      await supabase.from('pre_reading_materials').delete().eq('session_id', sessionId);
      
      if (materials.length > 0) {
        const materialsToInsert = materials.map((m, idx) => ({
          session_id: sessionId,
          title: m.title,
          link: m.link,
          display_order: m.display_order ?? idx,
        }));
        
        const { error: matError } = await supabase.from('pre_reading_materials').insert(materialsToInsert);
        if (matError) {
          toast({ title: 'Session saved, but error saving materials', description: matError.message, variant: 'destructive' });
        }
      }

      // Handle quiz assignments
      await supabase.from('session_quizzes').delete().eq('session_id', sessionId);
      
      if (quizIds.length > 0) {
        const quizAssignments = quizIds.map((quizId, idx) => ({
          session_id: sessionId,
          quiz_id: quizId,
          display_order: idx,
        }));
        
        const { error: quizError } = await supabase.from('session_quizzes').insert(quizAssignments);
        if (quizError) {
          toast({ title: 'Session saved, but error assigning quizzes', description: quizError.message, variant: 'destructive' });
        }
      }
    }

    toast({ title: session.id ? 'Session updated successfully' : 'Session created successfully' });
    fetchSessions();
  };

  const fetchSessionData = async (sessionId: string) => {
    const [materialsRes, quizzesRes] = await Promise.all([
      supabase
        .from('pre_reading_materials')
        .select('*')
        .eq('session_id', sessionId)
        .order('display_order', { ascending: true }),
      supabase
        .from('session_quizzes')
        .select('quiz_id')
        .eq('session_id', sessionId)
        .order('display_order', { ascending: true }),
    ]);
    setSessionMaterials(materialsRes.data || []);
    setSessionQuizIds((quizzesRes.data || []).map((sq: SessionQuiz) => sq.quiz_id));
  };

  const handleEditSession = async (session: Session) => {
    setEditingSession(session);
    await fetchSessionData(session.id);
    setSessionFormOpen(true);
  };

  const handleNewSession = () => {
    setEditingSession(null);
    setSessionMaterials([]);
    setSessionQuizIds([]);
    setSessionFormOpen(true);
  };

  const handleDeleteSession = async (id: string) => {
    const { error } = await supabase.from('sessions').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error deleting session', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Session deleted successfully' });
      fetchSessions();
    }
  };

  // Quiz CRUD
  const handleSaveQuiz = async (quiz: Omit<Quiz, 'id'> & { id?: string }) => {
    const quizData = { 
      title: quiz.title,
      questions: JSON.parse(JSON.stringify(quiz.questions))
    };
    if (quiz.id) {
      const { error } = await supabase.from('quizzes').update(quizData).eq('id', quiz.id);
      if (error) {
        toast({ title: 'Error updating quiz', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Quiz updated successfully' });
        fetchQuizzes();
      }
    } else {
      const { error } = await supabase.from('quizzes').insert(quizData);
      if (error) {
        toast({ title: 'Error creating quiz', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Quiz created successfully' });
        fetchQuizzes();
      }
    }
  };

  const getQuizSessionCount = (quizId: string) => {
    // This would require fetching session_quizzes, for now we show a placeholder
    return null;
  };

  const handleDeleteQuiz = async (id: string) => {
    const { error } = await supabase.from('quizzes').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error deleting quiz', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Quiz deleted successfully' });
      fetchQuizzes();
    }
  };

  const getSessionParentName = (session: Session) => {
    if (session.cohort_id) {
      return cohorts.find(c => c.id === session.cohort_id)?.name || 'Unknown Cohort';
    }
    if (session.course_id) {
      return courses.find(c => c.id === session.course_id)?.name || 'Unknown Course';
    }
    return '-';
  };


  if (authLoading) return null;
  
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-3xl font-display font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground">Manage cohorts, courses, sessions, and quizzes</p>
        </div>

        <Tabs defaultValue="cohorts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="cohorts" className="gap-2">
              <Users className="h-4 w-4" /> Cohorts
            </TabsTrigger>
            <TabsTrigger value="courses" className="gap-2">
              <BookOpen className="h-4 w-4" /> Courses
            </TabsTrigger>
            <TabsTrigger value="sessions" className="gap-2">
              <GraduationCap className="h-4 w-4" /> Sessions
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="gap-2">
              <ClipboardList className="h-4 w-4" /> Quizzes
            </TabsTrigger>
          </TabsList>

          {/* Cohorts Tab */}
          <TabsContent value="cohorts">
            <Card className="card-elevated">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Manage Cohorts</CardTitle>
                  <CardDescription>Create, edit, and manage cohort programs</CardDescription>
                </div>
                <Button onClick={() => { setEditingCohort(null); setCohortFormOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" /> Add Cohort
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : cohorts.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No cohorts yet. Create your first one!</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Mentor</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cohorts.map((cohort) => (
                        <TableRow key={cohort.id}>
                          <TableCell className="font-medium">{cohort.name}</TableCell>
                          <TableCell>{cohort.mentor_name || '-'}</TableCell>
                          <TableCell>
                            {cohort.start_date ? new Date(cohort.start_date).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={cohort.is_published ? 'default' : 'secondary'}>
                              {cohort.is_published ? 'Published' : 'Draft'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => { setEditingCohort(cohort); setCohortFormOpen(true); }} title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDuplicateCohort(cohort)} title="Duplicate">
                              <Copy className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Cohort?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete "{cohort.name}" and all its sessions. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteCohort(cohort.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses">
            <Card className="card-elevated">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Manage Courses</CardTitle>
                  <CardDescription>Create, edit, and manage self-paced courses</CardDescription>
                </div>
                <Button onClick={() => { setEditingCourse(null); setCourseFormOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" /> Add Course
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : courses.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No courses yet. Create your first one!</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Instructor</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {courses.map((course) => (
                        <TableRow key={course.id}>
                          <TableCell className="font-medium">{course.name}</TableCell>
                          <TableCell>{course.mentor_name || '-'}</TableCell>
                          <TableCell>{course.duration || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={course.is_published ? 'default' : 'secondary'}>
                              {course.is_published ? 'Published' : 'Draft'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => { setEditingCourse(course); setCourseFormOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Course?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete "{course.name}" and all its sessions. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteCourse(course.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions">
            <Card className="card-elevated">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Manage Sessions</CardTitle>
                  <CardDescription>Create and manage sessions within cohorts and courses</CardDescription>
                </div>
                <Button onClick={handleNewSession} disabled={cohorts.length === 0 && courses.length === 0}>
                  <Plus className="mr-2 h-4 w-4" /> Add Session
                </Button>
              </CardHeader>
              <CardContent>
                {cohorts.length === 0 && courses.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">Create a cohort or course first to add sessions.</p>
                ) : isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : sessions.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No sessions yet. Create your first one!</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Parent</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell className="font-medium">{session.title}</TableCell>
                          <TableCell>{getSessionParentName(session)}</TableCell>
                          <TableCell>
                            {session.session_date ? new Date(session.session_date).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell>{session.session_order}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEditSession(session)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Session?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete "{session.title}" and its quizzes. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteSession(session.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quizzes Tab */}
          <TabsContent value="quizzes">
            <Card className="card-elevated">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Manage Quizzes</CardTitle>
                  <CardDescription>Create reusable quizzes and assign them to sessions</CardDescription>
                </div>
                <Button onClick={() => { setEditingQuiz(null); setQuizFormOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" /> Add Quiz
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : quizzes.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No quizzes yet. Create your first one!</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Questions</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quizzes.map((quiz) => (
                        <TableRow key={quiz.id}>
                          <TableCell className="font-medium">{quiz.title}</TableCell>
                          <TableCell>{quiz.questions.length}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => { setEditingQuiz(quiz); setQuizFormOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Quiz?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete "{quiz.title}" and unassign it from all sessions. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteQuiz(quiz.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Forms */}
        <CohortForm
          open={cohortFormOpen}
          onOpenChange={setCohortFormOpen}
          cohort={editingCohort}
          onSave={handleSaveCohort}
        />
        <CourseForm
          open={courseFormOpen}
          onOpenChange={setCourseFormOpen}
          course={editingCourse}
          onSave={handleSaveCourse}
        />
        <SessionForm
          open={sessionFormOpen}
          onOpenChange={setSessionFormOpen}
          session={editingSession}
          cohorts={cohorts}
          courses={courses}
          quizzes={quizzes}
          preReadingMaterials={sessionMaterials}
          selectedQuizIds={sessionQuizIds}
          onSave={handleSaveSession}
        />
        <QuizForm
          open={quizFormOpen}
          onOpenChange={setQuizFormOpen}
          quiz={editingQuiz}
          onSave={handleSaveQuiz}
        />
      </div>
    </MainLayout>
  );
}
