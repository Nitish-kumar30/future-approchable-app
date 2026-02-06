-- Add enrollment_disabled column to cohorts table
ALTER TABLE public.cohorts 
ADD COLUMN enrollment_disabled boolean NOT NULL DEFAULT false;

-- Add enrollment_disabled column to courses table
ALTER TABLE public.courses 
ADD COLUMN enrollment_disabled boolean NOT NULL DEFAULT false;