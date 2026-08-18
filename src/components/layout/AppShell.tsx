import { ReactNode, useMemo } from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { buildLoginUrl } from '@/lib/authRedirect';
import { useSyncMobileNavHeight } from '@/hooks/useSyncMobileNavHeight';
import { useThemeMode, THEME_OPTIONS, type ThemeMode } from '@/hooks/useThemeMode';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  LogOut,
  User,
  Loader2,
  Shield,
  PlayCircle,
  Library,
  Crown,
  ChevronsUpDown,
  Palette,
  Award,
} from 'lucide-react';
import siteIcon from '@/assets/icon.png';
import PromoBanner from './PromoBanner';
import Footer from './Footer';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: ReactNode;
}

interface NavItem {
  path: string;
  href?: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { path: '/cohorts', label: 'Cohorts', icon: Users },
  { path: '/courses', label: 'Courses', icon: BookOpen },
  { path: '/free', href: '/courses?tab=free', label: 'Free', icon: PlayCircle },
  { path: '/resources', label: 'Resources', icon: Library },
];

const adminNavItems: NavItem[] = [
  { path: '/admin', label: 'Admin', icon: Shield },
];

/** Shared menu items for the profile dropdown, reused by both the desktop
 * sidebar footer trigger and the mobile top-bar avatar trigger so the two
 * stay in sync. */
function ProfileMenuItems({
  theme,
  setTheme,
  signOut,
}: {
  theme: ThemeMode;
  setTheme: (value: ThemeMode) => void;
  signOut: () => void;
}) {
  return (
    <>
      <DropdownMenuItem asChild>
        <Link to="/profile" className="flex items-center cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          Profile
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link to="/profile#certificates" className="flex items-center cursor-pointer">
          <Award className="mr-2 h-4 w-4" />
          Certificates
        </Link>
      </DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Palette className="mr-2 h-4 w-4" />
          Theme
          <span
            className={cn(
              'ml-auto mr-1 h-2.5 w-2.5 rounded-full',
              THEME_OPTIONS.find((t) => t.value === theme)?.swatchClass,
            )}
          />
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemeMode)}>
            {THEME_OPTIONS.map((opt) => (
              <DropdownMenuRadioItem key={opt.value} value={opt.value} className="cursor-pointer">
                <span className={cn('mr-2 h-2.5 w-2.5 rounded-full', opt.swatchClass)} />
                {opt.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
        <LogOut className="mr-2 h-4 w-4" />
        Sign out
      </DropdownMenuItem>
    </>
  );
}

function isNavActive(pathname: string, search: string, itemPath: string): boolean {
  const tab = new URLSearchParams(search).get('tab');
  if (itemPath === '/dashboard') return pathname === '/dashboard';
  if (itemPath === '/free') {
    return (pathname === '/courses' && tab === 'free') || pathname.startsWith('/on-demand');
  }
  if (itemPath === '/courses') {
    if (pathname === '/courses' && tab === 'free') return false;
    return pathname === '/courses' || pathname.startsWith('/courses/');
  }
  if (itemPath === '/resources') {
    return pathname.startsWith('/resources') || pathname.startsWith('/prompts');
  }
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

export default function AppShell({ children }: AppShellProps) {
  const { user, isLoading, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const mobileNavRef = useSyncMobileNavHeight([isAdmin]);
  const { theme, setTheme } = useThemeMode();
  const items = useMemo(
    () => (isAdmin ? [...navItems, ...adminNavItems] : navItems),
    [isAdmin],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    const loginUrl = buildLoginUrl(location.pathname + location.search);
    return <Navigate to={loginUrl} replace />;
  }

  const getInitials = (email: string) => email.substring(0, 2).toUpperCase();

  return (
    <div className="min-h-svh bg-background flex flex-col">
      <SidebarProvider>
        <Sidebar collapsible="icon" className="border-r border-sidebar-border">

          {/* ── Header: Toggle button + Logo ── */}
          <SidebarHeader className="px-2 py-2 border-b border-sidebar-border">
            <div className="flex items-center gap-2 h-9 min-w-0">
              <SidebarTrigger className="shrink-0 h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-md transition-colors duration-150" />
              {/* Logo: completely hidden when sidebar is collapsed to icon mode */}
              <Link
                to="/dashboard"
                className="flex items-center gap-2 min-w-0 group-data-[collapsible=icon]:hidden"
              >
                <img
                  src={siteIcon}
                  alt="Approachable"
                  className="h-6 w-6 shrink-0 rounded-md"
                />
                <span className="font-display font-bold text-sm text-sidebar-foreground truncate">
                  approachable.dev
                </span>
              </Link>
            </div>
          </SidebarHeader>

          {/* ── Nav items ── */}
          <SidebarContent className="pt-2">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const active = isNavActive(location.pathname, location.search, item.path);
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                          <Link to={item.href ?? item.path}>
                            <item.icon />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          {/* ── Footer: Upgrade card + Profile ── */}
          <SidebarFooter className="p-2 gap-2 border-t border-sidebar-border">

            {/* Upgrade to Annual Membership card */}
            <div
              aria-disabled="true"
              className={cn(
                'relative overflow-hidden rounded-lg border border-accent/25 p-3',
                'bg-gradient-to-br from-accent/20 via-accent/10 to-transparent',
                'pointer-events-none select-none',
                'group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2',
              )}
            >
              {/* Soft decorative glow */}
              <div className="absolute -top-4 -right-4 h-14 w-14 rounded-full bg-accent/25 blur-xl" />

              <div className="relative flex items-start gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 group-data-[collapsible=icon]:h-auto group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:bg-transparent">
                  <Crown className="h-3.5 w-3.5 text-accent" />
                </div>
                <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                  <p className="text-xs font-semibold text-sidebar-foreground leading-tight">
                    Upgrade to Annual Membership
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                    Coming soon
                  </p>
                </div>
              </div>
            </div>

            {/* Profile button — at the very bottom like Claude */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    'flex items-center gap-2.5 w-full rounded-md px-2 py-2 text-left',
                    'hover:bg-sidebar-accent transition-colors duration-150 outline-none',
                    'focus-visible:ring-1 focus-visible:ring-sidebar-ring',
                    'group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2',
                  )}
                >
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src="" alt={user.email || ''} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold">
                      {getInitials(user.email || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-xs font-semibold text-sidebar-foreground truncate leading-tight">
                      {user.email}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      {isAdmin ? 'Administrator' : 'Learner'}
                    </p>
                  </div>
                  <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60" side="right" align="end" forceMount>
                <DropdownMenuLabel className="font-normal py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src="" alt={user.email || ''} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                        {getInitials(user.email || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight truncate">{user.email}</p>
                      <p className="text-xs leading-tight text-muted-foreground mt-0.5">
                        {isAdmin ? 'Administrator' : 'Learner'}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ProfileMenuItems theme={theme} setTheme={setTheme} signOut={signOut} />
              </DropdownMenuContent>
            </DropdownMenu>

          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="min-w-0">
          {/* ── Mobile top bar: brand on the left, profile in the top-right corner ── */}
          <div className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-3 py-2">
            <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
              <img src={siteIcon} alt="Approachable" className="h-6 w-6 shrink-0 rounded-md" />
              <span className="font-display font-bold text-sm text-foreground truncate">
                approachable.dev
              </span>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="shrink-0 outline-none" aria-label="Profile menu">
                  <Avatar
                    className={cn(
                      'h-8 w-8 ring-2 ring-transparent transition-colors',
                      location.pathname.startsWith('/profile') && 'ring-primary',
                    )}
                  >
                    <AvatarImage src="" alt={user.email || ''} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-[11px] font-bold">
                      {getInitials(user.email || 'U')}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60" side="bottom" align="end" collisionPadding={12}>
                <DropdownMenuLabel className="font-normal py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src="" alt={user.email || ''} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                        {getInitials(user.email || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight truncate">{user.email}</p>
                      <p className="text-xs leading-tight text-muted-foreground mt-0.5">
                        {isAdmin ? 'Administrator' : 'Learner'}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ProfileMenuItems theme={theme} setTheme={setTheme} signOut={signOut} />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <PromoBanner />

          <div className="flex-1 px-3 py-4 md:px-6 md:py-5 pb-[calc(var(--mobile-nav-height)+var(--sticky-pay-bar-height,0px))] md:pb-5">
            {children}
          </div>

          <Footer className="mt-8 md:mt-auto px-4 md:px-6 pb-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom)+1.5rem)] md:pb-6" />
        </SidebarInset>

        {/* ── Mobile bottom navigation ── */}
        <nav
          ref={mobileNavRef}
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
        >
          <div className="flex items-stretch gap-0.5 p-1.5">
            <div className="grid grid-cols-5 gap-0.5 flex-1">
              {navItems.map((item) => {
                const active = isNavActive(location.pathname, location.search, item.path);
                return (
                  <Link key={item.path} to={item.href ?? item.path}>
                    <Button
                      variant={active ? 'secondary' : 'ghost'}
                      size="sm"
                      className="w-full flex-col h-auto py-1.5 gap-0.5 px-1"
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="text-[10px] leading-tight truncate max-w-full">{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>
            {isAdmin && (
              <Link to="/admin" className="shrink-0">
                <Button
                  variant={location.pathname.startsWith('/admin') ? 'secondary' : 'ghost'}
                  size="sm"
                  className="flex-col h-auto py-1.5 gap-0.5 px-2"
                >
                  <Shield className="h-4 w-4" />
                  <span className="text-[10px] leading-tight">Admin</span>
                </Button>
              </Link>
            )}
          </div>
        </nav>

      </SidebarProvider>
    </div>
  );
}
