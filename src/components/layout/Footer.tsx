import { cn } from '@/lib/utils';

interface FooterProps {
  className?: string;
  variant?: 'default' | 'inline';
}

export default function Footer({ className, variant = 'default' }: FooterProps) {
  return (
    <footer
      className={cn(
        'py-6 mt-auto',
        variant === 'default' && 'border-t border-border',
        className,
      )}
    >
      <div className="container flex items-center justify-center text-xs sm:text-sm text-muted-foreground text-center px-2">
        <p>
          © {new Date().getFullYear()} Approachable.dev. All rights reserved. For support, contact: ranbeer@gmail.com
        </p>
      </div>
    </footer>
  );
}
