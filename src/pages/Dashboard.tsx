import AppShell from '@/components/layout/AppShell';
import WelcomeRow from '@/components/dashboard/WelcomeRow';
import CohortSpotlightRow from '@/components/dashboard/CohortSpotlightRow';
import ComingSoonRow from '@/components/dashboard/ComingSoonRow';
import ContinueLearningRow from '@/components/dashboard/ContinueLearningRow';

export default function Dashboard() {
  return (
    <AppShell>
      <div className="space-y-6 animate-fade-in max-w-5xl">
        <WelcomeRow />
        <CohortSpotlightRow />
        <ComingSoonRow />
        <ContinueLearningRow />
      </div>
    </AppShell>
  );
}
