-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'learner');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'learner',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cohorts table
CREATE TABLE public.cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    mentor_name TEXT,
    mentor_info TEXT,
    start_date DATE,
    end_date DATE,
    max_seats INTEGER,
    meeting_link TEXT,
    group_link TEXT,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create courses table
CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    mentor_name TEXT,
    mentor_info TEXT,
    duration TEXT,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sessions table (can belong to cohort OR course)
CREATE TABLE public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_id UUID REFERENCES public.cohorts(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    session_date TIMESTAMP WITH TIME ZONE,
    recording_url TEXT,
    presentation_url TEXT,
    session_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT session_belongs_to_one CHECK (
        (cohort_id IS NOT NULL AND course_id IS NULL) OR 
        (cohort_id IS NULL AND course_id IS NOT NULL)
    )
);

-- Create quizzes table
CREATE TABLE public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    questions JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create enrollments table
CREATE TABLE public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    cohort_id UUID REFERENCES public.cohorts(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT enrollment_type CHECK (
        (cohort_id IS NOT NULL AND course_id IS NULL) OR 
        (cohort_id IS NULL AND course_id IS NOT NULL)
    ),
    UNIQUE (user_id, cohort_id),
    UNIQUE (user_id, course_id)
);

-- Create quiz_submissions table
CREATE TABLE public.quiz_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    answers JSONB NOT NULL DEFAULT '[]',
    score INTEGER,
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- Helper function: Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Helper function: Check if user is enrolled in a cohort
CREATE OR REPLACE FUNCTION public.is_enrolled_in_cohort(_user_id UUID, _cohort_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.enrollments
        WHERE user_id = _user_id AND cohort_id = _cohort_id
    )
$$;

-- Helper function: Check if user is enrolled in a course
CREATE OR REPLACE FUNCTION public.is_enrolled_in_course(_user_id UUID, _course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.enrollments
        WHERE user_id = _user_id AND course_id = _course_id
    )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for cohorts
CREATE POLICY "Anyone can view published cohorts" ON public.cohorts
    FOR SELECT USING (is_published = true OR public.is_admin());

CREATE POLICY "Admins can create cohorts" ON public.cohorts
    FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update cohorts" ON public.cohorts
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete cohorts" ON public.cohorts
    FOR DELETE USING (public.is_admin());

-- RLS Policies for courses
CREATE POLICY "Anyone can view published courses" ON public.courses
    FOR SELECT USING (is_published = true OR public.is_admin());

CREATE POLICY "Admins can create courses" ON public.courses
    FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update courses" ON public.courses
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete courses" ON public.courses
    FOR DELETE USING (public.is_admin());

-- RLS Policies for sessions
CREATE POLICY "Enrolled users and admins can view sessions" ON public.sessions
    FOR SELECT USING (
        public.is_admin() OR
        (cohort_id IS NOT NULL AND public.is_enrolled_in_cohort(auth.uid(), cohort_id)) OR
        (course_id IS NOT NULL AND public.is_enrolled_in_course(auth.uid(), course_id))
    );

CREATE POLICY "Admins can create sessions" ON public.sessions
    FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update sessions" ON public.sessions
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete sessions" ON public.sessions
    FOR DELETE USING (public.is_admin());

-- RLS Policies for quizzes
CREATE POLICY "Enrolled users and admins can view quizzes" ON public.quizzes
    FOR SELECT USING (
        public.is_admin() OR
        EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = session_id AND (
                (s.cohort_id IS NOT NULL AND public.is_enrolled_in_cohort(auth.uid(), s.cohort_id)) OR
                (s.course_id IS NOT NULL AND public.is_enrolled_in_course(auth.uid(), s.course_id))
            )
        )
    );

CREATE POLICY "Admins can create quizzes" ON public.quizzes
    FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update quizzes" ON public.quizzes
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete quizzes" ON public.quizzes
    FOR DELETE USING (public.is_admin());

-- RLS Policies for enrollments
CREATE POLICY "Users can view own enrollments" ON public.enrollments
    FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can enroll themselves" ON public.enrollments
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage enrollments" ON public.enrollments
    FOR ALL USING (public.is_admin());

-- RLS Policies for quiz_submissions
CREATE POLICY "Users can view own submissions" ON public.quiz_submissions
    FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can submit quizzes" ON public.quiz_submissions
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'learner');
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cohorts_updated_at BEFORE UPDATE ON public.cohorts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON public.quizzes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();