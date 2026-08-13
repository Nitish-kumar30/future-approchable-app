import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useThemeMode, type ThemeMode } from '@/hooks/useThemeMode';
import { cn } from '@/lib/utils';
import {
  CalendarDays,
  Lock,
  Sparkles,
  AppWindow,
  Bot,
  Users2,
  Cpu,
} from 'lucide-react';

const communityMembers = [
  { seed: 'community-1', initials: 'AK' },
  { seed: 'community-2', initials: 'RS' },
  { seed: 'community-3', initials: 'MP' },
  { seed: 'community-4', initials: 'JD' },
];

/**
 * Community card colors follow the active theme — each gets its own blue-family
 * shade so the card stays cohesive across themes while still feeling distinct:
 * Teal gets a cyan-leaning blue, Blue theme gets a pure blue, Midnight gets a
 * deep navy/indigo blue that reads darker to match its near-black background.
 */
const COMMUNITY_CARD_THEME: Record<
  ThemeMode,
  { gradient: string; glowBottom: string; buttonText: string; avatarBorder: string }
> = {
  teal: {
    gradient: 'from-indigo-700 via-indigo-800 to-violet-950',
    glowBottom: 'bg-indigo-400/15',
    buttonText: 'text-indigo-900',
    avatarBorder: 'border-indigo-800',
  },
  blue: {
    gradient: 'from-blue-600 via-blue-700 to-sky-900',
    glowBottom: 'bg-sky-400/20',
    buttonText: 'text-blue-900',
    avatarBorder: 'border-blue-800',
  },
  midnight: {
    gradient: 'from-blue-800 via-indigo-900 to-slate-950',
    glowBottom: 'bg-blue-400/20',
    buttonText: 'text-blue-900',
    avatarBorder: 'border-indigo-800',
  },
};

const monthlyPlanSessions = [
  {
    title: 'Google Workspace',
    week: 'August',
    date: 'Thu, Aug 20 · 7:00 PM IST',
    description:
      'Automate docs, sheets, and mail with Gemini and Workspace scripting — hands-on workflows you can reuse at work.',
    icon: AppWindow,
  },
  {
    title: 'OpenClaw Agent',
    week: 'September',
    date: 'Thu, Sep 17 · 7:00 PM IST',
    description:
      'A hands-on walkthrough of the OpenClaw agent framework for browser automation and task delegation.',
    icon: Bot,
  },
  {
    title: 'Claude Cowork',
    week: 'October',
    date: 'Thu, Oct 15 · 7:00 PM IST',
    description:
      'Pairing with Claude as a cowork partner — the prompts, context, and workflows that make it stick.',
    icon: Users2,
  },
  {
    title: 'Building Personal Agents',
    week: 'November',
    date: 'Thu, Nov 19 · 7:00 PM IST',
    description:
      'Design and ship your own personal AI agent end-to-end — from prompt design to deployment.',
    icon: Cpu,
  },
];

export default function ComingSoonRow() {
  const { theme } = useThemeMode();
  const communityTheme = COMMUNITY_CARD_THEME[theme];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="section-label">Upcoming live sessions</p>
        <Badge variant="secondary" className="text-[10px] h-5 gap-1">
          <Sparkles className="h-3 w-3" />
          Live sessions unlock with membership
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
        {/* Upcoming live sessions — bigger, interactive monthly plan card */}
        <Card className="card-elevated overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 px-5 pt-5 pb-4">
              <div className="h-11 w-11 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-foreground leading-tight">
                    Upcoming live sessions
                  </p>
                  <Badge variant="outline" className="h-5 shrink-0 text-[10px] font-medium">
                    Coming soon
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  One session a month — tap a session for details
                </p>
              </div>
            </div>

            <Accordion type="single" collapsible className="border-t border-border/60">
              {monthlyPlanSessions.map((session, index) => {
                const Icon = session.icon;
                const isNext = index === 0;
                return (
                  <AccordionItem
                    key={session.title}
                    value={session.title}
                    className={cn(
                      'relative border-b-0 border-t border-border/60 first:border-t-0 px-5',
                      isNext && 'bg-primary/[0.04]',
                    )}
                  >
                    {isNext && (
                      <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" aria-hidden />
                    )}
                    <AccordionTrigger className="py-3.5 hover:no-underline gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={cn(
                            'h-9 w-9 rounded-full flex items-center justify-center shrink-0',
                            isNext ? 'bg-primary/15' : 'bg-muted',
                          )}
                        >
                          <Icon className={cn('h-4 w-4', isNext ? 'text-primary' : 'text-muted-foreground')} />
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate">
                              {session.title}
                            </p>
                            {isNext && (
                              <Badge className="h-[18px] shrink-0 rounded-full bg-primary/15 px-1.5 text-[9px] font-semibold text-primary hover:bg-primary/15">
                                Next up
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {session.week} · {session.date}
                          </p>
                        </div>
                        <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-muted-foreground/70 shrink-0">
                          <Lock className="h-3 w-3" />
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pl-12 pr-6">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {session.description}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>

        {/* Community — colors adapt to the active theme */}
        <Card
          className={cn(
            'relative overflow-hidden border-0 bg-gradient-to-br',
            communityTheme.gradient,
          )}
        >
          {/* Decorative glow accents */}
          <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div
            className={cn(
              'pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full blur-2xl',
              communityTheme.glowBottom,
            )}
          />
          {theme === 'teal' && (
            <div className="pointer-events-none absolute -right-10 top-1/2 -translate-y-1/2 flex h-44 w-44 items-center justify-center rounded-full bg-white/[0.06]">
              <Users2 className="h-16 w-16 text-white/15" strokeWidth={1.5} />
            </div>
          )}

          <CardContent className="relative p-6 h-full min-h-[280px] flex flex-col justify-between gap-6 text-white">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold leading-tight">Community</p>
                <Badge className="h-5 shrink-0 rounded-full bg-white/15 text-white border-0 hover:bg-white/15 text-[10px] font-medium">
                  Coming soon
                </Badge>
              </div>
              <p className="text-sm text-white/70">Ask questions, share wins, and learn together</p>
            </div>

            <div className="space-y-4">
              <Button
                size="default"
                className={cn('bg-white hover:bg-white/90 font-medium', communityTheme.buttonText)}
              >
                Go to Community
              </Button>

              <div className="flex items-center gap-2">
                <div className="flex items-center -space-x-2.5">
                  {communityMembers.map((member) => (
                    <Avatar
                      key={member.seed}
                      className={cn('h-9 w-9 border-2', communityTheme.avatarBorder)}
                    >
                      <AvatarImage src={`https://i.pravatar.cc/64?u=${member.seed}`} alt="" />
                      <AvatarFallback className="bg-white/20 text-white text-[10px] font-semibold">
                        {member.initials}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <Badge className="h-6 rounded-full bg-white/15 text-white border-0 hover:bg-white/15 text-xs font-medium px-2.5">
                  +120
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
