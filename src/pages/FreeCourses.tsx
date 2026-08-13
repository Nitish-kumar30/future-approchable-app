import AppShell from '@/components/layout/AppShell';
import FreeCoursesGrid from '@/components/courses/FreeCoursesGrid';

export default function FreeCourses() {
  return (
    <AppShell>
      <div className="space-y-4 animate-fade-in">
        <div className="space-y-1">
          <h2 className="text-xl font-display font-bold text-foreground">Free Courses</h2>
          <p className="text-sm text-muted-foreground">
            Learn at your own pace with self-guided on-demand courses.
          </p>
        </div>
        <FreeCoursesGrid />
      </div>
    </AppShell>
  );
}
