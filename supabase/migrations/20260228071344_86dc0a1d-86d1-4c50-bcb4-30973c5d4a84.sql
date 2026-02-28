-- Change rating column from integer to numeric to support half-star values (e.g. 4.5)
ALTER TABLE public.feedback ALTER COLUMN rating TYPE numeric USING rating::numeric;

-- Add a check constraint to ensure rating is between 0.5 and 5 in 0.5 increments
ALTER TABLE public.feedback ADD CONSTRAINT feedback_rating_range 
  CHECK (rating >= 0.5 AND rating <= 5 AND (rating * 2) = FLOOR(rating * 2));