-- Add session_time to cohorts for displaying time like "7:30PM IST"
ALTER TABLE public.cohorts ADD COLUMN session_time text;

-- Add start_date to courses for displaying date and time
ALTER TABLE public.courses ADD COLUMN start_date timestamp with time zone;