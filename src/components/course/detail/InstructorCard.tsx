import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Markdown } from '@/components/ui/markdown';
import { GraduationCap } from 'lucide-react';

interface InstructorCardProps {
  mentorName: string;
  mentorInfo: string | null;
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export default function InstructorCard({ mentorName, mentorInfo }: InstructorCardProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-xl sm:text-2xl font-semibold">Your Instructor</h2>
      <Card className="card-elevated">
        <CardContent className="p-5 flex flex-col sm:flex-row gap-4">
          <Avatar className="h-14 w-14 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-base font-semibold">
              {initials(mentorName) || <GraduationCap className="h-6 w-6" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-1.5">
            <p className="font-semibold text-foreground">{mentorName}</p>
            {mentorInfo ? (
              <Markdown content={mentorInfo} className="text-sm" />
            ) : (
              <p className="text-sm text-muted-foreground">Course instructor.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
