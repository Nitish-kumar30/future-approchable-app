import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PlayCircle, Search } from 'lucide-react';
import CourseCard from '@/components/course/CourseCard';

interface FreeCourse {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  mentor_name: string | null;
  duration: string | null;
  image_url: string | null;
  created_at: string | null;
}

type SortOption = 'newest' | 'name-asc';

export default function FreeCoursesGrid({
  searchQuery = '',
  sort = 'newest',
}: {
  searchQuery?: string;
  sort?: SortOption;
}) {
  const [courses, setCourses] = useState<FreeCourse[]>([]);
  const [loading, setLoading] = useState(true);

  const visibleCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = !q
      ? [...courses]
      : courses.filter(
          (c) => c.name.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q),
        );
    if (sort === 'name-asc') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      filtered.sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
      );
    }
    return filtered;
  }, [courses, searchQuery, sort]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('courses')
        .select('id, slug, name, description, mentor_name, duration, image_url, created_at')
        .eq('is_published', true)
        .eq('is_on_demand', true)
        .order('created_at', { ascending: false });
      if (!cancelled) {
        setCourses(data || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="card-elevated overflow-hidden flex flex-col">
            <Skeleton className="h-40 w-full shrink-0 rounded-none" />
            <CardHeader className="p-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-full mt-2" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <Card className="card-elevated border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <PlayCircle className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-base font-semibold mb-1">No Free Courses Available</h3>
          <p className="text-sm text-muted-foreground">Check back soon for new self-paced courses.</p>
        </CardContent>
      </Card>
    );
  }

  if (visibleCourses.length === 0) {
    return (
      <Card className="card-elevated border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Search className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-base font-semibold mb-1">No matching courses</h3>
          <p className="text-sm text-muted-foreground">Try a different search term.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {visibleCourses.map((course) => (
        <CourseCard
          key={course.id}
          course={course}
          variant="free"
          href={`/on-demand/${course.slug}`}
          ctaLabel="Start learning"
        />
      ))}
    </div>
  );
}
