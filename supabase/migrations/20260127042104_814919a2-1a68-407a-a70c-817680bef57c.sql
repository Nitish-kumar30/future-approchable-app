-- Create storage bucket for course images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('course-images', 'course-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- Allow anyone to view course images (public bucket)
CREATE POLICY "Anyone can view course images"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-images');

-- Only admins can upload course images
CREATE POLICY "Admins can upload course images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'course-images' AND public.is_admin());

-- Only admins can update course images
CREATE POLICY "Admins can update course images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'course-images' AND public.is_admin());

-- Only admins can delete course images
CREATE POLICY "Admins can delete course images"
ON storage.objects FOR DELETE
USING (bucket_id = 'course-images' AND public.is_admin());