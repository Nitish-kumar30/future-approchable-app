export interface CourseIncludesInput {
  chapterCount: number;
  quizCount: number;
  preReadingCount: number;
  isPaid: boolean;
}

/** Plain-text "this course includes" bullets shared by the desktop rail and the mobile card. */
export function buildIncludesLabels({
  chapterCount,
  quizCount,
  preReadingCount,
  isPaid,
}: CourseIncludesInput): string[] {
  return [
    chapterCount > 0 && `${chapterCount} on-demand ${chapterCount === 1 ? 'lesson' : 'lessons'}`,
    quizCount > 0 && `${quizCount} ${quizCount === 1 ? 'quiz' : 'quizzes'}`,
    preReadingCount > 0 &&
      `${preReadingCount} reading ${preReadingCount === 1 ? 'material' : 'materials'}`,
    isPaid && 'Certificate of completion',
    'Lifetime access',
    'Learn on mobile & desktop',
  ].filter(Boolean) as string[];
}
