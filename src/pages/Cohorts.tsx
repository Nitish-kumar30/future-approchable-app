import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Calendar, GraduationCap, ArrowRight } from 'lucide-react';
import { formatCohortDateRange } from '@/lib/formatCohortDate';

interface Cohort {
  id: string;
  name: string;
  description: string | null;
  mentor_name: string | null;
  start_date: string | null;
  end_date: string | null;
  max_seats: number | null;
  session_time: string | null;
}

export default function Cohorts() {
  const { user } = useAuth();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [enrolledCohortIds, setEnrolledCohortIds] = useState<string[]>([]);
  const [enrollmentCounts, setEnrollmentCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCohorts();
    if (user) {
      fetchEnrollments();
    }
  }, [user]);

  const fetchCohorts = async () => {
    const { data, error } = await supabase
      .from('cohorts')
      .select('id, name, description, mentor_name, start_date, end_date, max_seats, session_time')
      .eq('is_published', true)
      .order('start_date', { ascending: true });

    if (!error && data) {
      setCohorts(data);
      // Fetch enrollment counts for all cohorts
      fetchEnrollmentCounts(data.map(c => c.id));
    }
    setIsLoading(false);
  };

  const fetchEnrollmentCounts = async (cohortIds: string[]) => {
    if (cohortIds.length === 0) return;
    
    const { data } = await supabase
      .from('enrollments')
      .select('cohort_id')
      .in('cohort_id', cohortIds);
    
    if (data) {
      const counts: Record<string, number> = {};
      cohortIds.forEach(id => counts[id] = 0);
      data.forEach(e => {
        if (e.cohort_id) {
          counts[e.cohort_id] = (counts[e.cohort_id] || 0) + 1;
        }
      });
      setEnrollmentCounts(counts);
    }
  };

  const fetchEnrollments = async () => {
    const { data, error } = await supabase
      .from('enrollments')
      .select('cohort_id')
      .eq('user_id', user?.id)
      .not('cohort_id', 'is', null);

    if (!error && data) {
      setEnrolledCohortIds(data.map(e => e.cohort_id as string));
    }
  };

  const isEnrolled = (cohortId: string) => enrolledCohortIds.includes(cohortId);

  // Use the shared utility function for consistent formatting

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-display font-bold text-foreground">Cohorts</h1>
          <p className="text-muted-foreground">
            Join live, mentor-led cohort programs and learn with a community.
          </p>
        </div>

        {/* Cohorts Grid */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="card-elevated">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full mt-2" />
                  <Skeleton className="h-4 w-2/3 mt-1" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : cohorts.length === 0 ? (
          <Card className="card-elevated border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Cohorts Available</h3>
              <p className="text-muted-foreground">
                Check back soon for upcoming cohort programs.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {cohorts.map((cohort) => (
              <Link key={cohort.id} to={`/cohorts/${cohort.id}`}>
                <Card className="card-elevated hover:shadow-lg transition-all duration-200 cursor-pointer h-full group">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {cohort.name}
                      </CardTitle>
                      {isEnrolled(cohort.id) && (
                        <Badge variant="secondary" className="shrink-0">Enrolled</Badge>
                      )}
                    </div>
                    <CardDescription className="line-clamp-3">
                      {cohort.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      {cohort.mentor_name && (
                        <span className="flex items-center gap-1.5">
                          <GraduationCap className="h-4 w-4" />
                          {cohort.mentor_name}
                        </span>
                      )}
                      {(cohort.start_date || cohort.session_time) && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          {formatCohortDateRange(cohort.start_date, cohort.end_date, cohort.session_time)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      {cohort.max_seats && (
                        <span className="text-xs text-muted-foreground">
                          {cohort.max_seats - (enrollmentCounts[cohort.id] || 0) > 0 
                            ? `${cohort.max_seats - (enrollmentCounts[cohort.id] || 0)} seats left`
                            : 'Fully booked'}
                        </span>
                      )}
                      <Button variant="ghost" size="sm" className="gap-1 ml-auto">
                        View details <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
