import { useState } from 'react';
import { Link } from 'react-router-dom';
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
      <div className="space-y-4 animate-fade-in">
        <div className="space-y-1">
          <h2 className="text-xl font-display font-bold text-foreground">Courses</h2>
          <p className="text-sm text-muted-foreground">
            Instructor-led, free on-demand, and your enrolled courses.
          </p>
        </div>

        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div className="flex h-auto w-auto items-center justify-start gap-7 bg-transparent p-0">
              <Link
                to="/courses"
                className="inline-flex h-auto items-center gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-0.5 pt-1.5 pb-2.5 text-sm font-medium text-muted-foreground shadow-none transition-colors duration-200 hover:border-muted-foreground/30 hover:text-foreground"
              >
                Courses
              </Link>
              <span className="inline-flex h-auto items-center gap-1.5 rounded-none border-b-2 border-primary bg-transparent px-0.5 pt-1.5 pb-2.5 text-sm font-medium text-foreground shadow-none">
                Free
              </span>
              <Link
                to="/courses?tab=my"
                className="inline-flex h-auto items-center gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-0.5 pt-1.5 pb-2.5 text-sm font-medium text-muted-foreground shadow-none transition-colors duration-200 hover:border-muted-foreground/30 hover:text-foreground"
              >
                My Courses
              </Link>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search courses..."
                  className="h-9 pl-9 text-sm"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs shrink-0">
                    <ListFilter className="h-3.5 w-3.5" />
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
          </div>
          <div className="-mt-[1px] border-b border-border" />

          <div className="mt-4">
            <FreeCoursesGrid searchQuery={search} sort={sort} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
