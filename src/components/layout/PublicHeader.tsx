import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import logo from '@/assets/icon.png';
import PromoBanner from './PromoBanner';

export default function PublicHeader({ hideAuth = false }: { hideAuth?: boolean }) {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <>
      <PromoBanner />
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo & Tagline */}
        <Link to="/" className="flex items-center space-x-3">
          <img src={logo} alt="Approachable logo" className="h-9 w-9 rounded-lg" />
          <div className="flex flex-col">
            <span className="font-display font-bold text-xl text-foreground leading-tight">Approachable</span>
            <span className="text-[10px] text-muted-foreground leading-none hidden sm:block">making learning AI approachable for everyone</span>
          </div>
        </Link>

        {/* Navigation - reserved for future links */}
        <nav className="hidden md:flex items-center space-x-1">
        </nav>

        {/* Auth Buttons */}
        {!hideAuth && (
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild>
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild className="gap-2">
                  <Link to="/auth">
                    <LogIn className="h-4 w-4" />
                    <span className="hidden sm:inline">Sign In</span>
                  </Link>
                </Button>
                <Button size="sm" asChild className="gap-2">
                  <Link to="/auth?tab=signup">
                    <UserPlus className="h-4 w-4" />
                    <span className="hidden sm:inline">Sign Up</span>
                  </Link>
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
