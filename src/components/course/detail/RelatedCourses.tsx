import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import CourseCard, { type CourseCardCourse } from '@/components/course/CourseCard';

interface RelatedCoursesProps {
  currentCourseId: string;
}

export default function RelatedCourses({ currentCourseId }: RelatedCoursesProps) {
  const [courses, setCourses] = useState<CourseCardCourse[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('courses')
        .select(
          'id, slug, name, description, mentor_name, duration, image_url, start_date, enrollment_disabled, price_inr_paise, price_usd_cents',
        )
        .eq('is_published', true)
        .eq('is_on_demand', false)
        .neq('id', currentCourseId)
        .order('start_date', { ascending: false })
        .limit(6);
      if (!cancelled) setCourses(data || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentCourseId]);

  if (courses.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-xl sm:text-2xl font-semibold">More Courses</h2>
      <div className="-mx-4 sm:mx-0 overflow-x-auto">
        <div className="flex gap-4 px-4 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <div key={course.id} className="w-64 shrink-0 sm:w-auto">
              <CourseCard course={course} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
