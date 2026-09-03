import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className }: MarkdownProps) {

  return (
    <div
      className={cn(
        'prose prose-sm max-w-none dark:prose-invert',
        'prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-8 prose-headings:mb-3 [&>:first-child]:mt-0',
        'prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg',
        'prose-p:text-foreground prose-p:leading-7 prose-p:my-4',
        'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
        'prose-strong:text-foreground prose-strong:font-semibold',
        'prose-ul:text-foreground prose-ul:my-4 prose-ol:text-foreground prose-ol:my-4',
        'prose-li:text-foreground prose-li:my-1.5',
        'prose-code:text-foreground prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-sm',
        'prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-pre:text-sm',
        'prose-blockquote:border-l-primary prose-blockquote:text-foreground prose-blockquote:bg-primary/5 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic',
        'prose-table:border prose-th:bg-muted prose-th:px-3 prose-td:px-3 prose-td:border-border',
        'prose-hr:border-border prose-hr:my-8',
        'prose-img:rounded-lg prose-img:max-w-full prose-img:my-4',
        '[&_p]:whitespace-pre-line',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt }) => (
            <img src={src} alt={alt ?? ''} loading="lazy" className="rounded-lg max-w-full my-4" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
