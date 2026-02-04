import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className }: MarkdownProps) {
  // Convert single newlines to double newlines for paragraph breaks
  // and preserve intentional double newlines as extra spacing
  const processedContent = content
    .split('\n\n')
    .map(block => block.split('\n').join('  \n')) // Add trailing spaces for line breaks within blocks
    .join('\n\n');

  return (
    <div
      className={cn(
        'prose prose-sm max-w-none dark:prose-invert',
        'prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2',
        'prose-p:text-foreground prose-p:leading-relaxed prose-p:my-3',
        'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
        'prose-strong:text-foreground prose-strong:font-semibold',
        'prose-ul:text-foreground prose-ul:my-3 prose-ol:text-foreground prose-ol:my-3',
        'prose-li:text-foreground prose-li:my-1',
        'prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-sm',
        'prose-pre:bg-muted prose-pre:border prose-pre:border-border',
        'prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground',
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{processedContent}</ReactMarkdown>
    </div>
  );
}
