import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { LOGIN_PATH } from '@/lib/authRedirect';
import logo from '@/assets/icon.png';
import PromoBanner from './PromoBanner';

export default function PublicHeader({ hideAuth = false }: { hideAuth?: boolean }) {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <>
      <PromoBanner />
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between gap-3 pl-3 pr-4 sm:pl-4 sm:pr-6 lg:pl-5 lg:pr-8">
        {/* Logo & Tagline — signed-in users go straight to their dashboard */}
        <Link to={user ? "/dashboard" : "/"} className="flex min-w-0 shrink items-center gap-2.5 sm:gap-3">
          <img src={logo} alt="Approachable logo" className="h-9 w-9 shrink-0 rounded-lg" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-display text-lg font-bold leading-tight text-foreground sm:text-xl">Approachable</span>
            <span className="text-[10px] text-muted-foreground leading-none hidden sm:block">making learning AI approachable for everyone</span>
          </div>
        </Link>

        {/* Navigation - reserved for future links */}
        <nav className="hidden md:flex items-center space-x-1">
        </nav>

        {/* Auth Buttons */}
        {!hideAuth && (
          <div className="flex shrink-0 items-center gap-2">
            {user ? (
              <Button size="sm" asChild className="whitespace-nowrap px-3 sm:px-4">
                <Link to="/dashboard">
                  <span className="sm:hidden">Dashboard</span>
                  <span className="hidden sm:inline">Go to Dashboard</span>
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild className="gap-2">
                  <Link to={LOGIN_PATH}>
                    <LogIn className="h-4 w-4" />
                    <span className="hidden sm:inline">Sign In</span>
                  </Link>
                </Button>
                <Button size="sm" asChild className="gap-2">
                  <Link to={`${LOGIN_PATH}?tab=signup`}>
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
    </>
  );
}
