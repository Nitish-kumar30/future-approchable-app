/** Extract title from first markdown H1, or fall back to filename without extension. */
export function parseChapterTitle(markdown: string, filename?: string): string {
  const h1Match = markdown.match(/^#\s+(.+)$/m);
  if (h1Match?.[1]) return h1Match[1].trim();

  if (filename) {
    return filename.replace(/\.md$/i, "").replace(/[-_]/g, " ");
  }

  return "Untitled Chapter";
}

/** Strip the leading H1 from markdown if present (title is shown separately in the UI). */
export function stripLeadingH1(markdown: string): string {
  return markdown.replace(/^#\s+.+\n?/, "").trimStart();
}
