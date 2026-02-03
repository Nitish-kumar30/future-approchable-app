import { Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-border py-6 mt-auto">
      <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Approachable.dev. All rights reserved.</p>
        <a 
          href="mailto:ranbeer@bigintsolutions.com" 
          className="flex items-center gap-2 hover:text-foreground transition-colors"
        >
          <Mail className="h-4 w-4" />
          ranbeer@bigintsolutions.com
        </a>
      </div>
    </footer>
  );
}
