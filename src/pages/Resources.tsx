import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BookMarked,
  FileText,
  ArrowRight,
  PlayCircle,
  Users,
  Award,
} from 'lucide-react';
import PromptingGuideModal from '@/components/prompts/PromptingGuideModal';

interface ToolCard {
  icon: typeof BookMarked;
  title: string;
  description: string;
  cta: string;
  /** Provide either a route (`to`) or a click handler (`onClick`). */
  to?: string;
  onClick?: () => void;
  variant?: 'default' | 'outline';
}

function ResourceCard({ tool }: { tool: ToolCard }) {
  const button = (
    <Button
      size="sm"
      variant={tool.variant ?? 'default'}
      className="h-8 text-xs"
      {...(tool.to ? { asChild: true } : { onClick: tool.onClick })}
    >
      {tool.to ? (
        <Link to={tool.to}>
          {tool.cta} <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      ) : (
        <>
          {tool.cta} <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </>
      )}
    </Button>
  );

  return (
    <Card className="card-elevated group hover:shadow-md transition-all duration-200 flex flex-col h-full">
      <CardContent className="p-5 space-y-3 flex flex-col h-full">
        <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
          <tool.icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">{tool.title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{tool.description}</p>
        </div>
        <div>{button}</div>
      </CardContent>
    </Card>
  );
}

export default function Resources() {
  const [guideOpen, setGuideOpen] = useState(false);

  const learningTools: ToolCard[] = [
    {
      icon: BookMarked,
      title: 'Prompt Library',
      description: 'Browse, search, and copy curated prompts for every use case.',
      cta: 'Open library',
      to: '/prompts',
    },
    {
      icon: FileText,
      title: 'Prompting Guide',
      description: 'A structured guide to writing effective prompts from first principles.',
      cta: 'Read guide',
      onClick: () => setGuideOpen(true),
      variant: 'outline',
    },
  ];

  const exploreLinks: ToolCard[] = [
    {
      icon: PlayCircle,
      title: 'Free Courses',
      description: 'Self-paced, on-demand courses you can start right now — no payment needed.',
      cta: 'Browse free',
      to: '/courses?tab=free',
      variant: 'outline',
    },
    {
      icon: Users,
      title: 'Live Cohorts',
      description: 'Join a mentor-led cohort and learn alongside a community.',
      cta: 'View cohorts',
      to: '/cohorts',
      variant: 'outline',
    },
    {
      icon: Award,
      title: 'Your Certificates',
      description: 'View and download certificates you’ve earned from completed courses.',
      cta: 'View certificates',
      to: '/profile#certificates',
      variant: 'outline',
    },
  ];

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-1">
          <h2 className="text-xl font-display font-bold text-foreground">Resources</h2>
          <p className="text-sm text-muted-foreground">
            Tools, guides, and shortcuts to get more out of your learning.
          </p>
        </div>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Learning tools
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {learningTools.map((tool) => (
              <ResourceCard key={tool.title} tool={tool} />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Explore
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {exploreLinks.map((tool) => (
              <ResourceCard key={tool.title} tool={tool} />
            ))}
          </div>
        </section>
      </div>

      <PromptingGuideModal open={guideOpen} onOpenChange={setGuideOpen} />
    </AppShell>
  );
}
