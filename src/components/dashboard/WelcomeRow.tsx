import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

function firstNameFromFullName(fullName: string | null | undefined): string {
  if (!fullName?.trim()) return 'Learner';
  return fullName.trim().split(/\s+/)[0];
}

export default function WelcomeRow() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!cancelled) {
        setFirstName(firstNameFromFullName(data?.full_name));
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-1">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <h2 className="text-xl font-display font-bold text-foreground tracking-tight">
        Welcome back, {firstName}
      </h2>
      <p className="text-sm text-muted-foreground">Your AI learning journey continues.</p>
    </div>
  );
}
