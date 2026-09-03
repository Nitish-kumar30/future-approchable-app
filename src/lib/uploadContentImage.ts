import { supabase } from '@/integrations/supabase/client';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export function validateContentImage(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Invalid file type. Please upload a JPEG, PNG, or WEBP image.';
  }
  if (file.size > MAX_SIZE_BYTES) {
    return 'Image must be 5 MB or smaller.';
  }
  return null;
}

export async function uploadContentImage(
  file: File,
  sessionId?: string,
): Promise<string> {
  const validationError = validateContentImage(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const folder = sessionId ? `session-content/${sessionId}` : 'session-content/draft';
  const filePath = `${folder}/${crypto.randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('course-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage.from('course-images').getPublicUrl(filePath);
  return urlData.publicUrl;
}
