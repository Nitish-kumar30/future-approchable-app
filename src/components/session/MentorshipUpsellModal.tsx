import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import CohortUpsellCard from '@/components/session/CohortUpsellCard';

interface MentorshipUpsellModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MentorshipUpsellModal({ open, onOpenChange }: MentorshipUpsellModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] z-50 w-full max-w-xs translate-x-[-50%] translate-y-[-50%] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogPrimitive.Title className="sr-only">Live mentorship cohort</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            An invitation to join a live mentorship cohort on the Claude ecosystem.
          </DialogPrimitive.Description>
          <div className="relative">
            <DialogPrimitive.Close className="absolute -top-3 -right-3 z-10 rounded-full bg-white shadow-md p-1.5 text-foreground/70 hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
              <CohortUpsellCard variant="mid-course" />
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
