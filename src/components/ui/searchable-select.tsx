import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface SearchableSelectGroup {
  heading?: string;
  items: string[];
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  groups: SearchableSelectGroup[];
  disabled?: boolean;
}

export function SearchableSelect({
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  groups,
  disabled,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);

  const displayValue = value || placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {displayValue}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>No result found.</CommandEmpty>
            {groups.map((group, idx) => (
              <React.Fragment key={group.heading ?? `group-${idx}`}>
                {idx > 0 && <CommandSeparator />}
                <CommandGroup heading={group.heading}>
                  {group.items.map((item) => (
                    <CommandItem
                      key={item}
                      value={item}
                      onSelect={() => {
                        onChange(item === value ? "" : item);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === item ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {item}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </React.Fragment>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
