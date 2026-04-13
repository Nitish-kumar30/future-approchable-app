
DROP VIEW IF EXISTS public.cohorts_public;

CREATE VIEW public.cohorts_public
WITH (security_barrier = true) AS
SELECT id, name, description, mentor_name, mentor_info,
       start_date, end_date, max_seats, session_time,
       is_published, enrollment_disabled, created_at, updated_at
FROM public.cohorts
WHERE is_published = true;

GRANT SELECT ON public.cohorts_public TO anon, authenticated;
