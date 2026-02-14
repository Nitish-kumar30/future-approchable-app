import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCohortDateRange } from '@/lib/formatCohortDate';
import { 
  Users, 
  BookOpen, 
  Calendar,
  ArrowRight,
  GraduationCap,
  Sparkles,
  Clock,
  PlayCircle,
  Image as ImageIcon
} from 'lucide-react';

interface Cohort {
  id: string;
  name: string;
  description: string | null;
  mentor_name: string | null;
  start_date: string | null;
  end_date: string | null;
  session_time: string | null;
}

interface Course {
  id: string;
  name: string;
  description: string | null;
  mentor_name: string | null;
  duration: string | null;
}

interface OnDemandCourse {
  id: string;
  name: string;
  description: string | null;
  mentor_name: string | null;
  duration: string | null;
  image_url: string | null;
}

interface Enrollment {
  id: string;
  cohort_id: string | null;
  course_id: string | null;
  enrolled_at: string;
  cohorts: Cohort | null;
  courses: Course | null;
}

interface CohortProgress {
  cohortId: string;
  isCompleted: boolean;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [cohortProgress, setCohortProgress] = useState<CohortProgress[]>([]);
  const [onDemandCourses, setOnDemandCourses] = useState<OnDemandCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchEnrollments();
    }
    fetchOnDemandCourses();
  }, [user]);

  const fetchEnrollments = async () => {
    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        id,
        cohort_id,
        course_id,
        enrolled_at,
        cohorts (id, name, description, mentor_name, start_date, end_date, session_time),
        courses (id, name, description, mentor_name, duration)
      `)
      .eq('user_id', user?.id);

    if (!error && data) {
      setEnrollments(data as unknown as Enrollment[]);
      // Fetch progress for cohort enrollments
      const cohortIds = data
        .filter(e => e.cohort_id)
        .map(e => e.cohort_id as string);
      if (cohortIds.length > 0) {
        fetchCohortProgress(cohortIds);
      }
    }
    setIsLoading(false);
  };

  const fetchCohortProgress = async (cohortIds: string[]) => {
    const progressData: CohortProgress[] = [];

    await Promise.all(
      cohortIds.map(async (cohortId) => {
        // Get all sessions for this cohort
        const { data: sessions } = await supabase
          .from('sessions')
          .select('id')
          .eq('cohort_id', cohortId);

        if (!sessions || sessions.length === 0) {
          progressData.push({ cohortId, isCompleted: false });
          return;
        }

        const sessionIds = sessions.map(s => s.id);

        // Get completed sessions count
        const { count: completedCount } = await supabase
          .from('session_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user?.id)
          .eq('is_completed', true)
          .in('session_id', sessionIds);

        const isCompleted = (completedCount || 0) === sessions.length && sessions.length > 0;
        progressData.push({ cohortId, isCompleted });
      })
    );

    setCohortProgress(progressData);
  };

  const isCompleted = (cohortId: string) => {
    const progress = cohortProgress.find(p => p.cohortId === cohortId);
    return progress?.isCompleted || false;
  };

  const fetchOnDemandCourses = async () => {
    const { data } = await supabase
      .from('courses')
      .select('id, name, description, mentor_name, duration, image_url')
      .eq('is_published', true)
      .eq('is_on_demand', true)
      .order('created_at', { ascending: false })
      .limit(4);
    if (data) setOnDemandCourses(data);
  };

  const cohortEnrollments = enrollments.filter(e => e.cohort_id && e.cohorts);
  const courseEnrollments = enrollments.filter(e => e.course_id && e.courses);
  const hasEnrollments = enrollments.length > 0;

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-display font-bold text-foreground">
            Welcome back! 👋
          </h1>
          <p className="text-muted-foreground">
            {hasEnrollments 
              ? "Here's an overview of your learning journey."
              : "Start your learning journey by exploring our cohorts and courses."
            }
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enrolled Cohorts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cohortEnrollments.length}</div>
              <p className="text-xs text-muted-foreground">Active cohort programs</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enrolled Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{courseEnrollments.length}</div>
              <p className="text-xs text-muted-foreground">Self-paced courses</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Learning</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{enrollments.length}</div>
              <p className="text-xs text-muted-foreground">Programs joined</p>
            </CardContent>
          </Card>
        </div>

        {/* Empty State or Enrollments */}
        {!hasEnrollments && !isLoading ? (
          <Card className="card-elevated border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Start Your Learning Journey</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                You're not enrolled in any cohorts or courses yet. Explore our catalog to find the perfect program for you.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild>
                  <Link to="/cohorts">
                    <Users className="mr-2 h-4 w-4" />
                    Browse Cohorts
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/courses">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Browse Courses
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Enrolled Cohorts */}
            {cohortEnrollments.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Your Cohorts</h2>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/cohorts">
                      View all <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {cohortEnrollments.slice(0, 4).map((enrollment) => (
                    <Link key={enrollment.id} to={`/cohorts/${enrollment.cohort_id}`}>
                      <Card className="card-elevated hover:shadow-lg transition-shadow cursor-pointer h-full">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{enrollment.cohorts?.name}</CardTitle>
                              <CardDescription className="line-clamp-2 mt-1">
                                {enrollment.cohorts?.description}
                              </CardDescription>
                            </div>
                            <Badge variant={isCompleted(enrollment.cohort_id!) ? "default" : "secondary"}>
                              {isCompleted(enrollment.cohort_id!) ? 'Completed' : 'Enrolled'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {enrollment.cohorts?.mentor_name && (
                              <span className="flex items-center gap-1">
                                <GraduationCap className="h-4 w-4" />
                                {enrollment.cohorts.mentor_name}
                              </span>
                            )}
                            {(enrollment.cohorts?.start_date || enrollment.cohorts?.session_time) && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {formatCohortDateRange(enrollment.cohorts.start_date, enrollment.cohorts.end_date, enrollment.cohorts.session_time)}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Enrolled Courses */}
            {courseEnrollments.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Your Courses</h2>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/courses">
                      View all <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {courseEnrollments.slice(0, 4).map((enrollment) => (
                    <Link key={enrollment.id} to={`/courses/${enrollment.course_id}`}>
                      <Card className="card-elevated hover:shadow-lg transition-shadow cursor-pointer h-full">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{enrollment.courses?.name}</CardTitle>
                              <CardDescription className="line-clamp-2 mt-1">
                                {enrollment.courses?.description}
                              </CardDescription>
                            </div>
                            <Badge variant="secondary">Enrolled</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {enrollment.courses?.mentor_name && (
                              <span className="flex items-center gap-1">
                                <GraduationCap className="h-4 w-4" />
                                {enrollment.courses.mentor_name}
                              </span>
                            )}
                            {enrollment.courses?.duration && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {enrollment.courses.duration}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* On-Demand Courses Section */}
        {onDemandCourses.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">On-Demand Courses</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/on-demand">
                  View all <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {onDemandCourses.map((course) => (
                <Link key={course.id} to={`/on-demand/${course.id}`}>
                  <Card className="card-elevated hover:shadow-lg transition-shadow cursor-pointer h-full group overflow-hidden">
                    {course.image_url && (
                      <div className="h-32 bg-muted overflow-hidden">
                        <img
                          src={course.image_url}
                          alt={course.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{course.name}</CardTitle>
                          <CardDescription className="line-clamp-2 mt-1">
                            {course.description}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="shrink-0 border-accent text-accent-foreground bg-accent/10">
                          <PlayCircle className="h-3 w-3 mr-1" /> On-Demand
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {course.mentor_name && (
                          <span className="flex items-center gap-1">
                            <GraduationCap className="h-4 w-4" />
                            {course.mentor_name}
                          </span>
                        )}
                        {course.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {course.duration}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
