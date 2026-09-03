import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Clock, GraduationCap, ArrowRight, Image as ImageIcon, Search } from 'lucide-react';
import { formatDuration } from '@/lib/formatDuration';

interface GuideCourse {
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

export default function GuidesCoursesGrid({
  searchQuery = '',
  sort = 'newest',
}: {
  searchQuery?: string;
  sort?: SortOption;
}) {
  const [courses, setCourses] = useState<GuideCourse[]>([]);
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
        .eq('is_text_course', true)
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
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="card-elevated overflow-hidden flex flex-col">
            <Skeleton className="h-36 w-full shrink-0 rounded-none" />
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
          <BookOpen className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-base font-semibold mb-1">No Guides Available</h3>
          <p className="text-sm text-muted-foreground">Check back soon for new reading guides.</p>
        </CardContent>
      </Card>
    );
  }

  if (visibleCourses.length === 0) {
    return (
      <Card className="card-elevated border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Search className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-base font-semibold mb-1">No matching guides</h3>
          <p className="text-sm text-muted-foreground">Try a different search term.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {visibleCourses.map((course) => (
        <Link key={course.id} to={`/guides/${course.slug}`}>
          <Card className="card-elevated hover:shadow-md transition-all duration-200 cursor-pointer group overflow-hidden flex flex-col h-full">
            <div className="relative h-36 shrink-0 bg-muted overflow-hidden">
              {course.image_url ? (
                <img
                  src={course.image_url}
                  alt={course.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
            </div>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base group-hover:text-primary transition-colors line-clamp-2">
                {course.name}
              </CardTitle>
              <CardDescription className="line-clamp-2 text-xs">{course.description}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 pb-4 space-y-2 mt-auto">
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {course.mentor_name && (
                  <span className="flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5" />
                    {course.mentor_name}
                  </span>
                )}
                {course.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDuration(course.duration)}
                  </span>
                )}
              </div>
              <div className="flex justify-end">
                <Button size="sm" className="gap-1 h-8 text-xs">
                  Start reading <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
