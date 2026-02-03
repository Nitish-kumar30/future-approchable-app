import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, ArrowRight, Sparkles, PlayCircle, ClipboardCheck } from 'lucide-react';
import PublicHeader from '@/components/layout/PublicHeader';
import Footer from '@/components/layout/Footer';

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      {/* Hero */}
      <section className="container py-24 text-center">
        <div className="max-w-3xl mx-auto space-y-8 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm">
            <Sparkles className="h-4 w-4" />
            Modern Learning Platform
          </div>
          
          <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground leading-tight">
            Making learning AI{' '}
            <span className="text-primary">approachable for everyone</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join cohort-based programs and self-paced courses led by expert mentors. 
            Build skills with a community of learners.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="text-lg px-8">
              <Link to="/live-courses">
                Explore Courses <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8">
              <Link to="/auth">
                Get Started
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-display font-bold text-foreground mb-4">Why Approachable?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Everything you need to accelerate your learning journey
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <div className="card-elevated p-6 space-y-4 animate-fade-in text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Cohort Learning</h3>
            <p className="text-sm text-muted-foreground">
              Learn with peers in structured cohort programs with live mentorship.
            </p>
          </div>
          
          <div className="card-elevated p-6 space-y-4 animate-fade-in text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Pre-Reading Materials</h3>
            <p className="text-sm text-muted-foreground">
              Prepare for each session with curated reading materials and resources.
            </p>
          </div>
          
          <div className="card-elevated p-6 space-y-4 animate-fade-in text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
              <PlayCircle className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Live Sessions</h3>
            <p className="text-sm text-muted-foreground">
              Attend live sessions and access recordings anytime.
            </p>
          </div>
          
          <div className="card-elevated p-6 space-y-4 animate-fade-in text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
              <ClipboardCheck className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Quizzes & Assessments</h3>
            <p className="text-sm text-muted-foreground">
              Test your understanding with auto-graded quizzes.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-24">
        <div className="card-elevated p-12 text-center max-w-4xl mx-auto bg-gradient-to-br from-primary/5 to-primary/10">
          <h2 className="text-3xl font-display font-bold text-foreground mb-4">
            Ready to Start Learning?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of learners who are advancing their skills with our expert-led courses.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/auth?tab=signup">
                Create Free Account
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/live-courses">
                Browse Courses
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
