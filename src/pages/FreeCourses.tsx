import { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import FreeCoursesGrid from '@/components/courses/FreeCoursesGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, ListFilter } from 'lucide-react';

type SortOption = 'newest' | 'name-asc';

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest first',
  'name-asc': 'Name (A–Z)',
};

export default function FreeCourses() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');

  return (
    <AppShell>
      <div className="space-y-5 animate-fade-in">
        <div className="space-y-1">
          <h2 className="text-xl font-display font-bold text-foreground">Free</h2>
          <p className="text-sm text-muted-foreground">
            Self-paced courses you can start anytime.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search free courses..."
              className="h-12 pl-12 text-base md:text-base"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-12 gap-1.5 shrink-0 px-4">
                <ListFilter className="h-4 w-4" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={sort}
                onValueChange={(value) => setSort(value as SortOption)}
              >
                {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
                  <DropdownMenuRadioItem key={option} value={option} className="text-xs">
                    {SORT_LABELS[option]}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <FreeCoursesGrid searchQuery={search} sort={sort} />
      </div>
    </AppShell>
  );
}
