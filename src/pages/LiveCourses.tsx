import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { buildLoginUrl, courseDetailPath } from "@/lib/authRedirect";
import PublicHeader from "@/components/layout/PublicHeader";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Clock, GraduationCap, ArrowRight, Image as ImageIcon } from "lucide-react";

interface Course {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  mentor_name: string | null;
  duration: string | null;
  image_url: string | null;
}

export default function LiveCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
    if (user) {
      fetchEnrollments();
    }
  }, [user]);

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from("courses")
      .select("id, slug, name, description, mentor_name, duration, image_url")
      .eq("is_published", true)
      .eq("is_on_demand", false)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCourses(data);
    }
    setIsLoading(false);
  };

  const fetchEnrollments = async () => {
    const { data, error } = await supabase
      .from("enrollments")
      .select("course_id")
      .eq("user_id", user?.id)
      .not("course_id", "is", null);

    if (!error && data) {
      setEnrolledCourseIds(data.map((e) => e.course_id as string));
    }
  };

  const isEnrolled = (courseId: string) => enrolledCourseIds.includes(courseId);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />

      <main className="flex-1 container py-8">
        <div className="space-y-8 animate-fade-in">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-display font-bold text-foreground">Courses</h1>
            <p className="text-muted-foreground">
              Join instructor-led courses with live sessions and interactive content.
            </p>
          </div>

          {/* Courses Grid */}
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="card-elevated overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full mt-2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : courses.length === 0 ? (
            <Card className="card-elevated border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Courses Available</h3>
                <p className="text-muted-foreground">Check back soon for new live courses.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  to={user ? courseDetailPath(course.slug) : buildLoginUrl(courseDetailPath(course.slug))}
                >
                  <Card className="card-elevated hover:shadow-lg transition-all duration-200 cursor-pointer h-full group overflow-hidden">
                    {/* Course Image */}
                    <div className="relative h-48 bg-muted overflow-hidden">
                      {course.image_url ? (
                        <img
                          src={course.image_url}
                          alt={course.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-16 w-16 text-muted-foreground/50" />
                        </div>
                      )}
                      {isEnrolled(course.id) && (
                        <Badge className="absolute top-3 right-3" variant="secondary">
                          Enrolled
                        </Badge>
                      )}
                    </div>

                    <CardHeader>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-2">
                        {course.name}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        {course.mentor_name && (
                          <span className="flex items-center gap-1.5">
                            <GraduationCap className="h-4 w-4" />
                            {course.mentor_name}
                          </span>
                        )}
                        {course.duration && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4" />
                            {course.duration}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-end pt-2">
                        <Button variant="ghost" size="sm" className="gap-1">
                          {user ? "View details" : "Sign in to enroll"} <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer className="mt-12" />
    </div>
  );
}
