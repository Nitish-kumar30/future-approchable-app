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
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Users, BookOpen, GraduationCap, ClipboardList, Plus, Pencil, Trash2, Loader2, Copy, Filter, Trophy, MessageSquare, Star, FileText, UserMinus, Download } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
 import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CohortForm } from '@/components/admin/CohortForm';
import { CourseForm } from '@/components/admin/CourseForm';
import { SessionForm } from '@/components/admin/SessionForm';
import { ChapterManager } from '@/components/admin/ChapterManager';
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
  enrollment_disabled: boolean;
}

interface Course {
  id: string;
  name: string;
  slug: string;
  description: string;
  mentor_name: string;
  mentor_info: string;
  duration: string;
  image_url: string;
  start_date: string;
  is_published: boolean;
  enrollment_disabled: boolean;
  is_on_demand: boolean;
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
  is_content_unlocked: boolean;
}

interface PreReadingMaterial {
  id?: string;
  title: string;
  link: string;
  display_order: number;
}

interface MiniProject {
  id?: string;
  title: string;
  description: string;
  display_order: number;
}

interface Question {
  id: string;
  type?: 'mcq' | 'mcq_ungraded' | 'subjective';
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

 interface EnrollmentWithUser {
   id: string;
   user_id: string;
   cohort_id: string | null;
   course_id: string | null;
   enrolled_at: string;
   user_email: string;
   user_name: string | null;
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
 interface FeedbackEntry {
   id: string;
   user_id: string;
   course_id: string | null;
   cohort_id: string | null;
   rating: number;
   comment: string | null;
   created_at: string;
   user_name: string | null;
   user_email: string | null;
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
  const [sessionMiniProjects, setSessionMiniProjects] = useState<MiniProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [cohortFormOpen, setCohortFormOpen] = useState(false);
  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [sessionFormOpen, setSessionFormOpen] = useState(false);
  const [quizFormOpen, setQuizFormOpen] = useState(false);

  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [chaptersSession, setChaptersSession] = useState<Session | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  // Session filter state
  const [sessionFilter, setSessionFilter] = useState<string>('all');

  // Course filter state
  const [courseFilter, setCourseFilter] = useState<string>('all');
 
   // Enrollment state
   const [enrollments, setEnrollments] = useState<EnrollmentWithUser[]>([]);
   const [enrollmentFilter, setEnrollmentFilter] = useState<string>('');
   const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);

   // Leaderboard state
   const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
   const [leaderboardFilter, setLeaderboardFilter] = useState<string>('');
   const [leaderboardLoading, setLeaderboardLoading] = useState(false);

   // Feedback state
   const [feedbackEntries, setFeedbackEntries] = useState<FeedbackEntry[]>([]);
   const [feedbackFilter, setFeedbackFilter] = useState<string>('');
   const [feedbackLoading, setFeedbackLoading] = useState(false);

   // Prompts state
    const [prompts, setPrompts] = useState<{ id: string; title: string; content: string; display_order: number }[]>([]);
    const [promptTitle, setPromptTitle] = useState('');
    const [promptContent, setPromptContent] = useState('');
    const [promptsLoading, setPromptsLoading] = useState(false);
    const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
    const [editPromptTitle, setEditPromptTitle] = useState('');
    const [editPromptContent, setEditPromptContent] = useState('');

    // Unenrolled users state
    const [unenrolledUsers, setUnenrolledUsers] = useState<{ id: string; name: string; email: string; whatsapp_number: string; cohort: string; status: string; created_at: string }[]>([]);
    const [unenrolledLoading, setUnenrolledLoading] = useState(false);
    const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

    // Registrations state
    interface Registration {
      id: string;
      name: string;
      email: string;
      whatsapp_number: string;
      country: string | null;
      state: string | null;
      cohort: string;
      company: string;
      role: string;
      interests: string[];
      other_interest: string | null;
      reason: string;
      additional_info: string | null;
      capstone_office_hours: boolean;
      status: string;
      created_at: string;
    }
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [registrationCohorts, setRegistrationCohorts] = useState<string[]>([]);
    const [registrationCohortFilter, setRegistrationCohortFilter] = useState('all');
    const [registrationsLoading, setRegistrationsLoading] = useState(false);
    const [expandedRegistration, setExpandedRegistration] = useState<string | null>(null);

    // Quiz Responses state
    interface ResponseQuestion {
      id: string;
      type?: 'mcq' | 'mcq_ungraded' | 'subjective';
      question: string;
      options?: string[];
      correctAnswer?: number;
    }
    interface ResponsesEnrolled {
      user_id: string;
      name: string | null;
      email: string;
    }
    interface ResponsesQuizBlock {
      id: string;
      title: string;
      questions: ResponseQuestion[];
      submissions: Array<{ user_id: string; submitted_at: string; answers: Record<string, number | string> }>;
    }
    interface ResponsesSessionBlock {
      id: string;
      title: string;
      session_order: number | null;
      quizzes: ResponsesQuizBlock[];
    }
    interface ResponsesData {
      enrolled: ResponsesEnrolled[];
      sessions: ResponsesSessionBlock[];
    }
    const [responsesCohortFilter, setResponsesCohortFilter] = useState<string>('');
    const [responsesData, setResponsesData] = useState<ResponsesData | null>(null);
    const [responsesLoading, setResponsesLoading] = useState(false);

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
      fetchPrompts(),
    ]);
    setIsLoading(false);
  };

  const fetchPrompts = async () => {
    setPromptsLoading(true);
    const { data } = await supabase.from('prompts').select('*').order('display_order').order('created_at', { ascending: false });
    if (data) setPrompts(data as { id: string; title: string; content: string; display_order: number }[]);
    setPromptsLoading(false);
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
      enrollment_disabled: cohort.enrollment_disabled,
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
              link: m.link,
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

          // 5. Copy mini projects
          const { data: miniProjects } = await supabase
            .from('mini_projects')
            .select('*')
            .eq('session_id', session.id)
            .order('display_order', { ascending: true });

          if (miniProjects && miniProjects.length > 0) {
            const newMiniProjects = miniProjects.map(mp => ({
              session_id: newSession.id,
              title: mp.title,
              description: mp.description || null,
              display_order: mp.display_order,
            }));
            const { error: mpError } = await supabase.from('mini_projects').insert(newMiniProjects);
            if (mpError) console.error('Mini project duplication error:', mpError);
          }
        }
      }

      toast({ title: 'Cohort duplicated successfully', description: 'All sessions, quizzes, pre-reading materials, and mini projects have been copied.' });
      fetchCohorts();
      fetchSessions();
    } catch (error) {
      toast({ title: 'Error duplicating cohort', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    }
  };

  // Course CRUD
  const handleSaveCourse = async (course: Omit<Course, 'id'> & { id?: string }) => {
    const slug = course.slug || course.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    const courseData = {
      name: course.name,
      slug,
      description: course.description || null,
      mentor_name: course.mentor_name || null,
      mentor_info: course.mentor_info || null,
      duration: course.duration || null,
      image_url: course.image_url || null,
      start_date: course.start_date || null,
      is_published: course.is_published,
      is_on_demand: course.is_on_demand ?? false,
      enrollment_disabled: course.is_on_demand ? false : course.enrollment_disabled,
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
  const handleSaveSession = async (session: Omit<Session, 'id'> & { id?: string }, materials: PreReadingMaterial[], quizIds: string[], projects: MiniProject[]) => {
    const sessionData = {
      title: session.title,
      description: session.description || null,
      cohort_id: session.cohort_id || null,
      course_id: session.course_id || null,
      session_date: session.session_date || null,
      recording_url: session.recording_url || null,
      presentation_url: session.presentation_url || null,
      session_order: session.session_order || 0,
      is_content_unlocked: session.is_content_unlocked ?? false,
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

      // Handle mini projects
      await supabase.from('mini_projects').delete().eq('session_id', sessionId);
      
      if (projects.length > 0) {
        const projectsToInsert = projects.map((p, idx) => ({
          session_id: sessionId,
          title: p.title,
          description: p.description || null,
          display_order: p.display_order ?? idx,
        }));
        
        const { error: projError } = await supabase.from('mini_projects').insert(projectsToInsert);
        if (projError) {
          toast({ title: 'Session saved, but error saving mini projects', description: projError.message, variant: 'destructive' });
        }
      }
    }

    toast({ title: session.id ? 'Session updated successfully' : 'Session created successfully' });
    fetchSessions();
  };

  const fetchSessionData = async (sessionId: string) => {
    const [materialsRes, quizzesRes, projectsRes] = await Promise.all([
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
      supabase
        .from('mini_projects')
        .select('*')
        .eq('session_id', sessionId)
        .order('display_order', { ascending: true }),
    ]);
    setSessionMaterials(materialsRes.data || []);
    setSessionQuizIds((quizzesRes.data || []).map((sq: SessionQuiz) => sq.quiz_id));
    setSessionMiniProjects(projectsRes.data || []);
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
    setSessionMiniProjects([]);
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

    const fetchRegistrations = async (cohortFilter = 'all') => {
      setRegistrationsLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-registrations`);
        if (cohortFilter && cohortFilter !== 'all') url.searchParams.set('cohort', cohortFilter);
        const response = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        const result = await response.json();
        if (response.ok) {
          setRegistrations(result.registrations || []);
          if (result.cohorts) setRegistrationCohorts(result.cohorts);
        } else {
          toast({ title: 'Failed to fetch registrations', description: result.error, variant: 'destructive' });
        }
      } catch {
        toast({ title: 'Error fetching registrations', variant: 'destructive' });
      } finally {
        setRegistrationsLoading(false);
      }
    };

    const downloadRegistrationsCSV = () => {
      const header = 'Name,Email,Phone,Country,State,Company,Role,Cohort,Capstone Office Hours,Interests,Other Interest,Reason,Additional Info,Status,Registered';
      const rows = registrations.map(r =>
        `"${(r.name || '').replace(/"/g, '""')}","${r.email}","${r.whatsapp_number}","${(r.country || '').replace(/"/g, '""')}","${(r.state || '').replace(/"/g, '""')}","${(r.company || '').replace(/"/g, '""')}","${(r.role || '').replace(/"/g, '""')}","${(r.cohort || '').replace(/"/g, '""')}","${r.capstone_office_hours ? 'Yes' : 'No'}","${(r.interests || []).join('; ')}","${(r.other_interest || '').replace(/"/g, '""')}","${(r.reason || '').replace(/"/g, '""')}","${(r.additional_info || '').replace(/"/g, '""')}","${r.status}","${new Date(r.created_at).toLocaleDateString()}"`
      );
      const csv = [header, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `registrations${registrationCohortFilter !== 'all' ? '_filtered' : ''}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };

    const fetchUnenrolledUsers = async () => {
      setUnenrolledLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) return;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-unenrolled-users`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
          }
        );
        const result = await response.json();
        if (response.ok) {
          setUnenrolledUsers(result.users || []);
        } else {
          toast({ title: 'Failed to fetch unenrolled users', description: result.error, variant: 'destructive' });
        }
      } catch (err) {
        toast({ title: 'Error fetching unenrolled users', variant: 'destructive' });
      } finally {
        setUnenrolledLoading(false);
      }
    };

    const copyUnenrolledEmails = () => {
      const emails = unenrolledUsers.map(u => u.email).join(', ');
      navigator.clipboard.writeText(emails);
      toast({ title: `${unenrolledUsers.length} emails copied to clipboard` });
    };

    const copyUnenrolledPhones = () => {
      const phones = unenrolledUsers.map(u => u.whatsapp_number).join(', ');
      navigator.clipboard.writeText(phones);
      toast({ title: `${unenrolledUsers.length} phone numbers copied to clipboard` });
    };

    const handleStatusUpdate = async (registrationId: string, newStatus: string) => {
      const previous = unenrolledUsers;
      setUnenrolledUsers(prev => prev.map(u => u.id === registrationId ? { ...u, status: newStatus } : u));
      setStatusUpdatingId(registrationId);
      try {
        const { data, error } = await supabase.functions.invoke('update-registration-status', {
          body: { id: registrationId, status: newStatus },
        });
        if (error || (data && (data as any).error)) {
          throw new Error(error?.message || (data as any)?.error || 'Update failed');
        }
        toast({ title: `Status updated to ${newStatus}` });
      } catch (err: any) {
        setUnenrolledUsers(previous);
        toast({ title: 'Failed to update status', description: err.message, variant: 'destructive' });
      } finally {
        setStatusUpdatingId(null);
      }
    };

    const downloadUnenrolledCSV = () => {
      const header = 'Name,Email,Phone,Cohort,Status,Registered';
      const rows = unenrolledUsers.map(u =>
        `"${(u.name || '').replace(/"/g, '""')}","${u.email}","${u.whatsapp_number}","${u.cohort}","${u.status}","${new Date(u.created_at).toLocaleDateString()}"`
      );
      const csv = [header, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'unenrolled_users.csv';
      a.click();
      URL.revokeObjectURL(url);
    };


   // Fetch enrollments when filter changes
   const fetchEnrollments = async (filter: string) => {
     if (!filter) {
       setEnrollments([]);
       return;
     }
 
     setEnrollmentsLoading(true);
     try {
       let queryParam = '';
       if (filter.startsWith('cohort:')) {
         queryParam = `cohort_id=${filter.replace('cohort:', '')}`;
       } else if (filter.startsWith('course:')) {
         queryParam = `course_id=${filter.replace('course:', '')}`;
       }
 
       const { data: sessionData } = await supabase.auth.getSession();
       const token = sessionData?.session?.access_token;
 
       if (!token) {
         toast({ title: 'Authentication required', variant: 'destructive' });
         setEnrollmentsLoading(false);
         return;
       }
 
       const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
       const res = await fetch(`${supabaseUrl}/functions/v1/get-enrollments?${queryParam}`, {
         method: 'GET',
         headers: {
           'Authorization': `Bearer ${token}`,
           'Content-Type': 'application/json',
         },
       });
 
       if (!res.ok) {
         const errorData = await res.json();
         throw new Error(errorData.error || 'Failed to fetch enrollments');
       }
 
       const data = await res.json();
       setEnrollments(data.enrollments || []);
     } catch (error) {
       console.error('Error fetching enrollments:', error);
       toast({ title: 'Error fetching enrollments', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
       setEnrollments([]);
     } finally {
       setEnrollmentsLoading(false);
     }
   };
 
   useEffect(() => {
     if (enrollmentFilter) {
       fetchEnrollments(enrollmentFilter);
     } else {
       setEnrollments([]);
     }
   }, [enrollmentFilter]);

   // Fetch leaderboard when filter changes
   const fetchLeaderboard = async (filter: string) => {
     if (!filter) {
       setLeaderboard([]);
       return;
     }

     setLeaderboardLoading(true);
     try {
       let queryParam = '';
       if (filter.startsWith('cohort:')) {
         queryParam = `cohort_id=${filter.replace('cohort:', '')}`;
       } else if (filter.startsWith('course:')) {
         queryParam = `course_id=${filter.replace('course:', '')}`;
       }

       const { data: sessionData } = await supabase.auth.getSession();
       const token = sessionData?.session?.access_token;

       if (!token) {
         toast({ title: 'Authentication required', variant: 'destructive' });
         setLeaderboardLoading(false);
         return;
       }

       const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
       const res = await fetch(`${supabaseUrl}/functions/v1/get-leaderboard?${queryParam}`, {
         method: 'GET',
         headers: {
           'Authorization': `Bearer ${token}`,
           'Content-Type': 'application/json',
         },
       });

       if (!res.ok) {
         const errorData = await res.json();
         throw new Error(errorData.error || 'Failed to fetch leaderboard');
       }

       const data = await res.json();
       setLeaderboard(data.leaderboard || []);
     } catch (error) {
       console.error('Error fetching leaderboard:', error);
       toast({ title: 'Error fetching leaderboard', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
       setLeaderboard([]);
     } finally {
       setLeaderboardLoading(false);
     }
   };

   useEffect(() => {
     if (leaderboardFilter) {
       fetchLeaderboard(leaderboardFilter);
     } else {
       setLeaderboard([]);
     }
   }, [leaderboardFilter]);

   // Fetch feedback when filter changes
   const fetchFeedback = async (filter: string) => {
     if (!filter) {
       setFeedbackEntries([]);
       return;
     }

     setFeedbackLoading(true);
     try {
       let query = supabase.from('feedback').select('*').order('created_at', { ascending: false });

       if (filter.startsWith('cohort:')) {
         query = query.eq('cohort_id', filter.replace('cohort:', ''));
       } else if (filter.startsWith('course:')) {
         query = query.eq('course_id', filter.replace('course:', ''));
       }

       const { data: feedbackData, error } = await query;
       if (error) throw error;

       if (!feedbackData || feedbackData.length === 0) {
         setFeedbackEntries([]);
         setFeedbackLoading(false);
         return;
       }

       // Fetch profile names for each unique user_id
       const userIds = [...new Set(feedbackData.map(f => f.user_id))];
       const { data: profiles } = await supabase
         .from('profiles')
         .select('user_id, full_name')
         .in('user_id', userIds);

       const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

       setFeedbackEntries(feedbackData.map(f => ({
         ...f,
         user_name: profileMap.get(f.user_id) || null,
         user_email: null,
       })));
     } catch (error) {
       console.error('Error fetching feedback:', error);
       toast({ title: 'Error fetching feedback', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
       setFeedbackEntries([]);
     } finally {
       setFeedbackLoading(false);
     }
   };

   useEffect(() => {
     if (feedbackFilter) {
       fetchFeedback(feedbackFilter);
     } else {
       setFeedbackEntries([]);
     }
    }, [feedbackFilter]);

    // Quiz Responses fetcher (single round-trip per cohort/course)
    const fetchCohortQuizResponses = async (filterValue: string) => {
      setResponsesLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        const param = filterValue.startsWith('cohort:')
          ? `cohort_id=${filterValue.replace('cohort:', '')}`
          : `course_id=${filterValue.replace('course:', '')}`;
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-quiz-responses?${param}`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to fetch responses');
        }
        const data = await res.json();
        setResponsesData({ enrolled: data.enrolled || [], sessions: data.sessions || [] });
      } catch (error) {
        console.error('Error fetching quiz responses:', error);
        toast({ title: 'Error fetching responses', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
        setResponsesData(null);
      } finally {
        setResponsesLoading(false);
      }
    };

    useEffect(() => {
      if (responsesCohortFilter) {
        fetchCohortQuizResponses(responsesCohortFilter);
      } else {
        setResponsesData(null);
      }
    }, [responsesCohortFilter]);

    const formatAnswerForCSV = (q: ResponseQuestion, a: number | string | undefined) => {
      if (a === undefined || a === null || a === '') return '';
      if ((q.type ?? 'mcq') === 'subjective') return String(a);
      const idx = Number(a);
      return q.options?.[idx] ?? `Option ${idx + 1}`;
    };

    const downloadResponsesCSV = () => {
      if (!responsesData) return;
      const lines: string[] = [];
      const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
      responsesData.sessions.forEach((sess) => {
        sess.quizzes.forEach((quiz) => {
          const header = ['Session', 'Quiz', 'Learner', 'Email', ...quiz.questions.map((q, i) => `Q${i + 1}: ${q.question}`)];
          lines.push(header.map(esc).join(','));
          const subByUser = new Map(quiz.submissions.map((s) => [s.user_id, s]));
          responsesData.enrolled.forEach((u) => {
            const sub = subByUser.get(u.user_id);
            const row = [
              `${sess.session_order ?? ''} ${sess.title}`.trim(),
              quiz.title,
              u.name || '',
              u.email,
              ...quiz.questions.map((q) => {
                if (!sub) return '(no submission)';
                return formatAnswerForCSV(q, sub.answers?.[q.id] as number | string | undefined);
              }),
            ];
            lines.push(row.map(esc).join(','));
          });
          lines.push('');
        });
      });
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const label = responsesCohortFilter.replace(/^(cohort|course):/, '');
      link.download = `quiz-responses-${label}-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    };


    const getEnrollmentParentName = (enrollment: EnrollmentWithUser) => {
     if (enrollment.cohort_id) {
       return cohorts.find(c => c.id === enrollment.cohort_id)?.name || 'Unknown Cohort';
     }
     if (enrollment.course_id) {
       return courses.find(c => c.id === enrollment.course_id)?.name || 'Unknown Course';
     }
     return '-';
   };

   const getScoreColor = (score: number) => {
     if (score >= 80) return 'text-green-600 dark:text-green-400';
     if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
     return 'text-red-600 dark:text-red-400';
   };

   const getRankBadge = (rank: number) => {
     if (rank === 1) return <span className="text-amber-500">🥇</span>;
     if (rank === 2) return <span className="text-slate-400">🥈</span>;
     if (rank === 3) return <span className="text-amber-700">🥉</span>;
     return <span className="text-muted-foreground">{rank}</span>;
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
           <TabsList className="grid w-full grid-cols-11 lg:w-auto lg:inline-grid">
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
              <TabsTrigger value="responses" className="gap-2">
                <MessageSquare className="h-4 w-4" /> Quiz Responses
              </TabsTrigger>
              <TabsTrigger value="enrollments" className="gap-2">
                <Users className="h-4 w-4" /> Enrollments
              </TabsTrigger>
               <TabsTrigger value="leaderboard" className="gap-2">
                 <Trophy className="h-4 w-4" /> Leaderboard
               </TabsTrigger>
               <TabsTrigger value="feedback" className="gap-2">
                <MessageSquare className="h-4 w-4" /> Feedback
                </TabsTrigger>
                <TabsTrigger value="prompts" className="gap-2">
                  <FileText className="h-4 w-4" /> Prompts
                </TabsTrigger>
                <TabsTrigger value="unenrolled" className="gap-2" onClick={() => { if (unenrolledUsers.length === 0) fetchUnenrolledUsers(); }}>
                  <UserMinus className="h-4 w-4" /> Unenrolled
                </TabsTrigger>
                <TabsTrigger value="registrations" className="gap-2" onClick={() => { if (registrations.length === 0) fetchRegistrations(); }}>
                  <ClipboardList className="h-4 w-4" /> Registrations
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
                <div className="flex items-center gap-3">
                  <Select value={courseFilter} onValueChange={setCourseFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter courses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Courses</SelectItem>
                      <SelectItem value="live">Live Courses</SelectItem>
                      <SelectItem value="on-demand">On-Demand Courses</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => { setEditingCourse(null); setCourseFormOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> Add Course
                  </Button>
                </div>
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
                        <TableHead>Type</TableHead>
                        <TableHead>Instructor</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {courses
                        .filter(c => courseFilter === 'all' || (courseFilter === 'on-demand' ? c.is_on_demand : !c.is_on_demand))
                        .map((course) => (
                        <TableRow key={course.id}>
                          <TableCell className="font-medium">{course.name}</TableCell>
                          <TableCell>
                            <Badge variant={course.is_on_demand ? 'outline' : 'secondary'} className={course.is_on_demand ? 'border-accent text-accent-foreground bg-accent/10' : ''}>
                              {course.is_on_demand ? 'On-Demand' : 'Live'}
                            </Badge>
                          </TableCell>
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
                <div className="flex items-center gap-3">
                  <Select value={sessionFilter} onValueChange={setSessionFilter}>
                    <SelectTrigger className="w-[220px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by parent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sessions</SelectItem>
                      {cohorts.length > 0 && (
                        <>
                          <SelectItem value="__cohorts__" disabled className="font-semibold text-muted-foreground">
                            — Cohorts —
                          </SelectItem>
                          {cohorts.map((cohort) => (
                            <SelectItem key={`cohort-${cohort.id}`} value={`cohort:${cohort.id}`}>
                              {cohort.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {courses.length > 0 && (
                        <>
                          <SelectItem value="__courses__" disabled className="font-semibold text-muted-foreground">
                            — Courses —
                          </SelectItem>
                          {courses.map((course) => (
                            <SelectItem key={`course-${course.id}`} value={`course:${course.id}`}>
                              {course.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleNewSession} disabled={cohorts.length === 0 && courses.length === 0}>
                    <Plus className="mr-2 h-4 w-4" /> Add Session
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {cohorts.length === 0 && courses.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">Create a cohort or course first to add sessions.</p>
                ) : isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : sessions.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No sessions yet. Create your first one!</p>
                ) : (
                  (() => {
                    const filteredSessions = sessions.filter((session) => {
                      if (sessionFilter === 'all') return true;
                      if (sessionFilter.startsWith('cohort:')) {
                        return session.cohort_id === sessionFilter.replace('cohort:', '');
                      }
                      if (sessionFilter.startsWith('course:')) {
                        return session.course_id === sessionFilter.replace('course:', '');
                      }
                      return true;
                    });

                    if (filteredSessions.length === 0) {
                      return (
                        <p className="text-center py-8 text-muted-foreground">
                          No sessions found for this filter.
                        </p>
                      );
                    }

                    return (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Parent</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Order</TableHead>
                            <TableHead>Content</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell className="font-medium">{session.title}</TableCell>
                          <TableCell>{getSessionParentName(session)}</TableCell>
                          <TableCell>
                            {session.session_date ? new Date(session.session_date).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell>{session.session_order}</TableCell>
                          <TableCell>
                            <Switch
                              checked={session.is_content_unlocked}
                              onCheckedChange={async (checked) => {
                                const { error } = await supabase.from('sessions').update({ is_content_unlocked: checked }).eq('id', session.id);
                                if (error) {
                                  toast({ title: 'Error updating session', description: error.message, variant: 'destructive' });
                                } else {
                                  setSessions(prev => prev.map(s => s.id === session.id ? { ...s, is_content_unlocked: checked } : s));
                                  toast({ title: checked ? 'Content unlocked' : 'Content locked' });
                                }
                              }}
                              aria-label="Toggle content visibility"
                            />
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => { console.log('[Chapters] clicked for session', session?.id, session?.title); setChaptersSession(session); }}>Chapters</Button>
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
                    );
                  })()
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

          {/* Quiz Responses Tab */}
          <TabsContent value="responses">
            <Card className="card-elevated">
              <CardHeader>
                <div className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>Quiz Responses</CardTitle>
                    <CardDescription>
                      Review submitted answers for ungraded MCQ and subjective questions.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadResponsesCSV}
                    disabled={!responsesData || responsesData.sessions.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" /> Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const cohortOptions = cohorts;
                  const onDemandCourses = courses.filter((c) => c.is_on_demand);

                  return (
                    <div className="space-y-6">
                      <div className="max-w-md space-y-2">
                        <label className="text-sm font-medium">Cohort / Course</label>
                        <Select value={responsesCohortFilter} onValueChange={setResponsesCohortFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select cohort or course" />
                          </SelectTrigger>
                          <SelectContent>
                            {cohortOptions.length > 0 && (
                              <SelectGroup>
                                <SelectLabel>Cohorts</SelectLabel>
                                {cohortOptions.map((c) => (
                                  <SelectItem key={c.id} value={`cohort:${c.id}`}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            )}
                            {onDemandCourses.length > 0 && (
                              <SelectGroup>
                                <SelectLabel>On-demand courses</SelectLabel>
                                {onDemandCourses.map((c) => (
                                  <SelectItem key={c.id} value={`course:${c.id}`}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {responsesLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : !responsesCohortFilter ? (
                        <p className="text-center py-8 text-muted-foreground text-sm">
                          Select a cohort or course to view responses.
                        </p>
                      ) : !responsesData || responsesData.sessions.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground text-sm">
                          No ungraded MCQ or subjective questions found for this cohort.
                        </p>
                      ) : (
                        <div className="space-y-8">
                          {responsesData.sessions.map((sess) => (
                            <div key={sess.id} className="space-y-4">
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-semibold">
                                  {sess.session_order ? `Session ${sess.session_order}: ` : ''}{sess.title}
                                </h3>
                              </div>
                              {sess.quizzes.map((quiz) => {
                                const subByUser = new Map(quiz.submissions.map((s) => [s.user_id, s]));
                                return (
                                  <div key={quiz.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-medium">{quiz.title}</span>
                                      <Badge variant="secondary" className="text-xs">
                                        {quiz.submissions.length} / {responsesData.enrolled.length} submitted
                                      </Badge>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead className="min-w-[160px]">Name</TableHead>
                                            {quiz.questions.map((q, i) => (
                                              <TableHead key={q.id} className="min-w-[200px]" title={q.question}>
                                                <div className="space-y-1">
                                                  <div className="font-semibold">Q{i + 1}</div>
                                                  <div className="text-xs font-normal text-muted-foreground line-clamp-2">
                                                    {q.question}
                                                  </div>
                                                </div>
                                              </TableHead>
                                            ))}
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {responsesData.enrolled.map((u) => {
                                            const sub = subByUser.get(u.user_id);
                                            return (
                                              <TableRow key={u.user_id}>
                                                <TableCell className="align-top">
                                                  <div className="font-medium text-sm">{u.name || 'Unknown'}</div>
                                                  <div className="text-xs text-muted-foreground">{u.email}</div>
                                                </TableCell>
                                                {!sub ? (
                                                  <TableCell
                                                    colSpan={quiz.questions.length}
                                                    className="text-center italic text-muted-foreground text-sm"
                                                  >
                                                    (no submission)
                                                  </TableCell>
                                                ) : (
                                                  quiz.questions.map((q) => {
                                                    const a = sub.answers?.[q.id];
                                                    const has = a !== undefined && a !== null && a !== '';
                                                    let content: React.ReactNode = <span className="text-muted-foreground">—</span>;
                                                    if (has) {
                                                      if ((q.type ?? 'mcq') === 'subjective') {
                                                        content = (
                                                          <p className="text-sm whitespace-pre-wrap break-words">{String(a)}</p>
                                                        );
                                                      } else {
                                                        const idx = Number(a);
                                                        content = <p className="text-sm">{q.options?.[idx] ?? `Option ${idx + 1}`}</p>;
                                                      }
                                                    }
                                                    return (
                                                      <TableCell key={q.id} className="align-top text-sm">
                                                        {content}
                                                      </TableCell>
                                                    );
                                                  })
                                                )}
                                              </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

         {/* Enrollments Tab */}
         <TabsContent value="enrollments">
           <Card className="card-elevated">
             <CardHeader className="flex flex-row items-center justify-between">
               <div>
                 <CardTitle>
                   View Enrollments{enrollments.length > 0 && enrollmentFilter ? ` (${enrollments.length})` : ''}
                 </CardTitle>
                 <CardDescription>View student enrollments by cohort or course</CardDescription>
               </div>
               <Select value={enrollmentFilter} onValueChange={setEnrollmentFilter}>
                 <SelectTrigger className="w-[250px]">
                   <Filter className="h-4 w-4 mr-2" />
                   <SelectValue placeholder="Select cohort or course" />
                 </SelectTrigger>
                 <SelectContent>
                   {cohorts.length > 0 && (
                     <SelectGroup>
                       <SelectLabel>Cohorts</SelectLabel>
                       {cohorts.map((cohort) => (
                         <SelectItem key={`cohort-${cohort.id}`} value={`cohort:${cohort.id}`}>
                           {cohort.name}
                         </SelectItem>
                       ))}
                     </SelectGroup>
                   )}
                   {courses.length > 0 && (
                     <SelectGroup>
                       <SelectLabel>Courses</SelectLabel>
                       {courses.map((course) => (
                         <SelectItem key={`course-${course.id}`} value={`course:${course.id}`}>
                           {course.name}
                         </SelectItem>
                       ))}
                     </SelectGroup>
                   )}
                 </SelectContent>
               </Select>
             </CardHeader>
             <CardContent>
               {!enrollmentFilter ? (
                 <div className="flex flex-col items-center justify-center py-12 text-center">
                   <Users className="h-12 w-12 text-muted-foreground mb-4" />
                   <p className="text-muted-foreground">Select a cohort or course to view enrollments</p>
                 </div>
               ) : enrollmentsLoading ? (
                 <div className="flex justify-center py-8">
                   <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                 </div>
               ) : enrollments.length === 0 ? (
                 <p className="text-center py-8 text-muted-foreground">No enrollments found for this selection.</p>
               ) : (
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Student Name</TableHead>
                       <TableHead>Email</TableHead>
                       <TableHead>Enrolled At</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {enrollments.map((enrollment) => (
                       <TableRow key={enrollment.id}>
                         <TableCell className="font-medium">{enrollment.user_name || 'Unknown'}</TableCell>
                         <TableCell>{enrollment.user_email}</TableCell>
                         <TableCell>
                           {new Date(enrollment.enrolled_at).toLocaleDateString()}
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               )}
             </CardContent>
           </Card>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <Card className="card-elevated">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>
                    Leaderboard{leaderboard.length > 0 && leaderboardFilter ? ` (${leaderboard.length} students)` : ''}
                  </CardTitle>
                  <CardDescription>View student rankings by quiz performance and session completion</CardDescription>
                </div>
                <Select value={leaderboardFilter} onValueChange={setLeaderboardFilter}>
                  <SelectTrigger className="w-[250px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Select cohort or course" />
                  </SelectTrigger>
                  <SelectContent>
                    {cohorts.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Cohorts</SelectLabel>
                        {cohorts.map((cohort) => (
                          <SelectItem key={`cohort-${cohort.id}`} value={`cohort:${cohort.id}`}>
                            {cohort.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {courses.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Courses</SelectLabel>
                        {courses.map((course) => (
                          <SelectItem key={`course-${course.id}`} value={`course:${course.id}`}>
                            {course.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                {!leaderboardFilter ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Select a cohort or course to view the leaderboard</p>
                  </div>
                ) : leaderboardLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : leaderboard.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No students found or no quiz submissions yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">#</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-center">Avg Quiz Score</TableHead>
                        <TableHead className="text-center">Sessions</TableHead>
                        <TableHead className="text-center">Completion</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboard.map((entry, index) => (
                        <TableRow key={entry.user_id}>
                          <TableCell className="font-medium text-lg">
                            {getRankBadge(index + 1)}
                          </TableCell>
                          <TableCell className="font-medium">{entry.user_name || 'Unknown'}</TableCell>
                          <TableCell>{entry.user_email}</TableCell>
                          <TableCell className="text-center">
                            <span className={`font-semibold ${getScoreColor(entry.avg_quiz_score)}`}>
                              {entry.avg_quiz_score}%
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">
                              ({entry.quizzes_attempted} quiz{entry.quizzes_attempted !== 1 ? 'zes' : ''})
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {entry.sessions_completed}/{entry.total_sessions}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={entry.completion_percentage} className="h-2 w-16" />
                              <span className="text-sm text-muted-foreground w-10">
                                {entry.completion_percentage}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback">
            <Card className="card-elevated">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>
                    Feedback{feedbackEntries.length > 0 && feedbackFilter ? ` (${feedbackEntries.length})` : ''}
                  </CardTitle>
                  <CardDescription>View learner feedback by cohort or course</CardDescription>
                </div>
                <Select value={feedbackFilter} onValueChange={setFeedbackFilter}>
                  <SelectTrigger className="w-[250px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Select cohort or course" />
                  </SelectTrigger>
                  <SelectContent>
                    {cohorts.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Cohorts</SelectLabel>
                        {cohorts.map((cohort) => (
                          <SelectItem key={`fb-cohort-${cohort.id}`} value={`cohort:${cohort.id}`}>
                            {cohort.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {courses.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Courses</SelectLabel>
                        {courses.map((course) => (
                          <SelectItem key={`fb-course-${course.id}`} value={`course:${course.id}`}>
                            {course.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                {!feedbackFilter ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Select a cohort or course to view feedback</p>
                  </div>
                ) : feedbackLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : feedbackEntries.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No feedback found for this selection.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead className="w-[50%]">Comment</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feedbackEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">{entry.user_name || 'Unknown'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => {
                                const isFull = entry.rating >= star;
                                const isHalf = !isFull && entry.rating >= star - 0.5;
                                if (isHalf) {
                                  return (
                                    <svg key={star} viewBox="0 0 24 24" className="h-4 w-4">
                                      <defs>
                                        <clipPath id={`admin-half-l-${entry.id}-${star}`}><rect x="0" y="0" width="12" height="24" /></clipPath>
                                        <clipPath id={`admin-half-r-${entry.id}-${star}`}><rect x="12" y="0" width="12" height="24" /></clipPath>
                                      </defs>
                                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#facc15" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" clipPath={`url(#admin-half-l-${entry.id}-${star})`} />
                                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="none" stroke="#d4d4d8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" clipPath={`url(#admin-half-r-${entry.id}-${star})`} />
                                    </svg>
                                  );
                                }
                                return (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${isFull ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
                                  />
                                );
                              })}
                              <span className="ml-1 text-xs text-muted-foreground">{entry.rating}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {entry.comment || <span className="italic">No comment</span>}
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(entry.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prompts Tab */}
          <TabsContent value="prompts">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Manage Prompts</CardTitle>
                <CardDescription>Add prompts that learners can browse and copy</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add Prompt Form */}
                <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                  <h3 className="font-medium text-sm">Add New Prompt</h3>
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Prompt title"
                    value={promptTitle}
                    onChange={(e) => setPromptTitle(e.target.value)}
                  />
                  <textarea
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Prompt content"
                    value={promptContent}
                    onChange={(e) => setPromptContent(e.target.value)}
                  />
                  <Button
                    onClick={async () => {
                      if (!promptTitle.trim() || !promptContent.trim()) {
                        toast({ title: 'Please fill in both title and content', variant: 'destructive' });
                        return;
                      }
                      const { error } = await supabase.from('prompts').insert({
                        title: promptTitle.trim(),
                        content: promptContent.trim(),
                      });
                      if (error) {
                        toast({ title: 'Failed to add prompt', description: error.message, variant: 'destructive' });
                      } else {
                        toast({ title: 'Prompt added!' });
                        setPromptTitle('');
                        setPromptContent('');
                        fetchPrompts();
                      }
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Prompt
                  </Button>
                </div>

                {/* Prompts List */}
                {promptsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : prompts.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No prompts yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prompts.map((prompt) => (
                        <TableRow key={prompt.id}>
                          <TableCell className="font-medium">{prompt.title}</TableCell>
                          <TableCell className="max-w-md truncate text-muted-foreground">{prompt.content}</TableCell>
                          <TableCell className="text-right flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => {
                              setEditingPromptId(prompt.id);
                              setEditPromptTitle(prompt.title);
                              setEditPromptContent(prompt.content);
                            }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Prompt?</AlertDialogTitle>
                                  <AlertDialogDescription>This will permanently delete "{prompt.title}".</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={async () => {
                                    const { error } = await supabase.from('prompts').delete().eq('id', prompt.id);
                                    if (!error) {
                                      toast({ title: 'Prompt deleted' });
                                      fetchPrompts();
                                    }
                                  }}>Delete</AlertDialogAction>
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

          {/* Unenrolled Users Tab */}
          <TabsContent value="unenrolled">
            <Card className="card-elevated">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Unenrolled Registrations</CardTitle>
                  <CardDescription>Users who registered interest but are not enrolled in any cohort</CardDescription>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={fetchUnenrolledUsers} disabled={unenrolledLoading}>
                    {unenrolledLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyUnenrolledEmails} disabled={unenrolledUsers.length === 0}>
                    <Copy className="mr-2 h-4 w-4" /> Copy Emails
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyUnenrolledPhones} disabled={unenrolledUsers.length === 0}>
                    <Copy className="mr-2 h-4 w-4" /> Copy Phones
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadUnenrolledCSV} disabled={unenrolledUsers.length === 0}>
                    <Download className="mr-2 h-4 w-4" /> Download CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {unenrolledLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : unenrolledUsers.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No unenrolled users found.</p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">{unenrolledUsers.length} registration{unenrolledUsers.length !== 1 ? 's' : ''} not enrolled in any cohort</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Cohort</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Registered</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unenrolledUsers.map((user, idx) => (
                          <TableRow key={`${user.email}-${idx}`}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.whatsapp_number}</TableCell>
                            <TableCell>{user.cohort}</TableCell>
                            <TableCell>
                              <Select
                                value={user.status}
                                onValueChange={(val) => handleStatusUpdate(user.id, val)}
                                disabled={statusUpdatingId === user.id}
                              >
                                <SelectTrigger className="w-[130px] h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="approved">Approved</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Registrations Tab */}
          <TabsContent value="registrations">
            <Card className="card-elevated">
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>All Registrations</CardTitle>
                  <CardDescription>View all cohort registration submissions with full details</CardDescription>
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                  <Select value={registrationCohortFilter} onValueChange={(val) => { setRegistrationCohortFilter(val); fetchRegistrations(val); }}>
                    <SelectTrigger className="w-[220px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Filter by cohort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cohorts</SelectItem>
                      {registrationCohorts.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => fetchRegistrations(registrationCohortFilter)} disabled={registrationsLoading}>
                    {registrationsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadRegistrationsCSV} disabled={registrations.length === 0}>
                    <Download className="mr-2 h-4 w-4" /> Download CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {registrationsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : registrations.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No registrations found.</p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">{registrations.length} registration{registrations.length !== 1 ? 's' : ''}</p>
                    <div className="space-y-3">
                      {registrations.map((reg) => (
                        <Card key={reg.id} className="border">
                          <div
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => setExpandedRegistration(expandedRegistration === reg.id ? null : reg.id)}
                          >
                            <div className="flex items-center gap-4 flex-wrap">
                              <span className="font-medium">{reg.name}</span>
                              <span className="text-sm text-muted-foreground">{reg.email}</span>
                              <span className="text-sm text-muted-foreground">{reg.whatsapp_number}</span>
                              <Badge variant="outline">{reg.status}</Badge>
                              {reg.capstone_office_hours && <Badge variant="secondary">Capstone</Badge>}
                            </div>
                            <span className="text-xs text-muted-foreground">{new Date(reg.created_at).toLocaleDateString()}</span>
                          </div>
                          {expandedRegistration === reg.id && (
                            <div className="border-t p-4 space-y-3 text-sm bg-muted/30">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div><span className="font-medium text-muted-foreground">Company:</span> {reg.company}</div>
                                <div><span className="font-medium text-muted-foreground">Role:</span> {reg.role}</div>
                                <div><span className="font-medium text-muted-foreground">Country:</span> {reg.country || '—'}</div>
                                {reg.country === 'India' && (
                                  <div><span className="font-medium text-muted-foreground">State:</span> {reg.state || '—'}</div>
                                )}
                                <div><span className="font-medium text-muted-foreground">Cohort:</span> {reg.cohort}</div>
                                <div><span className="font-medium text-muted-foreground">Status:</span> {reg.status}</div>
                                <div><span className="font-medium text-muted-foreground">Capstone Office Hours:</span> {reg.capstone_office_hours ? 'Yes' : 'No'}</div>
                              </div>
                              <div>
                                <span className="font-medium text-muted-foreground">Interests:</span>{' '}
                                {(reg.interests || []).join(', ')}
                                {reg.other_interest && ` (Other: ${reg.other_interest})`}
                              </div>
                              <div>
                                <span className="font-medium text-muted-foreground">Why they want to join:</span>
                                <p className="mt-1 whitespace-pre-wrap">{reg.reason}</p>
                              </div>
                              {reg.additional_info && (
                                <div>
                                  <span className="font-medium text-muted-foreground">Additional info:</span>
                                  <p className="mt-1 whitespace-pre-wrap">{reg.additional_info}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  </>
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
          miniProjects={sessionMiniProjects}
          onSave={handleSaveSession}
        />
        <ChapterManager
          open={!!chaptersSession}
          onOpenChange={(o) => { if (!o) setChaptersSession(null); }}
          sessionId={chaptersSession?.id ?? ''}
          sessionTitle={chaptersSession?.title ?? ''}
        />
        <QuizForm
          open={quizFormOpen}
          onOpenChange={setQuizFormOpen}
          quiz={editingQuiz}
          onSave={handleSaveQuiz}
        />

        {/* Edit Prompt Dialog */}
        <Dialog open={!!editingPromptId} onOpenChange={(open) => !open && setEditingPromptId(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Edit Prompt</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={editPromptTitle}
                  onChange={(e) => setEditPromptTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Content</label>
                <textarea
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={editPromptContent}
                  onChange={(e) => setEditPromptContent(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingPromptId(null)}>Cancel</Button>
              <Button onClick={async () => {
                if (!editPromptTitle.trim() || !editPromptContent.trim()) {
                  toast({ title: 'Title and content are required', variant: 'destructive' });
                  return;
                }
                const { error } = await supabase.from('prompts').update({
                  title: editPromptTitle.trim(),
                  content: editPromptContent.trim(),
                }).eq('id', editingPromptId!);
                if (error) {
                  toast({ title: 'Failed to update prompt', description: error.message, variant: 'destructive' });
                } else {
                  toast({ title: 'Prompt updated!' });
                  setEditingPromptId(null);
                  fetchPrompts();
                }
              }}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
